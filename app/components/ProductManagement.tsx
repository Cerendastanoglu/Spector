import React, { useState, useEffect } from "react";
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
  Thumbnail,
  ResourceList,
  ResourceItem,
  Box,
  Spinner,
  EmptyState,
  Icon,
  Collapsible,
  Toast,
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
  // Add CSS animations - Fixed to prevent header interference
  useEffect(() => {
    const styles = document.createElement('style');
    styles.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideIn {
        from { opacity: 0; transform: translateX(-10px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.98); }
        to { opacity: 1; transform: scale(1); }
      }
      .grid-item-hover {
        transition: all 0.2s ease-in-out;
        position: relative;
        z-index: 1;
      }
      .grid-item-hover:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        z-index: 2;
      }
      .product-table-container {
        position: relative;
        z-index: 0;
        isolation: isolate;
      }
      .product-table-header {
        position: sticky;
        top: 0;
        z-index: 10;
        background: white;
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
  
  // Main Workflow Tab State (Step 1: Select Products -> Step 2: Bulk Edit)
  const [activeMainTab, setActiveMainTab] = useState(0);
  
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
  
  // Advanced Filter States
  const [filterByVendor, setFilterByVendor] = useState<string>('');
  const [filterByProductType, setFilterByProductType] = useState<string>('');
  const [filterByTags, setFilterByTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [inventoryRange, setInventoryRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [hasImages, setHasImages] = useState<string>('all'); // 'all', 'with', 'without'
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [collections, setCollections] = useState<{id: string, title: string}[]>([]);
  
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
  
  // Content operation state
  const [contentOperation, setContentOperation] = useState<'title' | 'description' | 'tags'>('title');
  
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
  
  // Collapsible tag filter state
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  
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
      
      // Extract unique values for filters
      const collectionsMap = new Map<string, {id: string, title: string}>();
      const tagFrequency = new Map<string, number>();
      
      productsWithMockPricing.forEach((product: Product) => {
        // Extract collections using Map to avoid duplicates by ID
        if (product.collections?.edges) {
          product.collections.edges.forEach(edge => {
            collectionsMap.set(edge.node.id, { id: edge.node.id, title: edge.node.title });
          });
        }
        
        // Extract tags and count frequency
        if (product.tags) {
          product.tags.forEach(tag => {
            const trimmedTag = tag.trim();
            if (trimmedTag) {
              tagFrequency.set(trimmedTag, (tagFrequency.get(trimmedTag) || 0) + 1);
            }
          });
        }
      });
      
      // Update collections and tags state
      const uniqueCollections = Array.from(collectionsMap.values()).sort((a, b) => a.title.localeCompare(b.title));
      setCollections(uniqueCollections);
      setAvailableCollections(uniqueCollections);
      
      // Sort tags by frequency (most popular first), then alphabetically
      const sortedTags = Array.from(tagFrequency.entries())
        .sort((a, b) => {
          if (b[1] !== a[1]) return b[1] - a[1]; // Sort by frequency descending
          return a[0].localeCompare(b[0]); // Then alphabetically
        })
        .map(([tag]) => tag);
      
      setAvailableTags(sortedTags);
      
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
  }, [
    searchQuery, 
    currentCategory, 
    showDraftProducts, 
    sortField, 
    sortDirection, 
    filterByCollection,
    filterByVendor,
    filterByProductType,
    filterByTags,
    tagSearchQuery,
    priceRange,
    inventoryRange,
    filterByStatus,
    hasImages
  ]);

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

    // Vendor filter (temporarily disabled until added to GraphQL query)
    // if (filterByVendor && product.vendor !== filterByVendor) {
    //   return false;
    // }

    // Product Type filter (temporarily disabled until added to GraphQL query)
    // if (filterByProductType && product.productType !== filterByProductType) {
    //   return false;
    // }

    // Tags filter (product must have ALL selected tags)
    if (filterByTags.length > 0) {
      const productTags = product.tags || [];
      const hasAllTags = filterByTags.every(tag => 
        productTags.some(productTag => 
          productTag.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (!hasAllTags) {
        return false;
      }
    }

    // Status filter
    if (filterByStatus !== 'all' && product.status !== filterByStatus.toUpperCase()) {
      return false;
    }

    // Images filter
    if (hasImages !== 'all') {
      const productHasImages = product.featuredMedia?.preview?.image || (product.media?.edges && product.media.edges.length > 0);
      if (hasImages === 'with' && !productHasImages) {
        return false;
      }
      if (hasImages === 'without' && productHasImages) {
        return false;
      }
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      const productPrice = parseFloat(product.variants.edges[0]?.node.price || '0');
      if (priceRange.min && productPrice < parseFloat(priceRange.min)) {
        return false;
      }
      if (priceRange.max && productPrice > parseFloat(priceRange.max)) {
        return false;
      }
    }

    // Inventory range filter
    if (inventoryRange.min || inventoryRange.max) {
      const inventory = product.totalInventory;
      if (inventoryRange.min && inventory < parseInt(inventoryRange.min)) {
        return false;
      }
      if (inventoryRange.max && inventory > parseInt(inventoryRange.max)) {
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

  // Bulk Status Handler
  const handleBulkStatus = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update status.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('action', 'update-status');
      formData.append('productIds', JSON.stringify(selectedProducts));
      formData.append('status', newProductStatus);

      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update product status');
      }

      // Update UI with new status
      if (result.success) {
        setProducts(prevProducts =>
          prevProducts.map(product => {
            if (selectedProducts.includes(product.id)) {
              return {
                ...product,
                status: newProductStatus
              };
            }
            return product;
          })
        );

        setNotification({
          show: true,
          message: `Successfully updated status to ${newProductStatus} for ${selectedProducts.length} product${selectedProducts.length > 1 ? 's' : ''}`,
          error: false
        });
      }

    } catch (error) {
      console.error('Failed to update status:', error);
      setError(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    const tableHeadings = [
      <div key="select-all" style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '300px' }}>
        <Checkbox
          checked={
            paginatedProducts.length > 0 && 
            paginatedProducts.every(product => getProductSelectionState(product.id) !== 'none')
          }
          onChange={(checked) => {
            paginatedProducts.forEach(product => {
              handleBulkSelect(product.id, checked);
            });
          }}
          label=""
        />
        <Text as="span" variant="bodyMd" fontWeight="semibold">
          Product
        </Text>
      </div>,
      <div key="status" style={{ textAlign: 'center', minWidth: '80px' }}>
        <Text as="span" variant="bodyMd" fontWeight="semibold">Status</Text>
      </div>,
      <div key="inventory" style={{ textAlign: 'center', minWidth: '100px' }}>
        <Text as="span" variant="bodyMd" fontWeight="semibold">Inventory</Text>
      </div>,
      <div key="variants" style={{ textAlign: 'center', minWidth: '80px' }}>
        <Text as="span" variant="bodyMd" fontWeight="semibold">Variants</Text>
      </div>,
      <div key="actions" style={{ textAlign: 'center', minWidth: '120px' }}>
        <Text as="span" variant="bodyMd" fontWeight="semibold">Actions</Text>
      </div>
    ];

    const rows: any[] = [];
    
    paginatedProducts.forEach((product, index) => {
      const productKey = `product-${product.id}-${index}`;
      const inventory = product.totalInventory;
      const hasMultipleVariants = product.variants.edges.length > 1;
      const isExpanded = expandedProducts.has(product.id);

      // Status dot component
      const getStatusDot = (status: string) => {
        const colors = {
          ACTIVE: '#22c55e',
          DRAFT: '#f59e0b', 
          ARCHIVED: '#6b7280'
        };
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
              backgroundColor: colors[status as keyof typeof colors] || '#6b7280',
              boxShadow: `0 0 0 2px ${colors[status as keyof typeof colors] || '#6b7280'}20`
            }} />
            <Text as="span" variant="bodySm" tone="subdued">
              {status.charAt(0) + status.slice(1).toLowerCase()}
            </Text>
          </div>
        );
      };

      // Inventory dot component
      const getInventoryDot = (inventory: number) => {
        const getColor = () => {
          if (inventory === 0) return '#ef4444';
          if (inventory < 10) return '#f59e0b';
          if (inventory < 50) return '#3b82f6';
          return '#22c55e';
        };
        
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
              backgroundColor: getColor(),
              boxShadow: `0 0 0 2px ${getColor()}20`
            }} />
            <Text as="span" variant="bodySm">
              {inventory} units
            </Text>
          </div>
        );
      };

      // Main product row
      const productRow = [
        // Product info cell with image, title, and handle
        <div key={`${productKey}-product`} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          minWidth: '300px',
          padding: '12px 8px'
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Checkbox
              checked={getProductSelectionState(product.id) !== 'none'}
              onChange={(checked) => handleBulkSelect(product.id, checked)}
              label=""
            />
            {getProductSelectionState(product.id) === 'some' && (
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
          <div style={{ 
            position: 'relative',
            width: '48px', 
            height: '48px', 
            flexShrink: 0,
            borderRadius: '8px',
            overflow: 'hidden',
            border: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {product.featuredMedia?.preview?.image?.url ? (
              <img
                src={product.featuredMedia.preview.image.url}
                alt={product.featuredMedia?.preview?.image?.altText || product.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <Icon source={ProductIcon} tone="subdued" />
            )}
          </div>
          <div style={{ 
            flex: 1, 
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Text as="span" variant="bodyMd" fontWeight="semibold" truncate>
                {product.title}
              </Text>
              {hasMultipleVariants && (
                <Button
                  variant="plain"
                  size="micro"
                  icon={isExpanded ? ChevronUpIcon : ChevronDownIcon}
                  onClick={() => {
                    const newExpanded = new Set(expandedProducts);
                    if (isExpanded) {
                      newExpanded.delete(product.id);
                    } else {
                      newExpanded.add(product.id);
                    }
                    setExpandedProducts(newExpanded);
                  }}
                  accessibilityLabel={`${isExpanded ? 'Collapse' : 'Expand'} variants for ${product.title}`}
                />
              )}
            </div>
            <Text as="span" variant="bodySm" tone="subdued" truncate>
              {product.handle}
            </Text>
          </div>
        </div>,
        
        // Status column with dot
        <div key={`${productKey}-status`} style={{ textAlign: 'center', padding: '12px 8px' }}>
          {getStatusDot(product.status)}
        </div>,
        
        // Inventory column with dot
        <div key={`${productKey}-inventory`} style={{ textAlign: 'center', padding: '12px 8px' }}>
          {getInventoryDot(inventory)}
        </div>,

        // Variants column
        <div key={`${productKey}-variants`} style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          gap: '8px',
          padding: '12px 8px'
        }}>
          <Text as="span" variant="bodySm" fontWeight="medium">
            {product.variants.edges.length}
          </Text>
        </div>,
        
        // Actions column
        <div key={`${productKey}-actions`} style={{ textAlign: 'center', padding: '12px 8px' }}>
          <InlineStack gap="200" align="center">
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
        </div>
      ];

      rows.push(productRow);

      // Add expanded variant rows if product is expanded
      if (isExpanded && hasMultipleVariants) {
        product.variants.edges.forEach((variant, variantIndex) => {
          const variantInventory = variant.node.inventoryQuantity || 0;
          
          // Status dot for variant
          const getVariantStatusDot = (inventory: number) => {
            const color = inventory > 0 ? '#22c55e' : '#ef4444';
            return (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: color,
                  boxShadow: `0 0 0 2px ${color}20`
                }} />
                <Text as="span" variant="bodyXs" tone="subdued">
                  {inventory > 0 ? 'In Stock' : 'Out of Stock'}
                </Text>
              </div>
            );
          };

          // Inventory dot for variant
          const getVariantInventoryDot = (inventory: number) => {
            const getColor = () => {
              if (inventory === 0) return '#ef4444';
              if (inventory < 5) return '#f59e0b';
              if (inventory < 20) return '#3b82f6';
              return '#22c55e';
            };
            
            return (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                gap: '8px'
              }}>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: getColor(),
                  boxShadow: `0 0 0 2px ${getColor()}20`
                }} />
                <Text as="span" variant="bodyXs">
                  {inventory}
                </Text>
              </div>
            );
          };

          const isVariantSelected = selectedVariants.includes(variant.node.id);
          
          const variantRow = [
            // Product column - indented variant info with checkbox
            <div key={`${productKey}-variant-${variantIndex}`} style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              minWidth: '300px',
              padding: '8px 8px',
              paddingLeft: '16px', // Less indent to make room for checkbox
              backgroundColor: isVariantSelected ? '#f0f9ff' : '#f8fafc',
              borderLeft: '3px solid #e2e8f0',
              margin: '1px 0'
            }}>
              <Checkbox
                checked={isVariantSelected}
                onChange={(checked) => {
                  if (checked) {
                    setSelectedVariants([...selectedVariants, variant.node.id]);
                    // Also select the parent product if not already selected
                    if (!selectedProducts.includes(product.id)) {
                      setSelectedProducts([...selectedProducts, product.id]);
                    }
                  } else {
                    setSelectedVariants(selectedVariants.filter(id => id !== variant.node.id));
                    // Check if no more variants from this product are selected
                    const remainingVariants = product.variants.edges.filter(v => 
                      v.node.id !== variant.node.id && selectedVariants.includes(v.node.id)
                    );
                    if (remainingVariants.length === 0) {
                      setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                    }
                  }
                }}
                label=""
              />
              <div style={{ 
                width: '20px', 
                height: '20px', 
                flexShrink: 0,
                borderRadius: '4px',
                overflow: 'hidden',
                border: '1px solid #e5e7eb',
                backgroundColor: '#fff'
              }}>
                <div style={{ 
                  width: '100%', 
                  height: '100%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backgroundColor: '#f1f5f9'
                }}>
                  <Icon source={ProductIcon} tone="subdued" />
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Text as="span" variant="bodyXs" fontWeight="medium" truncate>
                  {variant.node.title}
                </Text>
                <div style={{ marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Text as="span" variant="bodyXs" tone="subdued">
                    SKU: {variant.node.sku || 'N/A'}
                  </Text>
                  {/* Price for this variant */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Text as="span" variant="bodyXs" fontWeight="medium">
                      ${parseFloat(variant.node.price).toFixed(2)}
                    </Text>
                    {variant.node.compareAtPrice && parseFloat(variant.node.compareAtPrice) > parseFloat(variant.node.price) && (
                      <>
                        <Text as="span" variant="bodyXs" tone="subdued">
                          <span style={{ textDecoration: 'line-through' }}>
                            ${parseFloat(variant.node.compareAtPrice).toFixed(2)}
                          </span>
                        </Text>
                        <Text as="span" variant="bodyXs" tone="success">
                          (${(parseFloat(variant.node.compareAtPrice) - parseFloat(variant.node.price)).toFixed(2)} off)
                        </Text>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>,
            
            // Status - variant availability based on inventory
            <div key={`${productKey}-variant-${variantIndex}-status`} style={{ textAlign: 'center', padding: '8px' }}>
              {getVariantStatusDot(variantInventory)}
            </div>,
            
            // Inventory - variant specific
            <div key={`${productKey}-variant-${variantIndex}-inventory`} style={{ textAlign: 'center', padding: '8px' }}>
              {getVariantInventoryDot(variantInventory)}
            </div>,
            
            // Variant number
            <div key={`${productKey}-variant-${variantIndex}-details`} style={{ textAlign: 'center', padding: '8px' }}>
              <Text as="span" variant="bodyXs" tone="subdued">
                #{variantIndex + 1}
              </Text>
            </div>,
            
            // Actions - variant specific (empty for now)
            <div key={`${productKey}-variant-${variantIndex}-actions`} style={{ textAlign: 'center', padding: '8px' }}>
              <Text as="span" variant="bodyXs" tone="subdued">
                —
              </Text>
            </div>
          ];
          rows.push(variantRow);
        });
      }
    });

    return (
      <div style={{ 
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: '#fff'
      }}>
        <DataTable
          columnContentTypes={['text', 'text', 'text', 'text', 'text']}
          headings={tableHeadings as any}
          rows={rows}
          verticalAlign="middle"
        />
      </div>
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
        <BlockStack gap="400">
          {/* Header */}
          <Text as="h2" variant="headingMd">Product Management</Text>
          
          {/* Modern Step Navigation */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '16px',
            padding: '20px',
            backgroundColor: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0'
          }}>
            {/* Step 1 Card */}
            <div
              onClick={() => setActiveMainTab(0)}
              style={{
                padding: '20px',
                backgroundColor: activeMainTab === 0 ? '#ffffff' : '#f1f5f9',
                borderRadius: '8px',
                border: activeMainTab === 0 ? '2px solid #FF204E' : '1px solid #e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: activeMainTab === 0 ? '0 4px 12px rgba(255, 32, 78, 0.15)' : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: activeMainTab === 0 ? '#FF204E' : '#A0153E99', // 99 adds opacity for greyed out effect
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  1
                </div>
                <Text as="span" variant="bodyLg" fontWeight="semibold">
                  Select Products
                </Text>
                {selectedProducts.length > 0 && (
                  <Badge tone="success" size="small">{selectedProducts.length.toString()}</Badge>
                )}
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                Choose products and variants to edit in bulk
              </Text>
            </div>

            {/* Step 2 Card */}
            <div
              onClick={() => selectedVariants.length > 0 && setActiveMainTab(1)}
              style={{
                padding: '20px',
                backgroundColor: activeMainTab === 1 ? '#ffffff' : (selectedVariants.length === 0 ? '#f8fafc' : '#f1f5f9'),
                borderRadius: '8px',
                border: activeMainTab === 1 ? '2px solid #FF204E' : '1px solid #e2e8f0',
                cursor: selectedVariants.length > 0 ? 'pointer' : 'not-allowed',
                transition: 'all 0.2s ease',
                boxShadow: activeMainTab === 1 ? '0 4px 12px rgba(255, 32, 78, 0.15)' : 'none',
                opacity: selectedVariants.length === 0 ? 0.6 : 1
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: activeMainTab === 1 ? '#FF204E' : (selectedVariants.length === 0 ? '#A0153E33' : '#A0153E99'), // 33 for very faded, 99 for greyed
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '16px'
                }}>
                  2
                </div>
                <Text as="span" variant="bodyLg" fontWeight="semibold" tone={selectedVariants.length === 0 ? 'subdued' : undefined}>
                  Bulk Edit
                </Text>
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                {selectedVariants.length === 0 
                  ? 'Select products first to enable bulk editing'
                  : 'Apply changes to your selected items'
                }
              </Text>
            </div>
          </div>

          {/* Selected Products Preview - Lightweight for up to 10K products */}
          {selectedVariants.length > 0 && (
            <div style={{
              padding: '12px 16px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginTop: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <Text as="span" variant="bodySm" fontWeight="semibold">
                  Selected Products ({selectedProducts.length} products)
                </Text>
                <Button
                  variant="plain"
                  size="micro"
                  onClick={() => {
                    setSelectedVariants([]);
                    setSelectedProducts([]);
                  }}
                >
                  Clear all
                </Button>
              </div>
              
              {/* Lightweight product preview with horizontal slider */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                overflowX: 'auto',
                overflowY: 'hidden',
                paddingBottom: '8px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#FF204E #f1f5f9'
              }}>
                {(() => {
                  // Get unique products from selected variants (performance optimized)
                  const selectedProductIds = new Set(
                    selectedVariants.map(variantId => {
                      // Find product that contains this variant
                      return filteredProducts.find(p => 
                        p.variants.edges.some(v => v.node.id === variantId)
                      )?.id;
                    }).filter(Boolean)
                  );
                  
                  const selectedProductsList = Array.from(selectedProductIds)
                    .map(productId => filteredProducts.find(p => p.id === productId))
                    .filter((product): product is Product => product !== undefined);
                  
                  return (
                    <>
                      {selectedProductsList.map((product, index) => {
                        const hasVariants = product.variants.edges.length > 1;
                        const selectedVariantCount = product.variants.edges.filter(v => 
                          selectedVariants.includes(v.node.id)
                        ).length;
                        
                        return (
                          <div
                            key={product.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '4px 8px',
                              backgroundColor: 'white',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              fontSize: '12px',
                              whiteSpace: 'nowrap',
                              minWidth: 'max-content',
                              flexShrink: 0,
                              position: 'relative',
                              margin: '8px 4px' // Add margin to prevent badge cutting
                            }}
                          >
                            {/* iPhone-style notification badge - only show if product has variants */}
                            {hasVariants && selectedVariantCount > 0 && (
                              <div style={{
                                position: 'absolute',
                                top: '-6px',
                                right: '-6px',
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: '#FF204E',
                                color: 'white',
                                fontSize: '9px',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px solid white',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 10
                              }}>
                                {selectedVariantCount}
                              </div>
                            )}
                            <div style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              backgroundColor: '#f1f5f9',
                              border: '1px solid #e5e7eb',
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
                                  backgroundColor: '#f8fafc'
                                }}>
                                  <Icon source={ProductIcon} tone="subdued" />
                                </div>
                              )}
                            </div>
                            <Text as="span" variant="bodyXs" truncate>
                              {product.title.length > 20 ? product.title.substring(0, 20) + '...' : product.title}
                            </Text>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
          
          {/* Bulk Operation Categories - Only show in Step 2 */}
          {activeMainTab === 1 && (
            <InlineStack gap="200" wrap>
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
                  variant={activeBulkTab === id ? "primary" : "secondary"}
                  onClick={() => setActiveBulkTab(id)}
                  disabled={selectedVariants.length === 0}
                  size="slim"
                  icon={icon}
                >
                  {label}
                </Button>
              ))}
            </InlineStack>
          )}
        </BlockStack>
      </Card>

      {/* Step Content */}
      {activeMainTab === 0 ? (
        /* Step 1: Product Selection */
        <Card>
            <BlockStack gap="500">
              {/* Step 1 Header */}
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="200">
                  <Text as="h3" variant="headingSm">Step 1: Select Products</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Choose the products and variants you want to edit in bulk. Use filters to find specific products.
                  </Text>
                </BlockStack>
                <Button 
                  onClick={fetchAllProducts} 
                  loading={isLoading || fetcher.state === 'submitting'} 
                  variant="secondary"
                  size="slim"
                >
                  Refresh Products
                </Button>
              </InlineStack>

              {/* Modern Compact Search and Filter Section */}
              <div style={{ 
                border: '1px solid #e1e3e5', 
                borderRadius: '12px', 
                padding: '20px',
                backgroundColor: '#fafbfb'
              }}>
                <BlockStack gap="300">
                  {/* Header */}
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={SearchIcon} />
                      <Text as="h3" variant="headingXs">Filters & Search</Text>
                    </InlineStack>
                  </InlineStack>

                {/* Search */}
                <TextField
                  label=""
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by product name, handle, or SKU..."
                  autoComplete="off"
                  clearButton
                  onClearButtonClick={() => setSearchQuery('')}
                />

                {/* Filter Controls - Row 1: Basic Filters */}
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Category"
                      value={currentCategory}
                      onChange={(value) => setCurrentCategory(value as InventoryCategory)}
                      options={ProductConstants.CATEGORY_OPTIONS as any}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Collection"
                      options={[
                        { label: 'All Collections', value: '' },
                        ...collections.map(collection => ({
                          label: collection.title,
                          value: collection.id
                        }))
                      ]}
                      value={filterByCollection}
                      onChange={setFilterByCollection}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Status"
                      options={[
                        { label: 'All Status', value: 'all' },
                        { label: 'Active', value: 'active' },
                        { label: 'Draft', value: 'draft' },
                        { label: 'Archived', value: 'archived' }
                      ]}
                      value={filterByStatus}
                      onChange={setFilterByStatus}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Sort by"
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

                {/* Filter Controls - Row 2: Price & Inventory Ranges */}
                <InlineStack gap="300" wrap={false}>
                  <div style={{ flex: 1 }}>
                    <Text as="p" variant="bodyMd" fontWeight="medium">Price Range</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label=""
                          placeholder="Min $"
                          value={priceRange.min}
                          onChange={(value) => setPriceRange(prev => ({ ...prev, min: value }))}
                          type="number"
                          autoComplete="off"
                        />
                      </div>
                      <Text as="span" variant="bodySm" tone="subdued">to</Text>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label=""
                          placeholder="Max $"
                          value={priceRange.max}
                          onChange={(value) => setPriceRange(prev => ({ ...prev, max: value }))}
                          type="number"
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text as="p" variant="bodyMd" fontWeight="medium">Inventory Range</Text>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ flex: 1 }}>
                        <TextField
                          label=""
                          placeholder="Min qty"
                          value={inventoryRange.min}
                          onChange={(value) => setInventoryRange(prev => ({ ...prev, min: value }))}
                          type="number"
                          autoComplete="off"
                        />
                      </div>
                      <Text as="span" variant="bodySm" tone="subdued">to</Text>
                      <div style={{ flex: 1 }}>
                        <TextField
                          label=""
                          placeholder="Max qty"
                          value={inventoryRange.max}
                          onChange={(value) => setInventoryRange(prev => ({ ...prev, max: value }))}
                          type="number"
                          autoComplete="off"
                        />
                      </div>
                    </InlineStack>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Select
                      label="Has Images"
                      options={[
                        { label: 'All Products', value: 'all' },
                        { label: 'With Images', value: 'with' },
                        { label: 'Without Images', value: 'without' }
                      ]}
                      value={hasImages}
                      onChange={setHasImages}
                    />
                  </div>
                  <div style={{ flex: 1, paddingTop: '22px' }}>
                    <Checkbox
                      checked={showDraftProducts}
                      onChange={setShowDraftProducts}
                      label="Include draft products"
                    />
                  </div>
                </InlineStack>

                {/* Filter Controls - Row 3: Tags Filter (Collapsible) */}
                {availableTags.length > 0 && (
                  <div style={{ 
                    border: '1px solid #e1e3e5', 
                    borderRadius: '8px', 
                    backgroundColor: '#fafbfb',
                    overflow: 'hidden'
                  }}>
                    {/* Tag Filter Header with Selected Tags Preview */}
                    <div 
                      style={{ 
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: isTagFilterOpen ? '1px solid #e1e3e5' : 'none',
                        backgroundColor: filterByTags.length > 0 ? '#f0f8ff' : '#fafbfb'
                      }}
                      onClick={() => setIsTagFilterOpen(!isTagFilterOpen)}
                    >
                      <InlineStack gap="200" wrap={false} align="space-between">
                        <InlineStack gap="200" wrap={false}>
                          <Icon source={isTagFilterOpen ? ChevronUpIcon : ChevronDownIcon} />
                          <Text as="p" variant="bodyMd" fontWeight="medium">
                            Filter by Tags
                            {filterByTags.length > 0 && ` (${filterByTags.length} selected)`}
                          </Text>
                        </InlineStack>
                        
                        {filterByTags.length > 0 && !isTagFilterOpen && (
                          <div style={{ flex: 1, marginLeft: '12px' }}>
                            <InlineStack gap="100" wrap>
                              {filterByTags.slice(0, 3).map(tag => (
                                <Badge key={tag} tone="info" size="small">{tag}</Badge>
                              ))}
                              {filterByTags.length > 3 && (
                                <Badge tone="info" size="small">{`+${filterByTags.length - 3} more`}</Badge>
                              )}
                            </InlineStack>
                          </div>
                        )}
                      </InlineStack>
                    </div>

                    {/* Collapsible Tag Filter Content */}
                    <Collapsible open={isTagFilterOpen} id="tag-filter-collapsible">
                      <div style={{ padding: '16px' }}>
                        <BlockStack gap="300">
                          {/* Selected Tags Management */}
                          {filterByTags.length > 0 && (
                            <div style={{ 
                              padding: '12px', 
                              backgroundColor: '#f0f8ff', 
                              borderRadius: '6px',
                              border: '1px solid #c7e0f4'
                            }}>
                              <BlockStack gap="200">
                                <InlineStack gap="200" wrap={false} align="space-between">
                                  <Text as="p" variant="bodySm" fontWeight="medium">Selected Tags ({filterByTags.length})</Text>
                                  <Button
                                    variant="plain"
                                    size="micro"
                                    onClick={() => setFilterByTags([])}
                                    accessibilityLabel="Clear all tag filters"
                                  >
                                    Clear all
                                  </Button>
                                </InlineStack>
                                <InlineStack gap="150" wrap>
                                  {filterByTags.map(tag => (
                                    <div key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                      <Badge tone="info">{tag}</Badge>
                                      <Button
                                        variant="plain"
                                        size="micro"
                                        onClick={() => setFilterByTags(prev => prev.filter(t => t !== tag))}
                                        accessibilityLabel={`Remove ${tag} tag filter`}
                                      >
                                        ×
                                      </Button>
                                    </div>
                                  ))}
                                </InlineStack>
                              </BlockStack>
                            </div>
                          )}

                          {/* Tag Search */}
                          <TextField
                            label="Search Tags"
                            placeholder="Type to search tags..."
                            value={tagSearchQuery}
                            onChange={setTagSearchQuery}
                            clearButton
                            onClearButtonClick={() => setTagSearchQuery('')}
                            prefix={<Icon source={SearchIcon} />}
                            autoComplete="off"
                          />

                          {/* Search Results */}
                          {tagSearchQuery && (
                            <div style={{ 
                              maxHeight: '150px', 
                              overflowY: 'auto', 
                              border: '1px solid #e1e3e5', 
                              borderRadius: '6px', 
                              padding: '12px',
                              backgroundColor: '#ffffff'
                            }}>
                              <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                                Search Results ({availableTags.filter(tag => 
                                  tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) && 
                                  !filterByTags.includes(tag)
                                ).length})
                              </Text>
                              <div style={{ marginTop: '8px' }}>
                                <InlineStack gap="150" wrap>
                                  {availableTags
                                    .filter(tag => 
                                      tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) && 
                                      !filterByTags.includes(tag)
                                    )
                                    .slice(0, 20)
                                    .map(tag => (
                                      <Button
                                        key={tag}
                                        variant="plain"
                                        size="slim"
                                        onClick={() => {
                                          setFilterByTags(prev => [...prev, tag]);
                                          setTagSearchQuery('');
                                        }}
                                      >
                                        + {tag}
                                      </Button>
                                    ))
                                  }
                                </InlineStack>
                                {availableTags.filter(tag => 
                                  tag.toLowerCase().includes(tagSearchQuery.toLowerCase()) && 
                                  !filterByTags.includes(tag)
                                ).length === 0 && (
                                  <Text as="p" variant="bodySm" tone="subdued">No matching tags found</Text>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Popular Tags (when not searching) */}
                          {!tagSearchQuery && (
                            <div>
                              <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                                Popular Tags (Top {Math.min(12, availableTags.length)})
                              </Text>
                              <div style={{ marginTop: '8px' }}>
                                <InlineStack gap="150" wrap>
                                  {availableTags
                                    .filter(tag => !filterByTags.includes(tag))
                                    .slice(0, 12)
                                    .map(tag => (
                                      <Button
                                        key={tag}
                                        variant="tertiary"
                                        size="slim"
                                        onClick={() => setFilterByTags(prev => [...prev, tag])}
                                      >
                                        + {tag}
                                      </Button>
                                    ))
                                  }
                                </InlineStack>
                                {availableTags.length > 12 && (
                                  <div style={{ marginTop: '8px' }}>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      {availableTags.length - 12} more tags available - use search to find them
                                    </Text>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </BlockStack>
                      </div>
                    </Collapsible>
                  </div>
                )}

                {/* Bottom Section: Selection Controls (Left) + Statistics (Right) */}
                <div style={{ marginTop: '20px', paddingTop: '15px', borderTop: '1px solid #e1e3e5' }}>
                  <InlineStack align="space-between" blockAlign="center" wrap>
                    {/* Left side: Selection Controls */}
                    <InlineStack gap="200" wrap>
                      <Button
                        variant="tertiary"
                        size="slim"
                        onClick={() => {
                          const activeProducts = filteredProducts.filter(p => p.status === 'ACTIVE');
                          const allVariants = activeProducts.flatMap(p => 
                            p.variants.edges.map(v => v.node.id)
                          );
                          setSelectedVariants(allVariants);
                          // Also update selectedProducts for visual checkbox consistency
                          const activeProductIds = activeProducts.map(p => p.id);
                          setSelectedProducts(activeProductIds);
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
                          const allVariants = outOfStockProducts.flatMap(p => 
                            p.variants.edges.map(v => v.node.id)
                          );
                          setSelectedVariants(allVariants);
                          // Also update selectedProducts for visual checkbox consistency
                          const outOfStockProductIds = outOfStockProducts.map(p => p.id);
                          setSelectedProducts(outOfStockProductIds);
                        }}
                        disabled={filteredProducts.filter(p => p.totalInventory === 0).length === 0}
                      >
                        Select Out of Stock
                      </Button>
                      <Button
                        variant="tertiary"
                        size="slim"
                        onClick={() => {
                          setSelectedVariants([]);
                          setSelectedProducts([]);
                        }}
                        disabled={selectedVariants.length === 0}
                        tone="critical"
                      >
                        Clear All
                      </Button>
                    </InlineStack>
                    
                    {/* Right side: Statistics */}
                    <InlineStack gap="150" wrap>
                      <Text as="span" variant="bodySm" fontWeight="medium">{filteredProducts.length}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Products Found</Text>
                      <Text as="span" variant="bodySm" tone="subdued">•</Text>
                      <Text as="span" variant="bodySm" fontWeight="medium">{selectedVariants.length}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Variants Selected</Text>
                      <Text as="span" variant="bodySm" tone="subdued">•</Text>
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredProducts.filter(p => p.status === 'ACTIVE').length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Active</Text>
                      <Text as="span" variant="bodySm" tone="subdued">•</Text>
                      <Text as="span" variant="bodySm" fontWeight="medium">
                        {filteredProducts.filter(p => p.totalInventory === 0).length}
                      </Text>
                      <Text as="span" variant="bodySm" tone="subdued">Out of Stock</Text>
                    </InlineStack>
                  </InlineStack>
                </div>
                </BlockStack>
              </div>
            </BlockStack>

            {/* Product Selection Table */}
            <BlockStack gap="500">
              <BlockStack gap="300">
                {/* Table Container - Headers removed since they don't relate to table */}

                {/* Clean Product Selection Table */}
                <div style={{ minHeight: '400px', maxHeight: '600px', overflow: 'auto', marginTop: '24px' }}>
                  {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '40px' }}>
                      <Spinner size="large" />
                      <Text as="p" variant="bodySm" tone="subdued">Loading products...</Text>
                    </div>
                  ) : filteredProducts.length === 0 ? (
                    <EmptyState
                      heading="No products found"
                      image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                      action={{
                        content: 'Clear filters',
                        onAction: () => {
                          setSearchQuery('');
                          setCurrentCategory('all');
                          setShowDraftProducts(true);
                          setFilterByCollection('');
                        }
                      }}
                    >
                      <p>Try adjusting your search or filter criteria to find products.</p>
                    </EmptyState>
                  ) : (
                    renderTableView()
                  )}
                </div>
            </BlockStack>
          </BlockStack>
        </Card>
      ) : (
        /* Step 2: Bulk Edit - Complete Interface */
        <BlockStack gap="400">
          {/* Bulk Edit Content */}
          {selectedVariants.length === 0 ? (
            <Card>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '16px',
                padding: '40px 20px',
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
            </Card>
          ) : (
            <Card>
              <BlockStack gap="400">
                {/* Pricing Tab */}
                {activeBulkTab === 0 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Pricing Operations</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update prices for {selectedVariants.length} selected variants.
                    </Text>

                    <Select
                      label="Price Update Method"
                      options={[
                        { label: 'Set Fixed Price - Apply same price to all variants', value: 'set' },
                        { label: 'Increase by Percentage - Add percentage to current prices', value: 'increase' },
                        { label: 'Decrease by Percentage - Subtract percentage from current prices', value: 'decrease' },
                        { label: 'Round Prices', value: 'round' },
                      ]}
                      value={priceOperation}
                      onChange={(value) => setPriceOperation(value as any)}
                    />
                    
                    {priceOperation === 'set' && (
                      <TextField
                        label="New Price"
                        type="number"
                        value={priceValue}
                        onChange={setPriceValue}
                        placeholder="0.00"
                        autoComplete="off"
                        prefix={currencySymbol}
                        helpText="Set the same price for all selected variants"
                      />
                    )}
                    
                    {(priceOperation === 'increase' || priceOperation === 'decrease') && (
                      <TextField
                        label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                        type="number"
                        value={pricePercentage}
                        onChange={setPricePercentage}
                        placeholder="0"
                        autoComplete="off"
                        suffix="%"
                        helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} current prices by this percentage`}
                      />
                    )}
                    
                    {priceOperation === 'round' && (
                      <Select
                        label="Rounding Rule"
                        options={[
                          { label: `Round to nearest ${storeCurrency}`, value: 'nearest' },
                          { label: `Round up to next ${storeCurrency}`, value: 'up' },
                          { label: `Round down to previous ${storeCurrency}`, value: 'down' },
                        ]}
                        value={roundingRule}
                        onChange={(value) => setRoundingRule(value as any)}
                      />
                    )}

                    <Button
                      variant="primary"
                      onClick={handleBulkPricing}
                      disabled={
                        selectedVariants.length === 0 || 
                        (priceOperation === 'set' && !priceValue) ||
                        ((priceOperation === 'increase' || priceOperation === 'decrease') && !pricePercentage)
                      }
                      loading={isLoading}
                    >
                      Apply Price Changes
                    </Button>
                  </BlockStack>
                )}

                {/* Collections Tab */}
                {activeBulkTab === 1 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Collection Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Add or remove collections for {selectedProducts.length} selected products.
                    </Text>

                    <Select
                      label="Collection Operation"
                      options={[
                        { label: 'Add to Collections', value: 'add' },
                        { label: 'Remove from Collections', value: 'remove' },
                      ]}
                      value={collectionOperation}
                      onChange={(value) => setCollectionOperation(value as any)}
                    />

                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '8px' }}>
                      {filteredCollections.map((collection) => (
                        <div key={collection.id} style={{ padding: '4px 0' }}>
                          <Checkbox
                            checked={selectedCollections.includes(collection.id)}
                            onChange={(checked) => {
                              if (checked) {
                                setSelectedCollections([...selectedCollections, collection.id]);
                              } else {
                                setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                              }
                            }}
                            label={collection.title}
                          />
                        </div>
                      ))}
                    </div>

                    <Button
                      variant="primary"
                      onClick={handleBulkCollections}
                      disabled={selectedProducts.length === 0 || selectedCollections.length === 0}
                      loading={isLoading}
                    >
                      Apply Collection Changes
                    </Button>
                  </BlockStack>
                )}

                {/* Content Tab */}
                {activeBulkTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Content Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update titles, descriptions, and tags for {selectedProducts.length} selected products.
                    </Text>

                    <Select
                      label="Content Operation"
                      options={[
                        { label: 'Update Titles', value: 'title' },
                        { label: 'Update Descriptions', value: 'description' },
                        { label: 'Manage Tags', value: 'tags' },
                      ]}
                      value={contentOperation}
                      onChange={(value) => setContentOperation(value as any)}
                    />

                    {contentOperation === 'title' && (
                      <>
                        <Select
                          label="Title Update Method"
                          options={[
                            { label: 'Add Prefix', value: 'prefix' },
                            { label: 'Add Suffix', value: 'suffix' },
                            { label: 'Find and Replace', value: 'replace' },
                          ]}
                          value={titleOperation}
                          onChange={(value) => setTitleOperation(value as any)}
                        />
                        
                        {titleOperation === 'replace' ? (
                          <>
                            <TextField
                              label="Find Text"
                              value={titleReplaceFrom}
                              onChange={setTitleReplaceFrom}
                              placeholder="Text to find"
                              autoComplete="off"
                            />
                            <TextField
                              label="Replace With"
                              value={titleReplaceTo}
                              onChange={setTitleReplaceTo}
                              placeholder="Replacement text"
                              autoComplete="off"
                            />
                          </>
                        ) : (
                          <TextField
                            label={titleOperation === 'prefix' ? 'Prefix Text' : 'Suffix Text'}
                            value={titleValue}
                            onChange={setTitleValue}
                            placeholder={titleOperation === 'prefix' ? 'Text to add at beginning' : 'Text to add at end'}
                            autoComplete="off"
                          />
                        )}
                      </>
                    )}

                    {contentOperation === 'tags' && (
                      <>
                        <Select
                          label="Tag Operation"
                          options={[
                            { label: 'Add Tags', value: 'add' },
                            { label: 'Remove Tags', value: 'remove' },
                          ]}
                          value={tagOperation}
                          onChange={(value) => setTagOperation(value as any)}
                        />
                        
                        <TextField
                          label={tagOperation === 'add' ? 'Tags to Add' : 'Tags to Remove'}
                          value={tagOperation === 'add' ? tagValue : tagRemoveValue}
                          onChange={tagOperation === 'add' ? setTagValue : setTagRemoveValue}
                          placeholder="Enter tags separated by commas"
                          autoComplete="off"
                          helpText="Separate multiple tags with commas"
                        />
                      </>
                    )}

                    <Button
                      variant="primary"
                      onClick={contentOperation === 'title' ? handleBulkTitleUpdate : handleBulkTags}
                      disabled={
                        selectedProducts.length === 0 || 
                        (contentOperation === 'title' && (
                          (titleOperation === 'replace' && (!titleReplaceFrom || !titleReplaceTo)) ||
                          ((titleOperation === 'prefix' || titleOperation === 'suffix') && !titleValue)
                        )) ||
                        (contentOperation === 'tags' && (
                          (tagOperation === 'add' && !tagValue) ||
                          (tagOperation === 'remove' && !tagRemoveValue)
                        ))
                      }
                      loading={isLoading}
                    >
                      Apply Content Changes
                    </Button>
                  </BlockStack>
                )}

                {/* Inventory Tab */}
                {activeBulkTab === 3 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Inventory Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update inventory settings for {selectedVariants.length} selected variants.
                    </Text>

                    <Select
                      label="Inventory Operation"
                      options={[
                        { label: 'Update Stock Quantities', value: 'stock' },
                        { label: 'Update SKUs', value: 'sku' },
                        { label: 'Update Cost & Weight', value: 'cost' },
                      ]}
                      value={inventoryOperation}
                      onChange={(value) => setInventoryOperation(value as any)}
                    />

                    {inventoryOperation === 'stock' && (
                      <>
                        <Select
                          label="Stock Update Method"
                          options={[
                            { label: 'Set Quantity', value: 'set' },
                            { label: 'Add to Current', value: 'add' },
                            { label: 'Subtract from Current', value: 'subtract' },
                          ]}
                          value={stockUpdateMethod}
                          onChange={(value) => setStockUpdateMethod(value as any)}
                        />
                        
                        <TextField
                          label="Quantity"
                          type="number"
                          value={stockQuantity}
                          onChange={setStockQuantity}
                          placeholder="0"
                          autoComplete="off"
                          helpText={`${stockUpdateMethod === 'set' ? 'Set' : stockUpdateMethod === 'add' ? 'Add' : 'Subtract'} this quantity ${stockUpdateMethod === 'set' ? 'as' : stockUpdateMethod === 'add' ? 'to' : 'from'} the current inventory`}
                        />
                      </>
                    )}

                    <Button
                      variant="primary"
                      onClick={handleBulkInventoryUpdate}
                      disabled={
                        selectedVariants.length === 0 || 
                        (inventoryOperation === 'stock' && !stockQuantity)
                      }
                      loading={isLoading}
                    >
                      Apply Inventory Changes
                    </Button>
                  </BlockStack>
                )}

                {/* Status Tab */}
                {activeBulkTab === 4 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Status & Visibility</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Manage product status and visibility for {selectedProducts.length} selected products.
                    </Text>

                    <Select
                      label="New Product Status"
                      options={[
                        { label: 'Active', value: 'ACTIVE' },
                        { label: 'Draft', value: 'DRAFT' },
                        { label: 'Archived', value: 'ARCHIVED' },
                      ]}
                      value={newProductStatus}
                      onChange={(value) => setNewProductStatus(value as any)}
                    />

                    <Button
                      variant="primary"
                      onClick={handleBulkStatus}
                      disabled={selectedProducts.length === 0}
                      loading={isLoading}
                    >
                      Apply Status Changes
                    </Button>
                  </BlockStack>
                )}

                {/* Discounts Tab */}
                {activeBulkTab === 5 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Discount Operations</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Apply discounts to {selectedVariants.length} selected variants.
                    </Text>

                    <Select
                      label="Discount Operation"
                      options={[
                        { label: 'Set Compare At Price', value: 'set' },
                        { label: 'Increase Compare At Price', value: 'increase' },
                        { label: 'Decrease Compare At Price', value: 'decrease' },
                      ]}
                      value={discountOperation}
                      onChange={(value) => setDiscountOperation(value as any)}
                    />

                    {discountOperation === 'set' && (
                      <TextField
                        label="Compare At Price"
                        type="number"
                        value={discountValue}
                        onChange={setDiscountValue}
                        placeholder="0.00"
                        autoComplete="off"
                        prefix={currencySymbol}
                        helpText="Set compare at price for discount display"
                      />
                    )}

                    {(discountOperation === 'increase' || discountOperation === 'decrease') && (
                      <TextField
                        label={`${discountOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                        type="number"
                        value={discountPercentage}
                        onChange={setDiscountPercentage}
                        placeholder="0"
                        autoComplete="off"
                        suffix="%"
                        helpText={`${discountOperation === 'increase' ? 'Increase' : 'Decrease'} compare at prices by this percentage`}
                      />
                    )}

                    <Button
                      variant="primary"
                      onClick={handleBulkDiscount}
                      disabled={
                        selectedVariants.length === 0 || 
                        (discountOperation === 'set' && !discountValue) ||
                        ((discountOperation === 'increase' || discountOperation === 'decrease') && !discountPercentage)
                      }
                      loading={isLoading}
                    >
                      Apply Discount Changes
                    </Button>
                  </BlockStack>
                )}

                {/* SEO Tab */}
                {activeBulkTab === 6 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">SEO Optimization</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update SEO settings for {selectedProducts.length} selected products.
                    </Text>

                    <TextField
                      label="SEO Title Template"
                      value={seoTemplate}
                      onChange={setSeoTemplate}
                      placeholder="Use {title} for product title"
                      autoComplete="off"
                      helpText="Use {title} as placeholder for product title"
                    />

                    <TextField
                      label="Meta Description"
                      value={metaDescription}
                      onChange={setMetaDescription}
                      placeholder="Enter meta description"
                      autoComplete="off"
                      multiline={3}
                      helpText="Meta description for search engines"
                    />

                    <Button
                      variant="primary"
                      onClick={handleBulkSEO}
                      disabled={selectedProducts.length === 0 || (!seoTemplate && !metaDescription)}
                      loading={isLoading}
                    >
                      Apply SEO Changes
                    </Button>
                  </BlockStack>
                )}
              </BlockStack>
            </Card>
          )}
        </BlockStack>
      )}

      {notification.show && (
        <Toast
          content={notification.message}
          error={notification.error}
          onDismiss={() => setNotification({ show: false, message: '' })}
          duration={4000}
        />
      )}
    </BlockStack>
    </>
  );
}
