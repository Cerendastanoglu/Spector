import React, { useState } from 'react';
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
  Badge,
} from '@shopify/polaris';
import { ChevronDownIcon, ChevronUpIcon, ProductIcon } from '@shopify/polaris-icons';

interface Product {
  id: string;
  title: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        price: string;
        compareAtPrice?: string;
        inventoryQuantity?: number;
        sku?: string;
        barcode?: string;
        taxable?: boolean;
        inventoryItem?: {
          id: string;
          unitCost?: {
            amount: string;
          };
        };
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
  
  // Cost per item state
  applyCostChanges: boolean;
  setApplyCostChanges: (value: boolean) => void;
  costValue: string;
  setCostValue: (value: string) => void;
  
  // Charge tax state
  applyTaxChanges: boolean;
  setApplyTaxChanges: (value: boolean) => void;
  taxable: boolean;
  setTaxable: (value: boolean) => void;
  
  // Unit price state (price per unit)
  applyUnitPriceChanges: boolean;
  setApplyUnitPriceChanges: (value: boolean) => void;
  unitPriceValue: string;
  setUnitPriceValue: (value: string) => void;
  
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
  applyCostChanges,
  setApplyCostChanges,
  costValue,
  setCostValue,
  applyTaxChanges,
  setApplyTaxChanges,
  taxable,
  setTaxable,
  applyUnitPriceChanges,
  setApplyUnitPriceChanges,
  unitPriceValue,
  setUnitPriceValue,
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

  // Calculate new price based on operation
  const calculateNewPrice = (currentPrice: string): string => {
    const price = parseFloat(currentPrice || '0');
    
    if (priceOperation === 'set') {
      return priceValue || currentPrice;
    } else if (priceOperation === 'increase') {
      const percentage = parseFloat(pricePercentage || '0');
      return (price * (1 + percentage / 100)).toFixed(2);
    } else if (priceOperation === 'decrease') {
      const percentage = parseFloat(pricePercentage || '0');
      return (price * (1 - percentage / 100)).toFixed(2);
    } else if (priceOperation === 'round') {
      return Math.round(price).toFixed(2);
    }
    return currentPrice;
  };

  // Calculate new compare price
  const calculateNewComparePrice = (currentPrice: string, currentComparePrice?: string): string | null => {
    if (!applyCompareChanges) return currentComparePrice || null;
    
    if (compareOperation === 'remove') return null;
    
    const price = parseFloat(currentComparePrice || currentPrice || '0');
    
    if (compareOperation === 'set') {
      return compareValue || currentComparePrice || null;
    } else if (compareOperation === 'increase') {
      const percentage = parseFloat(comparePercentage || '0');
      return (price * (1 + percentage / 100)).toFixed(2);
    } else if (compareOperation === 'decrease') {
      const percentage = parseFloat(comparePercentage || '0');
      return (price * (1 - percentage / 100)).toFixed(2);
    }
    return currentComparePrice || null;
  };

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

      {/* Collapsible Selected Products Section - Expandable with Price Preview */}
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
          id="selected-products-collapsible-pricing"
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
                const selectedProductVariants = product.variants.edges.filter(v =>
                  selectedVariants.includes(v.node.id)
                );

                // Check if price changes will apply
                const hasPriceChanges = 
                  (priceOperation === 'set' && priceValue) ||
                  (priceOperation === 'increase' && pricePercentage) ||
                  (priceOperation === 'decrease' && pricePercentage) ||
                  priceOperation === 'round';

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
                            {selectedProductVariants.length}/{product.variants.edges.length} {selectedProductVariants.length === 1 ? 'variant' : 'variants'}
                          </Text>
                        </div>
                      </div>
                      <Icon source={isExpanded ? ChevronUpIcon : ChevronDownIcon} tone="subdued" />
                    </div>

                    {/* Expandable Variants with Price Preview */}
                    {isExpanded && (
                      <div style={{
                        padding: '8px',
                        borderTop: '1px solid #e5e7eb',
                        backgroundColor: '#ffffff'
                      }}>
                        <BlockStack gap="100">
                          {selectedProductVariants.map((variant) => {
                            const currentPrice = variant.node.price;
                            const newPrice = calculateNewPrice(currentPrice);
                            const currentCompare = variant.node.compareAtPrice;
                            const newCompare = calculateNewComparePrice(currentPrice, currentCompare);
                            const priceChanged = newPrice !== currentPrice;
                            const compareChanged = newCompare !== currentCompare;

                            return (
                              <div
                                key={variant.node.id}
                                style={{
                                  padding: '6px 8px',
                                  backgroundColor: '#f9fafb',
                                  borderRadius: '4px',
                                  border: '1px solid #e5e7eb'
                                }}
                              >
                                <div style={{ marginBottom: '4px' }}>
                                  <Text as="span" variant="bodyXs" fontWeight="semibold">
                                    {variant.node.title}
                                  </Text>
                                  {variant.node.sku && (
                                    <Text as="span" variant="bodyXs" tone="subdued">
                                      {' • SKU: '}{variant.node.sku}
                                    </Text>
                                  )}
                                </div>
                                
                                {/* Price Preview */}
                                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                  <div>
                                    <Text as="p" variant="bodyXs" tone="subdued">
                                      Price:
                                    </Text>
                                    {hasPriceChanges && priceChanged ? (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <Text as="span" variant="bodyXs" tone="subdued">
                                          <span style={{ textDecoration: 'line-through' }}>{currencySymbol}{currentPrice}</span>
                                        </Text>
                                        <Text as="span" variant="bodyXs" fontWeight="semibold" tone="success">
                                          {currencySymbol}{newPrice}
                                        </Text>
                                      </div>
                                    ) : (
                                      <Text as="span" variant="bodyXs" fontWeight="medium">
                                        {currencySymbol}{currentPrice}
                                      </Text>
                                    )}
                                  </div>
                                  
                                  {(currentCompare || applyCompareChanges) && (
                                    <div>
                                      <Text as="p" variant="bodyXs" tone="subdued">
                                        Compare at:
                                      </Text>
                                      {applyCompareChanges && compareChanged ? (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          {currentCompare && (
                                            <Text as="span" variant="bodyXs" tone="subdued">
                                              <span style={{ textDecoration: 'line-through' }}>{currencySymbol}{currentCompare}</span>
                                            </Text>
                                          )}
                                          {newCompare ? (
                                            <Text as="span" variant="bodyXs" fontWeight="semibold" tone="success">
                                              {currencySymbol}{newCompare}
                                            </Text>
                                          ) : (
                                            <Badge tone="critical" size="small">Removed</Badge>
                                          )}
                                        </div>
                                      ) : (
                                        <Text as="span" variant="bodyXs" fontWeight="medium">
                                          {currentCompare ? `${currencySymbol}${currentCompare}` : '—'}
                                        </Text>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* Cost per Item */}
                                  <div>
                                    <Text as="p" variant="bodyXs" tone="subdued">
                                      Cost:
                                    </Text>
                                    {applyCostChanges && costValue ? (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {variant.node.inventoryItem?.unitCost?.amount && (
                                          <Text as="span" variant="bodyXs" tone="subdued">
                                            <span style={{ textDecoration: 'line-through' }}>{currencySymbol}{variant.node.inventoryItem.unitCost.amount}</span>
                                          </Text>
                                        )}
                                        <Text as="span" variant="bodyXs" fontWeight="semibold" tone="success">
                                          {currencySymbol}{costValue}
                                        </Text>
                                      </div>
                                    ) : (
                                      <Text as="span" variant="bodyXs" fontWeight="medium">
                                        {variant.node.inventoryItem?.unitCost?.amount 
                                          ? `${currencySymbol}${variant.node.inventoryItem.unitCost.amount}` 
                                          : '—'}
                                      </Text>
                                    )}
                                  </div>
                                  
                                  {/* Tax Status */}
                                  <div>
                                    <Text as="p" variant="bodyXs" tone="subdued">
                                      Taxable:
                                    </Text>
                                    {applyTaxChanges ? (
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        {variant.node.taxable !== undefined && variant.node.taxable !== taxable && (
                                          <Text as="span" variant="bodyXs" tone="subdued">
                                            <span style={{ textDecoration: 'line-through' }}>{variant.node.taxable ? 'Yes' : 'No'}</span>
                                          </Text>
                                        )}
                                        <Text as="span" variant="bodyXs" fontWeight="semibold" tone="success">
                                          {taxable ? 'Yes' : 'No'}
                                        </Text>
                                      </div>
                                    ) : (
                                      <Text as="span" variant="bodyXs" fontWeight="medium">
                                        {variant.node.taxable !== undefined ? (variant.node.taxable ? 'Yes' : 'No') : '—'}
                                      </Text>
                                    )}
                                  </div>
                                  
                                  {/* Unit Price */}
                                  {(variant.node.inventoryItem?.unitCost?.amount || applyUnitPriceChanges) && (
                                    <div>
                                      <Text as="p" variant="bodyXs" tone="subdued">
                                        Unit price:
                                      </Text>
                                      {applyUnitPriceChanges && unitPriceValue ? (
                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                          {variant.node.inventoryItem?.unitCost?.amount && (
                                            <Text as="span" variant="bodyXs" tone="subdued">
                                              <span style={{ textDecoration: 'line-through' }}>{currencySymbol}{variant.node.inventoryItem.unitCost.amount}</span>
                                            </Text>
                                          )}
                                          <Text as="span" variant="bodyXs" fontWeight="semibold" tone="success">
                                            {currencySymbol}{unitPriceValue}
                                          </Text>
                                        </div>
                                      ) : (
                                        <Text as="span" variant="bodyXs" fontWeight="medium">
                                          {variant.node.inventoryItem?.unitCost?.amount 
                                            ? `${currencySymbol}${variant.node.inventoryItem.unitCost.amount}` 
                                            : '—'}
                                        </Text>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </BlockStack>
                      </div>
                    )}
                  </div>
                );
              })}
            </BlockStack>
          </div>
        </Collapsible>
      </div>

      {/* Main Pricing Section */}
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <BlockStack gap="400">
          <Text variant="headingSm" as="h4">Price Settings</Text>
          
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
        </BlockStack>
      </div>

      {/* Advanced Pricing Options */}
      <div style={{
        padding: '16px',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <BlockStack gap="400">
          <Text variant="headingSm" as="h4">Advanced Options</Text>
          
          {/* Compare Price Section */}
          <BlockStack gap="200">
            <Checkbox
              label="Update compare at price (strikethrough price)"
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

        {/* Cost per Item and Unit Price Section - Side by Side */}
        <InlineStack gap="400" blockAlign="start">
          <div style={{ flex: 1 }}>
            <BlockStack gap="200">
              <Checkbox
                label="Update cost per item"
                checked={applyCostChanges}
                onChange={setApplyCostChanges}
              />

              {applyCostChanges && (
                <TextField
                  label="Cost per item"
                  type="number"
                  value={costValue}
                  onChange={setCostValue}
                  prefix={currencySymbol}
                  placeholder="0.00"
                  autoComplete="off"
                  helpText="The cost you pay to your supplier for this variant"
                />
              )}
            </BlockStack>
          </div>

          <div style={{ flex: 1 }}>
            <BlockStack gap="200">
              <Checkbox
                label="Update unit price (price per unit measurement)"
                checked={applyUnitPriceChanges}
                onChange={setApplyUnitPriceChanges}
              />

              {applyUnitPriceChanges && (
                <TextField
                  label="Unit price"
                  type="number"
                  value={unitPriceValue}
                  onChange={setUnitPriceValue}
                  prefix={currencySymbol}
                  placeholder="0.00"
                  autoComplete="off"
                  helpText="Price per unit of measurement (e.g., per kg, per lb)"
                />
              )}
            </BlockStack>
          </div>
        </InlineStack>

        {/* Charge Tax Section */}
        <InlineStack gap="300" blockAlign="center">
          <Text as="p" variant="bodyMd">
            Charge tax on this variant
          </Text>
          <Button
            onClick={() => {
              setApplyTaxChanges(true);
              setTaxable(!taxable);
            }}
            pressed={taxable}
            size="slim"
          >
            {taxable ? 'Yes' : 'No'}
          </Button>
        </InlineStack>
        </BlockStack>
      </div>

      {/* Apply Button */}
      <Button
        variant="primary"
        onClick={onApply}
        loading={isLoading}
        disabled={selectedCount === 0}
        size="large"
      >
        Apply All Price Changes
      </Button>
    </BlockStack>
  );
}
