import { useState } from 'react';
import { Modal, TextField, BlockStack, Text, Banner } from '@shopify/polaris';

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
  const getOperationTypeLabel = () => {
    switch (operationType) {
      case 'pricing': return 'Pricing';
      case 'tags': return 'Tags';
      case 'collections': return 'Collections';
      case 'inventory': return 'Inventory';
      case 'content': return 'Content';
      case 'titles': return 'Titles';
      case 'descriptions': return 'Descriptions';
      case 'images': return 'Images';
      default: return 'Bulk';
    }
  };
  
  const defaultName = `${getOperationTypeLabel()} Update - ${totalProducts} product${totalProducts !== 1 ? 's' : ''} - ${new Date().toLocaleDateString()}`;
  
  const handleSave = () => {
    const finalName = operationName.trim() || defaultName;
    onSave(finalName, description.trim());
    // Reset form
    setOperationName('');
    setDescription('');
  };
  
  const handleSkip = () => {
    onSave(defaultName, '');
    setOperationName('');
    setDescription('');
  };
  
  return (
    <Modal
      open={isOpen}
      onClose={onCancel}
      title="Name This Bulk Operation"
      primaryAction={{
        content: 'Save to History',
        onAction: handleSave,
      }}
      secondaryActions={[
        {
          content: 'Skip',
          onAction: handleSkip,
        },
        {
          content: 'Cancel',
          onAction: () => {
            setOperationName('');
            setDescription('');
            onCancel();
          }
        }
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="info">
            <Text as="p" variant="bodySm">
              Name this operation so you can track and revert it later. All changes are saved to your activity history.
            </Text>
          </Banner>
          
          <TextField
            label="Operation Name"
            value={operationName}
            onChange={setOperationName}
            placeholder={defaultName}
            autoComplete="off"
            helpText="Leave empty to use auto-generated name"
          />
          
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={setDescription}
            placeholder="E.g., 'Applied 15% holiday discount to seasonal products'"
            autoComplete="off"
            multiline={3}
            maxLength={500}
            showCharacterCount
            helpText="Add notes about why this change was made"
          />
          
          <div style={{
            padding: '12px',
            backgroundColor: '#f6f6f7',
            borderRadius: '8px',
            border: '1px solid #e1e3e5'
          }}>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" fontWeight="semibold" tone="subdued">
                Operation Summary:
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Type: {getOperationTypeLabel()} Update
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Products affected: {totalProducts}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Variants affected: {totalVariants}
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • Date: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
              </Text>
            </BlockStack>
          </div>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
