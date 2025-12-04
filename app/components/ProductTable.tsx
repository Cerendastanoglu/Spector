import React from 'react';
import {
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Checkbox,
  Thumbnail,
  Icon,
} from '@shopify/polaris';
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ViewIcon,
  EditIcon,
  ImageIcon,
} from '@shopify/polaris-icons';

interface ProductVariant {
  id: string;
  title: string;
  inventoryQuantity: number;
  price: string;
  compareAtPrice?: string;
  sku?: string;
  inventoryItem?: {
    id: string;
    tracked: boolean;
  };
}

interface Product {
  id: string;
  title: string;
  handle: string;
  description?: string;
  featuredMedia?: {
    preview?: {
      image?: {
        url: string;
        altText?: string;
      };
    };
  };
  status: string;
  totalInventory: number;
  tags?: string[];
  collections?: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: ProductVariant;
    }>;
  };
}

interface ProductTableProps {
  products: Product[];
  selectedProducts: string[];
  selectedVariants: string[];
  expandedProducts: Set<string>;
  onProductSelect: (productId: string, checked: boolean) => void;
  onVariantSelect: (variantId: string, checked: boolean) => void;
  onExpandProduct: (productId: string) => void;
  onViewProduct: (product: Product) => void;
  onEditProduct: (product: Product) => void;
  onContinueToBulkEdit?: () => void;
  shopCurrency?: string;
  showVariantSelection?: boolean;
  totalCount?: number;
  showStatusExplanation?: boolean;
  statusColumnHeader?: string;
  statusColumnContent?: (product: Product) => React.ReactNode;
}

export function ProductTable({
  products,
  selectedProducts,
  selectedVariants,
  expandedProducts,
  onProductSelect,
  onVariantSelect,
  onExpandProduct,
  onViewProduct,
  onEditProduct,
  onContinueToBulkEdit,
  shopCurrency = '$',
  showVariantSelection = false,
  totalCount,
  showStatusExplanation = true,
  statusColumnHeader = "Status",
  statusColumnContent,
}: ProductTableProps) {
  
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return '#22c55e';
      case 'DRAFT':
        return '#f59e0b';
      case 'ARCHIVED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const StatusDot = ({ status }: { status: string }) => (
    <div style={{
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: getStatusColor(status),
      flexShrink: 0,
      marginRight: '8px'
    }} />
  );

  const getInventoryDot = (inventory: number) => {
    const getInventoryConfig = () => {
      if (inventory === 0) return { color: '#ef4444', label: 'Out of Stock' };
      if (inventory < 10) return { color: '#f59e0b', label: 'Low Stock' };
      if (inventory < 50) return { color: '#3b82f6', label: 'In Stock' };
      return { color: '#22c55e', label: 'Well Stocked' };
    };
    
    const { color } = getInventoryConfig();
    
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          boxShadow: `0 0 0 2px ${color}20`
        }} />
        <Text as="span" variant="bodySm">
          {inventory} units
        </Text>
      </div>
    );
  };

  const getProductSelectionState = (productId: string): 'none' | 'some' | 'all' => {
    if (!showVariantSelection) {
      return selectedProducts.includes(productId) ? 'all' : 'none';
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return 'none';
    
    const variantIds = product.variants.edges.map(v => v.node.id);
    const selectedVariantCount = variantIds.filter(id => selectedVariants.includes(id)).length;
    
    if (selectedVariantCount === 0) return 'none';
    if (selectedVariantCount === variantIds.length) return 'all';
    return 'some';
  };

  const handleBulkSelect = (productId: string, checked: boolean) => {
    // Always just call onProductSelect - it will handle variants atomically
    onProductSelect(productId, checked);
  };

  // Status legend component
  const StatusLegend = () => {
    if (!showStatusExplanation) return null;
    
    return (
      <div style={{ 
        marginBottom: '12px',
        padding: '8px 12px',
        backgroundColor: '#f9fafb',
        borderRadius: '6px',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: '6px',
          flexWrap: 'wrap'
        }}>
          <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium">
            Product Status:
          </Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
            }} />
            <Text as="span" variant="bodyXs" tone="subdued">Active</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
            }} />
            <Text as="span" variant="bodyXs" tone="subdued">Draft</Text>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#ef4444',
            }} />
            <Text as="span" variant="bodyXs" tone="subdued">Archived</Text>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <StatusLegend />
      <div 
        className="shared-product-table product-table-mobile"
        style={{ 
          width: '100%',
          maxWidth: '100%',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: '#fff'
        }}
      >
      <table style={{ 
        width: '100%', 
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        margin: 0
      }}>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ 
              width: '40%', 
              padding: '12px 16px', 
              textAlign: 'left', 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#6b7280', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Product
            </th>
            <th style={{ 
              width: '15%', 
              padding: '12px 16px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#6b7280', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              {statusColumnHeader}
            </th>
            <th style={{ 
              width: '15%', 
              padding: '12px 16px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#6b7280', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Inventory
            </th>
            <th style={{ 
              width: '15%', 
              padding: '12px 16px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#6b7280', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Price
            </th>
            <th style={{ 
              width: '15%', 
              padding: '12px 16px', 
              textAlign: 'center', 
              fontSize: '12px', 
              fontWeight: '500', 
              color: '#6b7280', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em' 
            }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => {
            const isExpanded = expandedProducts.has(product.id);
            const hasMultipleVariants = product.variants?.edges?.length > 1;
            const selectionState = getProductSelectionState(product.id);
            
            return (
              <React.Fragment key={product.id}>
                <tr 
                  style={{ 
                    borderBottom: '1px solid #e5e7eb'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {/* Product column */}
                  <td style={{ 
                    width: '40%', 
                    padding: '12px 16px', 
                    fontSize: '14px', 
                    color: '#111827', 
                    verticalAlign: 'middle' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ position: 'relative' }}>
                        <Checkbox
                          label=""
                          checked={selectionState !== 'none'}
                          onChange={(checked) => handleBulkSelect(product.id, checked)}
                        />
                        {selectionState === 'some' && (
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: '10px',
                            transform: 'translateY(-50%)',
                            width: '6px',
                            height: '2px',
                            backgroundColor: '#3b82f6',
                            borderRadius: '1px',
                            pointerEvents: 'none',
                            zIndex: 1
                          }} />
                        )}
                      </div>
                      
                      <StatusDot status={product.status} />
                      
                      {product.featuredMedia?.preview?.image ? (
                        <Thumbnail
                          source={product.featuredMedia.preview.image.url}
                          alt={product.featuredMedia.preview.image.altText || product.title}
                          size="small"
                        />
                      ) : (
                        <div style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: '#f3f4f6',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Icon source={ImageIcon} tone="subdued" />
                        </div>
                      )}
                      
                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="medium">
                          {product.title}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {product.handle}
                        </Text>
                      </div>
                    </div>
                  </td>
                  
                  {/* Status column */}
                  <td style={{ 
                    width: '15%', 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#111827', 
                    verticalAlign: 'middle' 
                  }}>
                    {statusColumnContent ? statusColumnContent(product) : null}
                  </td>
                  
                  {/* Inventory column */}
                  <td style={{ 
                    width: '15%', 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#111827', 
                    verticalAlign: 'middle' 
                  }}>
                    {getInventoryDot(product.totalInventory)}
                  </td>
                  
                  {/* Price column */}
                  <td style={{ 
                    width: '15%', 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#111827', 
                    verticalAlign: 'middle' 
                  }}>
                    {hasMultipleVariants ? (
                      <Text as="span" variant="bodySm">
                        {`${product.variants.edges.length} variants`}
                      </Text>
                    ) : (
                      <BlockStack gap="050">
                        <Text as="span" variant="bodySm" fontWeight="medium">
                          {`${shopCurrency}${product.variants?.edges?.[0]?.node?.price || '0.00'}`}
                        </Text>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          {product.variants?.edges?.[0]?.node?.compareAtPrice 
                            ? `Compare: ${shopCurrency}${product.variants.edges[0].node.compareAtPrice}`
                            : 'No compare at'}
                        </Text>
                      </BlockStack>
                    )}
                  </td>
                  
                  {/* Actions column */}
                  <td style={{ 
                    width: '15%', 
                    padding: '12px 16px', 
                    textAlign: 'center', 
                    fontSize: '14px', 
                    color: '#111827', 
                    verticalAlign: 'middle' 
                  }}>
                    <InlineStack gap="100">
                      <div onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="plain"
                          size="micro"
                          icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                          onClick={() => onExpandProduct(product.id)}
                          accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} details for ${product.title}`}
                        />
                      </div>
                      
                      <Button
                        variant="plain"
                        size="micro"
                        icon={ViewIcon}
                        onClick={() => onViewProduct(product)}
                        accessibilityLabel={`View ${product.title}`}
                      />
                      
                      <Button
                        variant="plain"
                        size="micro"
                        icon={EditIcon}
                        onClick={() => onEditProduct(product)}
                        accessibilityLabel={`Edit ${product.title}`}
                      />
                    </InlineStack>
                  </td>
                </tr>
                
                {/* Expanded details row */}
                {isExpanded && (
                  <tr>
                    <td 
                      colSpan={5} 
                      style={{ 
                        padding: '20px',
                        backgroundColor: '#fafafa',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <BlockStack gap="200">
                        {/* Product Info - Creative card layout */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          flexWrap: 'wrap'
                        }}>
                          {/* Handle Badge */}
                          <div style={{
                            padding: '8px 14px',
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderRadius: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: '#8b5cf6'
                            }} />
                            <Text as="span" variant="bodySm">
                              {product.handle}
                            </Text>
                          </div>
                          
                          {/* SKU Badge */}
                          {product.variants?.edges?.[0]?.node?.sku && (
                            <div style={{
                              padding: '8px 14px',
                              backgroundColor: '#fff',
                              border: '1px solid #e5e7eb',
                              borderRadius: '20px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <div style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: '#06b6d4'
                              }} />
                              <Text as="span" variant="bodySm">
                                SKU: {product.variants.edges.length > 1 
                                  ? `${product.variants.edges.length} variants` 
                                  : product.variants.edges[0].node.sku}
                              </Text>
                            </div>
                          )}
                          
                          {/* Tags */}
                          {product.tags && product.tags.length > 0 && product.tags.map((tag, index) => (
                            <div key={index} style={{
                              padding: '8px 14px',
                              backgroundColor: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              borderRadius: '20px'
                            }}>
                              <Text as="span" variant="bodySm" tone="subdued">
                                {tag}
                              </Text>
                            </div>
                          ))}
                          
                          {/* Collections */}
                          {product.collections?.edges && product.collections.edges.length > 0 && (
                            product.collections.edges.map((collection) => (
                              <div key={collection.node.id} style={{
                                padding: '8px 14px',
                                backgroundColor: '#ecfdf5',
                                border: '1px solid #a7f3d0',
                                borderRadius: '20px'
                              }}>
                                <Text as="span" variant="bodySm" tone="subdued">
                                  📁 {collection.node.title}
                                </Text>
                              </div>
                            ))
                          )}
                        </div>
                        
                        {/* Description - Elegant box */}
                        {product.description && (
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#fff',
                            border: '1px solid #e5e7eb',
                            borderLeft: '3px solid #8b5cf6',
                            borderRadius: '8px'
                          }}>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {product.description}
                            </Text>
                          </div>
                        )}
                        
                        {/* Variants section - Simplified table */}
                        <div style={{ 
                          paddingTop: '16px',
                          borderTop: '1px solid #e5e7eb'
                        }}>
                          <div style={{ marginBottom: '12px' }}>
                            <InlineStack gap="200" align="space-between">
                              <Text as="span" variant="bodyXs" tone="subdued" fontWeight="semibold">
                                VARIANTS ({product.variants.edges.length})
                              </Text>
                            </InlineStack>
                          </div>
                          
                          <div style={{ 
                            backgroundColor: '#fff',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '1px solid #e5e7eb'
                          }}>
                            {product.variants.edges.map((variant, index) => {
                              const isVariantSelected = showVariantSelection && selectedVariants.includes(variant.node.id);
                              
                              return (
                                <div 
                                  key={variant.node.id}
                                  style={{
                                    padding: '12px 16px',
                                    backgroundColor: isVariantSelected ? '#f0f9ff' : 'transparent',
                                    borderBottom: index < product.variants.edges.length - 1 ? '1px solid #f0f0f0' : 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: '16px'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                    {showVariantSelection && (
                                      <Checkbox
                                        checked={isVariantSelected}
                                        onChange={(checked) => onVariantSelect(variant.node.id, checked)}
                                        label=""
                                      />
                                    )}
                                    <div>
                                      <Text as="span" variant="bodySm" fontWeight="medium">
                                        {variant.node.title}
                                      </Text>
                                      {variant.node.sku && (
                                        <Text as="p" variant="bodyXs" tone="subdued">
                                          SKU: {variant.node.sku}
                                        </Text>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <InlineStack gap="300" align="end">
                                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                                      <Text as="p" variant="bodyXs" tone="subdued">Stock</Text>
                                      <Text as="p" variant="bodySm" fontWeight="medium">
                                        {variant.node.inventoryQuantity}
                                      </Text>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: '70px' }}>
                                      <Text as="p" variant="bodyXs" tone="subdued">Price</Text>
                                      <Text as="p" variant="bodySm" fontWeight="medium">
                                        {shopCurrency}{variant.node.price}
                                      </Text>
                                    </div>
                                  </InlineStack>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </BlockStack>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {products.length === 0 && (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <Text as="p" variant="bodyMd" tone="subdued">
            No products found
          </Text>
        </div>
      )}
      
      {/* Product count display */}
      {products.length > 0 && (
        <div style={{ 
          padding: '12px 16px', 
          borderTop: '1px solid #e5e7eb',
          backgroundColor: '#f9fafb',
        }}>
          <InlineStack align="space-between" blockAlign="center">
            <Text as="p" variant="bodyXs" tone="subdued">
              Showing {products.length}{totalCount ? ` of ${totalCount}` : ''} products
            </Text>
            {onContinueToBulkEdit && (selectedProducts.length > 0 || selectedVariants.length > 0) && (
              <Button 
                variant="primary" 
                onClick={onContinueToBulkEdit}
                size="medium"
              >
                {`Go to Step 2 (${selectedProducts.length > 0 ? selectedProducts.length : selectedVariants.length} selected)`}
              </Button>
            )}
          </InlineStack>
        </div>
      )}
    </div>
    </div>
  );
}