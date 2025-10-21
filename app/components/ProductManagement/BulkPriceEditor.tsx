import React from 'react';
import {
  BlockStack,
  TextField,
  Select,
  Checkbox,
  InlineStack,
  Button,
  Text,
  Icon,
  Collapsible,
} from '@shopify/polaris';
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

interface BulkPriceEditorProps {
  // Price operation state
  priceOperation: 'set' | 'increase' | 'decrease' | 'round';
  setPriceOperation: (value: 'set' | 'increase' | 'decrease' | 'round') => void;
  priceValue: string;
  setPriceValue: (value: string) => void;
  pricePercentage: string;
  setPricePercentage: (value: string) => void;
  
  // Compare price state
  applyCompareChanges: boolean;
  setApplyCompareChanges: (value: boolean) => void;
  compareOperation: 'set' | 'increase' | 'decrease' | 'remove';
  setCompareOperation: (value: 'set' | 'increase' | 'decrease' | 'remove') => void;
  compareValue: string;
  setCompareValue: (value: string) => void;
  comparePercentage: string;
  setComparePercentage: (value: string) => void;
  
  // Actions
  onApply: () => void;
  isLoading: boolean;
  selectedCount: number;
  currencySymbol: string;
  
  // Selected products
  selectedProducts: Product[];
  selectedVariants: string[];
  showSelectedProducts: boolean;
  setShowSelectedProducts: (value: boolean) => void;
  onClearAll: () => void;
}

export function BulkPriceEditor({
  priceOperation,
  setPriceOperation,
  priceValue,
  setPriceValue,
  pricePercentage,
  setPricePercentage,
  applyCompareChanges,
  setApplyCompareChanges,
  compareOperation,
  setCompareOperation,
  compareValue,
  setCompareValue,
  comparePercentage,
  setComparePercentage,
  onApply,
  isLoading,
  selectedCount,
  currencySymbol,
  selectedProducts,
  selectedVariants,
  showSelectedProducts,
  setShowSelectedProducts,
  onClearAll,
}: BulkPriceEditorProps) {
  const priceOperationOptions = [
    { label: 'Set fixed price', value: 'set' },
    { label: 'Increase by percentage', value: 'increase' },
    { label: 'Decrease by percentage', value: 'decrease' },
    { label: 'Round to nearest dollar', value: 'round' },
  ];

  const compareOperationOptions = [
    { label: 'Set fixed compare price', value: 'set' },
    { label: 'Increase by percentage', value: 'increase' },
    { label: 'Decrease by percentage', value: 'decrease' },
    { label: 'Remove compare price', value: 'remove' },
  ];

  return (
    <BlockStack gap="400">
      <Text variant="headingMd" as="h3">
        Bulk Price Update
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
          id="selected-products-collapsible"
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

        {/* Compact Price Operation Row */}
        <InlineStack gap="300" blockAlign="start" wrap={false}>
          <div style={{ flex: 1 }}>
            <Select
              label="Price operation"
              options={priceOperationOptions}
              value={priceOperation}
              onChange={(value) => setPriceOperation(value as any)}
            />
          </div>
          
          {priceOperation === 'set' && (
            <div style={{ flex: 1 }}>
              <TextField
                label="New price"
                type="number"
                value={priceValue}
                onChange={setPriceValue}
                prefix={currencySymbol}
                placeholder="0.00"
                autoComplete="off"
              />
            </div>
          )}

          {(priceOperation === 'increase' || priceOperation === 'decrease') && (
            <div style={{ flex: 1 }}>
              <TextField
                label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} by`}
                type="number"
                value={pricePercentage}
                onChange={setPricePercentage}
                suffix="%"
                placeholder="0"
                autoComplete="off"
              />
            </div>
          )}

          {priceOperation === 'round' && (
            <div style={{ flex: 1, paddingTop: '20px' }}>
              <Text variant="bodyMd" as="p" tone="subdued">
                Will round all prices to the nearest dollar
              </Text>
            </div>
          )}
        </InlineStack>

        {/* Compare Price Section */}
        <BlockStack gap="200">
          <Checkbox
            label="Also update compare at price (strikethrough price)"
            checked={applyCompareChanges}
            onChange={setApplyCompareChanges}
          />

          {applyCompareChanges && (
            <InlineStack gap="300" blockAlign="start">
              <div style={{ flex: 1 }}>
                <Select
                  label="Compare price operation"
                  options={compareOperationOptions}
                  value={compareOperation}
                  onChange={(value) => setCompareOperation(value as any)}
                />
              </div>

              {compareOperation === 'set' && (
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Compare at price"
                    type="number"
                    value={compareValue}
                    onChange={setCompareValue}
                    prefix={currencySymbol}
                    placeholder="0.00"
                    autoComplete="off"
                  />
                </div>
              )}

            {(compareOperation === 'increase' || compareOperation === 'decrease') && (
              <div style={{ flex: 1 }}>
                <TextField
                  label={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} by`}
                  type="number"
                  value={comparePercentage}
                  onChange={setComparePercentage}
                  suffix="%"
                  placeholder="0"
                  autoComplete="off"
                />
              </div>
            )}

            {compareOperation === 'remove' && (
              <div style={{ flex: 1, paddingTop: '20px' }}>
                <Text variant="bodyMd" as="p" tone="subdued">
                  Will remove compare at price from all selected variants
                </Text>
              </div>
            )}
          </InlineStack>
          )}
        </BlockStack>

        <Button
          variant="primary"
          onClick={onApply}
          loading={isLoading}
          disabled={selectedCount === 0}
        >
          Apply Price Changes
        </Button>
    </BlockStack>
  );
}
