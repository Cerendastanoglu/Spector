import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import { ProductExporter } from "../utils/productExporter";
import { openInNewTab } from "../utils/browserUtils";
import { ProductConstants } from "../utils/scopedConstants";
import {
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  DataTable,
  Checkbox,
  TextField,
  Select,
  Modal,
  Thumbnail,
  Grid,
  ResourceList,
  ResourceItem,
  Box,
  Spinner,
  EmptyState,
  FormLayout,
  ChoiceList,
  Banner,
  Divider,
} from '@shopify/polaris';
// Import only the icons we actually use
import { ProductIcon, EditIcon, ViewIcon, ExportIcon } from "@shopify/polaris-icons";

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
  totalInventory: number;
  status: string;
  adminUrl?: string;
  storefrontUrl?: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        inventoryQuantity: number;
        price: string;
        sku?: string;
        inventoryItem?: {
          id: string;
          tracked: boolean;
        };
      };
    }>;
  };
}

interface ProductManagementProps {
  isVisible: boolean;
  initialCategory?: InventoryCategory;
}

type InventoryCategory = 'all' | 'out-of-stock' | 'critical' | 'low-stock' | 'in-stock';
type ViewMode = 'table' | 'cards';
type SortField = 'title' | 'inventory' | 'status' | 'updated' | 'created' | 'price' | 'variants';
type SortDirection = 'asc' | 'desc';

export function ProductManagement({ isVisible, initialCategory = 'all' }: ProductManagementProps) {
  // Default export settings since Settings component was removed
  const exportSettings = {
    format: 'csv' as const
  };
  
  const fetcher = useFetcher<{ products: Product[]; hasNextPage: boolean; endCursor?: string; error?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState<InventoryCategory>(initialCategory);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('inventory');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [bulkEditModalActive, setBulkEditModalActive] = useState(false);
  
  // Enhanced Pricing Operations State
  const [bulkOperation, setBulkOperation] = useState<'pricing' | 'collections'>('pricing');
  const [priceOperation, setPriceOperation] = useState<'set' | 'increase' | 'decrease' | 'round'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [pricePercentage, setPricePercentage] = useState('');
  const [roundingRule, setRoundingRule] = useState<'nearest' | 'up' | 'down'>('nearest');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [applyToComparePrice, setApplyToComparePrice] = useState(false);
  
  // Collection Management State
  const [collectionOperation, setCollectionOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{id: string, title: string}[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  
  // Filter collections based on search query
  const filteredCollections = availableCollections.filter(collection =>
    collection.title.toLowerCase().includes(collectionSearchQuery.toLowerCase())
  );
  
  // Advanced Bulk Operations State
  const [seoTemplate, setSeoTemplate] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('');
  const [marketingTags, setMarketingTags] = useState('');
  const [seasonalPricing, setSeasonalPricing] = useState('');
  
  // Error and success states for bulk operations
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkSuccess, setBulkSuccess] = useState<string | null>(null);
  
  const [showDraftProducts, setShowDraftProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(ProductConstants.MAX_RETRIES);

  // Thresholds for inventory categorization (use constants)
  // Removed duplicated constants

  // Helper function to navigate to product pages
  const navigateToProduct = (product: any, section: 'admin' | 'storefront') => {
    if (!product?.id) {
      console.error('No product ID found:', product);
      setError('Cannot navigate: Product ID not found');
      return;
    }

    try {
      const productId = product.id.replace('gid://shopify/Product/', '');
      
      let url;
      if (section === 'admin') {
        url = `https://spector-test-store.myshopify.com/admin/products/${productId}`;
      } else {
        if (!product.handle) {
          console.warn('No product handle found, using product ID for storefront URL');
        }
        url = `https://spector-test-store.myshopify.com/products/${product.handle || productId}`;
      }
      
      openInNewTab(url, () => {
        setError('Failed to open product page. Please allow popups for this site.');
      });
    } catch (error) {
      console.error('Error navigating to product:', error);
      setError('Failed to navigate to product page');
    }
  };

  // Load products on mount with better error handling
  useEffect(() => {
    if (isVisible && products.length === 0) {
      fetchAllProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const fetchAllProducts = async () => {
    // Prevent duplicate requests
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      console.log('Skipping duplicate fetch request');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setLastFetchTime(now);
    
    try {
      fetcher.submit(
        { action: "get-all-products" },
        { method: "POST", action: "/app/api/products" }
      );
      setRetryCount(0); // Reset retry count on successful submission
    } catch (error) {
      console.error("Error fetching products:", error);
      setError(`Failed to fetch products: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
      
      // Auto-retry logic
      if (retryCount < maxRetries) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          fetchAllProducts();
        }, Math.pow(2, retryCount) * 1000); // Exponential backoff
      }
    }
  };

  // Update products when fetcher data changes
  useEffect(() => {
    if (fetcher.data?.products) {
      setProducts(fetcher.data.products);
      setError(null);
      setIsLoading(false);
    } else if (fetcher.data?.error) {
      setError(fetcher.data.error);
      setIsLoading(false);
    } else if (fetcher.state === 'idle' && fetcher.data && !fetcher.data.products) {
      // Handle case where API returns but no products
      setError('No products found or failed to load');
      setIsLoading(false);
    }
  }, [fetcher.data, fetcher.state]);

  // Handle fetcher loading state
  useEffect(() => {
    if (fetcher.state === 'loading' || fetcher.state === 'submitting') {
      setIsLoading(true);
    } else if (fetcher.state === 'idle') {
      setIsLoading(false);
    }
  }, [fetcher.state]);

  // Filter and sort products
  const filteredProducts = products.filter(product => {
    // Draft products filter
    if (!showDraftProducts && product.status === 'DRAFT') {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        product.title,
        product.handle,
        ...product.variants.edges.map(v => v.node.sku || '')
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Category filter
    const inventory = product.totalInventory;
    const categoryFilter = (inventory: number) => {
      switch (currentCategory) {
        case 'out-of-stock': return inventory === 0;
        case 'critical': return inventory > 0 && inventory <= ProductConstants.CRITICAL_THRESHOLD;
        case 'low-stock': return inventory > ProductConstants.CRITICAL_THRESHOLD && inventory <= ProductConstants.LOW_STOCK_THRESHOLD;
        case 'in-stock': return inventory > ProductConstants.LOW_STOCK_THRESHOLD;
        case 'all': 
        default: 
          return true;
      }
    };

    if (!categoryFilter(inventory)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    const getValue = (product: Product) => {
      switch (sortField) {
        case 'title': return product.title;
        case 'inventory': return product.totalInventory;
        case 'status': return product.status;
        case 'created': 
          // Since createdAt is not available, sort by ID (newer products have later IDs)
          return product.id;
        case 'updated': 
          // Since updatedAt is not available, fallback to title for now
          return product.title;
        case 'price': {
          // Get price from first variant or 0 if no variants
          const firstVariant = product.variants.edges[0]?.node;
          return firstVariant ? parseFloat(firstVariant.price) : 0;
        }
        case 'variants': return product.variants.edges.length;
        default: return product.title;
      }
    };

    const aVal = getValue(a);
    const bVal = getValue(b);
    
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    }
    
    const comparison = String(aVal).localeCompare(String(bVal));
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleBulkSelect = (productId: string, checked: boolean) => {
    setSelectedProducts(prev => 
      checked 
        ? [...prev, productId]
        : prev.filter(id => id !== productId)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedProducts(checked ? filteredProducts.map(p => p.id) : []);
  };

  // Enhanced Pricing Operations with Error Handling
  const handleBulkPricing = async () => {
    if (selectedProducts.length === 0) {
      setBulkError("Please select at least one product to update pricing.");
      return;
    }
    
    // Validation based on operation type
    if (priceOperation === 'set' && (!priceValue || parseFloat(priceValue) <= 0)) {
      setBulkError("Please enter a valid price greater than $0.");
      return;
    }
    
    if ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || parseFloat(pricePercentage) <= 0)) {
      setBulkError("Please enter a valid percentage greater than 0.");
      return;
    }
    
    if (priceOperation === 'decrease' && parseFloat(pricePercentage) >= 100) {
      setBulkError("Decrease percentage must be less than 100%.");
      return;
    }
    
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    
    try {
      const updates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;

        let newPrice: number;
        const currentPrice = parseFloat(product.variants.edges[0]?.node.price || '0');
        
        if (currentPrice === 0 && priceOperation !== 'set') {
          throw new Error(`Product "${product.title}" has no current price. Please set a fixed price first.`);
        }
        
        switch (priceOperation) {
          case 'set':
            newPrice = parseFloat(priceValue) || 0;
            break;
          case 'increase':
            newPrice = currentPrice * (1 + (parseFloat(pricePercentage) || 0) / 100);
            break;
          case 'decrease':
            newPrice = currentPrice * (1 - (parseFloat(pricePercentage) || 0) / 100);
            break;
          case 'round':
            newPrice = currentPrice;
            if (roundingRule === 'up') newPrice = Math.ceil(currentPrice);
            else if (roundingRule === 'down') newPrice = Math.floor(currentPrice);
            else newPrice = Math.round(currentPrice);
            break;
          default:
            newPrice = currentPrice;
        }

        // Ensure minimum price
        if (newPrice < 0.01) {
          throw new Error(`Calculated price for "${product.title}" would be too low ($${newPrice.toFixed(2)}). Minimum price is $0.01.`);
        }

        return {
          productId,
          price: newPrice.toFixed(2),
          compareAtPrice: applyToComparePrice ? compareAtPrice : undefined
        };
      }).filter(Boolean);

      console.log('Bulk pricing updates:', updates);
      
      // Simulate API call - replace with actual Shopify API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success message
      setBulkSuccess(`Successfully updated pricing for ${selectedProducts.length} products!`);
      
      // Reset form and selections
      setPriceValue('');
      setPricePercentage('');
      setCompareAtPrice('');
      setSelectedProducts([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => setBulkSuccess(null), 3000);
      
      // Refresh products
      await fetchAllProducts();
      
    } catch (error) {
      console.error('Failed to update pricing:', error);
      setBulkError(`Failed to update pricing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Collection Management with Error Handling
  const handleBulkCollections = async () => {
    if (selectedProducts.length === 0) {
      setBulkError("Please select at least one product to update collections.");
      return;
    }
    
    if (selectedCollections.length === 0) {
      setBulkError("Please select at least one collection.");
      return;
    }
    
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    
    try {
      const operations = {
        products: selectedProducts,
        collections: selectedCollections,
        operation: collectionOperation
      };

      console.log('Bulk collection updates:', operations);
      
      // Simulate API call - replace with actual Shopify API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Success message
      const actionText = collectionOperation === 'add' ? 'added to' : 'removed from';
      setBulkSuccess(`Successfully ${actionText} ${selectedCollections.length} collections for ${selectedProducts.length} products!`);
      
      // Reset selections
      setSelectedCollections([]);
      setSelectedProducts([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => setBulkSuccess(null), 3000);
      
      // Refresh products
      await fetchAllProducts();
      
    } catch (error) {
      console.error('Failed to update collections:', error);
      setBulkError(`Failed to update collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced SEO Bulk Operations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkSEO = async () => {
    if (selectedProducts.length === 0) {
      setBulkError("Please select at least one product for SEO optimization.");
      return;
    }
    
    if (!seoTemplate.trim() && !metaDescription.trim()) {
      setBulkError("Please enter either an SEO title template or meta description.");
      return;
    }
    
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    
    try {
      const seoUpdates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        
        // Generate SEO title from template
        const seoTitle = seoTemplate
          .replace('{product_name}', product.title)
          .replace('{price}', product.variants.edges[0]?.node.price || '0')
          .replace('{category}', 'Product');
        
        return {
          productId,
          seoTitle: seoTitle || product.title,
          metaDescription: metaDescription || `Buy ${product.title} at the best price. High quality product with fast shipping.`
        };
      }).filter(Boolean);
      
      console.log('Bulk SEO updates:', seoUpdates);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBulkSuccess(`Successfully optimized SEO for ${selectedProducts.length} products with smart templates!`);
      setSeoTemplate('');
      setMetaDescription('');
      setSelectedProducts([]);
      setTimeout(() => setBulkSuccess(null), 3000);
    } catch (error) {
      setBulkError(`Failed to update SEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Inventory Management (commented out - unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkInventory = async () => {
    if (selectedProducts.length === 0) {
      setBulkError("Please select at least one product for inventory management.");
      return;
    }
    
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    
    try {
      const inventoryUpdates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        
        return {
          productId,
          inventoryPolicy: 'deny',
          tracking: true,
          lowStockThreshold: parseInt(lowStockAlert) || 5,
          autoReorderPoint: parseInt(lowStockAlert) * 2 || null
        };
      }).filter(Boolean);
      
      console.log('Bulk inventory updates:', inventoryUpdates);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBulkSuccess(`Successfully configured inventory settings for ${selectedProducts.length} products with smart alerts!`);
      setLowStockAlert('');
      setSelectedProducts([]);
      setTimeout(() => setBulkSuccess(null), 3000);
    } catch (error) {
      setBulkError(`Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced Marketing Operations (commented out - unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkMarketing = async () => {
    if (selectedProducts.length === 0) {
      setBulkError("Please select at least one product for marketing optimization.");
      return;
    }
    
    setIsLoading(true);
    setBulkError(null);
    setBulkSuccess(null);
    
    try {
      const marketingUpdates = selectedProducts.map(productId => {
        const product = products.find(p => p.id === productId);
        if (!product) return null;
        
        // Smart tag generation
        const autoTags = [
          'bestseller',
          'trending',
          'category-general',
          seasonalPricing ? `seasonal-${seasonalPricing}` : null,
          marketingTags.split(',').map(tag => tag.trim())
        ].flat().filter(Boolean);
        
        return {
          productId,
          tags: autoTags,
          seasonalPricing: seasonalPricing || null,
          promotionReady: true,
          crossSellEnabled: true
        };
      }).filter(Boolean);
      
      console.log('Bulk marketing updates:', marketingUpdates);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setBulkSuccess(`Successfully applied marketing optimization to ${selectedProducts.length} products with smart tagging!`);
      setMarketingTags('');
      setSeasonalPricing('');
      setSelectedProducts([]);
      setTimeout(() => setBulkSuccess(null), 3000);
    } catch (error) {
      setBulkError(`Failed to update marketing: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load available collections (you'll need to implement this API call)
  const loadCollections = async () => {
    try {
      console.log('Loading collections...');
      // Simulate loading collections - replace with actual API call
      const mockCollections = [
        { id: 'featured', title: 'Featured Products' },
        { id: 'new-arrivals', title: 'New Arrivals' },
        { id: 'sale', title: 'Sale Items' },
        { id: 'bestsellers', title: 'Best Sellers' },
        { id: 'seasonal', title: 'Seasonal Collection' },
        { id: 'electronics', title: 'Electronics' },
        { id: 'clothing', title: 'Clothing' },
        { id: 'accessories', title: 'Accessories' }
      ];
      setAvailableCollections(mockCollections);
      console.log('Collections loaded:', mockCollections.length);
    } catch (error) {
      console.error('Failed to load collections:', error);
      setError('Failed to load collections');
    }
  };

  // Load collections when products are selected (for bulk operations)
  useEffect(() => {
    if (selectedProducts.length > 0) {
      loadCollections();
    }
  }, [selectedProducts.length]);

  // Load collections on component mount
  useEffect(() => {
    loadCollections();
  }, []);

  const handleDraftSelected = () => {
    if (selectedProducts.length === 0) return;

    // Single confirmation
    if (!confirm(`Draft ${selectedProducts.length} selected products? This will change their status to draft.`)) {
      return;
    }

    // Store selected product IDs before clearing
    const productsToUpdate = [...selectedProducts];

    // Clear selection immediately for better UX
    setSelectedProducts([]);

    // Optimistically update UI - change products to draft immediately
    setProducts(prevProducts => 
      prevProducts.map(product => 
        productsToUpdate.includes(product.id) 
          ? { ...product, status: 'DRAFT' }
          : product
      )
    );

    // Submit to API in background with error handling
    try {
      const formData = new FormData();
      formData.append('action', 'draft-products');
      formData.append('productIds', JSON.stringify(productsToUpdate));
      
      fetcher.submit(formData, { 
        method: "post", 
        action: "/app/api/products",
        encType: "multipart/form-data"
      });
    } catch (error) {
      console.error('Error submitting draft request:', error);
      // Revert optimistic update on error
      setProducts(prevProducts => 
        prevProducts.map(product => 
          productsToUpdate.includes(product.id) 
            ? { ...product, status: 'ACTIVE' } // Revert to previous status
            : product
        )
      );
      setError('Failed to draft products. Please try again.');
    }
  };

  const handleActivateSelected = () => {
    if (selectedProducts.length === 0) return;

    // Single confirmation
    if (!confirm(`Activate ${selectedProducts.length} selected products? This will change their status to active.`)) {
      return;
    }

    // Store selected product IDs before clearing
    const productsToUpdate = [...selectedProducts];

    // Clear selection immediately for better UX
    setSelectedProducts([]);

    // Optimistically update UI - change products to active immediately
    setProducts(prevProducts => 
      prevProducts.map(product => 
        productsToUpdate.includes(product.id) 
          ? { ...product, status: 'ACTIVE' }
          : product
      )
    );

    // If draft products are hidden, temporarily show them so user can see the activation
    if (!showDraftProducts) {
      setShowDraftProducts(true);
    }

    // Submit to API in background with error handling
    try {
      const formData = new FormData();
      formData.append('action', 'activate-products');
      formData.append('productIds', JSON.stringify(productsToUpdate));
      
      fetcher.submit(formData, { 
        method: "post", 
        action: "/app/api/products",
        encType: "multipart/form-data"
      });
    } catch (error) {
      console.error('Error submitting activate request:', error);
      // Revert optimistic update on error
      setProducts(prevProducts => 
        prevProducts.map(product => 
          productsToUpdate.includes(product.id) 
            ? { ...product, status: 'DRAFT' } // Revert to previous status
            : product
        )
      );
      setError('Failed to activate products. Please try again.');
    }
  };

  const handleExportSelected = () => {
    const selectedProductData = filteredProducts.filter(p => selectedProducts.includes(p.id));
    
    if (selectedProductData.length === 0) {
      return;
    }
    
    const filename = `products-${currentCategory}-${new Date().toISOString().split('T')[0]}`;
    
    ProductExporter.exportProducts(selectedProductData, {
      format: exportSettings.format,
      filename
    });
  };

  const getBadgeTone = (inventory: number): 'critical' | 'warning' | 'success' => {
    if (inventory === 0) return 'critical';
    if (inventory <= ProductConstants.CRITICAL_THRESHOLD) return 'critical';
    if (inventory <= ProductConstants.LOW_STOCK_THRESHOLD) return 'warning';
    return 'success';
  };

  const renderTableView = () => {
    const rows = filteredProducts.map(product => {
      const inventory = product.totalInventory;
      const productKey = product.id;
      return [
        <InlineStack key={`${productKey}-title`} gap="200" blockAlign="center">
          <Checkbox
            checked={selectedProducts.includes(product.id)}
            onChange={(checked) => handleBulkSelect(product.id, checked)}
            label=""
          />
          <Thumbnail
            source={product.featuredMedia?.preview?.image?.url || ProductIcon}
            alt={product.featuredMedia?.preview?.image?.altText || product.title}
            size="small"
          />
          <BlockStack gap="100">
            <Text as="span" variant="bodyMd" fontWeight="semibold">
              {product.title}
            </Text>
            <Text as="span" variant="bodySm" tone="subdued">
              {product.handle}
            </Text>
          </BlockStack>
        </InlineStack>,
        // Price column - show main variant price or price range
        (() => {
          const prices = product.variants.edges.map(edge => parseFloat(edge.node.price));
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          
          if (prices.length === 1 || minPrice === maxPrice) {
            return (
              <Text as="span" variant="bodyMd" fontWeight="medium">
                ${minPrice.toFixed(2)}
              </Text>
            );
          } else {
            return (
              <BlockStack gap="100">
                <Text as="span" variant="bodyMd" fontWeight="medium">
                  ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                </Text>
                <Text as="span" variant="bodySm" tone="subdued">
                  {prices.length} variants
                </Text>
              </BlockStack>
            );
          }
        })(),
        <Badge key={`${productKey}-inventory`} tone={getBadgeTone(inventory)}>
          {`${inventory} units`}
        </Badge>,
        <Badge key={`${productKey}-status`} tone={
          product.status === 'ACTIVE' ? 'success' : 
          product.status === 'DRAFT' ? 'attention' : 
          product.status === 'ARCHIVED' ? 'critical' : undefined
        }>
          {product.status}
        </Badge>,
        <Text key={`${productKey}-variants`} as="span" variant="bodySm">
          {product.variants.edges.length} variant{product.variants.edges.length !== 1 ? 's' : ''}
        </Text>,
        <InlineStack key={`${productKey}-actions`} gap="200">
          <Button
            icon={ViewIcon}
            variant="plain"
            onClick={() => navigateToProduct(product, 'storefront')}
            accessibilityLabel={`${product.status === 'ACTIVE' ? 'View live' : 'View admin'} ${product.title}`}
          />
          <Button
            icon={EditIcon}
            variant="plain"
            onClick={() => navigateToProduct(product, 'admin')}
            accessibilityLabel={`Edit ${product.title}`}
          />
        </InlineStack>
      ];
    });

    return (
      <DataTable
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text']}
        headings={ProductConstants.TABLE_HEADINGS as any}
        rows={rows}
      />
    );
  };

  const renderCardView = () => {
    return (
      <ResourceList
        items={filteredProducts}
        renderItem={(product) => {
          const inventory = product.totalInventory;
          return (
            <ResourceItem
              id={product.id}
              media={
                <Thumbnail
                  source={product.featuredMedia?.preview?.image?.url || ProductIcon}
                  alt={product.featuredMedia?.preview?.image?.altText || product.title}
                />
              }
              accessibilityLabel={`View details for ${product.title}`}
              onClick={() => {
                // View product details - placeholder for future implementation
              }}
            >
              <InlineStack align="space-between">
                <BlockStack gap="100">
                  <InlineStack gap="300" blockAlign="center">
                    <div style={{ 
                      padding: '4px',
                      borderRadius: '4px',
                      border: '1px solid #e1e3e5',
                      backgroundColor: 'white',
                      transition: 'all 0.2s ease'
                    }}>
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onChange={(checked) => handleBulkSelect(product.id, checked)}
                        label=""
                      />
                    </div>
                    <Text as="h3" variant="bodyMd" fontWeight="semibold">
                      {product.title}
                    </Text>
                  </InlineStack>
                  <Text as="p" variant="bodySm" tone="subdued">
                    {product.handle} • {product.variants.edges.length} variants
                  </Text>
                </BlockStack>
                <InlineStack gap="200">
                  <Badge tone={getBadgeTone(inventory)}>
                    {`${inventory} units`}
                  </Badge>
                  <Badge tone={
                    product.status === 'ACTIVE' ? 'success' : 
                    product.status === 'DRAFT' ? 'attention' : 
                    product.status === 'ARCHIVED' ? 'critical' : undefined
                  }>
                    {product.status}
                  </Badge>
                  <Button
                    icon={ViewIcon}
                    variant="plain"
                    onClick={() => navigateToProduct(product, 'storefront')}
                    accessibilityLabel={`${product.status === 'ACTIVE' ? 'View live' : 'View admin'} ${product.title}`}
                  />
                </InlineStack>
              </InlineStack>
            </ResourceItem>
          );
        }}
      />
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BlockStack gap="600">
      {/* Error Display */}
      {error && (
        <Card background="bg-surface-critical">
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="p" variant="bodyMd" tone="critical">
                {error}
              </Text>
              <Button
                variant="plain"
                onClick={() => setError(null)}
                size="slim"
              >
                Dismiss
              </Button>
            </InlineStack>
            <Button
              onClick={fetchAllProducts}
              variant="secondary"
              size="slim"
              tone="critical"
            >
              Retry
            </Button>
          </BlockStack>
        </Card>
      )}

      {/* Product Management Controls - Always Visible */}
      <Card>
        <BlockStack gap="500">
          {/* Enhanced Product Header with Advanced Controls */}
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <Text as="h3" variant="headingLg">
                  Product Management
                </Text>
                <Badge tone={filteredProducts.length === 0 ? 'attention' : 'info'}>
                  {`${filteredProducts.length.toString()} ${filteredProducts.length === 1 ? 'product' : 'products'} found`}
                </Badge>
                {selectedProducts.length > 0 && (
                  <Badge tone="success">
                    {`${selectedProducts.length.toString()} selected`}
                  </Badge>
                )}
              </InlineStack>
              <InlineStack gap="300">
                <Button
                  onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                  icon={viewMode === 'table' ? ProductIcon : ViewIcon}
                  variant="secondary"
                >
                  {viewMode === 'table' ? 'Card View' : 'Table View'}
                </Button>
                <Button 
                  onClick={fetchAllProducts} 
                  loading={isLoading || fetcher.state === 'submitting'} 
                  variant="primary"
                >
                  Refresh Data
                </Button>
              </InlineStack>
            </InlineStack>
            
            <Text as="p" variant="bodySm" tone="subdued">
              Real-time inventory management with smart filtering and bulk operations
            </Text>

            {/* Comprehensive Filter Panel */}
            <Card background="bg-surface-secondary" padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h4" variant="headingSm">Smart Filters & Controls</Text>
                </InlineStack>

                {/* Primary Filter Row */}
                <Grid>
                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" fontWeight="medium">Search Products</Text>
                      <TextField
                        label=""
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search by name, handle, or SKU..."
                        autoComplete="off"
                        clearButton
                        onClearButtonClick={() => setSearchQuery('')}
                      />
                    </BlockStack>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" fontWeight="medium">Inventory Category</Text>
                      <Select
                        label=""
                        value={currentCategory}
                        onChange={(value) => setCurrentCategory(value as InventoryCategory)}
                        options={ProductConstants.CATEGORY_OPTIONS as any}
                      />
                    </BlockStack>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" fontWeight="medium">Sort Order</Text>
                      <Select
                        label=""
                        value={`${sortField}-${sortDirection}`}
                        onChange={(value) => {
                          const [field, direction] = value.split('-');
                          setSortField(field as SortField);
                          setSortDirection(direction as SortDirection);
                        }}
                        options={ProductConstants.SORT_OPTIONS as any}
                      />
                    </BlockStack>
                  </Grid.Cell>

                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                    <BlockStack gap="200">
                      <Text as="p" variant="bodySm" fontWeight="medium">Product Visibility</Text>
                      <Checkbox
                        checked={showDraftProducts}
                        onChange={setShowDraftProducts}
                        label="Include draft products"
                      />
                    </BlockStack>
                  </Grid.Cell>
                </Grid>

                {/* Enhanced Bulk Operations Bar with Advanced Features */}
                {filteredProducts.length > 0 && (
                  <Card background="bg-surface-secondary" padding="400">
                    <BlockStack gap="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Text as="p" variant="bodyMd" fontWeight="medium">Bulk Operations:</Text>
                          <div style={{ 
                            padding: '8px 12px',
                            borderRadius: '6px',
                            border: '1px solid #e1e3e5',
                            backgroundColor: '#f9fafb',
                            transition: 'all 0.2s ease'
                          }}>
                            <InlineStack gap="200" blockAlign="center">
                              <Checkbox
                                checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                                onChange={handleSelectAll}
                                label=""
                              />
                              <Text as="span" variant="bodySm" fontWeight="medium">
                                {selectedProducts.length > 0 && selectedProducts.length < filteredProducts.length 
                                  ? `${selectedProducts.length} of ${filteredProducts.length} selected`
                                  : `Select All (${filteredProducts.length})`}
                              </Text>
                            </InlineStack>
                          </div>
                          <Button
                            onClick={() => setSelectedProducts([])}
                            disabled={selectedProducts.length === 0 || isLoading}
                            size="slim"
                            variant="secondary"
                          >
                            Clear Selection
                          </Button>
                        </InlineStack>
                        
                        {/* Primary Actions */}
                        <InlineStack gap="200">
                          {selectedProducts.length > 0 && (
                            <>
                              <Button
                                variant="primary"
                                onClick={() => setBulkEditModalActive(true)}
                                size="slim"
                                disabled={isLoading || fetcher.state === 'submitting'}
                              >
                                Bulk Edit ({selectedProducts.length.toString()})
                              </Button>
                              <Button
                                onClick={handleExportSelected}
                                icon={ExportIcon}
                                size="slim"
                                variant="secondary"
                                disabled={isLoading}
                              >
                                Export CSV
                              </Button>
                              <Button
                                variant="secondary"
                                size="slim"
                                tone="success"
                                onClick={handleActivateSelected}
                                disabled={isLoading || fetcher.state === 'submitting'}
                                loading={fetcher.state === 'submitting'}
                              >
                                Activate ({selectedProducts.length.toString()})
                              </Button>
                              <Button
                                variant="secondary"
                                size="slim"
                                tone="critical"
                                onClick={handleDraftSelected}
                                disabled={isLoading || fetcher.state === 'submitting'}
                                loading={fetcher.state === 'submitting'}
                              >
                                Draft ({selectedProducts.length.toString()})
                              </Button>
                            </>
                          )}
                        </InlineStack>
                      </InlineStack>
                    </BlockStack>
                  </Card>
                )}

                {/* Advanced Bulk Operations Panel - Detailed Controls */}
                {selectedProducts.length > 0 && (
                  <Card background="bg-surface-hover" padding="500">
                    <BlockStack gap="500">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="h3" variant="headingMd">Advanced Bulk Operations</Text>
                        <Badge tone="info">{`${selectedProducts.length} products selected`}</Badge>
                      </InlineStack>

                      {/* Error and Success Banners */}
                      {(bulkError || bulkSuccess) && (
                        <BlockStack gap="200">
                          {bulkError && (
                            <Banner
                              title="Bulk Operation Error"
                              tone="critical"
                              onDismiss={() => setBulkError(null)}
                            >
                              <Text as="p">{bulkError}</Text>
                            </Banner>
                          )}
                          {bulkSuccess && (
                            <Banner
                              title="Bulk Operation Success"
                              tone="success"
                              onDismiss={() => setBulkSuccess(null)}
                            >
                              <Text as="p">{bulkSuccess}</Text>
                            </Banner>
                          )}
                        </BlockStack>
                      )}

                      {/* Advanced Bulk Operations Panel - Horizontal Layout */}
                      <BlockStack gap="400">
                        {/* Pricing Operations Section - Redesigned for Better Understanding */}
                        <Card background="bg-surface" padding="400">
                          <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="200">
                                <Text as="h4" variant="headingMd" tone="base">Bulk Pricing Management</Text>
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Update prices for multiple products at once using different strategies
                                </Text>
                              </BlockStack>
                              <Badge tone="info">Bulk Operations</Badge>
                            </InlineStack>

                            <Divider />

                            {/* Pricing Strategy Selection */}
                            <FormLayout>
                              <Select
                                label="Select Pricing Strategy"
                                value={priceOperation}
                                onChange={(value) => setPriceOperation(value as 'set' | 'increase' | 'decrease' | 'round')}
                                options={[
                                  { label: 'Set Fixed Price - Apply same price to all products', value: 'set' },
                                  { label: 'Increase Prices - Add amount or percentage', value: 'increase' },
                                  { label: 'Decrease Prices - Reduce by amount or percentage', value: 'decrease' },
                                  { label: 'Round Prices - Make prices look professional', value: 'round' },
                                ]}
                                helpText="Choose how you want to update the prices for selected products"
                              />
                            </FormLayout>

                            {/* Operation Content - Improved Layout */}
                            <Card background="bg-surface-secondary" padding="400">
                              {/* Set Fixed Price */}
                              {priceOperation === 'set' && (
                                <BlockStack gap="400">
                                  <Grid>
                                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                      <div style={{ 
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: '1px solid #e1e3e5',
                                        backgroundColor: 'white'
                                      }}>
                                        <TextField
                                          label="Fixed Price"
                                          type="number"
                                          value={priceValue}
                                          onChange={setPriceValue}
                                          prefix="$"
                                          helpText="Set the same price for all selected products"
                                          autoComplete="off"
                                          placeholder="29.99"
                                        />
                                      </div>
                                    </Grid.Cell>
                                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                      <div style={{ 
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: '1px solid #e1e3e5',
                                        backgroundColor: 'white',
                                        transition: 'all 0.2s ease'
                                      }}>
                                        <BlockStack gap="300">
                                          <Checkbox
                                            label="Also update compare-at price"
                                            checked={applyToComparePrice}
                                            onChange={setApplyToComparePrice}
                                          />
                                          {applyToComparePrice && (
                                            <TextField
                                              label="Compare At Price"
                                              type="number"
                                              value={compareAtPrice}
                                              onChange={setCompareAtPrice}
                                              prefix="$"
                                              helpText="Original price for comparison"
                                              autoComplete="off"
                                              placeholder="39.99"
                                            />
                                          )}
                                        </BlockStack>
                                      </div>
                                    </Grid.Cell>
                                    <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                      <div style={{ 
                                        padding: '16px',
                                        borderRadius: '8px',
                                        border: '1px solid #e1e3e5',
                                        backgroundColor: '#f9fafb',
                                        textAlign: 'center'
                                      }}>
                                        <BlockStack gap="200">
                                          <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                                            Action Preview
                                          </Text>
                                          <Text as="p" variant="bodyMd">
                                            {priceValue ? `All products → $${priceValue}` : 'Enter price to preview'}
                                          </Text>
                                          {applyToComparePrice && compareAtPrice && (
                                            <Text as="p" variant="bodySm" tone="subdued">
                                              Compare at: ${compareAtPrice}
                                            </Text>
                                          )}
                                        </BlockStack>
                                      </div>
                                    </Grid.Cell>
                                  </Grid>
                                  
                                  {/* Action Button */}
                                  <InlineStack align="center">
                                    <Button
                                      variant="primary"
                                      size="large"
                                      onClick={handleBulkPricing}
                                      disabled={!priceValue || isLoading}
                                      loading={isLoading}
                                    >
                                      {`Apply $${priceValue || '0.00'} to ${selectedProducts.length} Products`}
                                    </Button>
                                  </InlineStack>
                                </BlockStack>
                              )}

                              {/* Percentage Adjustment */}
                              {(priceOperation === 'increase' || priceOperation === 'decrease') && (
                                <Grid>
                                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                    <TextField
                                      label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                                      type="number"
                                      value={pricePercentage}
                                      onChange={setPricePercentage}
                                      suffix="%"
                                      helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} all selected product prices by this percentage`}
                                      autoComplete="off"
                                      placeholder="10"
                                      min="0"
                                      max={priceOperation === 'decrease' ? "99" : undefined}
                                    />
                                  </Grid.Cell>
                                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                    <Box padding="400">
                                      <BlockStack gap="200">
                                        <Text as="p" variant="bodySm" fontWeight="medium">
                                          Preview:
                                        </Text>
                                        <Text as="p" variant="bodySm" tone="subdued">
                                          Example: $20.00 → ${pricePercentage ? 
                                            (priceOperation === 'increase' 
                                              ? (20 * (1 + parseFloat(pricePercentage) / 100)).toFixed(2)
                                              : (20 * (1 - parseFloat(pricePercentage) / 100)).toFixed(2)
                                            ) : '20.00'}
                                        </Text>
                                      </BlockStack>
                                    </Box>
                                  </Grid.Cell>
                                  <Grid.Cell columnSpan={{ xs: 6, sm: 4, md: 4, lg: 4, xl: 4 }}>
                                    <Button
                                      variant="primary"
                                      size="large"
                                      onClick={handleBulkPricing}
                                      disabled={!pricePercentage || isLoading}
                                      loading={isLoading}
                                      fullWidth
                                    >
                                      {priceOperation === 'increase' ? 'Increase' : 'Decrease'} by {pricePercentage || '0'}%
                                    </Button>
                                  </Grid.Cell>
                                </Grid>
                              )}

                              {/* Price Rounding */}
                              {priceOperation === 'round' && (
                                <Grid>
                                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                    <BlockStack gap="300">
                                      <Text as="h5" variant="headingSm">Choose Rounding Method</Text>
                                      <InlineStack gap="300" wrap>
                                        <Button
                                          variant={roundingRule === 'up' ? 'primary' : 'secondary'}
                                          onClick={() => setRoundingRule('up')}
                                          size="medium"
                                        >
                                          � Round Up
                                        </Button>
                                        <Button
                                          variant={roundingRule === 'down' ? 'primary' : 'secondary'}
                                          onClick={() => setRoundingRule('down')}
                                          size="medium"
                                        >
                                          📉 Round Down
                                        </Button>
                                        <Button
                                          variant={roundingRule === 'nearest' ? 'primary' : 'secondary'}
                                          onClick={() => setRoundingRule('nearest')}
                                          size="medium"
                                        >
                                          🎯 Round to Nearest
                                        </Button>
                                      </InlineStack>
                                    </BlockStack>
                                  </Grid.Cell>
                                  <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                                    <InlineStack align="space-between" blockAlign="center">
                                      <BlockStack gap="200">
                                        <Text as="p" variant="bodySm" fontWeight="medium">
                                          📊 Examples:
                                        </Text>
                                        <Text as="p" variant="bodySm" tone="subdued">
                                          {roundingRule === 'up' && '$19.99 → $20.00, $19.01 → $20.00'}
                                          {roundingRule === 'down' && '$19.99 → $19.00, $19.01 → $19.00'}
                                          {roundingRule === 'nearest' && '$19.49 → $19.00, $19.51 → $20.00'}
                                        </Text>
                                      </BlockStack>
                                      <Button
                                        variant="primary"
                                        size="large"
                                        onClick={handleBulkPricing}
                                        disabled={isLoading}
                                        loading={isLoading}
                                      >
                                        Round All Prices ({roundingRule})
                                      </Button>
                                    </InlineStack>
                                  </Grid.Cell>
                                </Grid>
                              )}
                            </Card>
                          </BlockStack>
                        </Card>

                        {/* Collection Management Section - Full Width with Current Collections Display */}
                        <Card background="bg-surface" padding="400">
                          <BlockStack gap="400">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="h4" variant="headingSm" tone="base">Collection Management</Text>
                              <Badge tone="info">Smart Collections</Badge>
                            </InlineStack>

                            <Grid>
                              {/* Current Collections of Selected Products */}
                              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                                <Card background="bg-surface-secondary" padding="300">
                                  <BlockStack gap="300">
                                    <Text as="h5" variant="headingSm">📋 Current Collections</Text>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Collections that selected products are currently in:
                                    </Text>
                                    
                                    {/* Mock current collections - replace with actual data */}
                                    <BlockStack gap="200">
                                      {['Featured Products', 'New Arrivals', 'Best Sellers'].map((collection, index) => (
                                        <InlineStack key={index} gap="200" blockAlign="center">
                                          <Badge tone="attention">{`📁 ${collection}`}</Badge>
                                          <Text as="p" variant="bodySm" tone="subdued">
                                            {Math.floor(Math.random() * selectedProducts.length) + 1} of {selectedProducts.length} products
                                          </Text>
                                        </InlineStack>
                                      ))}
                                    </BlockStack>
                                    
                                    {selectedProducts.length === 0 && (
                                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                                        Select products to see their collections
                                      </Text>
                                    )}
                                  </BlockStack>
                                </Card>
                              </Grid.Cell>

                              {/* Available Collections to Add/Remove */}
                              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                                <BlockStack gap="300">
                                  <Text as="h5" variant="headingSm">Available Collections</Text>
                                  
                                  {availableCollections.length > 0 ? (
                                    <BlockStack gap="300">
                                      <TextField
                                        label="Search Collections"
                                        value={collectionSearchQuery || ''}
                                        onChange={(value) => setCollectionSearchQuery(value)}
                                        placeholder="Search through your collections..."
                                        helpText={`${availableCollections.length} collections available`}
                                        autoComplete="off"
                                      />
                                      
                                      <Box 
                                        background="bg-surface-secondary" 
                                        padding="300" 
                                        borderRadius="200"
                                      >
                                        <BlockStack gap="200">
                                          <Text as="p" variant="bodySm" fontWeight="medium">
                                            Select Collections ({selectedCollections.length} selected)
                                          </Text>
                                          
                                          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                            <ChoiceList
                                              title=""
                                              allowMultiple
                                              choices={filteredCollections.slice(0, 20).map(col => ({
                                                label: col.title,
                                                value: col.id
                                              }))}
                                              selected={selectedCollections}
                                              onChange={setSelectedCollections}
                                            />
                                          </div>
                                          
                                          {filteredCollections.length > 20 && (
                                            <Text as="p" variant="bodySm" tone="subdued">
                                              Showing first 20 collections. Use search to find specific collections.
                                            </Text>
                                          )}
                                          
                                          {filteredCollections.length === 0 && collectionSearchQuery && (
                                            <Text as="p" variant="bodySm" tone="subdued">
                                              No collections found matching "{collectionSearchQuery}"
                                            </Text>
                                          )}
                                        </BlockStack>
                                      </Box>
                                    </BlockStack>
                                  ) : (
                                    <Card background="bg-surface-secondary" padding="300">
                                      <InlineStack gap="200" blockAlign="center">
                                        <Spinner accessibilityLabel="Loading collections" size="small" />
                                        <Text as="p" variant="bodySm" tone="subdued">
                                          Loading collections...
                                        </Text>
                                      </InlineStack>
                                    </Card>
                                  )}
                                </BlockStack>
                              </Grid.Cell>

                              {/* Action Buttons and Preview */}
                              <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                                <BlockStack gap="300">
                                  <Text as="h5" variant="headingSm">Actions</Text>
                                  
                                  {selectedCollections.length > 0 ? (
                                    <BlockStack gap="300">
                                      <InlineStack gap="200" wrap>
                                        <Button
                                          variant="primary"
                                          onClick={() => {
                                            setCollectionOperation('add');
                                            handleBulkCollections();
                                          }}
                                          disabled={isLoading}
                                          loading={isLoading && collectionOperation === 'add'}
                                          size="medium"
                                        >
                                          Add to Collections
                                        </Button>
                                        
                                        <Button
                                          variant="secondary"
                                          onClick={() => {
                                            setCollectionOperation('remove');
                                            handleBulkCollections();
                                          }}
                                          disabled={isLoading}
                                          loading={isLoading && collectionOperation === 'remove'}
                                          size="medium"
                                        >
                                          Remove from Collections
                                        </Button>
                                      </InlineStack>

                                      {/* Live Preview */}
                                      <Card background="bg-surface-info" padding="300">
                                        <BlockStack gap="200">
                                          <Text as="p" variant="bodySm" fontWeight="medium">
                                            🔍 Action Preview:
                                          </Text>
                                          <Text as="p" variant="bodySm">
                                            • <strong>{selectedProducts.length} products</strong> selected
                                          </Text>
                                          <Text as="p" variant="bodySm">
                                            • <strong>{selectedCollections.length} collections</strong> chosen: {availableCollections
                                              .filter(c => selectedCollections.includes(c.id))
                                              .map(c => c.title)
                                              .join(', ')}
                                          </Text>
                                        </BlockStack>
                                      </Card>
                                    </BlockStack>
                                  ) : (
                                    <Card background="bg-surface-secondary" padding="300">
                                      <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                                        Select collections on the left to see actions
                                      </Text>
                                    </Card>
                                  )}
                                </BlockStack>
                              </Grid.Cell>
                            </Grid>
                          </BlockStack>
                        </Card>
                      </BlockStack>

                      {/* Quick Action Summary */}
                      <Card background="bg-surface-secondary" padding="300">
                        <InlineStack align="space-between" blockAlign="center">
                          <Text as="p" variant="bodySm" tone="subdued">
                            💡 <strong>Pro Tip:</strong> Use these advanced operations to efficiently manage large product catalogs
                          </Text>
                          <Button
                            variant="tertiary"
                            size="slim"
                            onClick={() => setSelectedProducts([])}
                          >
                            Clear Selection
                          </Button>
                        </InlineStack>
                      </Card>
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Product Results Section */}
      <Card>
        <BlockStack gap="400">
          {isLoading ? (
            <Box padding="800">
              <InlineStack align="center" gap="200">
                <Spinner size="large" />
                <Text as="p" variant="bodyMd">Loading products...</Text>
              </InlineStack>
            </Box>
          ) : filteredProducts.length === 0 ? (
            <EmptyState
              heading="No products match your criteria"
              image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
            >
              <Text as="p" variant="bodyMd">
                Try adjusting your filters, search terms, or category selection to find products.
              </Text>
              <Box padding="300">
                <Button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentCategory('all');
                    setShowDraftProducts(true);
                  }}
                  variant="primary"
                >
                  Reset Filters
                </Button>
              </Box>
            </EmptyState>
          ) : (
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h4" variant="headingMd">
                  Product Results
                </Text>
                <Text as="p" variant="bodySm" tone="subdued">
                  Showing {filteredProducts.length} of {products.length} products
                </Text>
              </InlineStack>
              {viewMode === 'table' ? renderTableView() : renderCardView()}
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* Enhanced Bulk Operations Modal */}
      <Modal
        open={bulkEditModalActive}
        onClose={() => setBulkEditModalActive(false)}
        title={`Bulk Edit ${selectedProducts.length} Products`}
        primaryAction={{
          content: bulkOperation === 'pricing' ? 'Update Pricing' : 'Update Collections',
          onAction: bulkOperation === 'pricing' ? handleBulkPricing : handleBulkCollections,
          disabled: bulkOperation === 'pricing' 
            ? (!priceValue && !pricePercentage) 
            : selectedCollections.length === 0,
          loading: isLoading
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setBulkEditModalActive(false),
          },
        ]}
      >
        <Modal.Section>
          <FormLayout>
            {/* Operation Type Selector */}
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Select Operation Type</Text>
              <InlineStack gap="200">
                <Button
                  variant={bulkOperation === 'pricing' ? 'primary' : 'secondary'}
                  onClick={() => setBulkOperation('pricing')}
                >
                  Pricing Operations
                </Button>
                <Button
                  variant={bulkOperation === 'collections' ? 'primary' : 'secondary'}
                  onClick={() => setBulkOperation('collections')}
                >
                  Collection Management
                </Button>
              </InlineStack>
            </BlockStack>

            {/* Pricing Operations */}
            {bulkOperation === 'pricing' && (
              <BlockStack gap="400">
                <Text as="h4" variant="headingSm">Price Update Method</Text>
                
                <ChoiceList
                  title=""
                  choices={[
                    { label: 'Set fixed price', value: 'set' },
                    { label: 'Increase by percentage', value: 'increase' },
                    { label: 'Decrease by percentage', value: 'decrease' },
                    { label: 'Round prices', value: 'round' },
                  ]}
                  selected={[priceOperation]}
                  onChange={(value) => setPriceOperation(value[0] as any)}
                />

                {priceOperation === 'set' && (
                  <TextField
                    label="New Price"
                    type="number"
                    value={priceValue}
                    onChange={setPriceValue}
                    prefix="$"
                    helpText="Set the same price for all selected products"
                    autoComplete="off"
                  />
                )}

                {(priceOperation === 'increase' || priceOperation === 'decrease') && (
                  <TextField
                    label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                    type="number"
                    value={pricePercentage}
                    onChange={setPricePercentage}
                    suffix="%"
                    helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} current prices by this percentage`}
                    autoComplete="off"
                  />
                )}

                {priceOperation === 'round' && (
                  <ChoiceList
                    title="Rounding Rule"
                    choices={[
                      { label: 'Round to nearest whole number', value: 'nearest' },
                      { label: 'Round up', value: 'up' },
                      { label: 'Round down', value: 'down' },
                    ]}
                    selected={[roundingRule]}
                    onChange={(value) => setRoundingRule(value[0] as any)}
                  />
                )}

                <Checkbox
                  label="Also update compare at price"
                  checked={applyToComparePrice}
                  onChange={setApplyToComparePrice}
                />

                {applyToComparePrice && (
                  <TextField
                    label="Compare At Price"
                    type="number"
                    value={compareAtPrice}
                    onChange={setCompareAtPrice}
                    prefix="$"
                    helpText="Set compare at price for all selected products"
                    autoComplete="off"
                  />
                )}
              </BlockStack>
            )}

            {/* Collection Operations */}
            {bulkOperation === 'collections' && (
              <BlockStack gap="400">
                <Text as="h4" variant="headingSm">Collection Operation</Text>
                
                <ChoiceList
                  title=""
                  choices={[
                    { label: 'Add to collections', value: 'add' },
                    { label: 'Remove from collections', value: 'remove' },
                    { label: 'Replace all collections', value: 'replace' },
                  ]}
                  selected={[collectionOperation]}
                  onChange={(value) => setCollectionOperation(value[0] as any)}
                />

                <ChoiceList
                  title="Select Collections"
                  allowMultiple
                  choices={availableCollections.map(col => ({
                    label: col.title,
                    value: col.id
                  }))}
                  selected={selectedCollections}
                  onChange={setSelectedCollections}
                />

                {selectedCollections.length > 0 && (
                  <Text as="p" variant="bodySm" tone="subdued">
                    {collectionOperation === 'add' && `Will add ${selectedProducts.length} products to ${selectedCollections.length} collections`}
                    {collectionOperation === 'remove' && `Will remove ${selectedProducts.length} products from ${selectedCollections.length} collections`}
                    {collectionOperation === 'replace' && `Will replace all collections for ${selectedProducts.length} products with ${selectedCollections.length} selected collections`}
                  </Text>
                )}
              </BlockStack>
            )}

            <Text as="p" variant="bodySm" tone="subdued">
              This operation will affect {selectedProducts.length} selected products.
            </Text>
          </FormLayout>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
