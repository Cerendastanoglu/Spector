import React, { useState } from 'react';
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
  tagOperation: 'add' | 'remove';
  setTagOperation: (value: 'add' | 'remove') => void;
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
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const toggleProductExpansion = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const tagOperationOptions = [
    { label: 'Add tags', value: 'add' },
    { label: 'Remove tags', value: 'remove' },
  ];

  return (
    <BlockStack gap="400">
      <Text variant="headingMd" as="h3">
        Bulk Tag Management
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
          id="selected-products-collapsible-tags"
          transition={{ duration: '150ms', timingFunction: 'ease-in-out' }}
        >
          <div style={{ 
            marginTop: '8px', 
            maxHeight: '300px', 
            overflowY: 'auto',
            scrollbarWidth: 'thin'
          }}>
            <BlockStack gap="100">
              {selectedProducts.map((product) => {
                const isExpanded = expandedProducts.has(product.id);
                const selectedVariantCount = product.variants.edges.filter(v =>
                  selectedVariants.includes(v.node.id)
                ).length;
                const totalVariants = product.variants.edges.length;
                const productTags = product.tags || [];

                return (
                  <div
                    key={product.id}
                    style={{
                      backgroundColor: '#f9fafb',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb',
                    }}
                  >
                    {/* Product Header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 8px',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleProductExpansion(product.id)}
                    >
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '4px',
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
                      <Text as="span" variant="bodyXs" fontWeight="medium">
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.title}</span>
                      </Text>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginTop: '2px' }}>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          {selectedVariantCount}/{totalVariants} variants
                        </Text>
                        {productTags.length > 0 && (
                          <>
                            <Text as="span" variant="bodyXs" tone="subdued">•</Text>
                            <Text as="span" variant="bodyXs" tone="subdued">
                              {productTags.length} {productTags.length === 1 ? 'tag' : 'tags'}
                            </Text>
                          </>
                        )}
                      </div>
                    </div>
                    <Icon source={isExpanded ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
                  </div>

                  {/* Expandable Tags - ALWAYS SHOW */}
                  {isExpanded && (
                    <div style={{
                      padding: '8px',
                      borderTop: '1px solid #e5e7eb',
                      backgroundColor: '#ffffff'
                    }}>
                      <div style={{ marginBottom: '6px' }}>
                        <Text as="p" variant="bodyXs" tone="subdued" fontWeight="semibold">
                          Current Tags:
                        </Text>
                      </div>
                      <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px'
                      }}>
                        {productTags.length > 0 ? (
                          productTags.map((tag) => (
                            <Badge key={tag} tone="info" size="small">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <Text as="span" variant="bodyXs" tone="subdued">
                            No tags
                          </Text>
                        )}
                      </div>
                    </div>
                  )}
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
