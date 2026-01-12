import { useState } from 'react';
import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  InlineStack,
  TextField,
  Text,
} from '@shopify/polaris';

interface BulkInventoryEditorProps {
  onApply: (operation: string, value: string) => void;
  isLoading?: boolean;
}

export function BulkInventoryEditor({
  onApply,
  isLoading = false,
}: BulkInventoryEditorProps) {
  const [inventoryOperation, setInventoryOperation] = useState<'set' | 'add' | 'subtract'>('set');
  const [inventoryValue, setInventoryValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [costValue, setCostValue] = useState('');

  const handleApplyInventory = () => {
    if (inventoryValue) {
      onApply(inventoryOperation, inventoryValue);
      setInventoryValue('');
    }
  };

  const handleApplyWeight = () => {
    if (weightValue) {
      onApply('weight', weightValue);
      setWeightValue('');
    }
  };

  const handleApplyCost = () => {
    if (costValue) {
      onApply('cost', costValue);
      setCostValue('');
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text as="h3" variant="headingMd">
          Inventory Management
        </Text>

        {/* Stock Quantity */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Stock Quantity
          </Text>
          
          <ButtonGroup variant="segmented">
            <Button
              pressed={inventoryOperation === 'set'}
              onClick={() => setInventoryOperation('set')}
              disabled={isLoading}
            >
              Set
            </Button>
            <Button
              pressed={inventoryOperation === 'add'}
              onClick={() => setInventoryOperation('add')}
              disabled={isLoading}
            >
              Add
            </Button>
            <Button
              pressed={inventoryOperation === 'subtract'}
              onClick={() => setInventoryOperation('subtract')}
              disabled={isLoading}
            >
              Subtract
            </Button>
          </ButtonGroup>

          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                type="number"
                value={inventoryValue}
                onChange={setInventoryValue}
                placeholder="Enter quantity"
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={handleApplyInventory}
              loading={isLoading}
              disabled={!inventoryValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
        </BlockStack>

        {/* Weight */
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Weight (kg)
          </Text>
          
          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                type="number"
                value={weightValue}
                onChange={setWeightValue}
                placeholder="Enter weight"
                autoComplete="off"
                disabled={isLoading}
                suffix="kg"
              />
            </div>
            <Button
              onClick={handleApplyWeight}
              loading={isLoading}
              disabled={!weightValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Set weight for shipping calculations
          </Text>
        </BlockStack>

        {/* Cost */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Cost per Item
          </Text>
          
          <InlineStack gap="200" blockAlign="end">
            <div style={{ flexGrow: 1 }}>
              <TextField
                label=""
                type="number"
                value={costValue}
                onChange={setCostValue}
                placeholder="Enter cost"
                autoComplete="off"
                disabled={isLoading}
                prefix="$"
              />
            </div>
            <Button
              onClick={handleApplyCost}
              loading={isLoading}
              disabled={!costValue || isLoading}
            >
              Apply
            </Button>
          </InlineStack>
          
          <Text as="p" variant="bodyXs" tone="subdued">
            Cost per item for profit calculations
          </Text>
        </BlockStack>

        {/* Help Text */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              Inventory Operations:
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                • <strong>Set:</strong> Replace current stock with new value
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • <strong>Add:</strong> Increase stock by specified amount
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • <strong>Subtract:</strong> Decrease stock by specified amount
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Weight and cost updates replace existing values
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
}
