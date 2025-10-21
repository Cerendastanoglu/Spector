import { useState } from 'react';
import {
  BlockStack,
  Button,
  ButtonGroup,
  ChoiceList,
  InlineStack,
  Text,
  Collapsible,
  Icon,
} from '@shopify/polaris';
import { Collection } from './types';
import { ChevronDownIcon, ChevronUpIcon, ProductIcon } from '@shopify/polaris-icons';

interface Product {
  id: string;
  title: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
      };
    }>;
  };
  featuredMedia?: {
    preview?: {
      image?: {
        url: string;
      };
    };
  };
}

interface BulkCollectionEditorProps {
  availableCollections: Collection[];
  selectedCollections: string[];
  onSelectedCollectionsChange: (collections: string[]) => void;
  collectionOperation: 'add' | 'remove';
  onCollectionOperationChange: (operation: 'add' | 'remove') => void;
  onApply: () => void;
  isLoading?: boolean;
  
  // Selected products
  selectedProducts: Product[];
  selectedVariants: string[];
  showSelectedProducts: boolean;
  setShowSelectedProducts: (value: boolean) => void;
  onClearAll: () => void;
}

export function BulkCollectionEditor({
  availableCollections,
  selectedCollections,
  onSelectedCollectionsChange,
  collectionOperation,
  onCollectionOperationChange,
  onApply,
  isLoading = false,
  selectedProducts,
  selectedVariants,
  showSelectedProducts,
  setShowSelectedProducts,
  onClearAll,
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

      {/* Collapsible Selected Products Section - Compact Design */}
      <div style={{
        padding: '8px 12px',
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setShowSelectedProducts(!showSelectedProducts)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '13px',
              fontWeight: '500',
              color: '#202223'
            }}
          >
            <Icon source={showSelectedProducts ? ChevronUpIcon : ChevronDownIcon} tone="base" />
            <span>{selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'} • {selectedVariants.length} {selectedVariants.length === 1 ? 'variant' : 'variants'}</span>
          </button>
          <Button
            variant="plain"
            size="slim"
            tone="critical"
            onClick={onClearAll}
          >
            Clear
          </Button>
        </div>

        <Collapsible
          open={showSelectedProducts}
          id="selected-products-collapsible-collections"
          transition={{ duration: '150ms', timingFunction: 'ease-in-out' }}
        >
          <div style={{ 
            marginTop: '8px', 
            maxHeight: '200px', 
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}>
            <BlockStack gap="100">
              {selectedProducts.map((product) => {
                const selectedVariantCount = product.variants.edges.filter(v =>
                  selectedVariants.includes(v.node.id)
                ).length;
                const totalVariants = product.variants.edges.length;

                return (
                  <div
                    key={product.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    <div style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '3px',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #d1d5db',
                      flexShrink: 0
                    }}>
                      {product.featuredMedia?.preview?.image?.url ? (
                        <img
                          src={product.featuredMedia.preview.image.url}
                          alt={product.title}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f3f4f6'
                        }}>
                          <Icon source={ProductIcon} tone="subdued" />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text as="span" variant="bodyXs" fontWeight="medium" truncate>
                        {product.title}
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          {selectedVariantCount}/{totalVariants} variants
                        </Text>
                      </div>
                    </div>
                  </div>
                );
              })}
            </BlockStack>
          </div>
        </Collapsible>
      </div>

        {/* Compact Operation Type Row */}
        <InlineStack gap="300" blockAlign="start" wrap={false}>
          <div style={{ minWidth: '200px' }}>
            <div style={{ marginBottom: '4px' }}>
              <Text as="span" variant="bodyMd" fontWeight="medium">Operation</Text>
            </div>
            <ButtonGroup variant="segmented">
              <Button
                pressed={collectionOperation === 'add'}
                onClick={() => onCollectionOperationChange('add')}
                disabled={isLoading}
              >
                Add to
              </Button>
              <Button
                pressed={collectionOperation === 'remove'}
                onClick={() => onCollectionOperationChange('remove')}
                disabled={isLoading}
              >
                Remove from
              </Button>
            </ButtonGroup>
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ marginBottom: '4px' }}>
              <Text as="span" variant="bodyMd" fontWeight="medium">Select Collections</Text>
              {selectedCollections.length > 0 && (
                <Text as="span" variant="bodySm" tone="subdued"> ({selectedCollections.length} selected)</Text>
              )}
            </div>
          
            {/* Search Input */}
            {availableCollections.length > 10 && (
              <div style={{ marginBottom: '8px' }}>
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
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <ChoiceList
                  title=""
                  allowMultiple
                  choices={collectionChoices}
                  selected={selectedCollections}
                  onChange={onSelectedCollectionsChange}
                />
              </div>
            )}
          </div>
        </InlineStack>

        {/* Apply Button */}
        <Button
          variant="primary"
          onClick={onApply}
          loading={isLoading}
          disabled={selectedCollections.length === 0 || isLoading}
          fullWidth
        >
          {collectionOperation === 'add' ? 'Add to' : 'Remove from'} Collections
        </Button>
    </BlockStack>
  );
}
