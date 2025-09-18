import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
// import { ProductExporter } from "../utils/productExporter";
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
  Icon,
  // Banner,
  Tabs,
} from '@shopify/polaris';
// Import only the icons we actually use
import { 
  ProductIcon, 
  EditIcon, 
  ViewIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  MoneyIcon,
  CollectionIcon,
  InventoryIcon,
  DeliveryIcon,
  ImageIcon,
  ClockIcon,
  SearchIcon,
  StatusIcon
} from "@shopify/polaris-icons";

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
      node: {
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
  // const exportSettings = {
  //   format: 'csv' as const
  // };
  
  const fetcher = useFetcher<{ products: Product[]; hasNextPage: boolean; endCursor?: string; error?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedVariants, setSelectedVariants] = useState<string[]>([]);
  const [currentCategory, setCurrentCategory] = useState<InventoryCategory>(initialCategory);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('inventory');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Bulk Operations Tab State
  const [activeBulkTab, setActiveBulkTab] = useState(0);
  const [bulkOperation, setBulkOperation] = useState<'pricing' | 'collections'>('pricing');
  
  // Enhanced Pricing Operations State
  const [priceOperation, setPriceOperation] = useState<'set' | 'increase' | 'decrease' | 'round'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [pricePercentage, setPricePercentage] = useState('0');
  const [roundingRule, setRoundingRule] = useState<'nearest' | 'up' | 'down'>('nearest');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [applyToComparePrice, setApplyToComparePrice] = useState(false);
  
  // Compare Price Operations State
  const [compareOperation, setCompareOperation] = useState<'set' | 'increase' | 'decrease' | 'remove'>('set');
  const [compareValue, setCompareValue] = useState('');
  const [comparePercentage, setComparePercentage] = useState('0');
  const [applyCompareChanges, setApplyCompareChanges] = useState(false);
  
  // Collection Management State
  const [collectionOperation, setCollectionOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{id: string, title: string}[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  
  // Collection Filter State
  const [filterByCollection, setFilterByCollection] = useState<string>('');
  
  // Currency State
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  
  // New Bulk Operations State
  const [titleOperation, setTitleOperation] = useState<'prefix' | 'suffix' | 'replace'>('prefix');
  const [titleValue, setTitleValue] = useState('');
  const [titleReplaceFrom, setTitleReplaceFrom] = useState('');
  const [titleReplaceTo, setTitleReplaceTo] = useState('');
  
  const [descriptionOperation, setDescriptionOperation] = useState<'append' | 'prepend' | 'replace'>('append');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [descriptionReplaceFrom, setDescriptionReplaceFrom] = useState('');
  const [descriptionReplaceTo, setDescriptionReplaceTo] = useState('');
  
  const [tagOperation, setTagOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [tagValue, setTagValue] = useState('');
  const [tagRemoveValue, setTagRemoveValue] = useState('');
  
  // Vendor functionality removed
  // const [vendorValue, setVendorValue] = useState('');
  // const [productTypeValue, setProductTypeValue] = useState('');
  const [costValue, setCostValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  
  // Enhanced Inventory Management State
  const [inventoryOperation, setInventoryOperation] = useState<'stock' | 'sku' | 'cost'>('stock');
  const [stockUpdateMethod, setStockUpdateMethod] = useState<'set' | 'add' | 'subtract'>('set');
  const [stockQuantity, setStockQuantity] = useState('');
  const [skuUpdateMethod, setSkuUpdateMethod] = useState<'prefix' | 'suffix' | 'replace' | 'generate'>('prefix');
  const [skuValue, setSkuValue] = useState('');
  const [skuFindText, setSkuFindText] = useState('');
  const [skuReplaceText, setSkuReplaceText] = useState('');
  const [skuPattern, setSkuPattern] = useState('');
  const [trackInventory, setTrackInventory] = useState(true);
  
  // SEO & Metadata State
  const [seoOperation, setSeoOperation] = useState<'seo-title' | 'meta-desc' | 'handles'>('seo-title');
  const [seoTitleTemplate, setSeoTitleTemplate] = useState('');
  const [metaDescTemplate, setMetaDescTemplate] = useState('');
  const [handleUpdateMethod, setHandleUpdateMethod] = useState<'auto' | 'prefix' | 'suffix'>('auto');
  const [handlePrefix, setHandlePrefix] = useState('');
  const [handleSuffix, setHandleSuffix] = useState('');
  
  // Status & Visibility State
  const [statusOperation, setStatusOperation] = useState<'status' | 'visibility' | 'publish-date'>('status');
  const [newProductStatus, setNewProductStatus] = useState<'ACTIVE' | 'DRAFT' | 'ARCHIVED'>('ACTIVE');
  const [visibilitySettings, setVisibilitySettings] = useState<string[]>(['online-store']);
  const [publishDate, setPublishDate] = useState('');

  
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
  
  // Enhanced Error and success states for bulk operations
  const [bulkRetryCount, setBulkRetryCount] = useState(0);
  const [bulkIsRetrying, setBulkIsRetrying] = useState(false);
  
  const [showDraftProducts, setShowDraftProducts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [maxRetries] = useState(ProductConstants.MAX_RETRIES);
  
  // Collapsible product details state
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  
  // Bulk operations modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  
  // Helper function to toggle product expansion
  const toggleProductExpansion = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  // Helper functions for variant selection
  const getProductVariantIds = (productId: string): string[] => {
    const product = filteredProducts.find(p => p.id === productId);
    return product ? product.variants.edges.map(v => v.node.id) : [];
  };

  const getSelectedVariantsForProduct = (productId: string): string[] => {
    const variantIds = getProductVariantIds(productId);
    return selectedVariants.filter(variantId => variantIds.includes(variantId));
  };

  const getProductSelectionState = (productId: string): 'none' | 'some' | 'all' => {
    const variantIds = getProductVariantIds(productId);
    const selectedCount = selectedVariants.filter(variantId => variantIds.includes(variantId)).length;
    
    if (selectedCount === 0) return 'none';
    if (selectedCount === variantIds.length) return 'all';
    return 'some';
  };

  const handleProductSelection = (productId: string, checked: boolean) => {
    const variantIds = getProductVariantIds(productId);
    
    if (checked) {
      // Select all variants for this product
      setSelectedVariants(prev => [...new Set([...prev, ...variantIds])]);
      // Also add to selectedProducts for compatibility with existing bulk operations
      setSelectedProducts(prev => [...new Set([...prev, productId])]);
    } else {
      // Deselect all variants for this product
      setSelectedVariants(prev => prev.filter(id => !variantIds.includes(id)));
      // Remove from selectedProducts
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };

  const handleVariantSelection = (productId: string, variantId: string, checked: boolean) => {
    if (checked) {
      setSelectedVariants(prev => [...prev, variantId]);
      // Check if all variants are now selected, if so add product to selectedProducts
      const variantIds = getProductVariantIds(productId);
      const newSelectedVariants = [...selectedVariants, variantId];
      if (variantIds.every(id => newSelectedVariants.includes(id))) {
        setSelectedProducts(prev => [...new Set([...prev, productId])]);
      }
    } else {
      setSelectedVariants(prev => prev.filter(id => id !== variantId));
      // Remove product from selectedProducts since not all variants are selected
      setSelectedProducts(prev => prev.filter(id => id !== productId));
    }
  };
  
  // Slider state for Product Results
  const [productResultsSliderIndex, setProductResultsSliderIndex] = useState(0);
  const [productsPerPage] = useState(10); // Number of products to show per page

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
      // Add mock collection data and compare prices to products for testing
      const productsWithCollections = fetcher.data.products.map((product: Product, index: number) => ({
        ...product,
        collections: {
          edges: [
            // Assign collections based on product index for testing
            ...(index % 4 === 0 ? [{ node: { id: 'featured', handle: 'featured', title: 'Featured Products' } }] : []),
            ...(index % 3 === 0 ? [{ node: { id: 'new-arrivals', handle: 'new-arrivals', title: 'New Arrivals' } }] : []),
            ...(index % 5 === 0 ? [{ node: { id: 'sale', handle: 'sale', title: 'Sale Items' } }] : []),
            ...(index % 2 === 0 ? [{ node: { id: 'bestsellers', handle: 'bestsellers', title: 'Best Sellers' } }] : []),
            ...(index % 6 === 0 ? [{ node: { id: 'electronics', handle: 'electronics', title: 'Electronics' } }] : []),
            ...(index % 7 === 0 ? [{ node: { id: 'clothing', handle: 'clothing', title: 'Clothing' } }] : []),
          ]
        },
        variants: {
          ...product.variants,
          edges: product.variants.edges.map(edge => ({
            ...edge,
            node: {
              ...edge.node,
              // Add mock compare prices for testing (30-50% higher than regular price)
              compareAtPrice: index % 3 === 0 ? (parseFloat(edge.node.price) * 1.3).toFixed(2) : undefined
            }
          }))
        }
      }));
      setProducts(productsWithCollections);
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

  // Reset slider when filters change
  useEffect(() => {
    setProductResultsSliderIndex(0);
  }, [searchQuery, currentCategory, showDraftProducts, sortField, sortDirection, filterByCollection]);

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

    // Collection filter
    if (filterByCollection && product.collections) {
      const isInCollection = product.collections.edges.some(edge => edge.node.id === filterByCollection);
      if (!isInCollection) {
        return false;
      }
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
    handleProductSelection(productId, checked);
  };

  // Enhanced error handling helpers
  const clearBulkMessages = () => {
    setError(null);
    // Clear bulk messages functionality
  };

  const handleBulkOperationError = (error: any, operation: string, canRetry = true) => {
    console.error(`Bulk ${operation} failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const isNetworkError = errorMessage.toLowerCase().includes('network') || 
                          errorMessage.toLowerCase().includes('fetch') ||
                          errorMessage.toLowerCase().includes('timeout');
    
    if (isNetworkError && canRetry && bulkRetryCount < 3) {
      setError(`${operation} failed due to network issues. Retrying... (Attempt ${bulkRetryCount + 1}/3)`);
      return { shouldRetry: true, isNetworkError: true };
    }
    
    setError(`Failed to ${operation.toLowerCase()}: ${errorMessage}${canRetry ? ' Click retry to try again.' : ''}`);
    return { shouldRetry: false, isNetworkError };
  };

  const retryBulkOperation = async (operationFunction: () => Promise<void>, operationName: string) => {
    setBulkIsRetrying(true);
    setBulkRetryCount(prev => prev + 1);
    
    try {
      await operationFunction();
      setBulkRetryCount(0);
    } catch (error) {
      handleBulkOperationError(error, operationName, bulkRetryCount < 2);
    } finally {
      setBulkIsRetrying(false);
    }
  };

  const simulateApiCall = async (operation: string, delay = 1500): Promise<void> => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate occasional failures for testing error handling
        if (Math.random() < 0.1) { // 10% chance of failure
          reject(new Error(`Simulated ${operation} API failure - network timeout`));
        } else {
          resolve();
        }
      }, delay);
    });
  };

  // const handleSelectAll = (checked: boolean) => {
  //   setSelectedProducts(checked ? filteredProducts.map(p => p.id) : []);
  // };

  // Enhanced Pricing Operations with Advanced Error Handling
  const handleBulkPricing = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update pricing.");
      return;
    }
    
    // Validation based on operation type
    if (priceOperation === 'set' && (!priceValue || parseFloat(priceValue) <= 0)) {
      setError("Please enter a valid price greater than $0.");
      return;
    }
    
    if ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || pricePercentage.trim() === '' || isNaN(parseFloat(pricePercentage)))) {
      setError("Please enter a valid percentage.");
      return;
    }
    
    if ((priceOperation === 'increase' || priceOperation === 'decrease') && parseFloat(pricePercentage) < 0) {
      setError("Percentage cannot be negative.");
      return;
    }
    
    if (priceOperation === 'decrease' && parseFloat(pricePercentage) >= 100) {
      setError("Decrease percentage must be less than 100%.");
      return;
    }
    
    // Validate compare price operations if enabled
    if (applyCompareChanges) {
      if (compareOperation === 'set' && (!compareValue || parseFloat(compareValue) <= 0)) {
        setError("Please enter a valid compare price greater than $0.");
        return;
      }
      
      if ((compareOperation === 'increase' || compareOperation === 'decrease') && (!comparePercentage || comparePercentage.trim() === '' || isNaN(parseFloat(comparePercentage)))) {
        setError("Please enter a valid compare price percentage.");
        return;
      }
      
      if ((compareOperation === 'increase' || compareOperation === 'decrease') && parseFloat(comparePercentage) < 0) {
        setError("Compare price percentage cannot be negative.");
        return;
      }
      
      if (compareOperation === 'decrease' && parseFloat(comparePercentage) >= 100) {
        setError("Compare price decrease percentage must be less than 100%.");
        return;
      }
    }
    
    setIsLoading(true);
    clearBulkMessages();
    
    const failed: string[] = [];
    const successful: string[] = [];
    
    try {
      const updates = [];
      
      // Process each product and calculate new prices
      for (let i = 0; i < selectedProducts.length; i++) {
        const productId = selectedProducts[i];
        const product = products.find(p => p.id === productId);
        
        try {
          if (!product) {
            failed.push(`Product ID ${productId}: Product not found`);
            continue;
          }

          let newPrice: number;
          let newComparePrice: string | null = null;
          const currentPrice = parseFloat(product.variants.edges[0]?.node.price || '0');
          const currentComparePrice = product.variants.edges[0]?.node.compareAtPrice ? parseFloat(product.variants.edges[0].node.compareAtPrice) : null;
          
          if (currentPrice === 0 && priceOperation !== 'set') {
            failed.push(`${product.title}: No current price found. Please set a fixed price first.`);
            continue;
          }
          
          // Calculate new regular price
          switch (priceOperation) {
            case 'set':
              newPrice = parseFloat(priceValue) || 0;
              break;
            case 'increase':
              const increasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 + increasePercent / 100);
              console.log(`Increase: ${currentPrice} * (1 + ${increasePercent}/100) = ${newPrice}`);
              break;
            case 'decrease':
              const decreasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 - decreasePercent / 100);
              console.log(`Decrease: ${currentPrice} * (1 - ${decreasePercent}/100) = ${newPrice}`);
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
            failed.push(`${product.title}: Calculated price ($${newPrice.toFixed(2)}) is below minimum ($0.01)`);
            continue;
          }

          // Calculate new compare price if enabled
          if (applyCompareChanges) {
            switch (compareOperation) {
              case 'set':
                newComparePrice = parseFloat(compareValue) > 0 ? parseFloat(compareValue).toFixed(2) : null;
                break;
              case 'increase':
                if (currentComparePrice !== null) {
                  const compareIncreasePercent = parseFloat(comparePercentage) || 0;
                  newComparePrice = (currentComparePrice * (1 + compareIncreasePercent / 100)).toFixed(2);
                } else {
                  // Skip if no existing compare price
                  console.log(`${product.title}: No existing compare price to increase`);
                }
                break;
              case 'decrease':
                if (currentComparePrice !== null) {
                  const compareDecreasePercent = parseFloat(comparePercentage) || 0;
                  newComparePrice = (currentComparePrice * (1 - compareDecreasePercent / 100)).toFixed(2);
                } else {
                  // Skip if no existing compare price
                  console.log(`${product.title}: No existing compare price to decrease`);
                }
                break;
              case 'remove':
                newComparePrice = null;
                break;
            }
          }

          updates.push({
            productId,
            variantId: product.variants.edges[0]?.node.id,
            productTitle: product.title,
            price: newPrice.toFixed(2),
            compareAtPrice: newComparePrice
          });
          
          successful.push(product.title);
          
        } catch (error) {
          failed.push(`${product?.title || productId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (updates.length === 0) {
        throw new Error('No products could be updated. Please check the errors above.');
      }
      
      // Make real API call to update prices
      const formData = new FormData();
      formData.append('action', 'update-product-prices');
      formData.append('updates', JSON.stringify(updates));
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update prices');
      }
      
      // Update UI immediately with new prices
      if (result.success) {
        setProducts(prevProducts => 
          prevProducts.map(product => {
            const update = result.results.find((r: any) => r.productId === product.id);
            if (update && update.success) {
              return {
                ...product,
                variants: {
                  ...product.variants,
                  edges: product.variants.edges.map(edge => ({
                    ...edge,
                    node: {
                      ...edge.node,
                      price: update.newPrice || edge.node.price,
                      compareAtPrice: update.newCompareAtPrice !== undefined ? update.newCompareAtPrice : edge.node.compareAtPrice
                    }
                  }))
                }
              };
            }
            return product;
          })
        );
      }
      
      // Handle results
      const apiFailed = result.results.filter((r: any) => !r.success);
      const apiSuccessful = result.results.filter((r: any) => r.success);
      
      if (apiFailed.length > 0) {
        apiFailed.forEach((failure: any) => {
          failed.push(`${failure.productId}: ${failure.error}`);
        });
      }
      
      if (apiSuccessful.length > 0) {
        console.log(`✅ Successfully updated pricing for ${apiSuccessful.length} products!`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${apiSuccessful.length} products updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Reset form only if completely successful (keep products selected for additional operations)
      if (failed.length === 0) {
        setPriceValue('');
        setPricePercentage('0');
        setCompareAtPrice('');
        setCompareValue('');
        setComparePercentage('0');
        setApplyCompareChanges(false);
        // Note: Keeping selectedProducts so users can perform multiple operations on the same selection
        
        // Show info about compare price operations
        if (applyCompareChanges) {
          const productsWithoutCompare = selectedProducts.filter(productId => {
            const product = products.find(p => p.id === productId);
            return !product?.variants.edges[0]?.node.compareAtPrice;
          }).length;
          
          if (productsWithoutCompare > 0 && (compareOperation === 'increase' || compareOperation === 'decrease')) {
            console.log(`ℹ️ Note: ${productsWithoutCompare} product(s) didn't have existing compare prices, so percentage changes were skipped for those.`);
          }
        }
      }
      
    } catch (error) {
      console.error('Bulk pricing error:', error);
      setError(`Failed to update prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Enhanced Collection Management with Error Handling
  const handleBulkCollections = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update collections.");
      return;
    }
    
    if (selectedCollections.length === 0) {
      setError("Please select at least one collection.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update products with selected collections
      setProducts(prevProducts => 
        prevProducts.map(product => {
          if (selectedProducts.includes(product.id)) {
            const selectedCollectionObjects = availableCollections.filter(col => 
              selectedCollections.includes(col.id)
            );
            
            // Get current collections as array of nodes
            const currentCollectionNodes = product.collections?.edges?.map(edge => edge.node) || [];
            
            let updatedCollectionNodes = [...currentCollectionNodes];
            
            if (collectionOperation === 'add') {
              // Add selected collections (avoid duplicates)
              const existingCollectionIds = updatedCollectionNodes.map(col => col.id);
              const newCollections = selectedCollectionObjects
                .filter(col => !existingCollectionIds.includes(col.id))
                .map(col => ({ id: col.id, handle: col.title.toLowerCase().replace(/\s+/g, '-'), title: col.title }));
              
              updatedCollectionNodes = [...updatedCollectionNodes, ...newCollections];
            } else if (collectionOperation === 'remove') {
              // Remove selected collections
              updatedCollectionNodes = updatedCollectionNodes.filter(col => 
                !selectedCollections.includes(col.id)
              );
            }
            
            return {
              ...product,
              collections: {
                edges: updatedCollectionNodes.map(node => ({ node }))
              }
            };
          }
          return product;
        })
      );
      
      // Success message
      const actionText = collectionOperation === 'add' ? 'added to' : 'removed from';
      const collectionNames = selectedCollections.map(id => 
        availableCollections.find(col => col.id === id)?.title
      ).filter(Boolean).join(', ');
      
      console.log(`Successfully ${actionText} collections (${collectionNames}) for ${selectedProducts.length} products!`);
      
      // Reset collection selections but keep product selections
      setSelectedCollections([]);
      
    } catch (error) {
      console.error('Failed to update collections:', error);
      setError(`Failed to update collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkTitleUpdate = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update titles.");
      return;
    }
    
    if (titleOperation === 'replace' && (!titleReplaceFrom || !titleReplaceTo)) {
      setError("Please provide both find and replace text.");
      return;
    }
    
    if ((titleOperation === 'prefix' || titleOperation === 'suffix') && !titleValue) {
      setError(`Please provide ${titleOperation} text.`);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Update product titles
      setProducts(prevProducts => 
        prevProducts.map(product => {
          if (selectedProducts.includes(product.id)) {
            let newTitle = product.title;
            
            if (titleOperation === 'prefix') {
              newTitle = `${titleValue} ${product.title}`;
            } else if (titleOperation === 'suffix') {
              newTitle = `${product.title} ${titleValue}`;
            } else if (titleOperation === 'replace') {
              newTitle = product.title.replace(new RegExp(titleReplaceFrom, 'g'), titleReplaceTo);
            }
            
            return {
              ...product,
              title: newTitle
            };
          }
          return product;
        })
      );
      
      // Success message
      let operationText = '';
      if (titleOperation === 'prefix') {
        operationText = `Added prefix "${titleValue}" to`;
      } else if (titleOperation === 'suffix') {
        operationText = `Added suffix "${titleValue}" to`;
      } else {
        operationText = `Replaced "${titleReplaceFrom}" with "${titleReplaceTo}" in`;
      }
      
      console.log(`Successfully ${operationText} ${selectedProducts.length} product titles!`);
      
      // Reset title form but keep product selections
      setTitleValue('');
      setTitleReplaceFrom('');
      setTitleReplaceTo('');
      
    } catch (error) {
      console.error('Failed to update titles:', error);
      setError(`Failed to update titles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkInventoryUpdate = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update inventory.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (inventoryOperation === 'stock') {
        const quantity = parseInt(stockQuantity) || 0;
        
        // Update product variants with new stock quantities
        setProducts(prevProducts => 
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              return {
                ...product,
                variants: {
                  ...product.variants,
                  edges: product.variants.edges.map(edge => {
                    let newQuantity = edge.node.inventoryQuantity;
                    
                    if (stockUpdateMethod === 'set') {
                      newQuantity = quantity;
                    } else if (stockUpdateMethod === 'add') {
                      newQuantity = edge.node.inventoryQuantity + quantity;
                    } else if (stockUpdateMethod === 'subtract') {
                      newQuantity = Math.max(0, edge.node.inventoryQuantity - quantity);
                    }
                    
                    return {
                      ...edge,
                      node: {
                        ...edge.node,
                        inventoryQuantity: newQuantity
                      }
                    };
                  })
                },
                totalInventory: product.variants.edges.reduce((total, edge) => {
                  let newQuantity = edge.node.inventoryQuantity;
                  if (stockUpdateMethod === 'set') {
                    newQuantity = quantity;
                  } else if (stockUpdateMethod === 'add') {
                    newQuantity = edge.node.inventoryQuantity + quantity;
                  } else if (stockUpdateMethod === 'subtract') {
                    newQuantity = Math.max(0, edge.node.inventoryQuantity - quantity);
                  }
                  return total + newQuantity;
                }, 0)
              };
            }
            return product;
          })
        );
        
        console.log(`Successfully ${stockUpdateMethod === 'set' ? 'set' : stockUpdateMethod === 'add' ? 'added' : 'subtracted'} ${quantity} stock for ${selectedProducts.length} products!`);
        
      } else if (inventoryOperation === 'sku') {
        // Update SKUs based on the selected method
        setProducts(prevProducts => 
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              return {
                ...product,
                variants: {
                  ...product.variants,
                  edges: product.variants.edges.map((edge, index) => {
                    let newSku = edge.node.sku || '';
                    
                    if (skuUpdateMethod === 'prefix') {
                      newSku = `${skuValue}${newSku}`;
                    } else if (skuUpdateMethod === 'suffix') {
                      newSku = `${newSku}${skuValue}`;
                    } else if (skuUpdateMethod === 'replace') {
                      newSku = newSku.replace(new RegExp(skuFindText, 'g'), skuReplaceText);
                    } else if (skuUpdateMethod === 'generate') {
                      newSku = skuPattern
                        .replace('{id}', product.id)
                        .replace('{variant}', (index + 1).toString());
                    }
                    
                    return {
                      ...edge,
                      node: {
                        ...edge.node,
                        sku: newSku
                      }
                    };
                  })
                }
              };
            }
            return product;
          })
        );
        
        console.log(`Successfully updated SKUs for ${selectedProducts.length} products using ${skuUpdateMethod} method!`);
        
      } else if (inventoryOperation === 'cost') {
        // This would typically update cost, weight, origin country, and tracking settings
        // For now, we'll just log the operation since these are meta fields
        console.log(`Successfully updated inventory metadata for ${selectedProducts.length} products!`);
        console.log({
          cost: costValue,
          weight: weightValue,
          originCountry: originCountry,
          trackingEnabled: trackInventory
        });
      }
      
      // Reset form fields but keep product selections
      if (inventoryOperation === 'stock') {
        setStockQuantity('');
      } else if (inventoryOperation === 'sku') {
        setSkuValue('');
        setSkuFindText('');
        setSkuReplaceText('');
        setSkuPattern('');
      } else if (inventoryOperation === 'cost') {
        setCostValue('');
        setWeightValue('');
        setOriginCountry('');
      }
      
    } catch (error) {
      console.error('Failed to update inventory:', error);
      setError(`Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced SEO Bulk Operations
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkSEO = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product for SEO optimization.");
      return;
    }
    
    if (!seoTemplate.trim() && !metaDescription.trim()) {
      setError("Please enter either an SEO title template or meta description.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log(null);
    
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
      
      console.log(`Successfully optimized SEO for ${selectedProducts.length} products with smart templates!`);
      setSeoTemplate('');
      setMetaDescription('');
      // Keep products selected for additional operations
      setTimeout(() => console.log(null), 3000);
    } catch (error) {
      setError(`Failed to update SEO: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Smart Inventory Management (commented out - unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkInventory = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product for inventory management.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log(null);
    
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
      
      console.log(`Successfully configured inventory settings for ${selectedProducts.length} products with smart alerts!`);
      setLowStockAlert('');
      // Keep products selected for additional operations
      setTimeout(() => console.log(null), 3000);
    } catch (error) {
      setError(`Failed to update inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Advanced Marketing Operations (commented out - unused)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBulkMarketing = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product for marketing optimization.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    console.log(null);
    
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
      
      console.log(`Successfully applied marketing optimization to ${selectedProducts.length} products with smart tagging!`);
      setMarketingTags('');
      setSeasonalPricing('');
      // Keep products selected for additional operations
      setTimeout(() => console.log(null), 3000);
    } catch (error) {
      setError(`Failed to update marketing: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  // Load store currency
  const loadStoreCurrency = async () => {
    try {
      // In a real implementation, you would fetch this from Shopify API
      // For now, we'll simulate it with mock data
      const mockCurrency = 'USD'; // This would come from shop.currencyCode in Shopify
      const currencySymbols: { [key: string]: string } = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'CAD': 'C$',
        'AUD': 'A$',
        'JPY': '¥',
        'CHF': 'CHF ',
        'SEK': 'kr',
        'NOK': 'kr',
        'DKK': 'kr',
      };
      
      setStoreCurrency(mockCurrency);
      setCurrencySymbol(currencySymbols[mockCurrency] || '$');
    } catch (error) {
      console.error('Failed to load store currency:', error);
      // Fallback to USD
      setStoreCurrency('USD');
      setCurrencySymbol('$');
    }
  };

  // Load collections and currency on component mount
  useEffect(() => {
    loadCollections();
    loadStoreCurrency();
  }, []);

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

  // const handleDraftSelected = () => {
  //   if (selectedProducts.length === 0) return;

  //   // Single confirmation
  //   if (!confirm(`Draft ${selectedProducts.length} selected products? This will change their status to draft.`)) {
  //     return;
  //   }

  //   // Store selected product IDs before clearing
  //   const productsToUpdate = [...selectedProducts];

  //   // Clear selection immediately for better UX
  //   setSelectedProducts([]);

  //   // Optimistically update UI - change products to draft immediately
  //   setProducts(prevProducts => 
  //     prevProducts.map(product => 
  //       productsToUpdate.includes(product.id) 
  //         ? { ...product, status: 'DRAFT' }
  //         : product
  //     )
  //   );

  //   // Submit to API in background with error handling
  //   try {
  //     const formData = new FormData();
  //     formData.append('action', 'draft-products');
  //     formData.append('productIds', JSON.stringify(productsToUpdate));
      
  //     fetcher.submit(formData, { 
  //       method: "post", 
  //       action: "/app/api/products",
  //       encType: "multipart/form-data"
  //     });
  //   } catch (error) {
  //     console.error('Error submitting draft request:', error);
  //     // Revert optimistic update on error
  //     setProducts(prevProducts => 
  //       prevProducts.map(product => 
  //         productsToUpdate.includes(product.id) 
  //           ? { ...product, status: 'ACTIVE' } // Revert to previous status
  //           : product
  //       )
  //     );
  //     setError('Failed to draft products. Please try again.');
  //   }
  // };

  // const handleActivateSelected = () => {
  //   if (selectedProducts.length === 0) return;

  //   // Single confirmation
  //   if (!confirm(`Activate ${selectedProducts.length} selected products? This will change their status to active.`)) {
  //     return;
  //   }

  //   // Store selected product IDs before clearing
  //   const productsToUpdate = [...selectedProducts];

  //   // Clear selection immediately for better UX
  //   setSelectedProducts([]);

  //   // Optimistically update UI - change products to active immediately
  //   setProducts(prevProducts => 
  //     prevProducts.map(product => 
  //       productsToUpdate.includes(product.id) 
  //         ? { ...product, status: 'ACTIVE' }
  //         : product
  //     )
  //   );

  //   // If draft products are hidden, temporarily show them so user can see the activation
  //   if (!showDraftProducts) {
  //     setShowDraftProducts(true);
  //   }

  //   // Submit to API in background with error handling
  //   try {
  //     const formData = new FormData();
  //     formData.append('action', 'activate-products');
  //     formData.append('productIds', JSON.stringify(productsToUpdate));
      
  //     fetcher.submit(formData, { 
  //       method: "post", 
  //       action: "/app/api/products",
  //       encType: "multipart/form-data"
  //     });
  //   } catch (error) {
  //     console.error('Error submitting activate request:', error);
  //     // Revert optimistic update on error
  //     setProducts(prevProducts => 
  //       prevProducts.map(product => 
  //         productsToUpdate.includes(product.id) 
  //           ? { ...product, status: 'DRAFT' } // Revert to previous status
  //           : product
  //       )
  //     );
  //     setError('Failed to activate products. Please try again.');
  //   }
  // };

  // const handleExportSelected = () => {
  //   const selectedProductData = filteredProducts.filter(p => selectedProducts.includes(p.id));
    
  //   if (selectedProductData.length === 0) {
  //     return;
  //   }
    
  //   const filename = `products-${currentCategory}-${new Date().toISOString().split('T')[0]}`;
    
  //   ProductExporter.exportProducts(selectedProductData, {
  //     format: exportSettings.format,
  //     filename
  //   });
  // };

  const getBadgeTone = (inventory: number): 'critical' | 'warning' | 'success' => {
    if (inventory === 0) return 'critical';
    if (inventory <= ProductConstants.CRITICAL_THRESHOLD) return 'critical';
    if (inventory <= ProductConstants.LOW_STOCK_THRESHOLD) return 'warning';
    return 'success';
  };

  const handleSelectAll = (checked: boolean) => {
    const currentPageProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    if (checked) {
      const newSelection = [...new Set([...selectedProducts, ...currentPageProducts.map(p => p.id)])];
      setSelectedProducts(newSelection);
    } else {
      const currentPageIds = currentPageProducts.map(p => p.id);
      setSelectedProducts(selectedProducts.filter(id => !currentPageIds.includes(id)));
    }
  };

  // Helper functions for product results selection
  const isAllResultsSelected = () => {
    const visibleProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    return visibleProducts.length > 0 && visibleProducts.every(product => getProductSelectionState(product.id) !== 'none');
  };

  const handleSelectAllResults = (checked: boolean) => {
    const visibleProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    visibleProducts.forEach(product => {
      handleProductSelection(product.id, checked);
    });
  };

  const isAllCurrentPageSelected = () => {
    const currentPageProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    return currentPageProducts.length > 0 && currentPageProducts.every(product => selectedProducts.includes(product.id));
  };

  const isIndeterminate = () => {
    const currentPageProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    const selectedCount = currentPageProducts.filter(product => selectedProducts.includes(product.id)).length;
    return selectedCount > 0 && selectedCount < currentPageProducts.length;
  };

  const renderTableView = () => {
    const paginatedProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    
    // Create custom headings with Select All checkbox
    const tableHeadings = [
      <div key="select-all" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Checkbox
          checked={isAllCurrentPageSelected()}
          onChange={handleSelectAll}
          label=""
        />
        <Text as="span" variant="bodyMd" fontWeight="medium">Select</Text>
      </div>,
      'Product',
      'Price', 
      'Inventory', 
      'Status', 
      'Variants', 
      'Actions'
    ];
    
    const rows = paginatedProducts.map(product => {
      const inventory = product.totalInventory;
      const productKey = product.id;
      return [
        // First column: Select checkbox
        <div key={`${productKey}-select`} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: '48px',
          padding: '4px 0'
        }}>
          <Checkbox
            checked={getProductSelectionState(product.id) !== 'none'}
            onChange={(checked) => handleBulkSelect(product.id, checked)}
            label=""
          />
        </div>,
        // Second column: Product info
        <div key={`${productKey}-title`} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          minHeight: '48px',
          padding: '4px 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <Thumbnail
              source={product.featuredMedia?.preview?.image?.url || ProductIcon}
              alt={product.featuredMedia?.preview?.image?.altText || product.title}
              size="small"
            />
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            flex: 1, 
            minWidth: 0 
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: product.status === 'ACTIVE' ? '#4CAF50' : product.status === 'DRAFT' ? '#FFC107' : '#9E9E9E',
              flexShrink: 0
            }} />
            <div 
              style={{ 
                flex: 1, 
                minWidth: 0,
                overflow: 'hidden',
                position: 'relative'
              }}
              className="product-title-container"
            >
              <div 
                style={{ 
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'transform 0.3s ease-in-out'
                }}
                className="product-title-text"
                onMouseEnter={(e) => {
                  const container = e.currentTarget.parentElement;
                  const containerWidth = container?.offsetWidth || 0;
                  const textWidth = e.currentTarget.scrollWidth;
                  if (textWidth > containerWidth) {
                    const scrollDistance = textWidth - containerWidth + 20;
                    e.currentTarget.style.transform = `translateX(-${scrollDistance}px)`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateX(0)';
                }}
              >
                <Text as="span" variant="bodyMd" fontWeight="semibold">
                  {product.title}
                </Text>
              </div>
            </div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px', 
              marginLeft: '8px',
              flexShrink: 0
            }}>
              <Text as="span" variant="bodySm" tone="subdued">
                {product.handle}
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text as="span" variant="bodySm" fontWeight="medium">
                  ${(() => {
                    const prices = product.variants.edges.map(edge => parseFloat(edge.node.price));
                    const minPrice = Math.min(...prices);
                    const maxPrice = Math.max(...prices);
                    return minPrice === maxPrice ? minPrice.toFixed(2) : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
                  })()}
                </Text>
                {(() => {
                  const comparePrice = product.variants.edges[0]?.node.compareAtPrice;
                  if (comparePrice && parseFloat(comparePrice) > parseFloat(product.variants.edges[0].node.price)) {
                    return (
                      <Text as="span" variant="bodyXs" tone="subdued">
                        <span style={{ textDecoration: 'line-through' }}>
                          ${parseFloat(comparePrice).toFixed(2)}
                        </span>
                      </Text>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        </div>,
        // Price column - show main variant price or price range with compare prices
        (() => {
          const prices = product.variants.edges.map(edge => parseFloat(edge.node.price));
          const comparePrices = product.variants.edges.map(edge => edge.node.compareAtPrice ? parseFloat(edge.node.compareAtPrice) : null).filter(p => p !== null);
          const minPrice = Math.min(...prices);
          const maxPrice = Math.max(...prices);
          const hasComparePrices = comparePrices.length > 0;
          
          if (prices.length === 1 || minPrice === maxPrice) {
            const comparePrice = product.variants.edges[0]?.node.compareAtPrice;
            return (
              <BlockStack gap="100">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    ${minPrice.toFixed(2)}
                  </Text>
                  {comparePrice && parseFloat(comparePrice) > minPrice && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      <span style={{ textDecoration: 'line-through' }}>
                        ${parseFloat(comparePrice).toFixed(2)}
                      </span>
                    </Text>
                  )}
                </div>
                {comparePrice && parseFloat(comparePrice) > minPrice && (
                  <Text as="span" variant="bodyXs" tone="success">
                    Save ${(parseFloat(comparePrice) - minPrice).toFixed(2)}
                  </Text>
                )}
              </BlockStack>
            );
          } else {
            return (
              <BlockStack gap="100">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="medium">
                    ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}
                  </Text>
                  {hasComparePrices && (
                    <Text as="span" variant="bodySm" tone="subdued">
                      Compare prices available
                    </Text>
                  )}
                </div>
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
        columnContentTypes={['text', 'text', 'text', 'text', 'text', 'text', 'text']}
        headings={tableHeadings as any}
        rows={rows}
      />
    );
  };

  const renderCardView = () => {
    const paginatedProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    return (
      <ResourceList
        items={paginatedProducts}
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
              <BlockStack gap="200">
                {/* Main Row: Checkbox, Title, Status, Stock, and Actions */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                    <Checkbox
                      checked={getProductSelectionState(product.id) !== 'none'}
                      onChange={(checked) => handleBulkSelect(product.id, checked)}
                      label=""
                    />
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      flex: 1, 
                      minWidth: 0 
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: product.status === 'ACTIVE' ? '#4CAF50' : product.status === 'DRAFT' ? '#FFC107' : '#9E9E9E',
                        flexShrink: 0
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div 
                          style={{ 
                            overflow: 'hidden',
                            position: 'relative',
                            marginBottom: '4px'
                          }}
                          className="product-title-container"
                        >
                          <div 
                            style={{ 
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              transition: 'transform 0.3s ease-in-out'
                            }}
                            className="product-title-text"
                            onMouseEnter={(e) => {
                              const container = e.currentTarget.parentElement;
                              const containerWidth = container?.offsetWidth || 0;
                              const textWidth = e.currentTarget.scrollWidth;
                              if (textWidth > containerWidth) {
                                const scrollDistance = textWidth - containerWidth + 20;
                                e.currentTarget.style.transform = `translateX(-${scrollDistance}px)`;
                              }
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateX(0)';
                            }}
                          >
                            <Text as="h3" variant="bodyMd" fontWeight="semibold">
                              {product.title}
                            </Text>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Text as="p" variant="bodySm" tone="subdued">
                            ${(() => {
                              const prices = product.variants.edges.map(edge => parseFloat(edge.node.price));
                              const minPrice = Math.min(...prices);
                              const maxPrice = Math.max(...prices);
                              return minPrice === maxPrice ? minPrice.toFixed(2) : `${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)}`;
                            })()}
                          </Text>
                          {(() => {
                            const comparePrice = product.variants.edges[0]?.node.compareAtPrice;
                            if (comparePrice && parseFloat(comparePrice) > parseFloat(product.variants.edges[0].node.price)) {
                              return (
                                <Text as="span" variant="bodyXs" tone="subdued">
                                  <span style={{ textDecoration: 'line-through' }}>
                                    ${parseFloat(comparePrice).toFixed(2)}
                                  </span>
                                </Text>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Badge tone={getBadgeTone(inventory)}>
                      {`${inventory}`}
                    </Badge>

                    {/* Only show expand button for products with multiple variants */}
                    {product.variants.edges.length > 1 && (
                      <Button
                        icon={expandedProducts.has(product.id) ? ChevronUpIcon : ChevronDownIcon}
                        variant="plain"
                        size="slim"
                        onClick={() => toggleProductExpansion(product.id)}
                        accessibilityLabel={`${expandedProducts.has(product.id) ? 'Collapse' : 'Expand'} product details`}
                      />
                    )}
                    <Button
                      icon={ViewIcon}
                      variant="plain"
                      size="slim"
                      onClick={() => navigateToProduct(product, 'storefront')}
                      accessibilityLabel={`${product.status === 'ACTIVE' ? 'View live' : 'View admin'} ${product.title}`}
                    />
                  </div>
                </div>

                {/* Enhanced Expandable Details Section - Only for products with multiple variants */}
                {expandedProducts.has(product.id) && product.variants.edges.length > 1 && (
                  <Box paddingBlockStart="300" paddingInlineStart="400">
                    <div style={{ minHeight: '320px' }}>
                      <Card background="bg-surface-secondary" padding="400">
                      <BlockStack gap="400">
                        {/* Quick Actions Bar */}
                        <InlineStack gap="200" wrap>
                          <Button
                            variant="tertiary"
                            size="slim"
                            onClick={() => window.open(product.adminUrl, '_blank')}
                            disabled={!product.adminUrl}
                          >
                            Edit in Admin
                          </Button>
                          <Button
                            variant="tertiary"
                            size="slim"
                            onClick={() => window.open(product.storefrontUrl, '_blank')}
                            disabled={!product.storefrontUrl}
                          >
                            View Store
                          </Button>
                          <Button
                            variant="tertiary"
                            size="slim"
                            onClick={() => {
                              const newSelected = selectedProducts.includes(product.id) 
                                ? selectedProducts.filter(id => id !== product.id)
                                : [...selectedProducts, product.id];
                              setSelectedProducts(newSelected);
                            }}
                            tone={selectedProducts.includes(product.id) ? 'critical' : 'success'}
                          >
                            {selectedProducts.includes(product.id) ? 'Deselect' : 'Select'} Product
                          </Button>
                        </InlineStack>

                        {/* Product Info Grid - Only show when there are multiple variants */}
                        {product.variants.edges.length > 1 && (
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '20px'
                          }}>
                            {/* Basic Details */}
                            <BlockStack gap="200">
                              <Text as="p" variant="bodySm" fontWeight="medium">Product Details</Text>
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Handle:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">{product.handle}</Text>
                                </InlineStack>

                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">ID:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">{product.id.slice(-8)}</Text>
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>

                            {/* Pricing Summary */}
                            <BlockStack gap="200">
                              <Text as="p" variant="bodySm" fontWeight="medium">Pricing Overview</Text>
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Price Range:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">
                                    ${Math.min(...product.variants.edges.map(v => parseFloat(v.node.price)))} - 
                                    ${Math.max(...product.variants.edges.map(v => parseFloat(v.node.price)))}
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Variants:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">{product.variants.edges.length}</Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Total Stock:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">{product.totalInventory}</Text>
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>

                            {/* URLs & Links */}
                            <BlockStack gap="200">
                              <Text as="p" variant="bodySm" fontWeight="medium">Links & Access</Text>
                              <BlockStack gap="100">
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Admin URL:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">
                                    {product.adminUrl ? 'Available' : 'Not available'}
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Store URL:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">
                                    {product.storefrontUrl ? 'Available' : 'Not available'}
                                  </Text>
                                </InlineStack>
                                <InlineStack gap="200" blockAlign="center">
                                  <Text as="span" variant="bodyXs" fontWeight="medium">Has Image:</Text>
                                  <Text as="span" variant="bodyXs" tone="subdued">
                                    {product.featuredMedia?.preview?.image ? 'Yes' : 'No'}
                                  </Text>
                                </InlineStack>
                              </BlockStack>
                            </BlockStack>
                          </div>
                        )}

                        {/* Variant Management Section */}
                        {product.variants.edges.length > 0 && (
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <Text as="p" variant="bodySm" fontWeight="medium">
                                Variant Management ({product.variants.edges.length} variants)
                              </Text>
                              <Button
                                variant="plain"
                                size="slim"
                                onClick={() => handleProductSelection(product.id, true)}
                                disabled={getProductSelectionState(product.id) === 'all'}
                              >
                                {getProductSelectionState(product.id) === 'all' ? 'All Selected' : 'Select All Variants'}
                              </Button>
                            </InlineStack>
                            
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: 'auto 1fr auto auto auto auto', 
                              gap: '8px 12px',
                              alignItems: 'center',
                              fontSize: '12px',
                              maxHeight: '200px',
                              overflowY: 'auto',
                              backgroundColor: 'var(--p-color-bg-surface)',
                              padding: '12px',
                              borderRadius: '6px'
                            }}>
                              {/* Headers */}
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Select</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Variant</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Price</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Stock</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">SKU</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Actions</Text>
                              
                              {/* Variant rows */}
                              {product.variants.edges.map((variant) => (
                                <>
                                  <Checkbox
                                    key={`${variant.node.id}-checkbox`}
                                    label=""
                                    checked={selectedVariants.includes(variant.node.id)}
                                    onChange={(checked) => handleVariantSelection(product.id, variant.node.id, checked)}
                                  />
                                  <Text key={`${variant.node.id}-title`} as="span" variant="bodyXs">
                                    {variant.node.title !== 'Default Title' ? variant.node.title : 'Default'}
                                  </Text>
                                  <Text key={`${variant.node.id}-price`} as="span" variant="bodyXs" fontWeight="medium">
                                    ${variant.node.price}
                                  </Text>
                                  <Text 
                                    key={`${variant.node.id}-stock`} 
                                    as="span" 
                                    variant="bodyXs"
                                    tone={variant.node.inventoryQuantity === 0 ? 'critical' : 'success'}
                                  >
                                    {variant.node.inventoryQuantity || 0}
                                  </Text>
                                  <Text key={`${variant.node.id}-sku`} as="span" variant="bodyXs" tone="subdued">
                                    {variant.node.sku || '-'}
                                  </Text>
                                  <Button
                                    key={`${variant.node.id}-edit`}
                                    variant="plain"
                                    size="slim"
                                    onClick={() => {
                                      // Copy variant ID to clipboard for easy access
                                      navigator.clipboard.writeText(variant.node.id);
                                    }}
                                  >
                                    Copy ID
                                  </Button>
                                </>
                              ))}
                            </div>
                          </BlockStack>
                        )}


                      </BlockStack>
                    </Card>
                    </div>
                  </Box>
                )}
              </BlockStack>
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
    <>
      <style>{`
        @media (max-width: 768px) {
          .product-management-layout {
            flex-direction: column !important;
            height: auto !important;
            gap: 16px !important;
          }
          .bulk-operations-column {
            width: 100% !important;
            min-width: auto !important;
            margin-bottom: 16px;
          }
          .product-results-column {
            height: 60vh !important;
          }
        }
        @media (min-width: 1200px) {
          .product-management-layout {
            gap: 32px !important;
          }
          .bulk-operations-column {
            width: 440px !important;
          }
        }
      `}</style>
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

      {/* Product Management Header */}
      <Card>
        <BlockStack gap="500">
          {/* Header Row */}
          <InlineStack align="space-between" blockAlign="center">
            <Text as="h3" variant="headingMd">
              Product Management
            </Text>
            <InlineStack gap="300" blockAlign="center">
              <InlineStack gap="200">
                <Badge tone={filteredProducts.length === 0 ? 'attention' : 'info'}>
                  {`${filteredProducts.length} found`}
                </Badge>
                {selectedProducts.length > 0 && (
                  <Badge tone="success">
                    {`${selectedProducts.length} selected`}
                  </Badge>
                )}
                {selectedVariants.length > 0 && (
                  <Badge tone="info">
                    {`${selectedVariants.length} variants selected`}
                  </Badge>
                )}
              </InlineStack>
              <Button 
                onClick={fetchAllProducts} 
                loading={isLoading || fetcher.state === 'submitting'} 
                variant="secondary"
                size="slim"
              >
                Refresh Data
              </Button>
            </InlineStack>
          </InlineStack>
          
          {/* Bulk Operations Section */}
          <BlockStack gap="300">
            <InlineStack gap="300" blockAlign="center">
              <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                BULK OPERATIONS
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Select variants from the product table to enable bulk operations
              </Text>
            </InlineStack>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(7, minmax(85px, 1fr))', 
              gap: '8px',
              alignItems: 'center'
            }}>
              {[
                { id: 0, label: 'Pricing', icon: MoneyIcon },
                { id: 1, label: 'Collections', icon: CollectionIcon },
                { id: 2, label: 'Content', icon: EditIcon },
                { id: 3, label: 'Inventory', icon: InventoryIcon },
                { id: 4, label: 'Media', icon: ImageIcon },
                { id: 5, label: 'SEO', icon: SearchIcon },
                { id: 6, label: 'Status', icon: StatusIcon },
              ].map(({ id, label, icon }) => (
                <Button
                  key={id}
                  onClick={() => setActiveBulkTab(id)}
                  disabled={selectedVariants.length === 0}
                  variant={activeBulkTab === id ? 'primary' : 'secondary'}
                  size="slim"
                  icon={icon}
                  fullWidth
                >
                  {label}
                </Button>
              ))}
            </div>
          </BlockStack>
        </BlockStack>
      </Card>

      {/* Main Layout - Left: Management Controls, Right: Product List */}
      <div style={{ 
        display: 'flex', 
        gap: '24px', 
        minHeight: 'calc(100vh - 200px)',
        flexDirection: 'row'
      }} className="product-management-layout">
        {/* Left Column - Product Management Controls */}
        <div style={{ 
          width: '420px', 
          minWidth: '400px', 
          flexShrink: 0
        }} className="bulk-operations-column">
          <BlockStack gap="400">
            {/* Bulk Operations Content */}
            <Card background="bg-surface-secondary" padding="300">
              <BlockStack gap="300">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h4" variant="bodyMd" fontWeight="semibold">Bulk Operations</Text>
                  <Badge tone={selectedVariants.length > 0 ? 'success' : 'attention'}>
                    {selectedVariants.length > 0 ? `${selectedVariants.length} variants selected` : 'No variants selected'}
                  </Badge>
                </InlineStack>

                {/* Content area - full width */}
                <div style={{ 
                  minHeight: '320px',
                  padding: '16px',
                  backgroundColor: 'var(--p-color-bg-surface)',
                  borderRadius: '8px',
                  border: '1px solid var(--p-color-border-subdued)'
                }}>
                  {selectedVariants.length === 0 ? (
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '100%',
                      flexDirection: 'column',
                      gap: '16px',
                      color: 'var(--p-color-text-subdued)',
                      textAlign: 'center'
                    }}>
                      <div style={{ opacity: 0.3 }}>
                        <Icon source={ProductIcon} />
                      </div>
                      <div>
                        <Text as="p" variant="headingSm" tone="subdued">Select variants to begin</Text>
                        <Text as="p" variant="bodySm" tone="subdued">Choose product variants from the list and use the buttons above to perform bulk operations</Text>
                      </div>
                    </div>
                  ) : (
                    <Card background="bg-surface" padding="400">
                      <BlockStack gap="400">
                      {activeBulkTab === 0 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Pricing Operations</Text>
                          <ChoiceList
                            title="Price Update Method"
                            choices={[
                              { label: 'Set Fixed Price - Apply same price to all products', value: 'set' },
                              { label: 'Increase by Percentage - Add percentage to current prices', value: 'increase' },
                              { label: 'Decrease by Percentage - Subtract percentage from current prices', value: 'decrease' },
                              { label: `Round Prices`, value: 'round' },
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
                              placeholder="0.00" autoComplete="off"
                              prefix={currencySymbol}
                              helpText="Set the same price for all selected products"
                            />
                          )}
                          
                          {(priceOperation === 'increase' || priceOperation === 'decrease') && (
                            <TextField
                              label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                              type="number"
                              value={pricePercentage}
                              onChange={setPricePercentage}
                              placeholder="0" autoComplete="off"
                              suffix="%"
                              helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} current prices by this percentage`}
                            />
                          )}
                          
                          {priceOperation === 'round' && (
                            <ChoiceList
                              title="Rounding Rule"
                              choices={[
                                { label: `Round to nearest ${storeCurrency}`, value: 'nearest' },
                                { label: `Round up to next ${storeCurrency}`, value: 'up' },
                                { label: `Round down to previous ${storeCurrency}`, value: 'down' },
                              ]}
                              selected={[roundingRule]}
                              onChange={(value) => setRoundingRule(value[0] as any)}
                            />
                          )}
                          
                          {/* Compare Price Operations Section */}
                          <div style={{ 
                            borderTop: '1px solid var(--p-color-border)',
                            paddingTop: '16px',
                            marginTop: '16px'
                          }}>
                            <Checkbox
                              checked={applyCompareChanges}
                              onChange={setApplyCompareChanges}
                              label="Also update compare prices"
                              helpText="Note: Price changes above only apply to regular prices. Compare price changes are separate."
                            />
                            
                            {applyCompareChanges && (
                              <div style={{ marginTop: '12px' }}>
                                <ChoiceList
                                  title="Compare Price Operation"
                                  choices={[
                                    { label: 'Set fixed compare price', value: 'set' },
                                    { label: 'Increase compare price by percentage', value: 'increase' },
                                    { label: 'Decrease compare price by percentage', value: 'decrease' },
                                    { label: 'Remove compare prices', value: 'remove' },
                                  ]}
                                  selected={[compareOperation]}
                                  onChange={(value) => setCompareOperation(value[0] as any)}
                                />
                                
                                {compareOperation === 'set' && (
                                  <TextField
                                    label="Compare Price"
                                    type="number"
                                    value={compareValue}
                                    onChange={setCompareValue}
                                    placeholder="0.00" autoComplete="off"
                                    prefix={currencySymbol}
                                    helpText="Set the same compare price for all selected products"
                                  />
                                )}
                                
                                {(compareOperation === 'increase' || compareOperation === 'decrease') && (
                                  <TextField
                                    label={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} Compare Price Percentage`}
                                    type="number"
                                    value={comparePercentage}
                                    onChange={setComparePercentage}
                                    placeholder="0" autoComplete="off"
                                    suffix="%"
                                    helpText={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} current compare prices by this percentage. Only affects products that already have compare prices.`}
                                  />
                                )}
                                
                                {compareOperation === 'remove' && (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    This will remove compare prices from all selected products.
                                  </Text>
                                )}
                              </div>
                            )}
                          </div>
                          
                              <Button
                                variant="primary"
                                onClick={handleBulkPricing}
                                disabled={
                                  selectedProducts.length === 0 ||
                                  (priceOperation === 'set' && !priceValue) ||
                                  ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || pricePercentage === '0')) ||
                                  (applyCompareChanges && compareOperation === 'set' && !compareValue) ||
                                  (applyCompareChanges && (compareOperation === 'increase' || compareOperation === 'decrease') && (!comparePercentage || comparePercentage === '0'))
                                }
                              >
                            Apply Pricing Changes
                              </Button>
                    </BlockStack>
                      )}

                      {activeBulkTab === 1 && (
                        <BlockStack gap="500">
                          {/* Collections Section */}
                          <BlockStack gap="400">
                            <Text as="h5" variant="headingSm">Collection Management</Text>
                            <ChoiceList
                              title="Collection Operation"
                              choices={[
                                { label: 'Add to Collections', value: 'add' },
                                { label: 'Remove from Collections', value: 'remove' },
                                { label: 'Replace Collections', value: 'replace' },
                              ]}
                              selected={[collectionOperation]}
                              onChange={(value) => setCollectionOperation(value[0] as any)}
                            />
                            
                            <TextField
                              label="Search Collections"
                              value={collectionSearchQuery}
                              onChange={setCollectionSearchQuery}
                              placeholder="Search collections..." autoComplete="off"
                              clearButton
                              onClearButtonClick={() => setCollectionSearchQuery('')}
                            />
                            
                            {/* Collection Selection */}
                            <div style={{ maxHeight: '150px', overflowY: 'auto', border: '1px solid var(--p-color-border)', borderRadius: '4px', padding: '8px' }}>
                              <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                                Available Collections ({filteredCollections.length})
                              </Text>
                              <div style={{ marginTop: '8px' }}>
                                {filteredCollections.length > 0 ? (
                                  filteredCollections.map(collection => (
                                    <div key={collection.id} style={{ marginBottom: '4px' }}>
                                      <Checkbox
                                        checked={selectedCollections.includes(collection.id)}
                                        onChange={(checked) => {
                                          if (checked) {
                                            setSelectedCollections(prev => [...prev, collection.id]);
                                          } else {
                                            setSelectedCollections(prev => prev.filter(id => id !== collection.id));
                                          }
                                        }}
                                        label={collection.title}
                                      />
                                    </div>
                                  ))
                                ) : (
                                  <Text as="p" variant="bodySm" tone="subdued">
                                    No collections found
                                  </Text>
                                )}
                              </div>
                            </div>
                            
                            {selectedCollections.length > 0 && (
                              <Text as="p" variant="bodySm" tone="success">
                                {selectedCollections.length} collection{selectedCollections.length !== 1 ? 's' : ''} selected
                              </Text>
                            )}
                            
                            <Button
                              variant="primary"
                              onClick={handleBulkCollections}
                              disabled={selectedCollections.length === 0 || selectedProducts.length === 0}
                              loading={isLoading}
                            >
                              Apply Collections
                            </Button>
                          </BlockStack>

                          {/* Tags Section */}
                          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="400">
                              <Text as="h5" variant="headingSm">Tag Management</Text>
                              <ChoiceList
                                title="Tag Operation"
                                choices={[
                                  { label: 'Add Tags', value: 'add' },
                                  { label: 'Remove Tags', value: 'remove' },
                                  { label: 'Replace Tags', value: 'replace' },
                                ]}
                                selected={[tagOperation]}
                                onChange={(value) => setTagOperation(value[0] as any)}
                              />
                              
                              {tagOperation === 'remove' ? (
                                <TextField
                                  label="Tags to Remove"
                                  value={tagRemoveValue}
                                  onChange={setTagRemoveValue}
                                  placeholder="tag1, tag2, tag3" autoComplete="off"
                                  helpText="Separate multiple tags with commas"
                                />
                              ) : (
                                <TextField
                                  label={tagOperation === 'add' ? 'Tags to Add' : 'New Tags'}
                                  value={tagValue}
                                  onChange={setTagValue}
                                  placeholder="tag1, tag2, tag3" autoComplete="off"
                                  helpText="Separate multiple tags with commas"
                                />
                              )}
                              
                              <Button
                                variant="secondary"
                                onClick={() => {/* TODO: Implement tag updates */}}
                                disabled={!tagValue && !tagRemoveValue}
                              >
                                Apply Tags
                              </Button>
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      )}

                      {activeBulkTab === 2 && (
                        <BlockStack gap="500">
                          {/* Title Updates Section */}
                          <BlockStack gap="400">
                            <Text as="h5" variant="headingSm">Title Updates</Text>
                            <ChoiceList
                              title="Title Operation"
                              choices={[
                                { label: 'Add Prefix', value: 'prefix' },
                                { label: 'Add Suffix', value: 'suffix' },
                                { label: 'Find & Replace', value: 'replace' },
                              ]}
                              selected={[titleOperation]}
                              onChange={(value) => setTitleOperation(value[0] as any)}
                            />
                            
                            {titleOperation === 'replace' ? (
                              <InlineStack gap="300">
                                <TextField
                                  label="Find"
                                  value={titleReplaceFrom}
                                  onChange={setTitleReplaceFrom}
                                  placeholder="Text to find" autoComplete="off"
                                />
                                <TextField
                                  label="Replace With"
                                  value={titleReplaceTo}
                                  onChange={setTitleReplaceTo}
                                  placeholder="Replacement text" autoComplete="off"
                                />
                              </InlineStack>
                            ) : (
                              <TextField
                                label={titleOperation === 'prefix' ? 'Prefix Text' : 'Suffix Text'}
                                value={titleValue}
                                onChange={setTitleValue}
                                placeholder={titleOperation === 'prefix' ? 'Add to beginning...' : 'Add to end...'}
                                autoComplete="off"
                              />
                            )}
                            
                            <Button
                              variant="primary"
                              onClick={handleBulkTitleUpdate}
                              disabled={selectedProducts.length === 0 || (titleOperation === 'replace' ? (!titleReplaceFrom || !titleReplaceTo) : !titleValue)}
                              loading={isLoading}
                            >
                              Apply Titles
                            </Button>
                          </BlockStack>

                          {/* Description Updates Section */}
                          <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                            <BlockStack gap="400">
                              <Text as="h5" variant="headingSm">Description Updates</Text>
                              <ChoiceList
                                title="Description Operation"
                                choices={[
                                  { label: 'Append Text', value: 'append' },
                                  { label: 'Prepend Text', value: 'prepend' },
                                  { label: 'Find & Replace', value: 'replace' },
                                ]}
                                selected={[descriptionOperation]}
                                onChange={(value) => setDescriptionOperation(value[0] as any)}
                              />
                              
                              {descriptionOperation === 'replace' ? (
                                <InlineStack gap="300">
                                  <TextField
                                    label="Find"
                                    value={descriptionReplaceFrom}
                                    onChange={setDescriptionReplaceFrom}
                                    placeholder="Text to find" autoComplete="off"
                                  />
                                  <TextField
                                    label="Replace With"
                                    value={descriptionReplaceTo}
                                    onChange={setDescriptionReplaceTo}
                                    placeholder="Replacement text" autoComplete="off"
                                  />
                                </InlineStack>
                              ) : (
                                <TextField
                                  label={descriptionOperation === 'append' ? 'Text to Append' : 'Text to Prepend'}
                                  value={descriptionValue}
                                  onChange={setDescriptionValue}
                                  multiline={4}
                                  placeholder={descriptionOperation === 'append' ? 'Add to end of descriptions...' : 'Add to beginning of descriptions...'}
                                  autoComplete="off"
                                />
                              )}
                              
                              <Button
                                variant="secondary"
                                onClick={() => {/* TODO: Implement description updates */}}
                                disabled={!descriptionValue && !descriptionReplaceFrom}
                              >
                                Apply Descriptions
                              </Button>
                            </BlockStack>
                          </Box>
                        </BlockStack>
                      )}



                      {activeBulkTab === 3 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Inventory Management</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Manage stock levels, SKUs, costs, and inventory tracking for selected products.
                          </Text>
                          
                          <ChoiceList
                            title="Inventory Operation"
                            choices={[
                              { label: 'Update Stock Quantities', value: 'stock' },
                              { label: 'Update SKUs', value: 'sku' },
                              { label: 'Update Costs & Tracking', value: 'cost' },
                            ]}
                            selected={[inventoryOperation]}
                            onChange={(value) => setInventoryOperation(value[0] as any)}
                          />
                          
                          {inventoryOperation === 'stock' && (
                            <BlockStack gap="300">
                              <ChoiceList
                                title="Stock Update Method"
                                choices={[
                                  { label: 'Set Absolute Quantity', value: 'set' },
                                  { label: 'Add to Current Stock', value: 'add' },
                                  { label: 'Subtract from Current Stock', value: 'subtract' },
                                ]}
                                selected={[stockUpdateMethod]}
                                onChange={(value) => setStockUpdateMethod(value[0] as any)}
                              />
                              
                              <TextField
                                label={`Quantity to ${stockUpdateMethod === 'set' ? 'Set' : stockUpdateMethod === 'add' ? 'Add' : 'Subtract'}`}
                                type="number"
                                value={stockQuantity}
                                onChange={setStockQuantity}
                                placeholder="0" 
                                autoComplete="off"
                                helpText={`${stockUpdateMethod === 'set' ? 'Set exact quantity' : stockUpdateMethod === 'add' ? 'Add to current stock' : 'Subtract from current stock'} for all selected variants`}
                              />
                            </BlockStack>
                          )}
                          
                          {inventoryOperation === 'sku' && (
                            <BlockStack gap="300">
                              <ChoiceList
                                title="SKU Update Method"
                                choices={[
                                  { label: 'Add Prefix to SKUs', value: 'prefix' },
                                  { label: 'Add Suffix to SKUs', value: 'suffix' },
                                  { label: 'Replace SKU Pattern', value: 'replace' },
                                  { label: 'Generate New SKUs', value: 'generate' },
                                ]}
                                selected={[skuUpdateMethod]}
                                onChange={(value) => setSkuUpdateMethod(value[0] as any)}
                              />
                              
                              {skuUpdateMethod === 'replace' ? (
                                <InlineStack gap="300">
                                  <TextField
                                    label="Find in SKU"
                                    value={skuFindText}
                                    onChange={setSkuFindText}
                                    placeholder="Text to find" 
                                    autoComplete="off"
                                  />
                                  <TextField
                                    label="Replace With"
                                    value={skuReplaceText}
                                    onChange={setSkuReplaceText}
                                    placeholder="Replacement text" 
                                    autoComplete="off"
                                  />
                                </InlineStack>
                              ) : skuUpdateMethod === 'generate' ? (
                                <TextField
                                  label="SKU Pattern"
                                  value={skuPattern}
                                  onChange={setSkuPattern}
                                  placeholder="e.g., PROD-{id}-{variant}" 
                                  autoComplete="off"
                                  helpText="Use {id} for product ID, {variant} for variant number"
                                />
                              ) : (
                                <TextField
                                  label={skuUpdateMethod === 'prefix' ? 'Prefix Text' : 'Suffix Text'}
                                  value={skuValue}
                                  onChange={setSkuValue}
                                  placeholder={skuUpdateMethod === 'prefix' ? 'Add to beginning...' : 'Add to end...'} 
                                  autoComplete="off"
                                />
                              )}
                            </BlockStack>
                          )}
                          
                          {inventoryOperation === 'cost' && (
                            <BlockStack gap="300">
                              <TextField
                                label="Product Cost"
                                type="number"
                                value={costValue}
                                onChange={setCostValue}
                                placeholder="0.00" 
                                autoComplete="off"
                                prefix="$"
                                helpText="Set the cost price for all selected products"
                              />
                              
                              <TextField
                                label="Weight"
                                type="number"
                                value={weightValue}
                                onChange={setWeightValue}
                                placeholder="0.0" 
                                autoComplete="off"
                                suffix="lbs"
                                helpText="Set the weight for all selected products"
                              />
                              
                              <TextField
                                label="Origin Country"
                                value={originCountry}
                                onChange={setOriginCountry}
                                placeholder="Enter country code (e.g., US, CA, UK)" 
                                autoComplete="off"
                                helpText="Set the origin country for all selected products"
                              />
                              
                              <Checkbox
                                checked={trackInventory}
                                onChange={setTrackInventory}
                                label="Track inventory quantities"
                                helpText="Enable inventory tracking for selected variants"
                              />
                            </BlockStack>
                          )}
                          
                          <Button
                            variant="primary"
                            onClick={handleBulkInventoryUpdate}
                            disabled={
                              selectedProducts.length === 0 || 
                              (inventoryOperation === 'stock' && !stockQuantity) ||
                              (inventoryOperation === 'sku' && 
                                ((skuUpdateMethod === 'replace' && (!skuFindText || !skuReplaceText)) ||
                                 (skuUpdateMethod === 'generate' && !skuPattern) ||
                                 ((skuUpdateMethod === 'prefix' || skuUpdateMethod === 'suffix') && !skuValue))) ||
                              (inventoryOperation === 'cost' && !costValue && !weightValue && !originCountry)
                            }
                            loading={isLoading}
                          >
                            Apply Inventory Changes
                          </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 4 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Media Management</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Media management features will be available soon. This will include:
                          </Text>
                          <ul>
                            <li>Bulk image upload and replacement</li>
                            <li>Alt text updates for accessibility</li>
                            <li>Video management</li>
                            <li>Image optimization</li>
                          </ul>
                          <Button
                            variant="secondary"
                            disabled
                          >
                            Coming Soon
                          </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 5 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">SEO & Metadata</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Optimize search engine visibility and metadata for selected products.
                          </Text>
                          
                          <ChoiceList
                            title="SEO Operation"
                            choices={[
                              { label: 'Update SEO Titles', value: 'seo-title' },
                              { label: 'Update Meta Descriptions', value: 'meta-desc' },
                              { label: 'Update URL Handles', value: 'handles' },
                            ]}
                            selected={[seoOperation]}
                            onChange={(value) => setSeoOperation(value[0] as any)}
                          />
                          
                          {seoOperation === 'seo-title' && (
                            <TextField
                              label="SEO Title Template"
                              value={seoTitleTemplate}
                              onChange={setSeoTitleTemplate}
                              placeholder="e.g., {title} - Premium Quality | Your Store"
                              autoComplete="off"
                              helpText="Use {title} for product title, {price} for price"
                            />
                          )}
                          
                          {seoOperation === 'meta-desc' && (
                            <TextField
                              label="Meta Description Template"
                              value={metaDescTemplate}
                              onChange={setMetaDescTemplate}
                              multiline={3}
                              placeholder="e.g., Shop {title} at the best price. High quality products with fast shipping."
                              autoComplete="off"
                              helpText="Use {title}, {price}, {description} as placeholders"
                            />
                          )}
                          
                          {seoOperation === 'handles' && (
                            <ChoiceList
                              title="Handle Update Method"
                              choices={[
                                { label: 'Auto-generate from Title', value: 'auto' },
                                { label: 'Add Prefix to Handles', value: 'prefix' },
                                { label: 'Add Suffix to Handles', value: 'suffix' },
                              ]}
                              selected={[handleUpdateMethod]}
                              onChange={(value) => setHandleUpdateMethod(value[0] as any)}
                            />
                          )}
                          
                          {handleUpdateMethod === 'prefix' && (
                            <TextField
                              label="Handle Prefix"
                              value={handlePrefix}
                              onChange={setHandlePrefix}
                              placeholder="e.g., premium-"
                              autoComplete="off"
                            />
                          )}
                          
                          {handleUpdateMethod === 'suffix' && (
                            <TextField
                              label="Handle Suffix"
                              value={handleSuffix}
                              onChange={setHandleSuffix}
                              placeholder="e.g., -2024"
                              autoComplete="off"
                            />
                          )}
                          
                          <Button
                            variant="primary"
                            onClick={() => {/* TODO: Implement SEO updates */}}
                            disabled={
                              selectedProducts.length === 0 ||
                              (seoOperation === 'seo-title' && !seoTitleTemplate) ||
                              (seoOperation === 'meta-desc' && !metaDescTemplate) ||
                              (seoOperation === 'handles' && handleUpdateMethod === 'prefix' && !handlePrefix) ||
                              (seoOperation === 'handles' && handleUpdateMethod === 'suffix' && !handleSuffix)
                            }
                          >
                            Apply SEO Changes
                          </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 6 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Status & Visibility</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Manage product status, visibility, and publication settings.
                          </Text>
                          
                          <ChoiceList
                            title="Status Operation"
                            choices={[
                              { label: 'Change Product Status', value: 'status' },
                              { label: 'Update Visibility', value: 'visibility' },
                              { label: 'Set Publication Date', value: 'publish-date' },
                            ]}
                            selected={[statusOperation]}
                            onChange={(value) => setStatusOperation(value[0] as any)}
                          />
                          
                          {statusOperation === 'status' && (
                            <ChoiceList
                              title="Product Status"
                              choices={[
                                { label: 'Active - Make products live', value: 'ACTIVE' },
                                { label: 'Draft - Save as draft', value: 'DRAFT' },
                                { label: 'Archived - Archive products', value: 'ARCHIVED' },
                              ]}
                              selected={[newProductStatus]}
                              onChange={(value) => setNewProductStatus(value[0] as any)}
                            />
                          )}
                          
                          {statusOperation === 'visibility' && (
                            <ChoiceList
                              title="Visibility Settings"
                              choices={[
                                { label: 'Visible in Online Store', value: 'online-store' },
                                { label: 'Hidden from Online Store', value: 'hidden' },
                                { label: 'Available on Sales Channels', value: 'sales-channels' },
                              ]}
                              selected={visibilitySettings}
                              onChange={setVisibilitySettings}
                              allowMultiple
                            />
                          )}
                          
                          {statusOperation === 'publish-date' && (
                            <TextField
                              label="Publication Date"
                              type="datetime-local"
                              value={publishDate}
                              onChange={setPublishDate}
                              autoComplete="off"
                              helpText="Set when products should be published"
                            />
                          )}
                          
                          <Button
                            variant="primary"
                            onClick={() => {/* TODO: Implement status updates */}}
                            disabled={
                              selectedProducts.length === 0 ||
                              (statusOperation === 'status' && !newProductStatus) ||
                              (statusOperation === 'visibility' && visibilitySettings.length === 0) ||
                              (statusOperation === 'publish-date' && !publishDate)
                            }
                          >
                            Apply Status Changes
                          </Button>
                        </BlockStack>
                      )}


                        </BlockStack>
                      </Card>
                    )}
                </div>
              </BlockStack>
            </Card>
          </BlockStack>
        </div>

        {/* Right Column - Product Results */}
        <div style={{ 
          flex: 1, 
          minHeight: 'calc(100vh - 200px)',
          display: 'flex',
          flexDirection: 'column'
        }} className="product-results-column">
          <BlockStack gap="400">
            {/* Smart Filters & Controls */}
            <Card background="bg-surface-secondary" padding="400">
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h4" variant="headingSm">Filters & Search</Text>
                  <Button
                    variant="plain"
                    size="slim"
                    onClick={() => {
                      setSearchQuery('');
                      setCurrentCategory('all');
                      setShowDraftProducts(true);
                      setFilterByCollection('');
                    }}
                  >
                    Clear All
                  </Button>
                </InlineStack>

                {/* Search Section */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyXs" fontWeight="medium" tone="subdued">SEARCH & FILTER</Text>
                  <TextField
                    label=""
                    value={searchQuery}
                    onChange={setSearchQuery}
                    placeholder="Search by product name, handle, or SKU..."
                    autoComplete="off"
                    clearButton
                    onClearButtonClick={() => setSearchQuery('')}
                  />
                </BlockStack>

                {/* Filter Controls */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyXs" fontWeight="medium" tone="subdued">CATEGORY & STATUS</Text>
                  <InlineStack gap="300">
                    <div style={{ flex: 1 }}>
                      <Select
                        label=""
                        value={currentCategory}
                        onChange={(value) => setCurrentCategory(value as InventoryCategory)}
                        options={ProductConstants.CATEGORY_OPTIONS as any}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
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
                    </div>
                  </InlineStack>
                  <Checkbox
                    checked={showDraftProducts}
                    onChange={setShowDraftProducts}
                    label="Include draft products in results"
                  />
                </BlockStack>

                {/* Statistics Section */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyXs" fontWeight="medium" tone="subdued">CURRENT VIEW STATISTICS</Text>
                  <InlineStack gap="400" wrap>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">{filteredProducts.length}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Products Found</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">{selectedVariants.length}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Variants Selected</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredProducts.filter(p => p.status === 'ACTIVE').length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Active</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredProducts.filter(p => p.totalInventory === 0).length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Out of Stock</Text>
                    </InlineStack>
                  </InlineStack>
                </BlockStack>

                {/* Quick Actions */}
                <BlockStack gap="300">
                  <Text as="p" variant="bodyXs" fontWeight="medium" tone="subdued">QUICK ACTIONS</Text>
                  
                  {/* Collection Filter */}
                  <div style={{ marginBottom: '12px' }}>
                    <Select
                      label=""
                      placeholder="Filter by collection..."
                      value={filterByCollection}
                      onChange={setFilterByCollection}
                      options={[
                        { label: 'All Collections', value: '' },
                        ...availableCollections.map(collection => ({
                          label: collection.title,
                          value: collection.id
                        }))
                      ]}
                    />
                  </div>
                  
                  <InlineStack gap="200" wrap>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        const activeProducts = filteredProducts.filter(p => p.status === 'ACTIVE');
                        activeProducts.forEach(product => handleProductSelection(product.id, true));
                      }}
                      disabled={filteredProducts.filter(p => p.status === 'ACTIVE').length === 0}
                    >
                      Select All Active
                    </Button>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        const outOfStockProducts = filteredProducts.filter(p => p.totalInventory === 0);
                        outOfStockProducts.forEach(product => handleProductSelection(product.id, true));
                      }}
                      disabled={filteredProducts.filter(p => p.totalInventory === 0).length === 0}
                    >
                      Select Out of Stock
                    </Button>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        setSelectedProducts([]);
                        setSelectedVariants([]);
                      }}
                      disabled={selectedProducts.length === 0 && selectedVariants.length === 0}
                    >
                      Clear Selection
                    </Button>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>

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
                    setFilterByCollection('');
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
                <InlineStack gap="300" blockAlign="center">
                <Text as="p" variant="bodySm" tone="subdued">
                    Showing {Math.min(productResultsSliderIndex + 1, filteredProducts.length)} - {Math.min(productResultsSliderIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                </Text>
                  {filteredProducts.length > productsPerPage && (
                    <InlineStack gap="200" blockAlign="center">
                      <Button
                        size="micro"
                        disabled={productResultsSliderIndex === 0}
                        onClick={() => setProductResultsSliderIndex(Math.max(0, productResultsSliderIndex - productsPerPage))}
                        icon={ChevronLeftIcon}
                      >
                        Previous
                      </Button>
                      <Button
                        size="micro"
                        disabled={productResultsSliderIndex + productsPerPage >= filteredProducts.length}
                        onClick={() => setProductResultsSliderIndex(Math.min(filteredProducts.length - productsPerPage, productResultsSliderIndex + productsPerPage))}
                        icon={ChevronRightIcon}
                      >
                        Next
                      </Button>
                    </InlineStack>
                  )}
                </InlineStack>
              </InlineStack>
              
              {/* Select All Checkbox for Product Results */}
              <InlineStack gap="300" blockAlign="center">
                <Checkbox
                  checked={isAllResultsSelected()}
                  onChange={handleSelectAllResults}
                  label=""
                />
                <Text as="p" variant="bodySm" fontWeight="medium">
                  Select all {filteredProducts.length} products in results
                </Text>
                {selectedProducts.length > 0 && (
                  <Badge tone="info">
                    {`${selectedProducts.length} selected`}
                  </Badge>
                )}
              </InlineStack>
              
              {renderCardView()}
            </BlockStack>
          )}
        </BlockStack>
      </Card>
          </BlockStack>
        </div>
      </div>
    </BlockStack>
    </>
  );
}
