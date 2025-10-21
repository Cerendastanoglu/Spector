import { useState } from 'react';
import {
  BlockStack,
  Button,
  ButtonGroup,
  Card,
  ChoiceList,
  InlineStack,
  Text,
} from '@shopify/polaris';
import { Collection } from './types';

interface BulkCollectionEditorProps {
  availableCollections: Collection[];
  selectedCollections: string[];
  onSelectedCollectionsChange: (collections: string[]) => void;
  collectionOperation: 'add' | 'remove';
  onCollectionOperationChange: (operation: 'add' | 'remove') => void;
  onApply: () => void;
  isLoading?: boolean;
}

export function BulkCollectionEditor({
  availableCollections,
  selectedCollections,
  onSelectedCollectionsChange,
  collectionOperation,
  onCollectionOperationChange,
  onApply,
  isLoading = false,
}: BulkCollectionEditorProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Filter collections based on search
  const filteredCollections = availableCollections.filter(collection =>
    collection.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Convert collections to choice list format
  const collectionChoices = filteredCollections.map(collection => ({
    label: collection.title,
    value: collection.id,
  }));

  return (
    <BlockStack gap="400">
      <Text as="h3" variant="headingMd">
        Collection Management
      </Text>

        {/* Operation Type */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Operation
          </Text>
          <ButtonGroup variant="segmented">
            <Button
              pressed={collectionOperation === 'add'}
              onClick={() => onCollectionOperationChange('add')}
              disabled={isLoading}
            >
              Add to Collections
            </Button>
            <Button
              pressed={collectionOperation === 'remove'}
              onClick={() => onCollectionOperationChange('remove')}
              disabled={isLoading}
            >
              Remove from Collections
            </Button>
          </ButtonGroup>
        </BlockStack>

        {/* Collection Selection */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">
            Select Collections
          </Text>
          
          {/* Search Input */}
          {availableCollections.length > 10 && (
            <div>
              <input
                type="text"
                placeholder="Search collections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid var(--p-border-subdued)',
                  borderRadius: '8px',
                  fontSize: '14px',
                }}
              />
            </div>
          )}

          {filteredCollections.length === 0 ? (
            <Text as="p" variant="bodySm" tone="subdued">
              {searchQuery ? 'No collections found matching your search' : 'No collections available'}
            </Text>
          ) : (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <ChoiceList
                title=""
                allowMultiple
                choices={collectionChoices}
                selected={selectedCollections}
                onChange={onSelectedCollectionsChange}
              />
            </div>
          )}
        </BlockStack>

        {/* Selected Collections Summary */}
        {selectedCollections.length > 0 && (
          <Card background="bg-surface-info">
            <Text as="p" variant="bodySm">
              <strong>{selectedCollections.length}</strong> collection{selectedCollections.length !== 1 ? 's' : ''} selected
            </Text>
          </Card>
        )}

        {/* Apply Button */}
        <InlineStack align="end">
          <Button
            variant="primary"
            onClick={onApply}
            loading={isLoading}
            disabled={selectedCollections.length === 0 || isLoading}
          >
            {collectionOperation === 'add' ? 'Add to' : 'Remove from'} Collections
          </Button>
        </InlineStack>

        {/* Help Text */}
        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <Text as="p" variant="bodySm" fontWeight="semibold">
              How it works:
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodyXs" tone="subdued">
                • <strong>Add to Collections:</strong> Selected products will be added to the chosen collections
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • <strong>Remove from Collections:</strong> Selected products will be removed from the chosen collections
              </Text>
              <Text as="p" variant="bodyXs" tone="subdued">
                • You can select multiple collections to update at once
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
    </BlockStack>
  );
}
