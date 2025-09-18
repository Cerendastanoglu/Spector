import { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
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
  Collapsible,
  Link,
  Banner,
  Toast,
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
  media?: {
    edges: Array<{
      node: {
        id: string;
        image?: {
          url: string;
          altText?: string;
        };
      };
    }>;
  };
  totalInventory: number;
  status: string;
  tags?: string[];
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

// Product Image Slideshow Component
const ProductImageSlideshow: React.FC<{ 
  product: Product; 
  size?: 'small' | 'medium' | 'large' 
}> = ({ product, size = 'small' }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // Get all available images
  const images = React.useMemo(() => {
    const mediaImages = product.media?.edges
      ?.map(edge => edge.node.image)
      .filter(img => img && img.url) || [];
    
    const featuredImage = product.featuredMedia?.preview?.image;
    
    // Combine images, ensuring featured image is first if it exists and isn't already in media
    const allImages = [];
    if (featuredImage) {
      allImages.push(featuredImage);
    }
    
    // Add media images that aren't the same as featured image
    mediaImages.forEach(img => {
      if (img && (!featuredImage || img.url !== featuredImage.url)) {
        allImages.push(img);
      }
    });
    
    return allImages;
  }, [product.featuredMedia, product.media]);
  
  // Reset current index when product changes
  React.useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id]);
  
  if (images.length === 0) {
    return (
      <Thumbnail
        source={ProductIcon}
        alt={product.title}
        size={size}
      />
    );
  }
  
  if (images.length === 1) {
    return (
      <Thumbnail
        source={images[0].url}
        alt={images[0].altText || product.title}
        size={size}
      />
    );
  }
  
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Thumbnail
        source={images[currentImageIndex]?.url || ProductIcon}
        alt={images[currentImageIndex]?.altText || product.title}
        size={size}
      />
      {images.length > 1 && (
        <div style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '2px 6px',
          borderRadius: '8px',
          backdropFilter: 'blur(4px)'
        }}>
          {images.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentImageIndex(index)}
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                border: 'none',
                backgroundColor: index === currentImageIndex ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              aria-label={`View image ${index + 1} of ${images.length}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function ProductManagement({ isVisible, initialCategory = 'all' }: ProductManagementProps) {
  // Add CSS animations
  useEffect(() => {
    const styles = document.createElement('style');
    styles.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .grid-item-hover {
        transition: all 0.2s ease-in-out;
      }
      .grid-item-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      }
    `;
    document.head.appendChild(styles);
    return () => {
      if (styles.parentNode) {
        styles.parentNode.removeChild(styles);
      }
    };
  }, []);

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
  const [collectionOperation, setCollectionOperation] = useState<'add' | 'remove'>('add');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{id: string, title: string}[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  const [showCurrentCollections, setShowCurrentCollections] = useState(false);
  
  // Collection Filter State
  const [filterByCollection, setFilterByCollection] = useState<string>('');
  
  // Currency State
  const [storeCurrency, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [shopDomain, setShopDomain] = useState<string>('');
  
  // New Bulk Operations State
  const [titleOperation, setTitleOperation] = useState<'prefix' | 'suffix' | 'replace'>('prefix');
  const [titleValue, setTitleValue] = useState('');
  const [titleReplaceFrom, setTitleReplaceFrom] = useState('');
  const [titleReplaceTo, setTitleReplaceTo] = useState('');
  
  // Notification State
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    error?: boolean;
  }>({ show: false, message: '' });
  
  const [descriptionOperation, setDescriptionOperation] = useState<'append' | 'prepend' | 'replace'>('append');
  const [descriptionValue, setDescriptionValue] = useState('');
  const [descriptionReplaceFrom, setDescriptionReplaceFrom] = useState('');
  const [descriptionReplaceTo, setDescriptionReplaceTo] = useState('');
  
  const [tagOperation, setTagOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [tagValue, setTagValue] = useState('');
  const [tagRemoveValue, setTagRemoveValue] = useState('');
  
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

  // Bulk Discount Operations State
  const [discountOperation, setDiscountOperation] = useState<'set' | 'increase' | 'decrease'>('set');
  const [discountValue, setDiscountValue] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');

  
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
      setSelectedVariants(prev => {
        const newSelectedVariants = [...prev, variantId];
        
        // Check if all variants are now selected, if so add product to selectedProducts
        const variantIds = getProductVariantIds(productId);
        if (variantIds.length > 0 && variantIds.every(id => newSelectedVariants.includes(id))) {
          setSelectedProducts(prevProducts => [...new Set([...prevProducts, productId])]);
        }
        
        return newSelectedVariants;
      });
    } else {
      setSelectedVariants(prev => {
        const newSelectedVariants = prev.filter(id => id !== variantId);
        
        // Remove product from selectedProducts since not all variants are selected
        setSelectedProducts(prevProducts => prevProducts.filter(id => id !== productId));
        
        return newSelectedVariants;
      });
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
      // Use real product data from API (including collections)
      const productsWithMockPricing = fetcher.data.products.map((product: Product, index: number) => ({
        ...product,
        // Keep real collections data from API, only add mock compare prices for testing
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
      setProducts(productsWithMockPricing);
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
    if (selectedVariants.length === 0) {
      setError("Please select at least one variant to update pricing.");
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
      // Process each selected variant individually
      const variantUpdates = [];
      
      for (let i = 0; i < selectedVariants.length; i++) {
        const variantId = selectedVariants[i];
        
        // Find the product and variant
        let targetProduct = null;
        let targetVariant = null;
        
        for (const product of products) {
          const variant = product.variants.edges.find(edge => edge.node.id === variantId);
          if (variant) {
            targetProduct = product;
            targetVariant = variant.node;
            break;
          }
        }
        
        if (!targetProduct || !targetVariant) {
          failed.push(`Variant ID ${variantId}: Variant not found`);
          continue;
        }

        try {
          let newPrice: number;
          let newComparePrice: string | null = null;
          const currentPrice = parseFloat(targetVariant.price || '0');
          const currentComparePrice = targetVariant.compareAtPrice ? parseFloat(targetVariant.compareAtPrice) : null;
          
          if (currentPrice === 0 && priceOperation !== 'set') {
            failed.push(`${targetProduct.title} (${targetVariant.title}): No current price found. Please set a fixed price first.`);
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
            failed.push(`${targetProduct.title} (${targetVariant.title}): Calculated price ($${newPrice.toFixed(2)}) is below minimum ($0.01)`);
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
                  console.log(`${targetProduct.title} (${targetVariant.title}): No existing compare price to increase`);
                }
                break;
              case 'decrease':
                if (currentComparePrice !== null) {
                  const compareDecreasePercent = parseFloat(comparePercentage) || 0;
                  newComparePrice = (currentComparePrice * (1 - compareDecreasePercent / 100)).toFixed(2);
                } else {
                  // Skip if no existing compare price
                  console.log(`${targetProduct.title} (${targetVariant.title}): No existing compare price to decrease`);
                }
                break;
              case 'remove':
                newComparePrice = null;
                break;
            }
          }

          variantUpdates.push({
            productId: targetProduct.id,
            variantId: targetVariant.id,
            productTitle: targetProduct.title,
            price: newPrice.toFixed(2),
            compareAtPrice: newComparePrice
          });
          
          successful.push(`${targetProduct.title} (${targetVariant.title})`);
          
        } catch (error) {
          failed.push(`${targetProduct?.title || targetVariant.id} (${targetVariant.title}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (variantUpdates.length === 0) {
        throw new Error('No variants could be updated. Please check the errors above.');
      }
      
      // Make real API call to update prices
      const formData = new FormData();
      formData.append('action', 'update-product-prices');
      formData.append('updates', JSON.stringify(variantUpdates));
      
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
            return {
              ...product,
              variants: {
                ...product.variants,
                edges: product.variants.edges.map(edge => {
                  const variantUpdate = result.results.find((r: any) => r.variantId === edge.node.id);
                  if (variantUpdate && variantUpdate.success) {
                    return {
                      ...edge,
                      node: {
                        ...edge.node,
                        price: variantUpdate.newPrice || edge.node.price,
                        compareAtPrice: variantUpdate.newCompareAtPrice !== undefined ? variantUpdate.newCompareAtPrice : edge.node.compareAtPrice
                      }
                    };
                  }
                  return edge;
                })
              }
            };
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

  // Separate handler for regular pricing only
  const handleBulkRegularPricing = async () => {
    if (selectedVariants.length === 0) {
      setError("Please select at least one variant to update pricing.");
      return;
    }
    
    // Validation based on operation type
    if (priceOperation === 'set' && (!priceValue || parseFloat(priceValue) <= 0)) {
      setError("Please enter a valid price greater than $0.");
      return;
    }
    
    if ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || pricePercentage.trim() === '' || isNaN(parseFloat(pricePercentage)))) {
      setError("Please enter a valid percentage for price adjustment.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const failed: string[] = [];
    const successful: string[] = [];
    
    try {
      // Process each selected variant individually
      const variantUpdates = [];
      
      for (let i = 0; i < selectedVariants.length; i++) {
        const variantId = selectedVariants[i];
        
        // Find the product and variant
        let targetProduct = null;
        let targetVariant = null;
        
        for (const product of products) {
          const variant = product.variants.edges.find(edge => edge.node.id === variantId);
          if (variant) {
            targetProduct = product;
            targetVariant = variant.node;
            break;
          }
        }

        if (!targetProduct || !targetVariant) {
          failed.push(`Variant ${variantId}: Product not found`);
          continue;
        }

        try {
          const currentPrice = parseFloat(targetVariant.price);

          if (currentPrice === 0 && priceOperation !== 'set') {
            failed.push(`${targetProduct.title} (${targetVariant.title}): No current price found. Please set a fixed price first.`);
            continue;
          }

          let newPrice = currentPrice;

          // Calculate new regular price
          switch (priceOperation) {
            case 'set':
              newPrice = parseFloat(priceValue);
              break;
            case 'increase':
              const increasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 + increasePercent / 100);
              break;
            case 'decrease':
              const decreasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 - decreasePercent / 100);
              break;
            case 'round':
              if (roundingRule === 'up') {
                newPrice = Math.ceil(currentPrice);
              } else if (roundingRule === 'down') {
                newPrice = Math.floor(currentPrice);
              } else {
                newPrice = Math.round(currentPrice);
              }
              break;
            default:
              newPrice = currentPrice;
          }

          // Ensure minimum price
          if (newPrice < 0.01) {
            failed.push(`${targetProduct.title} (${targetVariant.title}): Calculated price ($${newPrice.toFixed(2)}) is below minimum ($0.01)`);
            continue;
          }

          variantUpdates.push({
            productId: targetProduct.id,
            variantId: targetVariant.id,
            productTitle: targetProduct.title,
            price: newPrice.toFixed(2),
            compareAtPrice: targetVariant.compareAtPrice // Keep existing compare price
          });
          
          successful.push(`${targetProduct.title} (${targetVariant.title})`);
          
        } catch (error) {
          console.error(`Error updating variant ${targetVariant.id}:`, error);
          failed.push(`${targetProduct?.title || targetVariant.id} (${targetVariant.title}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (variantUpdates.length === 0) {
        throw new Error('No variants could be updated. Please check the errors above.');
      }
      
      // Make API call to update prices
      const formData = new FormData();
      formData.append('action', 'update-product-prices');
      formData.append('updates', JSON.stringify(variantUpdates));
      
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
            return {
              ...product,
              variants: {
                ...product.variants,
                edges: product.variants.edges.map(edge => {
                  const variantUpdate = result.results.find((r: any) => r.variantId === edge.node.id);
                  if (variantUpdate && variantUpdate.success) {
                    return {
                      ...edge,
                      node: {
                        ...edge.node,
                        price: variantUpdate.newPrice || edge.node.price
                      }
                    };
                  }
                  return edge;
                })
              }
            };
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
        console.log(`✅ Successfully updated regular pricing for ${apiSuccessful.length} variants!`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${apiSuccessful.length} variants updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Reset form only if completely successful
      if (failed.length === 0) {
        setPriceValue('');
        setPricePercentage('0');
      }
      
    } catch (error) {
      console.error('Bulk regular pricing error:', error);
      setError(`Failed to update regular prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Separate handler for compare pricing only
  const handleBulkComparePricing = async () => {
    if (selectedVariants.length === 0) {
      setError("Please select at least one variant to update compare pricing.");
      return;
    }
    
    // Validation based on operation type
    if (compareOperation === 'set' && (!compareValue || parseFloat(compareValue) <= 0)) {
      setError("Please enter a valid compare price greater than $0.");
      return;
    }
    
    if ((compareOperation === 'increase' || compareOperation === 'decrease') && (!comparePercentage || comparePercentage.trim() === '' || isNaN(parseFloat(comparePercentage)))) {
      setError("Please enter a valid percentage for compare price adjustment.");
      return;
    }

    setIsLoading(true);
    setError(null);
    
    const failed: string[] = [];
    const successful: string[] = [];
    
    try {
      // Process each selected variant individually
      const variantUpdates = [];
      
      for (let i = 0; i < selectedVariants.length; i++) {
        const variantId = selectedVariants[i];
        
        // Find the product and variant
        let targetProduct = null;
        let targetVariant = null;
        
        for (const product of products) {
          const variant = product.variants.edges.find(edge => edge.node.id === variantId);
          if (variant) {
            targetProduct = product;
            targetVariant = variant.node;
            break;
          }
        }

        if (!targetProduct || !targetVariant) {
          failed.push(`Variant ${variantId}: Product not found`);
          continue;
        }

        try {
          const currentComparePrice = targetVariant.compareAtPrice ? parseFloat(targetVariant.compareAtPrice) : null;
          let newComparePrice = currentComparePrice;

          // Calculate new compare price
          switch (compareOperation) {
            case 'set':
              newComparePrice = parseFloat(compareValue);
              break;
            case 'increase':
              if (currentComparePrice !== null) {
                const compareIncreasePercent = parseFloat(comparePercentage) || 0;
                newComparePrice = (currentComparePrice * (1 + compareIncreasePercent / 100));
              } else {
                console.log(`${targetProduct.title} (${targetVariant.title}): No existing compare price to increase`);
                continue; // Skip this variant
              }
              break;
            case 'decrease':
              if (currentComparePrice !== null) {
                const compareDecreasePercent = parseFloat(comparePercentage) || 0;
                newComparePrice = (currentComparePrice * (1 - compareDecreasePercent / 100));
              } else {
                console.log(`${targetProduct.title} (${targetVariant.title}): No existing compare price to decrease`);
                continue; // Skip this variant
              }
              break;
            case 'remove':
              newComparePrice = null;
              break;
          }

          variantUpdates.push({
            productId: targetProduct.id,
            variantId: targetVariant.id,
            productTitle: targetProduct.title,
            price: targetVariant.price, // Keep existing regular price
            compareAtPrice: newComparePrice
          });
          
          successful.push(`${targetProduct.title} (${targetVariant.title})`);
          
        } catch (error) {
          console.error(`Error updating variant ${targetVariant.id}:`, error);
          failed.push(`${targetProduct?.title || targetVariant.id} (${targetVariant.title}): ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      if (variantUpdates.length === 0) {
        throw new Error('No variants could be updated. Please check the errors above.');
      }
      
      // Make API call to update prices
      const formData = new FormData();
      formData.append('action', 'update-product-prices');
      formData.append('updates', JSON.stringify(variantUpdates));
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update compare prices');
      }
      
      // Update UI immediately with new compare prices
      if (result.success) {
        setProducts(prevProducts => 
          prevProducts.map(product => {
            return {
              ...product,
              variants: {
                ...product.variants,
                edges: product.variants.edges.map(edge => {
                  const variantUpdate = result.results.find((r: any) => r.variantId === edge.node.id);
                  if (variantUpdate && variantUpdate.success) {
                    return {
                      ...edge,
                      node: {
                        ...edge.node,
                        compareAtPrice: variantUpdate.newCompareAtPrice !== undefined ? variantUpdate.newCompareAtPrice : edge.node.compareAtPrice
                      }
                    };
                  }
                  return edge;
                })
              }
            };
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
        console.log(`✅ Successfully updated compare pricing for ${apiSuccessful.length} variants!`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${apiSuccessful.length} variants updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Reset form only if completely successful
      if (failed.length === 0) {
        setCompareAtPrice('');
        setCompareValue('');
        setComparePercentage('0');
        setApplyCompareChanges(false);
      }
      
    } catch (error) {
      console.error('Bulk compare pricing error:', error);
      setError(`Failed to update compare prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    const failed: string[] = [];
    const successful: string[] = [];
    
    try {
      // Prepare updates for API call
      const updates = selectedProducts.map(productId => ({
        productId,
        collectionIds: selectedCollections,
        operation: collectionOperation
      }));
      
      // Make API call to update collections
      const formData = new FormData();
      formData.append('action', 'update-collections');
      formData.append('updates', JSON.stringify(updates));
      
      console.log('🔄 Sending collection operation:', { updates, operation: collectionOperation });
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      console.log('📤 Collection API response:', result);
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update collections');
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
        apiSuccessful.forEach((success: any) => {
          const product = products.find(p => p.id === success.productId);
          successful.push(product?.title || success.productId);
        });
      }
      
      // Update local state to reflect changes
      if (result.success) {
        // Fetch updated product data to refresh collections
        await fetchAllProducts();
      }
      
      const actionText = collectionOperation === 'add' ? 'added to' : 'removed from';
      const collectionNames = selectedCollections.map(id => 
        availableCollections.find(col => col.id === id)?.title
      ).filter(Boolean).join(', ');
      
      if (successful.length > 0) {
        setNotification({
          show: true,
          message: `Successfully ${actionText} ${collectionNames} for ${successful.length} product${successful.length > 1 ? 's' : ''}`,
          error: false
        });
      }
      
      if (failed.length > 0) {
        setNotification({
          show: true,
          message: `${successful.length} products updated, ${failed.length} failed. See console for details.`,
          error: true
        });
        console.log("Failed operations:", failed);
      }
      
      // Reset collection selections only if completely successful
      if (failed.length === 0) {
        setSelectedCollections([]);
      }
      
    } catch (error) {
      console.error('Failed to update collections:', error);
      setError(`Failed to update collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkTags = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update tags.");
      return;
    }
    
    if (tagOperation === 'add' && !tagValue) {
      setError("Please provide tags to add.");
      return;
    }
    
    if (tagOperation === 'remove' && !tagRemoveValue) {
      setError("Please provide tags to remove.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const productIds = selectedProducts; // selectedProducts is already an array of IDs
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-tags',
          productIds,
          tagOperation,
          tagValue: tagOperation === 'add' ? tagValue : undefined,
          tagRemoveValue: tagOperation === 'remove' ? tagRemoveValue : undefined,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update tags');
      }

      // Update local state with the new tags
      setProducts(prevProducts => 
        prevProducts.map(product => {
          const updatedProduct = result.updatedProducts?.find((p: any) => p.id === product.id);
          if (updatedProduct) {
            return { ...product, tags: updatedProduct.tags };
          }
          return product;
        })
      );
      
      // Process results like the collections handler
      const successful: string[] = [];
      const failed: string[] = [];
      
      if (result.failedProducts && result.failedProducts.length > 0) {
        result.failedProducts.forEach((failure: any) => {
          failed.push(`${failure.productId}: ${failure.error}`);
        });
      }
      
      if (result.updatedProducts && result.updatedProducts.length > 0) {
        result.updatedProducts.forEach((success: any) => {
          const product = products.find(p => p.id === success.id);
          successful.push(product?.title || success.id);
        });
      }
      
      // Update local state to reflect changes
      if (result.success) {
        // Fetch updated product data to refresh tags
        await fetchAllProducts();
      }
      
      const actionText = tagOperation === 'add' ? 'added tags to' : 
                        tagOperation === 'remove' ? 'removed tags from' : 'updated tags for';
      const tagNames = tagOperation === 'add' ? tagValue : tagRemoveValue;
      
      if (successful.length > 0) {
        console.log(`✅ Successfully ${actionText} ${successful.length} products! Tags: ${tagNames}`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${successful.length} products updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Clear form only if completely successful
      if (failed.length === 0) {
        setTagValue('');
        setTagRemoveValue('');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update tags';
      console.error('Failed to update tags:', error);
      setError(errorMessage);
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
    setError("");
    
    try {
      const productIds = selectedProducts; // selectedProducts is already an array of IDs
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-titles',
          productIds,
          titleOperation,
          titleValue: titleOperation !== 'replace' ? titleValue : undefined,
          titleReplaceFrom: titleOperation === 'replace' ? titleReplaceFrom : undefined,
          titleReplaceTo: titleOperation === 'replace' ? titleReplaceTo : undefined,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update titles');
      }

      // Update local state with the new titles
      setProducts(prevProducts => 
        prevProducts.map(product => {
          const updatedProduct = result.updatedProducts?.find((p: any) => p.id === product.id);
          if (updatedProduct) {
            return { ...product, title: updatedProduct.title };
          }
          return product;
        })
      );
      
      // Process results like other handlers
      const successful: string[] = [];
      const failed: string[] = [];
      
      if (result.results) {
        result.results.forEach((resultItem: any) => {
          if (resultItem.success) {
            const product = products.find(p => p.id === resultItem.productId);
            successful.push(product?.title || resultItem.productId);
          } else {
            failed.push(`${resultItem.productId}: ${resultItem.error}`);
          }
        });
      }

      // Update local state to reflect changes
      if (result.success) {
        // Fetch updated product data to refresh titles
        await fetchAllProducts();
      }
      
      let operationText = '';
      if (titleOperation === 'prefix') {
        operationText = `added prefix "${titleValue}" to`;
      } else if (titleOperation === 'suffix') {
        operationText = `added suffix "${titleValue}" to`;
      } else {
        operationText = `replaced "${titleReplaceFrom}" with "${titleReplaceTo}" in`;
      }
      
      if (successful.length > 0) {
        console.log(`✅ Successfully ${operationText} ${successful.length} product titles!`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${successful.length} products updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Clear form only if completely successful
      if (failed.length === 0) {
        setTitleValue('');
        setTitleReplaceFrom('');
        setTitleReplaceTo('');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update titles';
      console.error('Failed to update titles:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkDescriptionUpdate = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update descriptions.");
      return;
    }
    
    // Validation based on operation type
    if ((descriptionOperation === 'append' || descriptionOperation === 'prepend') && !descriptionValue) {
      setError("Please enter description text to add.");
      return;
    }
    
    if (descriptionOperation === 'replace' && (!descriptionReplaceFrom || !descriptionReplaceTo)) {
      setError("Please provide both find and replace text for description replacement.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const response = await fetch('/app/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-descriptions',
          productIds: selectedProducts,
          descriptionOperation,
          descriptionValue,
          descriptionReplaceFrom,
          descriptionReplaceTo,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`Failed to update descriptions: ${errorText}`);
      }
      
      const result = await response.json();

      // Process results like other handlers
      const successful: string[] = [];
      const failed: string[] = [];
      
      if (result.results) {
        result.results.forEach((resultItem: any) => {
          if (resultItem.success) {
            const product = products.find(p => p.id === resultItem.productId);
            successful.push(product?.title || resultItem.productId);
          } else {
            failed.push(`${resultItem.productId}: ${resultItem.error}`);
          }
        });
      }

      // Update local state to reflect changes
      if (result.success) {
        // Fetch updated product data to refresh descriptions
        await fetchAllProducts();
      }
      
      let operationText = '';
      if (descriptionOperation === 'append') {
        operationText = `appended text to descriptions of`;
      } else if (descriptionOperation === 'prepend') {
        operationText = `prepended text to descriptions of`;
      } else {
        operationText = `replaced "${descriptionReplaceFrom}" with "${descriptionReplaceTo}" in descriptions of`;
      }
      
      if (successful.length > 0) {
        console.log(`✅ Successfully ${operationText} ${successful.length} products!`);
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${successful.length} products updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
      }
      
      // Clear form only if completely successful
      if (failed.length === 0) {
        setDescriptionValue('');
        setDescriptionReplaceFrom('');
        setDescriptionReplaceTo('');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update descriptions';
      console.error('Failed to update descriptions:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkInventoryUpdate = async () => {
    if (selectedVariants.length === 0) {
      setError("Please select at least one variant to update inventory.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      if (inventoryOperation === 'stock') {
        const response = await fetch('/app/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'update-inventory',
            variantIds: selectedVariants,
            inventoryOperation,
            stockQuantity,
            stockUpdateMethod,
          }),
        });

        const result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update inventory');
        }

        // Process results like other handlers
        const successful: string[] = [];
        const failed: string[] = [];
        
        if (result.results) {
          result.results.forEach((resultItem: any) => {
            if (resultItem.success) {
              successful.push(resultItem.variantId);
            } else {
              failed.push(`${resultItem.variantId}: ${resultItem.error}`);
            }
          });
        }

        // Update local state to reflect changes
        if (result.success) {
          // Fetch updated product data to refresh inventory
          await fetchAllProducts();
        }
        
        const actionText = stockUpdateMethod === 'set' ? 'set stock to' : 
                          stockUpdateMethod === 'add' ? 'added' : 'subtracted';
        
        if (successful.length > 0) {
          console.log(`✅ Successfully ${actionText} ${stockQuantity} for ${successful.length} variants!`);
        }
        
        if (failed.length > 0) {
          console.log(`⚠️ ${successful.length} variants updated successfully. ${failed.length} failed.`);
          console.log("Failed operations:", failed);
        }
        
        // Clear form only if completely successful
        if (failed.length === 0) {
          setStockQuantity('');
        }
        
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

  // Load available collections from Shopify API
  const loadCollections = async () => {
    try {
      console.log('Loading collections from Shopify...');
      
      const formData = new FormData();
      formData.append('action', 'fetch-collections');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.collections) {
        const collections = result.collections.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title
        }));
        setAvailableCollections(collections);
        console.log('Collections loaded:', collections.length);
      } else {
        throw new Error(result.error || 'Failed to fetch collections');
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
      setError('Failed to load collections');
      // Fallback to empty array so the UI doesn't break
      setAvailableCollections([]);
    }
  };

  // Load store currency from Shopify API
  const loadStoreCurrency = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'get-shop-info');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (response.ok && result.shop) {
        const currencyCode = result.shop.currencyCode || 'USD';
        
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
          'TRY': '₺',  // Turkish Lira
          'TL': '₺',   // Alternative for Turkish Lira
          'INR': '₹',
          'CNY': '¥',
          'BRL': 'R$',
          'MXN': '$',
          'RUB': '₽',
          'KRW': '₩',
          'PLN': 'zł',
          'CZK': 'Kč',
          'HUF': 'Ft',
          'ZAR': 'R',
        };
        
        setStoreCurrency(currencyCode);
        setCurrencySymbol(currencySymbols[currencyCode] || currencyCode + ' ');
        
        // Extract shop domain from myshopifyDomain (e.g., "my-shop.myshopify.com" -> "my-shop")
        const domain = result.shop.myshopifyDomain || '';
        const shopName = domain.split('.')[0];
        setShopDomain(shopName);
        
        console.log(`💰 Store currency loaded: ${currencyCode} (${currencySymbols[currencyCode] || currencyCode})`);
        console.log(`🏪 Shop domain: ${shopName}`);
      } else {
        throw new Error(result.error || 'Failed to fetch shop info');
      }
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
            <ProductImageSlideshow product={product} size="small" />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Text as="span" variant="bodyMd" fontWeight="semibold">
                    {product.title}
                  </Text>
                  <Button
                    variant="plain"
                    size="micro"
                    icon={EditIcon}
                    url={shopDomain ? `https://admin.shopify.com/store/${shopDomain}/products/${product.id.split('/').pop()}` : '#'}
                    external
                    accessibilityLabel={`Edit ${product.title}`}
                  />
                </div>
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
      <div style={{ 
        animation: 'fadeIn 0.3s ease-in-out',
        transition: 'all 0.2s ease-in-out'
      }}>
        <ResourceList
          items={paginatedProducts}
          renderItem={(product) => {
            const inventory = product.totalInventory;
            const isSelected = getProductSelectionState(product.id) !== 'none';
            return (
              <div style={{
                transition: 'all 0.2s ease-in-out',
                transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.1)' : 'none',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <ResourceItem
                  id={product.id}
                  media={
                    <div style={{
                      transition: 'transform 0.2s ease-in-out',
                      borderRadius: '6px',
                      overflow: 'hidden'
                    }}>
                      <Thumbnail
                        source={product.featuredMedia?.preview?.image?.url || ProductIcon}
                        alt={product.featuredMedia?.preview?.image?.altText || product.title}
                      />
                    </div>
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

                            {/* Tags Section */}
                            {product.tags && product.tags.length > 0 && (
                              <BlockStack gap="200">
                                <Text as="p" variant="bodySm" fontWeight="medium">Tags</Text>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                  {product.tags.slice(0, 6).map((tag, index) => (
                                    <div
                                      key={index}
                                      style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#374151',
                                        border: '1px solid #e5e7eb'
                                      }}
                                    >
                                      {tag}
                                    </div>
                                  ))}
                                  {product.tags.length > 6 && (
                                    <div
                                      style={{
                                        backgroundColor: '#f3f4f6',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        color: '#6b7280',
                                        border: '1px solid #e5e7eb'
                                      }}
                                    >
                                      +{product.tags.length - 6} more
                                    </div>
                                  )}
                                </div>
                              </BlockStack>
                            )}
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
              </div>
          );
        }}
      />
      </div>
    );
  };

  if (!isVisible) {
    return null;
  }

  // Bulk Discount Handler
  const handleBulkDiscount = async () => {
    if (!selectedVariants.length) {
      setError("Please select at least one variant to apply discounts.");
      return;
    }

    // Basic validation
    if (discountOperation === 'set' && (!discountValue || parseFloat(discountValue) < 0 || parseFloat(discountValue) > 100)) {
      setError("Please enter a valid discount percentage between 0 and 100.");
      return;
    }

    if ((discountOperation === 'increase' || discountOperation === 'decrease') && (!discountPercentage || parseFloat(discountPercentage) <= 0)) {
      setError("Please enter a valid percentage.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Note: This is a placeholder for discount functionality
      // In a real implementation, you would:
      // 1. Determine current discount values for selected variants
      // 2. Calculate new discount values based on operation
      // 3. Update products via Shopify Admin API
      // 4. Handle discount codes, price rules, or compare-at prices
      
      console.log('Bulk discount operation:', {
        operation: discountOperation,
        value: discountValue,
        percentage: discountPercentage,
        selectedVariants: selectedVariants.length
      });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, show a success message
      setError("Bulk discount feature is coming soon! This will allow you to apply discounts to selected products.");
      
    } catch (error: any) {
      console.error('Bulk discount error:', error);
      setError(error.message || 'Failed to apply bulk discounts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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
              gridTemplateColumns: 'repeat(8, minmax(85px, 1fr))', 
              gap: '8px',
              alignItems: 'center'
            }}>
              {[
                { id: 0, label: 'Pricing', icon: MoneyIcon },
                { id: 1, label: 'Collections', icon: CollectionIcon },
                { id: 2, label: 'Content', icon: EditIcon },
                { id: 3, label: 'Inventory', icon: InventoryIcon },
                { id: 4, label: 'Status', icon: StatusIcon },
                { id: 5, label: 'Discounts', icon: MoneyIcon },
                { id: 6, label: 'SEO', icon: SearchIcon },
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
                          
                          {/* Separate buttons for regular and compare pricing */}
                          <InlineStack gap="400">
                            <Button
                              variant="primary"
                              onClick={handleBulkRegularPricing}
                              disabled={
                                selectedVariants.length === 0 ||
                                (priceOperation === 'set' && !priceValue) ||
                                ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || pricePercentage === '0'))
                              }
                            >
                              Apply Regular Pricing
                            </Button>
                            
                            {applyCompareChanges && (
                              <Button
                                variant="secondary"
                                onClick={handleBulkComparePricing}
                                disabled={
                                  selectedVariants.length === 0 ||
                                  (compareOperation === 'set' && !compareValue) ||
                                  ((compareOperation === 'increase' || compareOperation === 'decrease') && (!comparePercentage || comparePercentage === '0'))
                                }
                              >
                                Apply Compare Pricing
                              </Button>
                            )}
                          </InlineStack>
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
                              ]}
                              selected={[collectionOperation]}
                              onChange={(value) => setCollectionOperation(value[0] as any)}
                            />
                            
                            {/* Current Collections Display */}
                            {selectedProducts.length > 0 && (
                              <Collapsible
                                id="current-collections"
                                open={showCurrentCollections}
                                transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
                              >
                                <div style={{
                                  border: '1px solid var(--p-color-border-subdued)',
                                  borderRadius: '8px',
                                  padding: '12px',
                                  backgroundColor: 'var(--p-color-bg-surface-secondary)'
                                }}>
                                  <Text as="h6" variant="headingXs" fontWeight="medium">
                                    Current Collections for Selected Products
                                  </Text>
                                  <div style={{ marginTop: '8px' }}>
                                    {(() => {
                                      // Get all collections from selected products
                                      const currentCollections = new Map();
                                      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
                                      
                                      selectedProductsData.forEach(product => {
                                        const productCollections = product.collections?.edges?.map(edge => edge.node) || [];
                                        productCollections.forEach(collection => {
                                          if (!currentCollections.has(collection.id)) {
                                            currentCollections.set(collection.id, {
                                              ...collection,
                                              productCount: 0,
                                              products: []
                                            });
                                          }
                                          currentCollections.get(collection.id).productCount++;
                                          currentCollections.get(collection.id).products.push(product.title);
                                        });
                                      });

                                      const collectionsArray = Array.from(currentCollections.values());
                                      
                                      if (collectionsArray.length === 0) {
                                        return (
                                          <Text as="p" variant="bodySm" tone="subdued">
                                            Selected products are not in any collections
                                          </Text>
                                        );
                                      }

                                      return collectionsArray.map(collection => (
                                        <div key={collection.id} style={{ 
                                          marginBottom: '8px',
                                          padding: '8px',
                                          backgroundColor: 'var(--p-color-bg-surface)',
                                          borderRadius: '4px',
                                          border: '1px solid var(--p-color-border)'
                                        }}>
                                          <InlineStack align="space-between" blockAlign="center">
                                            <BlockStack gap="100">
                                              <Text as="p" variant="bodySm" fontWeight="medium">
                                                {collection.title}
                                              </Text>
                                              <Text as="p" variant="bodySm" tone="subdued">
                                                {collection.productCount} of {selectedProducts.length} selected products
                                              </Text>
                                            </BlockStack>
                                            <Badge tone={collection.productCount === selectedProducts.length ? 'success' : 'attention'}>
                                              {collection.productCount === selectedProducts.length ? 'All' : `${collection.productCount}/${selectedProducts.length}`}
                                            </Badge>
                                          </InlineStack>
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>
                              </Collapsible>
                            )}
                            
                            <Button
                              variant="plain"
                              onClick={() => setShowCurrentCollections(!showCurrentCollections)}
                              disabled={selectedProducts.length === 0}
                              icon={showCurrentCollections ? ChevronUpIcon : ChevronDownIcon}
                            >
                              {showCurrentCollections ? 'Hide' : 'Show'} Current Collections
                            </Button>
                            
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
                                onClick={handleBulkTags}
                                disabled={!tagValue && !tagRemoveValue}
                                loading={isLoading}
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
                                variant="primary"
                                onClick={handleBulkDescriptionUpdate}
                                disabled={
                                  selectedProducts.length === 0 ||
                                  ((descriptionOperation === 'append' || descriptionOperation === 'prepend') && !descriptionValue) ||
                                  (descriptionOperation === 'replace' && (!descriptionReplaceFrom || !descriptionReplaceTo))
                                }
                                loading={isLoading}
                              >
                                Apply Descriptions
                              </Button>
                            </BlockStack>
                          </Box>

                          {/* Media Management Section */}
                          <Box padding="400" background="bg-surface-tertiary" borderRadius="200">
                            <BlockStack gap="400">
                              <Text as="h5" variant="headingSm">Media Management</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Media management features will be available soon. This will include:
                              </Text>
                              <ul style={{ paddingLeft: '20px', margin: '8px 0' }}>
                                <li>Bulk image upload and replacement</li>
                                <li>Alt text updates for accessibility</li>
                                <li>Video management and optimization</li>
                                <li>Image quality optimization</li>
                              </ul>
                              <Button
                                variant="secondary"
                                disabled
                              >
                                Media Management (Coming Soon)
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
                              selectedVariants.length === 0 || 
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
                          <Text as="h5" variant="headingSm">Status & Visibility</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Manage product status, visibility, and publication settings for selected products.
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
                                { label: 'Active - Products are live and visible', value: 'ACTIVE' },
                                { label: 'Draft - Products are saved but not published', value: 'DRAFT' },
                                { label: 'Archived - Products are hidden from all channels', value: 'ARCHIVED' },
                              ]}
                              selected={[newProductStatus]}
                              onChange={(value) => setNewProductStatus(value[0] as any)}
                            />
                          )}
                          
                          {statusOperation === 'visibility' && (
                            <ChoiceList
                              title="Visibility Settings"
                              choices={[
                                { label: 'Show in Online Store', value: 'online-store' },
                                { label: 'Hide from Online Store', value: 'hidden' },
                                { label: 'Available in Point of Sale', value: 'pos' },
                                { label: 'Show in Search Results', value: 'search' },
                              ]}
                              selected={visibilitySettings}
                              onChange={setVisibilitySettings}
                              allowMultiple
                            />
                          )}
                          
                          {statusOperation === 'publish-date' && (
                            <TextField
                              label="Publication Date & Time"
                              type="datetime-local"
                              value={publishDate}
                              onChange={setPublishDate}
                              autoComplete="off"
                              helpText="Set when products should be automatically published"
                            />
                          )}
                          
                          <Button
                            variant="secondary"
                            onClick={() => {/* TODO: Implement status updates */}}
                            disabled={
                              selectedProducts.length === 0 ||
                              (statusOperation === 'status' && !newProductStatus) ||
                              (statusOperation === 'visibility' && visibilitySettings.length === 0) ||
                              (statusOperation === 'publish-date' && !publishDate)
                            }
                          >
                            Apply Status Changes (Coming Soon)
                          </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 5 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Discount Management</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Apply discounts and promotional pricing to selected products.
                          </Text>
                          
                          <ChoiceList
                            title="Discount Operation"
                            choices={[
                              { label: 'Set Discount Percentage', value: 'set' },
                              { label: 'Increase Current Discounts', value: 'increase' },
                              { label: 'Decrease Current Discounts', value: 'decrease' },
                            ]}
                            selected={[discountOperation]}
                            onChange={(value) => setDiscountOperation(value[0] as any)}
                          />
                          
                          {discountOperation === 'set' && (
                            <TextField
                              label="Discount Percentage"
                              type="number"
                              value={discountValue}
                              onChange={setDiscountValue}
                              placeholder="25"
                              autoComplete="off"
                              suffix="%"
                              helpText="Set discount percentage (0-100%)"
                            />
                          )}
                          
                          {(discountOperation === 'increase' || discountOperation === 'decrease') && (
                            <TextField
                              label={`${discountOperation === 'increase' ? 'Increase' : 'Decrease'} Discount Percentage`}
                              type="number"
                              value={discountPercentage}
                              onChange={setDiscountPercentage}
                              placeholder="10"
                              autoComplete="off"
                              suffix="%"
                              helpText={`${discountOperation === 'increase' ? 'Increase' : 'Decrease'} current discounts by this percentage`}
                            />
                          )}
                          
                          <Button
                            variant="primary"
                            onClick={handleBulkDiscount}
                            disabled={
                              selectedVariants.length === 0 ||
                              (discountOperation === 'set' && (!discountValue || parseFloat(discountValue) < 0 || parseFloat(discountValue) > 100)) ||
                              ((discountOperation === 'increase' || discountOperation === 'decrease') && (!discountPercentage || parseFloat(discountPercentage) <= 0))
                            }
                            loading={isLoading}
                          >
                            Apply Discounts
                          </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 6 && (
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
                            variant="secondary"
                            onClick={() => {/* TODO: Implement SEO updates */}}
                            disabled={
                              selectedProducts.length === 0 ||
                              (seoOperation === 'seo-title' && !seoTitleTemplate) ||
                              (seoOperation === 'meta-desc' && !metaDescTemplate) ||
                              (seoOperation === 'handles' && handleUpdateMethod === 'prefix' && !handlePrefix) ||
                              (seoOperation === 'handles' && handleUpdateMethod === 'suffix' && !handleSuffix)
                            }
                          >
                            Apply SEO Changes (Coming Soon)
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
    
    {notification.show && (
      <Toast
        content={notification.message}
        error={notification.error}
        onDismiss={() => setNotification({ show: false, message: '' })}
        duration={4000}
      />
    )}
    </>
  );
}
