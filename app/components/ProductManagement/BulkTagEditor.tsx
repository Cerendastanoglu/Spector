import React, { useMemo, useState } from 'react';
import {
  BlockStack,
  TextField,
  Select,
  InlineStack,
  Button,
  Text,
  Icon,
  Collapsible,
  Badge,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, ProductIcon } from '@shopify/polaris-icons';

interface Product {
  id: string;
  title: string;
  tags?: string[];
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

interface BulkTagEditorProps {
  tagOperation: 'add' | 'remove' | 'replace';
  setTagOperation: (value: 'add' | 'remove' | 'replace') => void;
  tagValue: string;
  setTagValue: (value: string) => void;
  tagRemoveValue: string;
  setTagRemoveValue: (value: string) => void;
  onApply: () => void;
  isLoading: boolean;
  selectedCount: number;
  
  // Selected products
  selectedProducts: Product[];
  selectedVariants: string[];
  showSelectedProducts: boolean;
  setShowSelectedProducts: (value: boolean) => void;
  onClearAll: () => void;
}

export function BulkTagEditor({
  tagOperation,
  setTagOperation,
  tagValue,
  setTagValue,
  tagRemoveValue,
  setTagRemoveValue,
  onApply,
  isLoading,
  selectedCount,
  selectedProducts,
  selectedVariants,
  showSelectedProducts,
  setShowSelectedProducts,
  onClearAll,
}: BulkTagEditorProps) {
  const [showCurrentTags, setShowCurrentTags] = useState(false);

  const tagOperationOptions = [
    { label: 'Add tags', value: 'add' },
    { label: 'Remove tags', value: 'remove' },
    { label: 'Replace all tags', value: 'replace' },
  ];

  // Aggregate existing tags from selected products
  const currentTagsData = useMemo(() => {
    const tagMap = new Map<string, number>();
    
    selectedProducts.forEach(product => {
      if (product.tags) {
        product.tags.forEach(tag => {
          const trimmedTag = tag.trim();
          if (trimmedTag) {
            tagMap.set(trimmedTag, (tagMap.get(trimmedTag) || 0) + 1);
          }
        });
      }
    });

    return Array.from(tagMap.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        percentage: Math.round((count / selectedProducts.length) * 100)
      }))
      .sort((a, b) => b.count - a.count); // Most common tags first
  }, [selectedProducts]);

  return (
    <BlockStack gap="400">
      <Text variant="headingMd" as="h3">
        Bulk Tag Management
      </Text>

      {/* Current Tags Summary - Compact & Visual */}
      {currentTagsData.length > 0 && (
        <div style={{
          padding: '8px 12px',
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button
              onClick={() => setShowCurrentTags(!showCurrentTags)}
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
              <Icon source={showCurrentTags ? ChevronUpIcon : ChevronDownIcon} tone="base" />
              <span>Current Tags ({currentTagsData.length})</span>
            </button>
          </div>

          <Collapsible
            open={showCurrentTags}
            id="current-tags-collapsible"
            transition={{ duration: '200ms', timingFunction: 'ease' }}
          >
            <div style={{ 
              marginTop: '12px',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '6px',
              maxHeight: '160px',
              overflowY: 'auto'
            }}>
              {currentTagsData.map(({ tag, count, percentage }) => (
                <div
                  key={tag}
                  style={{
                    padding: '6px 10px',
                    backgroundColor: '#fff',
                    borderRadius: '16px',
                    border: '1px solid #d1d5db',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    // When clicking a tag, add it to remove field for easy removal
                    if (tagOperation === 'remove') {
                      setTagRemoveValue(tag);
                    }
                  }}
                  title={`Click to ${tagOperation === 'remove' ? 'remove' : 'view'} this tag`}
                >
                  <Text as="span" variant="bodyXs" fontWeight="medium">
                    {tag}
                  </Text>
                  <Badge tone={percentage >= 50 ? 'success' : 'info'} size="small">
                    {`${count}/${selectedProducts.length}`}
                  </Badge>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #e1e3e5' }}>
              <Text as="p" variant="bodyXs" tone="subdued">
                💡 Tip: Click a tag to quickly select it for removal
              </Text>
            </div>
          </Collapsible>
        </div>
      )}

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
          id="selected-products-collapsible-tags"
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

        <Text variant="bodyMd" as="p" tone="subdued">
          Manage tags for {selectedCount} selected product{selectedCount !== 1 ? 's' : ''}
        </Text>

        {/* Compact Tag Operation Row */}
        <InlineStack gap="300" blockAlign="start" wrap={false}>
          <div style={{ flex: 1 }}>
            <Select
              label="Tag operation"
              options={tagOperationOptions}
              value={tagOperation}
              onChange={(value) => setTagOperation(value as any)}
            />
          </div>

          {tagOperation === 'add' && (
            <div style={{ flex: 2 }}>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="medium">Tags to add</Text>
                  <Text as="span" variant="bodySm" tone="subdued"> (comma-separated)</Text>
                </div>
                <TextField
                  label=""
                  labelHidden
                  value={tagValue}
                  onChange={setTagValue}
                  placeholder="summer, sale, featured"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {tagOperation === 'remove' && (
            <div style={{ flex: 2 }}>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="medium">Tags to remove</Text>
                  <Text as="span" variant="bodySm" tone="subdued"> (comma-separated)</Text>
                </div>
                <TextField
                  label=""
                  labelHidden
                  value={tagRemoveValue}
                  onChange={setTagRemoveValue}
                  placeholder="old-tag, discontinued"
                  autoComplete="off"
                />
              </div>
            </div>
          )}

          {tagOperation === 'replace' && (
            <div style={{ flex: 2 }}>
              <div>
                <div style={{ marginBottom: '4px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="medium">New tags</Text>
                  <Text as="span" variant="bodySm" tone="subdued"> (replaces all existing)</Text>
                </div>
                <TextField
                  label=""
                  labelHidden
                  value={tagValue}
                  onChange={setTagValue}
                  placeholder="new, updated, current"
                  autoComplete="off"
                />
              </div>
            </div>
          )}
        </InlineStack>

        <Button
          variant="primary"
          onClick={onApply}
          loading={isLoading}
          disabled={selectedCount === 0}
        >
          Apply Tag Changes
        </Button>
    </BlockStack>
  );
}
