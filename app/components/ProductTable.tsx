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
  shopCurrency?: string;
  showVariantSelection?: boolean;
  totalCount?: number;
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
  shopCurrency = '$',
  showVariantSelection = false,
  totalCount,
}: ProductTableProps) {
  
  const getStatusDot = (status: string) => {
    const getStatusConfig = () => {
      switch (status.toUpperCase()) {
        case 'ACTIVE':
          return { color: '#22c55e', label: 'Active' };
        case 'DRAFT':
          return { color: '#f59e0b', label: 'Draft' };
        case 'ARCHIVED':
          return { color: '#ef4444', label: 'Archived' };
        default:
          return { color: '#6b7280', label: status };
      }
    };
    
    const { color, label } = getStatusConfig();
    
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
          {label}
        </Text>
      </div>
    );
  };

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
    if (!showVariantSelection) {
      onProductSelect(productId, checked);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (!product) return;
    
    const variantIds = product.variants.edges.map(v => v.node.id);
    
    if (checked) {
      // Select all variants of this product
      variantIds.forEach(variantId => {
        if (!selectedVariants.includes(variantId)) {
          onVariantSelect(variantId, true);
        }
      });
      // Also select the product
      if (!selectedProducts.includes(productId)) {
        onProductSelect(productId, true);
      }
    } else {
      // Deselect all variants of this product
      variantIds.forEach(variantId => {
        if (selectedVariants.includes(variantId)) {
          onVariantSelect(variantId, false);
        }
      });
      // Also deselect the product
      if (selectedProducts.includes(productId)) {
        onProductSelect(productId, false);
      }
    }
  };

  return (
    <div 
      className="shared-product-table"
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
              Status
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
                    {getStatusDot(product.status)}
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
                    <Text as="span" variant="bodySm">
                      {hasMultipleVariants 
                        ? `${product.variants.edges.length} variants` 
                        : `${shopCurrency}${product.variants?.edges?.[0]?.node?.price || '0.00'}`
                      }
                    </Text>
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
                      <Button
                        variant="plain"
                        size="micro"
                        icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                        onClick={() => onExpandProduct(product.id)}
                        accessibilityLabel={`${isExpanded ? 'Hide' : 'Show'} details for ${product.title}`}
                      />
                      
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
                        padding: '16px',
                        backgroundColor: '#f8fafc',
                        borderBottom: '1px solid #e5e7eb'
                      }}
                    >
                      <BlockStack gap="400">
                        {/* Product metadata - Improved alignment */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '24px',
                          padding: '8px 0'
                        }}>
                          {/* Handle Section */}
                          <div style={{ minWidth: '120px' }}>
                            <BlockStack gap="150">
                              <Text as="h4" variant="headingXs" fontWeight="semibold" tone="base">
                                Handle
                              </Text>
                              <div style={{
                                padding: '6px 8px',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb'
                              }}>
                                <Text as="span" variant="bodyXs" fontWeight="medium" tone="base">
                                  {product.handle}
                                </Text>
                              </div>
                            </BlockStack>
                          </div>
                          
                          {/* Tags Section */}
                          <div style={{ minWidth: '120px' }}>
                            <BlockStack gap="150">
                              <Text as="h4" variant="headingXs" fontWeight="semibold" tone="base">
                                Tags
                              </Text>
                              <div style={{
                                padding: '6px 8px',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                minHeight: '28px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                {product.tags && product.tags.length > 0 ? (
                                  <InlineStack gap="100" wrap={false}>
                                    {product.tags.slice(0, 2).map((tag, index) => (
                                      <Badge key={index} size="small" tone="info">{tag}</Badge>
                                    ))}
                                    {product.tags.length > 2 && (
                                      <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium">
                                        +{product.tags.length - 2}
                                      </Text>
                                    )}
                                  </InlineStack>
                                ) : (
                                  <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium">
                                    No tags
                                  </Text>
                                )}
                              </div>
                            </BlockStack>
                          </div>
                          
                          {/* Collections Section */}
                          <div style={{ minWidth: '120px' }}>
                            <BlockStack gap="150">
                              <Text as="h4" variant="headingXs" fontWeight="semibold" tone="base">
                                Collections
                              </Text>
                              <div style={{
                                padding: '6px 8px',
                                backgroundColor: '#ffffff',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb',
                                minHeight: '28px',
                                display: 'flex',
                                alignItems: 'center'
                              }}>
                                {product.collections?.edges && product.collections.edges.length > 0 ? (
                                  <InlineStack gap="100" wrap={false}>
                                    {product.collections.edges.slice(0, 1).map((collection) => (
                                      <Badge key={collection.node.id} size="small" tone="success">
                                        {collection.node.title}
                                      </Badge>
                                    ))}
                                    {product.collections.edges.length > 1 && (
                                      <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium">
                                        +{product.collections.edges.length - 1}
                                      </Text>
                                    )}
                                  </InlineStack>
                                ) : (
                                  <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium">
                                    No collections
                                  </Text>
                                )}
                              </div>
                            </BlockStack>
                          </div>
                        </div>
                        
                        {/* Variants section */}
                        <div>
                          <InlineStack gap="200" align="space-between">
                            <Text as="h4" variant="headingXs" fontWeight="medium">Variants</Text>
                            {product.variants.edges.length > 1 && (
                              <Badge size="small">{`${product.variants.edges.length} total`}</Badge>
                            )}
                          </InlineStack>
                          
                          <div style={{ marginTop: '8px' }}>
                            <BlockStack gap="200">
                              {product.variants.edges.map((variant) => {
                                const isVariantSelected = showVariantSelection && selectedVariants.includes(variant.node.id);
                                
                                return (
                                  <div 
                                    key={variant.node.id}
                                    style={{
                                      padding: '12px',
                                      backgroundColor: isVariantSelected ? '#f0f9ff' : '#fff',
                                      border: '1px solid #e5e7eb',
                                      borderRadius: '6px',
                                      borderLeft: isVariantSelected ? '3px solid #3b82f6' : '3px solid #e5e7eb'
                                    }}
                                  >
                                    <InlineStack gap="400" align="space-between">
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {showVariantSelection && (
                                          <Checkbox
                                            checked={isVariantSelected}
                                            onChange={(checked) => onVariantSelect(variant.node.id, checked)}
                                            label=""
                                          />
                                        )}
                                        <Text as="span" variant="bodySm" fontWeight="medium">
                                          {variant.node.title}
                                        </Text>
                                        {variant.node.sku && (
                                          <Badge size="small" tone="info">
                                            {`SKU: ${variant.node.sku}`}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      <InlineStack gap="400">
                                        <div style={{ textAlign: 'center' }}>
                                          <Text as="p" variant="bodyXs" tone="subdued">Inventory</Text>
                                          <Text as="p" variant="bodySm" fontWeight="medium">
                                            {variant.node.inventoryQuantity}
                                          </Text>
                                        </div>
                                        <div style={{ textAlign: 'center' }}>
                                          <Text as="p" variant="bodyXs" tone="subdued">Price</Text>
                                          <Text as="p" variant="bodySm" fontWeight="medium">
                                            {shopCurrency}{variant.node.price}
                                          </Text>
                                        </div>
                                      </InlineStack>
                                    </InlineStack>
                                  </div>
                                );
                              })}
                            </BlockStack>
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
          textAlign: 'center'
        }}>
          <Text as="p" variant="bodyXs" tone="subdued">
            Showing {products.length}{totalCount ? ` of ${totalCount}` : ''} products
          </Text>
        </div>
      )}
    </div>
  );
}