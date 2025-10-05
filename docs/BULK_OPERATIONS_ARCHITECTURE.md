# Bulk Operations Activity Tracking - Complete Architecture

## Overview
This document explains the complete implementation for named bulk operations with activity tracking and revert functionality.

## System Flow

```
User Performs Bulk Edit → Track Changes → Show Naming Modal → Save to DB → Display in History → Allow Revert
```

## 1. Data Capture Layer (BEFORE API calls)

### Location: `ProductManagement.tsx` - Before each bulk operation

```typescript
// Add this state at component level
const [pendingOperation, setPendingOperation] = useState<{
  operationType: string;
  changes: any[];
  totalProducts: number;
  totalVariants: number;
} | null>(null);

const [showNamingModal, setShowNamingModal] = useState(false);
```

## 2. Change Tracking (DURING operations)

### Modify each bulk handler to capture changes:

```typescript
// Example: handleBulkPricing() modification
const handleBulkPricing = async () => {
  // ... existing validation code ...
  
  const changesLog = []; // NEW: Track changes
  
  for (let i = 0; i < selectedVariants.length; i++) {
    const variantId = selectedVariants[i];
    // ... find product and variant ...
    
    // NEW: Capture old value BEFORE update
    const oldPrice = targetVariant.price;
    const oldComparePrice = targetVariant.compareAtPrice;
    
    // ... calculate new price ...
    
    // NEW: Log the change
    changesLog.push({
      productId: targetProduct.id,
      variantId: targetVariant.id,
      productTitle: targetProduct.title,
      variantTitle: targetVariant.title,
      fieldChanged: 'price',
      oldValue: oldPrice,
      newValue: newPrice.toFixed(2),
      changeType: priceOperation,
      // Additional metadata
      metadata: {
        compareAtPriceOld: oldComparePrice,
        compareAtPriceNew: newComparePrice,
        percentage: pricePercentage
      }
    });
  }
  
  // ... make API call ...
  
  // NEW: After successful API call, show naming modal
  if (result.success && apiSuccessful.length > 0) {
    setPendingOperation({
      operationType: 'pricing',
      changes: changesLog,
      totalProducts: new Set(changesLog.map(c => c.productId)).size,
      totalVariants: changesLog.length
    });
    setShowNamingModal(true);
  }
}
```

## 3. Naming Modal Component

### Create new file: `app/components/OperationNamingModal.tsx`

```typescript
import { Modal, TextField, TextArea, Button, InlineStack, BlockStack, Text } from '@shopify/polaris';

interface OperationNamingModalProps {
  isOpen: boolean;
  operationType: string;
  totalProducts: number;
  totalVariants: number;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
}

export function OperationNamingModal({ 
  isOpen, 
  operationType, 
  totalProducts, 
  totalVariants,
  onSave, 
  onCancel 
}: OperationNamingModalProps) {
  const [operationName, setOperationName] = useState('');
  const [description, setDescription] = useState('');
  
  // Auto-generate default name
  const defaultName = `${operationType} Update - ${totalProducts} products - ${new Date().toLocaleDateString()}`;
  
  const handleSave = () => {
    onSave(operationName || defaultName, description);
    setOperationName('');
    setDescription('');
  };
  
  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      title="Name This Operation"
      primaryAction={{
        content: 'Save Activity',
        onAction: handleSave,
      }}
      secondaryActions={[{
        content: 'Skip',
        onAction: () => {
          onSave(defaultName, '');
          setOperationName('');
          setDescription('');
        }
      }]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Text as="p" variant="bodySm" tone="subdued">
            Give this bulk operation a memorable name so you can track and revert it later.
          </Text>
          
          <TextField
            label="Operation Name"
            value={operationName}
            onChange={setOperationName}
            placeholder={defaultName}
            autoComplete="off"
            helpText="Leave empty to use auto-generated name"
          />
          
          <TextArea
            label="Description (Optional)"
            value={description}
            onChange={setDescription}
            placeholder="E.g., 'Applied 15% holiday discount to seasonal products'"
            autoComplete="off"
            maxLength={500}
          />
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Affected: {totalProducts} product{totalProducts !== 1 ? 's' : ''}, {totalVariants} variant{totalVariants !== 1 ? 's' : ''}
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
```

## 4. Database Save Function

### Modify `/app/api/bulk-history.tsx` to add CREATE action:

```typescript
export async function action({ request }: ActionFunctionArgs) {
  const { admin, session } = await authenticate.admin(request);
  const shop = session.shop;

  try {
    const formData = await request.formData();
    const action = formData.get("action") as string;

    // NEW ACTION: Create bulk edit record
    if (action === "create") {
      const data = JSON.parse(formData.get("data") as string);
      const { operationType, operationName, description, changes, totalProducts, totalVariants } = data;
      
      // Create batch with all items in single transaction
      const batch = await db.bulkEditBatch.create({
        data: {
          shop,
          operationType,
          operationName,
          description: description || null,
          totalProducts,
          totalVariants,
          canRevert: true,
          isReverted: false,
          items: {
            create: changes.map((change: any) => ({
              productId: change.productId,
              variantId: change.variantId || null,
              productTitle: change.productTitle,
              variantTitle: change.variantTitle || null,
              fieldChanged: change.fieldChanged,
              oldValue: change.oldValue || null,
              newValue: change.newValue || null,
              changeType: change.changeType,
            }))
          }
        },
        include: {
          items: true
        }
      });
      
      return json({ success: true, batch });
    }
    
    // Existing revert action...
    if (action === "revert") {
      // ... existing revert code ...
    }
    
  } catch (error) {
    console.error("Error in bulk history action:", error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}
```

## 5. Wire Everything Together in ProductManagement.tsx

```typescript
// Add modal to render
const handleSaveOperationName = async (name: string, description: string) => {
  if (!pendingOperation) return;
  
  try {
    const formData = new FormData();
    formData.append('action', 'create');
    formData.append('data', JSON.stringify({
      operationType: pendingOperation.operationType,
      operationName: name,
      description,
      changes: pendingOperation.changes,
      totalProducts: pendingOperation.totalProducts,
      totalVariants: pendingOperation.totalVariants
    }));
    
    const response = await fetch('/app/api/bulk-history', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Operation saved to history:', name);
      setShowNamingModal(false);
      setPendingOperation(null);
      // Optionally show success message
      setSuccess(`Operation "${name}" saved to history. You can revert it anytime.`);
    }
  } catch (error) {
    console.error('Failed to save operation:', error);
    setError('Failed to save operation to history');
  }
};

// Add to component JSX (before closing tags)
<OperationNamingModal
  isOpen={showNamingModal}
  operationType={pendingOperation?.operationType || ''}
  totalProducts={pendingOperation?.totalProducts || 0}
  totalVariants={pendingOperation?.totalVariants || 0}
  onSave={handleSaveOperationName}
  onCancel={() => {
    setShowNamingModal(false);
    setPendingOperation(null);
  }}
/>
```

## 6. Update BulkEditHistory to Use Real Data

### Modify `/app/components/BulkEditHistory.tsx`:

```typescript
// Remove mock data (lines 138-262)
// Use real data from API:

const batches = historyFetcher.data?.batches || [];

// Display real batches instead of mockBatches
{batches.length === 0 ? (
  <Text as="p" variant="bodySm" tone="subdued">
    No bulk edit history yet. Your named operations will appear here.
  </Text>
) : (
  batches.map((batch) => (
    // ... existing batch display code ...
  ))
)}
```

## Required Changes Summary

### Files to Modify:
1. **`app/components/ProductManagement.tsx`**
   - Add states: `pendingOperation`, `showNamingModal`
   - Modify ALL bulk handlers: `handleBulkPricing`, `handleBulkTags`, `handleBulkCollections`, etc.
   - Add change tracking to each operation
   - Add modal trigger after success
   - Add `handleSaveOperationName` function

2. **`app/components/OperationNamingModal.tsx`** (NEW FILE)
   - Create modal component

3. **`app/routes/app.api.bulk-history.tsx`**
   - Add "create" action handler

4. **`app/components/BulkEditHistory.tsx`**
   - Remove mock data
   - Use real API data

### Database Schema (Already exists in Prisma):
```prisma
model BulkEditBatch {
  id              String   @id @default(cuid())
  shop            String
  operationType   String   // 'pricing', 'tags', 'collections', etc.
  operationName   String   // User-provided name
  description     String?  // Optional description
  totalProducts   Int
  totalVariants   Int
  createdAt       DateTime @default(now())
  canRevert       Boolean  @default(true)
  isReverted      Boolean  @default(false)
  revertedAt      DateTime?
  items           BulkEditItem[]
}

model BulkEditItem {
  id            String   @id @default(cuid())
  batchId       String
  batch         BulkEditBatch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  productId     String
  variantId     String?
  productTitle  String
  variantTitle  String?
  fieldChanged  String   // 'price', 'tags', 'title', etc.
  oldValue      String?
  newValue      String?
  changeType    String   // 'increase', 'decrease', 'add', 'remove', etc.
  createdAt     DateTime @default(now())
}
```

## Testing Checklist

- [ ] Change tracking captures old/new values correctly
- [ ] Modal appears after successful bulk operation
- [ ] Default name is auto-generated
- [ ] Custom names are saved to database
- [ ] History displays real data from database
- [ ] Revert functionality works with tracked changes
- [ ] All bulk operations (pricing, tags, collections, inventory, etc.) are tracked
- [ ] Multiple operations create separate history entries
- [ ] History persists across sessions

## Benefits

1. **Full Audit Trail** - Every bulk operation is documented
2. **Easy Rollback** - Revert any operation with one click
3. **Professional Workflow** - Like git commits for product changes
4. **No Performance Impact** - Async saves after operation completes
5. **User Control** - Can skip naming if in a hurry
6. **Smart Defaults** - Auto-generated names for convenience
