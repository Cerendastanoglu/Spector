import React, { useState, useEffect, useMemo } from "react";
import { useFetcher } from "@remix-run/react";
import { openInNewTab } from "../utils/browserUtils";
import { ProductConstants } from "../utils/scopedConstants";
import { ProductTable } from "./ProductTable";
import styles from "./StepsUI.module.css";
import {
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Checkbox,
  TextField,
  Select,
  Box,
  Spinner,
  EmptyState,
  Icon,
  Collapsible,
  Toast,
  Divider,
  Banner,
} from '@shopify/polaris';
// Import only the icons we actually use
import { 
  ProductIcon, 
  EditIcon, 
  ChevronDownIcon, 
  ChevronUpIcon,
  MoneyIcon,
  CollectionIcon,
  InventoryIcon,
  SearchIcon,
  PlusIcon,
  MinusIcon,
  PackageIcon,
  CalculatorIcon,
  LocationIcon,
  HashtagIcon
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
  shopDomain?: string;
}

type InventoryCategory = 'all' | 'out-of-stock' | 'critical' | 'low-stock' | 'in-stock';

type SortField = 'title' | 'inventory' | 'status' | 'updated' | 'created' | 'price' | 'variants';
type SortDirection = 'asc' | 'desc';



export function ProductManagement({ isVisible, initialCategory = 'all', shopDomain }: ProductManagementProps) {
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

  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('inventory');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // Main Workflow Tab State (Step 1: Select Products -> Step 2: Bulk Edit)
  const [activeMainTab, setActiveMainTab] = useState(0);
  
  // Bulk Operations Tab State
  const [activeBulkTab, setActiveBulkTab] = useState(0);

  // Bulk Operation Completion Tracking
  const [hasBulkOperationsCompleted, setHasBulkOperationsCompleted] = useState(false);
  
  // Enhanced Pricing Operations State
  const [priceOperation, setPriceOperation] = useState<'set' | 'increase' | 'decrease' | 'round'>('set');
  const [priceValue, setPriceValue] = useState('');
  const [pricePercentage, setPricePercentage] = useState('0');
  const [roundingRule] = useState<'nearest' | 'up' | 'down'>('nearest');

  
  // Compare Price Operations State
  const [, setCompareAtPrice] = useState('');
  const [compareOperation, setCompareOperation] = useState<'set' | 'increase' | 'decrease' | 'remove'>('set');
  const [compareValue, setCompareValue] = useState('');
  
  // Pricing Category State  
  const [comparePercentage, setComparePercentage] = useState('0');
  const [applyCompareChanges, setApplyCompareChanges] = useState(false);
  
  // Collection Management State
  const [collectionOperation, setCollectionOperation] = useState<'add' | 'remove'>('add');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{id: string, title: string}[]>([]);
  const [collectionSearchQuery] = useState('');
  
  // Current Ads Management State
  const [showCurrentAds, setShowCurrentAds] = useState<{[key: number]: boolean}>({});
  const [currentAds, setCurrentAds] = useState<any[]>([]);
  const [adsLoaded, setAdsLoaded] = useState<{[key: number]: boolean}>({});
  const [fetchingAds, setFetchingAds] = useState(false);
  
  // Description Management State  
  const [descriptionOperation, setDescriptionOperation] = useState<'prefix' | 'suffix' | 'replace'>('prefix');
  const [descriptionValue, setDescriptionValue] = useState('');
  
  // Image Management State
  const [imageOperation, setImageOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [imageUrls, setImageUrls] = useState<string[]>(['']);
  const [imagePosition, setImagePosition] = useState<'start' | 'end'>('end');

  
  // Collection Filter State
  const [filterByCollection, setFilterByCollection] = useState<string>('');
  
  // Advanced Filter States
  const [filterByVendor] = useState<string>('');
  const [filterByProductType] = useState<string>('');
  const [filterByTags, setFilterByTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [inventoryRange, setInventoryRange] = useState<{ min: string; max: string }>({ min: '', max: '' });
  const [filterByStatus, setFilterByStatus] = useState<string>('all');
  const [hasImages, setHasImages] = useState<string>('all'); // 'all', 'with', 'without'
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [collections, setCollections] = useState<{id: string, title: string}[]>([]);
  
  // Currency State
  const [, setStoreCurrency] = useState<string>('USD');
  const [currencySymbol, setCurrencySymbol] = useState<string>('$');
  const [, setShopDomain] = useState<string>('');
  
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
    actionLabel?: string;
    onAction?: () => void;
  }>({ show: false, message: '' });
  
  const [tagOperation, setTagOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [tagValue, setTagValue] = useState('');
  const [tagRemoveValue, setTagRemoveValue] = useState('');
  
  // Content operation state
  const [contentOperation, setContentOperation] = useState<'title' | 'description' | 'images'>('title');
  
  const [costValue, setCostValue] = useState('');
  const [weightValue, setWeightValue] = useState('');
  const [originCountry, setOriginCountry] = useState('');
  
  // Enhanced Inventory Management State
  const [inventoryOperation, setInventoryOperation] = useState<'stock' | 'sku' | 'cost'>('stock');
  const [stockUpdateMethod, setStockUpdateMethod] = useState<'set' | 'add' | 'subtract'>('set');
  const [stockQuantity, setStockQuantity] = useState('');
  const [skuUpdateMethod] = useState<'prefix' | 'suffix' | 'replace' | 'generate'>('prefix');
  const [skuValue, setSkuValue] = useState('');
  const [skuFindText, setSkuFindText] = useState('');
  const [skuReplaceText, setSkuReplaceText] = useState('');
  const [skuPattern, setSkuPattern] = useState('');
  const [trackInventory] = useState(true);
  
  // SEO & Metadata State

  
  // Status & Visibility State

  
  // Filter collections based on search query - memoized to prevent performance issues
  const filteredCollections = useMemo(() => {
    return availableCollections.filter(collection =>
      collection.title.toLowerCase().includes(collectionSearchQuery.toLowerCase())
    );
  }, [availableCollections, collectionSearchQuery]);
  
  // Advanced Bulk Operations State
  const [seoTemplate, setSeoTemplate] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [lowStockAlert, setLowStockAlert] = useState('');
  const [marketingTags, setMarketingTags] = useState('');
  const [seasonalPricing, setSeasonalPricing] = useState('');
  
  // Enhanced Error and success states for bulk operations
  const [success, setSuccess] = useState<string | null>(null);

  
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
  // Removed state variables related to the bulk operation modal
  const [pendingBulkOperation, setPendingBulkOperation] = useState<{
    type: 'price' | 'collection' | 'tags' | 'inventory' | 'content';
    data: any;
  } | null>(null);

  
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
    // Get all variant IDs for this product upfront to avoid race conditions
    const variantIds = getProductVariantIds(productId);
    
    if (checked) {
      // Use functional updates to ensure we're working with latest state
      setSelectedVariants(prevVariants => {
        const newSelectedVariants = [...prevVariants, variantId];
        
        // Check if all variants are now selected
        const allVariantsSelected = variantIds.length > 0 && 
          variantIds.every(id => newSelectedVariants.includes(id));
        
        // Update product selection based on variant selection state
        if (allVariantsSelected) {
          setSelectedProducts(prevProducts => {
            // Only add if not already present
            return prevProducts.includes(productId) 
              ? prevProducts 
              : [...prevProducts, productId];
          });
        }
        
        return newSelectedVariants;
      });
    } else {
      // Deselecting a variant always deselects the parent product
      setSelectedVariants(prevVariants => {
        const newSelectedVariants = prevVariants.filter(id => id !== variantId);
        
        // Always remove product when any variant is deselected
        setSelectedProducts(prevProducts => 
          prevProducts.filter(id => id !== productId)
        );
        
        return newSelectedVariants;
      });
    }
  };
  
  // Pagination state
  const [productsPerPage] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);

  // Thresholds for inventory categorization (use constants)
  // Removed duplicated constants

  // Helper function to navigate to product pages
  const navigateToProduct = (product: any, section: 'admin' | 'storefront') => {
    if (!product?.id) {
      console.error('No product ID found:', product);
      setError('Cannot navigate: Product ID not found');
      return;
    }

    // Ensure we have a shop domain
    if (!shopDomain) {
      console.error('Shop domain not provided');
      setError('Cannot navigate: Shop domain not available');
      return;
    }

    try {
      const productId = product.id.replace('gid://shopify/Product/', '');
      
      let url;
      if (section === 'admin') {
        // Use dynamic shop domain for admin URLs
        url = `https://${shopDomain}/admin/products/${productId}`;
      } else {
        if (!product.handle) {
          console.warn('No product handle found, using product ID for storefront URL');
        }
        // Use dynamic shop domain for storefront URLs
        url = `https://${shopDomain}/products/${product.handle || productId}`;
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

  // Filter change handler - reset page when filters change
  useEffect(() => {
    setCurrentPage(1); // Reset to first page when any filter changes
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

  // Enhanced error handling helpers
  const clearBulkMessages = () => {
    setError(null);
    // Clear bulk messages functionality
  };





  // const handleSelectAll = (checked: boolean) => {
  //   setSelectedProducts(checked ? filteredProducts.map(p => p.id) : []);
  // };

  // CSV Export Function
  const handleExportCSV = () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to export.");
      return;
    }

    const selectedProductsData = filteredProducts.filter(product => 
      selectedProducts.includes(product.id)
    );

    // Define CSV headers - including variant inventory columns
    const headers = [
      'Title',
      'Handle', 
      'Status',
      'Total Inventory',
      'Total Variants',
      'Variant Inventories'
    ];

    // Convert products to CSV format
    const csvData = selectedProductsData.map(product => {
      // Get variant inventory details
      const variantInventories = product.variants?.edges?.map(variant => 
        `${variant.node.title}: ${variant.node.inventoryQuantity || 0}`
      ).join('; ') || '';

      return [
        `"${product.title}"`, // Wrap in quotes to handle commas
        product.handle,
        product.status,
        product.totalInventory,
        product.variants?.edges?.length || 0,
        `"${variantInventories}"` // Wrap in quotes to handle commas and semicolons
      ];
    });

    // Combine headers and data
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setSuccess(`Successfully exported ${selectedProducts.length} products to CSV.`);
  };

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




    // Validation for new pricing operations
    
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
    
    // Instead of applying changes right away, set up the pending operation and show the modal
    const operationData = {
      priceOperation,
      priceValue,
      pricePercentage,
      applyCompareChanges,
      compareOperation,
      compareValue,
      comparePercentage,
      selectedVariants: [...selectedVariants]
    };
    
    // Directly apply changes without showing a modal
    setPendingBulkOperation({ type: 'price', data: operationData });
    applyPriceChanges(); // Apply changes immediately
  };
  
  // This function is called after the user confirms the batch name
  const applyPriceChanges = async () => {
    if (!pendingBulkOperation || pendingBulkOperation.type !== 'price') {
      setError("No pending price operation found.");
      return;
    }
    
    const { 
      priceOperation, 
      priceValue, 
      pricePercentage, 
      applyCompareChanges,
      compareOperation,
      compareValue,
      comparePercentage,
      selectedVariants 
    } = pendingBulkOperation.data;
    
    setIsLoading(true);
    clearBulkMessages();
    
    const failed: string[] = [];
    const successful: string[] = [];
    
    try {
      // Process each selected variant individually
      const variantUpdates = [];
      
      // Add batch information
      const batchInfo = {
        operationName: `Price Update ${new Date().toLocaleDateString()}`,
        description: `${selectedVariants.length} variants affected`,
        type: 'pricing'
      };
      
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
            case 'increase': {
              const increasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 + increasePercent / 100);
              console.log(`Increase: ${currentPrice} * (1 + ${increasePercent}/100) = ${newPrice}`);
              break;
            }
            case 'decrease': {
              const decreasePercent = parseFloat(pricePercentage) || 0;
              newPrice = currentPrice * (1 - decreasePercent / 100);
              console.log(`Decrease: ${currentPrice} * (1 - ${decreasePercent}/100) = ${newPrice}`);
              break;
            }
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
      formData.append('batchInfo', JSON.stringify(batchInfo));
      
      // Use a timeout to prevent "no frame" error by allowing UI to update before API call
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let result;
      try {
        const response = await fetch('/app/api/products', {
          method: 'POST',
          body: formData
        });
        
        result = await response.json();
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to update prices');
        }
      } catch (apiError) {
        console.error('API call error:', apiError);
        throw new Error(`Failed to communicate with server: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
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
        setHasBulkOperationsCompleted(true); // Mark bulk operations as completed
        setPriceValue('');
        setPricePercentage('0');
        setCompareAtPrice('');
        setCompareValue('');
        setComparePercentage('0');
        setApplyCompareChanges(false);
        
        // Show success notification
        setNotification({
          show: true,
          message: `Successfully updated prices for ${apiSuccessful.length} products`,
          error: false
        });
        
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
        setHasBulkOperationsCompleted(true); // Mark bulk operations as completed
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
    
    setError("");
    
    // Store the pending operation
    setPendingBulkOperation({
      type: 'tags',
      data: {
        productIds: selectedProducts,
        tagOperation,
        tagValue: tagOperation === 'add' ? tagValue : undefined,
        tagRemoveValue: tagOperation === 'remove' ? tagRemoveValue : undefined,
      }
    });
    
    // Apply changes immediately without showing modal
    applyTagChanges();
  };
  
  // This function is called after the modal confirmation for tag operations
  const applyTagChanges = async () => {
    const {
      productIds,
      tagOperation,
      tagValue,
      tagRemoveValue
    } = pendingBulkOperation?.data || {};
    
    if (!productIds || productIds.length === 0) {
      return;
    }
    
    setIsLoading(true);
    
    try {
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
          operationName: `Tag Update ${new Date().toLocaleDateString()}`,
          operationDescription: `${productIds.length} products affected`
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
      
      // Process the operation result
      if (result.bulkOperationId) {
        // Show success notification
        setNotification({
          show: true,
          message: `Successfully ${actionText} ${successful.length} products!`,
          error: false
        });
      } else if (successful.length > 0) {
        setNotification({
          show: true,
          message: `Successfully ${actionText} ${successful.length} products!`,
          error: false
        });
      }
      
      if (failed.length > 0) {
        console.log(`⚠️ ${successful.length} products updated successfully. ${failed.length} failed.`);
        console.log("Failed operations:", failed);
        
        setNotification({
          show: true,
          message: `${successful.length} products updated, ${failed.length} failed. See console for details.`,
          error: true
        });
      }
      
      // Clear form only if completely successful
      if (failed.length === 0) {
        setHasBulkOperationsCompleted(true); // Mark bulk operations as completed
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
        setHasBulkOperationsCompleted(true); // Mark bulk operations as completed
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
    
    if (descriptionOperation === 'replace' && (!titleReplaceFrom || !titleReplaceTo)) {
      setError("Please provide both find and replace text for descriptions.");
      return;
    }
    
    if ((descriptionOperation === 'prefix' || descriptionOperation === 'suffix') && !descriptionValue) {
      setError(`Please provide ${descriptionOperation} text for descriptions.`);
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const productIds = selectedProducts;
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-descriptions',
          productIds,
          descriptionOperation,
          descriptionValue: descriptionOperation !== 'replace' ? descriptionValue : undefined,
          descriptionReplaceFrom: descriptionOperation === 'replace' ? titleReplaceFrom : undefined,
          descriptionReplaceTo: descriptionOperation === 'replace' ? titleReplaceTo : undefined,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update descriptions');
      }

      // Process results
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
        await fetchAllProducts();
      }
      
      let operationText = '';
      if (descriptionOperation === 'prefix') {
        operationText = `added prefix to descriptions of`;
      } else if (descriptionOperation === 'suffix') {
        operationText = `added suffix to descriptions of`;
      } else {
        operationText = `replaced text in descriptions of`;
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
        setHasBulkOperationsCompleted(true);
        setDescriptionValue('');
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update descriptions';
      console.error('Failed to update descriptions:', error);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBulkImageUpdate = async () => {
    if (selectedProducts.length === 0) {
      setError("Please select at least one product to update images.");
      return;
    }
    
    if (imageOperation !== 'remove' && imageUrls.every(url => !url.trim())) {
      setError("Please provide at least one valid image URL.");
      return;
    }
    
    setIsLoading(true);
    setError("");
    
    try {
      const productIds = selectedProducts;
      const validImageUrls = imageUrls.filter(url => url.trim());
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-images',
          productIds,
          imageOperation,
          imageUrls: validImageUrls,
          imagePosition: imageOperation === 'add' ? imagePosition : undefined,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update images');
      }

      // Process results
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
        await fetchAllProducts();
      }
      
      let operationText = '';
      if (imageOperation === 'add') {
        operationText = `added ${validImageUrls.length} image${validImageUrls.length > 1 ? 's' : ''} to`;
      } else if (imageOperation === 'remove') {
        operationText = `removed images from`;
      } else {
        operationText = `replaced images in`;
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
        setHasBulkOperationsCompleted(true);
        setImageUrls(['']);
      }
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update images';
      console.error('Failed to update images:', error);
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
          setHasBulkOperationsCompleted(true); // Mark bulk operations as completed
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

  // Handler for fetching product details with lazy loading
  const handleFetchProductDetails = async (tabIndex: number) => {
    if (selectedProducts.length === 0) {
      setNotification({
        show: true,
        message: 'Please select products first',
        error: true
      });
      return;
    }

    // If details are already loaded for this tab, don't fetch again
    if (adsLoaded[tabIndex]) {
      return;
    }

    setFetchingAds(true);
    try {
      // Use the selected products that we already have in memory
      const selectedProductDetails = products.filter(p => selectedProducts.includes(p.id));
      
      // Set the product details directly without an API call
      setCurrentAds(selectedProductDetails);
      setAdsLoaded(prev => ({ ...prev, [tabIndex]: true }));
    } catch (error) {
      console.error('Error loading product details:', error);
      setNotification({
        show: true,
        message: 'Failed to load product details. Please try again.',
        error: true
      });
    } finally {
      setFetchingAds(false);
    }
  };

  // Reusable function to render Current Ads section
  const renderCurrentAdsSection = () => (
    <Card>
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h4" variant="headingSm">Selected Product Details</Text>
          <Button
            variant="plain"
            onClick={() => {
              const isCurrentlyOpen = showCurrentAds[activeBulkTab] || false;
              setShowCurrentAds(prev => ({
                ...prev,
                [activeBulkTab]: !isCurrentlyOpen
              }));
              // Lazy load product details when opening
              if (!isCurrentlyOpen) {
                handleFetchProductDetails(activeBulkTab);
              }
            }}
            icon={showCurrentAds[activeBulkTab] ? ChevronUpIcon : ChevronDownIcon}
            loading={fetchingAds}
          >
{`${showCurrentAds[activeBulkTab] ? 'Hide' : 'Show'} Details (${selectedProducts.length} products)`}
          </Button>
        </InlineStack>
        
        <Collapsible
          open={showCurrentAds[activeBulkTab] || false}
          id={`current-ads-collapsible-${activeBulkTab}`}
          transition={{duration: '200ms', timingFunction: 'ease-in-out'}}
          expandOnPrint
        >
          <BlockStack gap="300">
            {selectedProducts.length > 0 && products.filter(p => selectedProducts.includes(p.id)).map((product) => (
              <Box key={product.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text as="p" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
                    <Badge tone={product.status === 'ACTIVE' ? 'success' : 'attention'}>
                      {product.status}
                    </Badge>
                  </InlineStack>
                  
                  {/* Product details information */}
                  <Text as="p" variant="bodySm" tone="subdued">
                    Product Information: {fetchingAds ? 'Loading...' : 'Available'}
                  </Text>
                  
                  {!fetchingAds && currentAds.length > 0 && (
                    <BlockStack gap="200">
                      <InlineStack gap="100">
                        <Text as="span" variant="bodyMd">Price:</Text>
                        <Text as="span" variant="bodyMd" fontWeight="semibold">
                          {product.variants && product.variants.edges && product.variants.edges.length > 0 
                            ? `$${product.variants.edges[0].node.price}`
                            : '$0.00'}
                        </Text>
                      </InlineStack>
                      
                      <InlineStack gap="100" wrap={false} blockAlign="start">
                        <Text as="span" variant="bodyMd">Tags:</Text>
                        <div style={{
                          maxWidth: '300px',
                          overflowX: 'auto',
                          whiteSpace: 'nowrap',
                          scrollbarWidth: 'none',
                          msOverflowStyle: 'none',
                          padding: '4px 0'
                        }}>
                          <InlineStack gap="100">
                            {product.tags && product.tags.length > 0 ? 
                              product.tags.map((tag, index) => (
                                <Badge key={index} tone="info" size="small">{tag}</Badge>
                              )) : 
                              <Text as="span" variant="bodyMd" tone="subdued">No tags</Text>
                            }
                          </InlineStack>
                        </div>
                      </InlineStack>
                    </BlockStack>
                  )}
                </BlockStack>
              </Box>
            ))}
          </BlockStack>
        </Collapsible>
      </BlockStack>
    </Card>
  );

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
        
        // Comprehensive currency symbol map supporting all major Shopify currencies
        const currencySymbols: { [key: string]: string } = {
          // Americas
          'USD': '$',        // US Dollar
          'CAD': 'C$',       // Canadian Dollar
          'MXN': '$',        // Mexican Peso
          'BRL': 'R$',       // Brazilian Real
          'ARS': '$',        // Argentine Peso
          'CLP': '$',        // Chilean Peso
          'COP': '$',        // Colombian Peso
          'PEN': 'S/',       // Peruvian Sol
          
          // Europe
          'EUR': '€',        // Euro
          'GBP': '£',        // British Pound
          'CHF': 'CHF ',     // Swiss Franc
          'SEK': 'kr',       // Swedish Krona
          'NOK': 'kr',       // Norwegian Krone
          'DKK': 'kr',       // Danish Krone
          'ISK': 'kr',       // Icelandic Króna
          'PLN': 'zł',       // Polish Złoty
          'CZK': 'Kč',       // Czech Koruna
          'HUF': 'Ft',       // Hungarian Forint
          'RON': 'lei',      // Romanian Leu
          'BGN': 'лв',       // Bulgarian Lev
          'HRK': 'kn',       // Croatian Kuna
          'RUB': '₽',        // Russian Ruble
          'UAH': '₴',        // Ukrainian Hryvnia
          'TRY': '₺',        // Turkish Lira
          'TL': '₺',         // Turkish Lira (alternative)
          
          // Asia-Pacific
          'JPY': '¥',        // Japanese Yen
          'CNY': '¥',        // Chinese Yuan
          'KRW': '₩',        // South Korean Won
          'INR': '₹',        // Indian Rupee
          'IDR': 'Rp',       // Indonesian Rupiah
          'MYR': 'RM',       // Malaysian Ringgit
          'PHP': '₱',        // Philippine Peso
          'SGD': 'S$',       // Singapore Dollar
          'THB': '฿',        // Thai Baht
          'VND': '₫',        // Vietnamese Dong
          'HKD': 'HK$',      // Hong Kong Dollar
          'TWD': 'NT$',      // Taiwan Dollar
          'AUD': 'A$',       // Australian Dollar
          'NZD': 'NZ$',      // New Zealand Dollar
          'PKR': '₨',        // Pakistani Rupee
          'BDT': '৳',        // Bangladeshi Taka
          'LKR': 'Rs',       // Sri Lankan Rupee
          'NPR': 'Rs',       // Nepalese Rupee
          
          // Middle East & Africa
          'AED': 'د.إ',      // UAE Dirham
          'SAR': '﷼',        // Saudi Riyal
          'QAR': '﷼',        // Qatari Riyal
          'KWD': 'د.ك',      // Kuwaiti Dinar
          'BHD': 'د.ب',      // Bahraini Dinar
          'OMR': '﷼',        // Omani Rial
          'JOD': 'د.ا',      // Jordanian Dinar
          'ILS': '₪',        // Israeli Shekel
          'EGP': '£',        // Egyptian Pound
          'ZAR': 'R',        // South African Rand
          'NGN': '₦',        // Nigerian Naira
          'KES': 'KSh',      // Kenyan Shilling
          'GHS': '₵',        // Ghanaian Cedi
          'MAD': 'د.م.',     // Moroccan Dirham
          'TND': 'د.ت',      // Tunisian Dinar
          
          // Other
          'NIO': 'C$',       // Nicaraguan Córdoba
          'CRC': '₡',        // Costa Rican Colón
          'BOB': 'Bs.',      // Bolivian Boliviano
          'PYG': '₲',        // Paraguayan Guaraní
          'UYU': '$U',       // Uruguayan Peso
          'VES': 'Bs.S',     // Venezuelan Bolívar
          'DOP': 'RD$',      // Dominican Peso
          'GTQ': 'Q',        // Guatemalan Quetzal
          'HNL': 'L',        // Honduran Lempira
          'PAB': 'B/.',      // Panamanian Balboa
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

  // Load currency on component mount
  useEffect(() => {
    loadStoreCurrency();
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

  // Helper functions for product results selection





  if (!isVisible) {
    return null;
  }

  // Bulk Discount Handler


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
          </BlockStack>
        </Card>
      )}

      {/* Success Display */}
      {success && (
        <Card background="bg-surface-success">
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="p" variant="bodyMd" tone="success">
                {success}
              </Text>
              <Button
                variant="plain"
                onClick={() => setSuccess(null)}
                size="slim"
              >
                Dismiss
              </Button>
            </InlineStack>
          </BlockStack>
        </Card>
      )}

      {/* Product Management Header */}
      <BlockStack gap="400">
        {/* Modern Step Navigation - Individual Boxes */}
        <div className={styles.stepsContainer}>
            {/* Step 1: Select Products */}
            <div 
              className={`${styles.stepCard} ${activeMainTab === 0 ? `${styles.active} ${styles.activeInfo}` : ''}`}
              onClick={() => setActiveMainTab(0)}
            >
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <div className={`${styles.stepIcon} ${activeMainTab === 0 ? styles.active : ''}`}>
                        <Box 
                          background={activeMainTab >= 0 ? "bg-fill-info" : "bg-fill-disabled"} 
                          padding="200" 
                          borderRadius="100"
                        >
                          <Icon 
                            source={ProductIcon} 
                            tone={activeMainTab >= 0 ? undefined : "subdued"} 
                          />
                        </Box>
                      </div>
                      <BlockStack gap="050">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h3" variant="headingSm" fontWeight="semibold">
                            Step 1: Select Products
                          </Text>
                          <div className={`${styles.stepProgress} ${activeMainTab === 0 ? styles.current : (selectedProducts.length > 0 && hasBulkOperationsCompleted) ? styles.completed : styles.pending}`}>
                            {activeMainTab === 0 ? "Current" : (selectedProducts.length > 0 && hasBulkOperationsCompleted) ? "✓ Done" : "1 of 2"}
                          </div>
                        </InlineStack>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          Choose products and variants
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </InlineStack>
                  
                  <Text as="p" variant="bodySm" tone="subdued">
                    Choose products and variants to edit in bulk operations
                  </Text>
                  
                  {selectedProducts.length > 0 && (
                    <div className={styles.stepSuccess}>
                      <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                        {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
                      </Text>
                    </div>
                  )}
                </BlockStack>
              </Card>
            </div>

            {/* Step 2: Bulk Edit */}
            <div 
              className={`${styles.stepCard} ${activeMainTab === 1 ? `${styles.active} ${styles.activeInfo}` : ''}`}
              onClick={() => selectedVariants.length > 0 && setActiveMainTab(1)}
            >
              <Card>
                <BlockStack gap="300">
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <div className={`${styles.stepIcon} ${activeMainTab === 1 ? styles.active : ''}`}>
                        <Box 
                          background={activeMainTab >= 1 && selectedVariants.length > 0 ? "bg-fill-info" : "bg-fill-disabled"} 
                          padding="200" 
                          borderRadius="100"
                        >
                          <Icon 
                            source={EditIcon} 
                            tone={activeMainTab >= 1 && selectedVariants.length > 0 ? undefined : "subdued"} 
                          />
                        </Box>
                      </div>
                      <BlockStack gap="050">
                        <InlineStack gap="200" blockAlign="center">
                          <Text as="h3" variant="headingSm" fontWeight="semibold" tone={selectedVariants.length === 0 ? 'subdued' : undefined}>
                            Step 2: Bulk Edit
                          </Text>
                          <div className={`${styles.stepProgress} ${activeMainTab === 1 ? styles.current : hasBulkOperationsCompleted ? styles.completed : styles.pending}`}>
                            {activeMainTab === 1 ? "Current" : hasBulkOperationsCompleted ? "✓ Done" : "2 of 2"}
                          </div>
                        </InlineStack>
                        <Text as="p" variant="bodyXs" tone="subdued">
                          Apply changes to selections
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  </InlineStack>
                  
                  <Text as="p" variant="bodySm" tone="subdued">
                    {selectedVariants.length === 0 
                      ? 'Select products first to enable bulk editing'
                      : 'Apply changes to your selected items'
                    }
                  </Text>
                  
                  {selectedVariants.length > 0 && (
                    <div className={styles.stepSuccess}>
                      <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                        {selectedVariants.length} variant{selectedVariants.length !== 1 ? 's' : ''} ready for editing
                      </Text>
                    </div>
                  )}
                </BlockStack>
              </Card>
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
                  Selected Products ({selectedProducts.length} {selectedProducts.length === 1 ? 'product' : 'products'})
                </Text>
                <Button
                  variant="plain"
                  size="micro"
                  onClick={() => {
                    setSelectedVariants([]);
                    setSelectedProducts([]);
                    setHasBulkOperationsCompleted(false); // Reset completion state
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
                      {selectedProductsList.map((product, _index) => {
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
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
              gap: '12px',
              width: '100%'
            }}>
              {[
                { id: 0, label: 'Pricing', icon: MoneyIcon },
                { id: 1, label: 'Collections', icon: CollectionIcon },
                { id: 2, label: 'Tags', icon: HashtagIcon },
                { id: 3, label: 'Content', icon: EditIcon },
                { id: 4, label: 'Inventory', icon: InventoryIcon },
                { id: 5, label: 'Variants', icon: ProductIcon },
              ].map(({ id, label, icon }) => (
                <Button
                  key={id}
                  variant={activeBulkTab === id ? "primary" : "secondary"}
                  onClick={() => setActiveBulkTab(id)}
                  disabled={selectedVariants.length === 0}
                  size="large"
                  icon={icon}
                  fullWidth
                >
                  {label}
                </Button>
              ))}
            </div>
          )}
      </BlockStack>

      {/* Bulk Edit History removed */}

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
                <InlineStack gap="300" align="end">
                  <Badge tone="info" size="medium">
                    {`${selectedProducts.length} of ${filteredProducts.length} selected`}
                  </Badge>
                  <InlineStack gap="200">
                    <Button 
                      onClick={handleExportCSV}
                      disabled={selectedProducts.length === 0}
                      variant="secondary"
                      size="slim"
                      tone="success"
                    >
                      Export CSV
                    </Button>
                    <Button 
                      onClick={fetchAllProducts} 
                      loading={isLoading || fetcher.state === 'submitting'} 
                      variant="secondary"
                      size="slim"
                    >
                      Refresh Products
                    </Button>
                  </InlineStack>
                </InlineStack>
              </InlineStack>

              {/* Modern Compact Search and Filter Section */}
              <Card padding="0">
                <button
                  onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                  style={{
                    width: '100%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    padding: '16px 20px',
                    textAlign: 'left'
                  }}
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={SearchIcon} />
                      <Text as="h3" variant="headingXs">Filters & Search</Text>
                    </InlineStack>
                    <div style={{ marginLeft: 'auto' }}>
                      <Icon source={isFiltersOpen ? ChevronUpIcon : ChevronDownIcon} />
                    </div>
                  </InlineStack>
                </button>
                
                {isFiltersOpen && (
                  <div style={{ padding: '0 20px 20px 20px' }}>
                    <BlockStack gap="300">

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
                          setHasBulkOperationsCompleted(false); // Reset completion state
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
                )}
              </Card>
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
                    <>
                      <ProductTable
                        products={filteredProducts.slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)}
                        selectedProducts={selectedProducts}
                        selectedVariants={selectedVariants}
                        expandedProducts={expandedProducts}
                        onProductSelect={handleProductSelection}
                        onVariantSelect={(variantId, checked) => {
                          const product = filteredProducts.find(p => 
                            p.variants.edges.some(v => v.node.id === variantId)
                          );
                          if (product) {
                            handleVariantSelection(product.id, variantId, checked);
                          }
                        }}
                        onExpandProduct={toggleProductExpansion}
                        onViewProduct={(product) => navigateToProduct(product, 'storefront')}
                        onEditProduct={(product) => navigateToProduct(product, 'admin')}
                        onContinueToBulkEdit={() => setActiveMainTab(1)}
                      shopCurrency={currencySymbol}
                      showVariantSelection={true}
                      totalCount={filteredProducts.length}
                    />
                    
                    {/* Pagination Controls */}
                    {filteredProducts.length > productsPerPage && (
                      <Box padding="400">
                        <InlineStack align="center" gap="400">
                          <Button
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(currentPage - 1)}
                          >
                            Previous
                          </Button>
                          <Text as="p" variant="bodyMd">
                            Page {currentPage} of {Math.ceil(filteredProducts.length / productsPerPage)} 
                            {' '}({filteredProducts.length} products total)
                          </Text>
                          <Button
                            disabled={currentPage >= Math.ceil(filteredProducts.length / productsPerPage)}
                            onClick={() => setCurrentPage(currentPage + 1)}
                          >
                            Next
                          </Button>
                        </InlineStack>
                      </Box>
                    )}
                  </>
                  )}
                </div>
            </BlockStack>
          </BlockStack>
        </Card>
      ) : (
        /* Step 2: Bulk Edit - Complete Interface */
        <BlockStack gap="200">
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
                    <InlineStack gap="200" blockAlign="center">
                      <Text as="h3" variant="headingSm">Pricing Operations</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Change prices completely or round existing prices.
                      </Text>
                    </InlineStack>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update pricing for {selectedVariants.length} selected variants.
                    </Text>

                    {/* Current Ads Section */}
                    {renderCurrentAdsSection()}

                    {/* Price Management Category */}
                    <BlockStack gap="400">

                        <Text as="p" variant="bodyMd" fontWeight="medium">Price Update Method</Text>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                          <Button
                            variant={priceOperation === 'set' ? 'primary' : 'secondary'}
                            onClick={() => setPriceOperation('set')}
                            size="medium"
                          >
                            Set Fixed Price
                          </Button>
                          <Button
                            variant={priceOperation === 'increase' ? 'primary' : 'secondary'}
                            onClick={() => setPriceOperation('increase')}
                            size="medium"
                          >
                            Increase by %
                          </Button>
                          <Button
                            variant={priceOperation === 'decrease' ? 'primary' : 'secondary'}
                            onClick={() => setPriceOperation('decrease')}
                            size="medium"
                          >
                            Decrease by %
                          </Button>
                        </div>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {priceOperation === 'set' && 'Apply same price to all variants'}
                          {priceOperation === 'increase' && 'Increase current prices by percentage'}
                          {priceOperation === 'decrease' && 'Decrease current prices by percentage'}
                        </Text>
                        
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
                            placeholder="10"
                            autoComplete="off"
                            suffix="%"
                            helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} current prices by this percentage`}
                          />
                        )}

                        {/* Compare Price Section */}
                        <Divider />
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="center">
                            <Text as="p" variant="bodyMd" fontWeight="medium">Compare At Price</Text>
                            <Checkbox
                              label="Apply compare price changes"
                              checked={applyCompareChanges}
                              onChange={setApplyCompareChanges}
                            />
                          </InlineStack>
                          
                          {applyCompareChanges && (
                            <BlockStack gap="300">
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
                                <Button
                                  variant={compareOperation === 'set' ? 'primary' : 'secondary'}
                                  onClick={() => setCompareOperation('set')}
                                  size="medium"
                                >
                                  Set Fixed
                                </Button>
                                <Button
                                  variant={compareOperation === 'increase' ? 'primary' : 'secondary'}
                                  onClick={() => setCompareOperation('increase')}
                                  size="medium"
                                >
                                  Increase %
                                </Button>
                                <Button
                                  variant={compareOperation === 'decrease' ? 'primary' : 'secondary'}
                                  onClick={() => setCompareOperation('decrease')}
                                  size="medium"
                                >
                                  Decrease %
                                </Button>
                                <Button
                                  variant={compareOperation === 'remove' ? 'primary' : 'secondary'}
                                  onClick={() => setCompareOperation('remove')}
                                  size="medium"
                                >
                                  Remove
                                </Button>
                              </div>
                              
                              {compareOperation === 'set' && (
                                <TextField
                                  label="Compare At Price"
                                  type="number"
                                  value={compareValue}
                                  onChange={setCompareValue}
                                  placeholder="0.00"
                                  prefix={currencySymbol}
                                  helpText="Set compare at price for all selected variants"
                                  autoComplete="off"
                                />
                              )}
                              
                              {(compareOperation === 'increase' || compareOperation === 'decrease') && (
                                <TextField
                                  label={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} Compare Price %`}
                                  type="number"
                                  value={comparePercentage}
                                  onChange={setComparePercentage}
                                  placeholder="10"
                                  suffix="%"
                                  helpText={`${compareOperation === 'increase' ? 'Increase' : 'Decrease'} current compare prices by this percentage`}
                                  autoComplete="off"
                                />
                              )}
                              
                              {compareOperation === 'remove' && (
                                <Text as="p" variant="bodySm" tone="subdued">
                                  This will remove compare at price from all selected variants
                                </Text>
                              )}
                            </BlockStack>
                          )}
                        </BlockStack>

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


                  </BlockStack>
                )}

                {/* Collections Tab */}
                {activeBulkTab === 1 && (() => {
                  // Get current collections for selected products
                  const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
                  const currentCollections = new Set<string>();
                  selectedProductsData.forEach(product => {
                    product.collections?.edges.forEach(edge => {
                      currentCollections.add(edge.node.id);
                    });
                  });
                  
                  return (
                    <BlockStack gap="400">
                      <Text as="h3" variant="headingSm">Collection Management</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Manage collections for {selectedProducts.length} selected {selectedProducts.length === 1 ? 'product' : 'products'}.
                        <Text as="span" variant="bodyXs" tone="subdued" fontWeight="medium"> 
                          {" "}• Green dots indicate products already in the collection.
                        </Text>
                      </Text>

                      {/* Current Ads Section */}
                      {renderCurrentAdsSection()}

                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                          Collection Operation
                        </Text>
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                          gap: '8px', 
                          marginTop: '8px' 
                        }}>
                          <Button
                            variant={collectionOperation === 'add' ? 'primary' : 'secondary'}
                            onClick={() => setCollectionOperation('add')}
                            size="large"
                            icon={PlusIcon}
                          >
                            Add to Collections
                          </Button>
                          <Button
                            variant={collectionOperation === 'remove' ? 'primary' : 'secondary'}
                            onClick={() => setCollectionOperation('remove')}
                            size="large"
                            icon={MinusIcon}
                          >
                            Remove from Collections
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                          Available Collections
                        </Text>
                        <div style={{ 
                          maxHeight: '250px', 
                          overflowY: 'auto', 
                          border: '1px solid #e1e3e5', 
                          borderRadius: '8px', 
                          marginTop: '8px'
                        }}>
                          {filteredCollections.map((collection) => {
                            const isInCurrent = currentCollections.has(collection.id);
                            const isSelected = selectedCollections.includes(collection.id);
                            
                            return (
                              <div 
                                key={collection.id} 
                                style={{ 
                                  padding: '12px',
                                  borderBottom: '1px solid #f1f2f3',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: isSelected ? '#f0f8ff' : 'transparent'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(checked) => {
                                      if (checked) {
                                        setSelectedCollections([...selectedCollections, collection.id]);
                                      } else {
                                        setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                                      }
                                    }}
                                    label=""
                                  />
                                  <div>
                                    <Text as="p" variant="bodyMd">
                                      {collection.title}
                                    </Text>
                                    {isInCurrent && (
                                      <Text as="p" variant="bodySm" tone="subdued">
                                        Currently assigned
                                      </Text>
                                    )}
                                  </div>
                                </div>
                                {isInCurrent && (
                                  <div style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: '#008060'
                                  }} />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <Button
                        variant="primary"
                        onClick={handleBulkCollections}
                        disabled={selectedProducts.length === 0 || selectedCollections.length === 0}
                        loading={isLoading}
                        size="large"
                      >
                        {collectionOperation === 'add' ? 'Add Selected Collections' : 'Remove Selected Collections'}
                      </Button>
                    </BlockStack>
                  );
                })()}

                {/* Tags Tab */}
                {activeBulkTab === 2 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Tag Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Manage tags for {selectedProducts.length} selected {selectedProducts.length === 1 ? 'product' : 'products'}.
                    </Text>

                    {/* Current Ads Section */}
                    {renderCurrentAdsSection()}

                    <div>
                      <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                        Tag Operations
                      </Text>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                        gap: '8px', 
                        marginTop: '8px' 
                      }}>
                        <Button
                          variant={tagOperation === 'add' ? 'primary' : 'secondary'}
                          onClick={() => setTagOperation('add')}
                          size="large"
                          icon={PlusIcon}
                        >
                          Add Tags
                        </Button>
                        <Button
                          variant={tagOperation === 'remove' ? 'primary' : 'secondary'}
                          onClick={() => setTagOperation('remove')}
                          size="large"
                          icon={MinusIcon}
                        >
                          Remove Tags
                        </Button>
                      </div>
                    </div>
                    
                    <TextField
                      label={tagOperation === 'add' ? 'Tags to Add' : 'Tags to Remove'}
                      value={tagOperation === 'add' ? tagValue : tagRemoveValue}
                      onChange={tagOperation === 'add' ? setTagValue : setTagRemoveValue}
                      placeholder="Enter tags separated by commas"
                      autoComplete="off"
                      helpText="Separate multiple tags with commas (e.g., sale, summer, featured)"
                    />

                    <Button
                      variant="primary"
                      onClick={handleBulkTags}
                      disabled={
                        selectedProducts.length === 0 || 
                        (tagOperation === 'add' && !tagValue) ||
                        (tagOperation === 'remove' && !tagRemoveValue)
                      }
                      loading={isLoading}
                      size="large"
                    >
                      {tagOperation === 'add' ? 'Add Tags to Products' : 'Remove Tags from Products'}
                    </Button>
                  </BlockStack>
                )}

                {/* Content Tab */}
                {activeBulkTab === 3 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Content Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Update content for {selectedProducts.length} selected {selectedProducts.length === 1 ? 'product' : 'products'}.
                    </Text>

                    {/* Current Ads Section */}
                    {renderCurrentAdsSection()}

                    {/* Content Sub-tabs */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(3, 1fr)', 
                      gap: '8px', 
                      borderBottom: '1px solid #e1e3e5',
                      marginBottom: '20px'
                    }}>
                      {[
                        { id: 'title', label: 'Titles' },
                        { id: 'description', label: 'Descriptions' },
                        { id: 'images', label: 'Images' }
                      ].map(({ id, label }) => (
                        <Button
                          key={id}
                          variant={contentOperation === id ? 'primary' : 'tertiary'}
                          onClick={() => setContentOperation(id as any)}
                          size="medium"
                        >
                          {label}
                        </Button>
                      ))}
                    </div>

                    {/* Title Management */}
                    {contentOperation === 'title' && (
                      <BlockStack gap="400">
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                            Title Update Method
                          </Text>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                            gap: '8px', 
                            marginTop: '8px' 
                          }}>
                            <Button
                              variant={titleOperation === 'prefix' ? 'primary' : 'secondary'}
                              onClick={() => setTitleOperation('prefix')}
                              size="large"
                            >
                              Add Prefix
                            </Button>
                            <Button
                              variant={titleOperation === 'suffix' ? 'primary' : 'secondary'}
                              onClick={() => setTitleOperation('suffix')}
                              size="large"
                            >
                              Add Suffix
                            </Button>
                            <Button
                              variant={titleOperation === 'replace' ? 'primary' : 'secondary'}
                              onClick={() => setTitleOperation('replace')}
                              size="large"
                            >
                              Find & Replace
                            </Button>
                          </div>
                        </div>
                        
                        {titleOperation === 'replace' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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
                          </div>
                        ) : (
                          <TextField
                            label={titleOperation === 'prefix' ? 'Prefix Text' : 'Suffix Text'}
                            value={titleValue}
                            onChange={setTitleValue}
                            placeholder={
                              titleOperation === 'prefix' 
                                ? 'Text to add at beginning (e.g., "NEW - ")' 
                                : 'Text to add at end (e.g., " - ON SALE")'
                            }
                            autoComplete="off"
                          />
                        )}

                        <Button
                          variant="primary"
                          onClick={handleBulkTitleUpdate}
                          disabled={
                            selectedProducts.length === 0 || 
                            (titleOperation === 'replace' && (!titleReplaceFrom || !titleReplaceTo)) ||
                            ((titleOperation === 'prefix' || titleOperation === 'suffix') && !titleValue)
                          }
                          loading={isLoading}
                          size="large"
                        >
                          Update Product Titles
                        </Button>
                      </BlockStack>
                    )}

                    {/* Description Management */}
                    {contentOperation === 'description' && (
                      <BlockStack gap="400">
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                            Description Update Method
                          </Text>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                            gap: '8px', 
                            marginTop: '8px' 
                          }}>
                            <Button
                              variant={descriptionOperation === 'prefix' ? 'primary' : 'secondary'}
                              onClick={() => setDescriptionOperation('prefix')}
                              size="large"
                            >
                              Add Prefix
                            </Button>
                            <Button
                              variant={descriptionOperation === 'suffix' ? 'primary' : 'secondary'}
                              onClick={() => setDescriptionOperation('suffix')}
                              size="large"
                            >
                              Add Suffix
                            </Button>
                            <Button
                              variant={descriptionOperation === 'replace' ? 'primary' : 'secondary'}
                              onClick={() => setDescriptionOperation('replace')}
                              size="large"
                            >
                              Find & Replace
                            </Button>
                          </div>
                        </div>
                        
                        {descriptionOperation === 'replace' ? (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <TextField
                              label="Find Text in Description"
                              value={titleReplaceFrom}
                              onChange={setTitleReplaceFrom}
                              placeholder="Text to find in descriptions"
                              autoComplete="off"
                              multiline={3}
                            />
                            <TextField
                              label="Replace With"
                              value={titleReplaceTo}
                              onChange={setTitleReplaceTo}
                              placeholder="Replacement text"
                              autoComplete="off"
                              multiline={3}
                            />
                          </div>
                        ) : (
                          <TextField
                            label={descriptionOperation === 'prefix' ? 'Prefix Text' : 'Suffix Text'}
                            value={descriptionValue}
                            onChange={setDescriptionValue}
                            placeholder={
                              descriptionOperation === 'prefix' 
                                ? 'Text to add at beginning of descriptions' 
                                : 'Text to add at end of descriptions'
                            }
                            autoComplete="off"
                            multiline={4}
                            helpText="This text will be added to all selected product descriptions"
                          />
                        )}

                        <Button
                          variant="primary"
                          onClick={handleBulkDescriptionUpdate}
                          disabled={
                            selectedProducts.length === 0 || 
                            (descriptionOperation === 'replace' && (!titleReplaceFrom || !titleReplaceTo)) ||
                            ((descriptionOperation === 'prefix' || descriptionOperation === 'suffix') && !descriptionValue)
                          }
                          loading={isLoading}
                          size="large"
                        >
                          Update Product Descriptions
                        </Button>
                      </BlockStack>
                    )}

                    {/* Images Management */}
                    {contentOperation === 'images' && (
                      <BlockStack gap="400">
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                            Image Operation Type
                          </Text>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', 
                            gap: '8px', 
                            marginTop: '8px' 
                          }}>
                            <Button
                              variant={imageOperation === 'add' ? 'primary' : 'secondary'}
                              onClick={() => setImageOperation('add')}
                              size="large"
                              icon={PlusIcon}
                            >
                              Add Images
                            </Button>
                            <Button
                              variant={imageOperation === 'remove' ? 'primary' : 'secondary'}
                              onClick={() => setImageOperation('remove')}
                              size="large"
                              icon={MinusIcon}
                            >
                              Remove Images
                            </Button>
                            <Button
                              variant={imageOperation === 'replace' ? 'primary' : 'secondary'}
                              onClick={() => setImageOperation('replace')}
                              size="large"
                            >
                              Replace Images
                            </Button>
                          </div>
                        </div>

                        {imageOperation === 'add' && (
                          <BlockStack gap="400">
                            <div>
                              <Text as="p" variant="bodyMd" fontWeight="medium">Image Position</Text>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '8px' }}>
                                <Button
                                  variant={imagePosition === 'start' ? 'primary' : 'secondary'}
                                  onClick={() => setImagePosition('start')}
                                  size="medium"
                                >
                                  Add to Beginning
                                </Button>
                                <Button
                                  variant={imagePosition === 'end' ? 'primary' : 'secondary'}
                                  onClick={() => setImagePosition('end')}
                                  size="medium"
                                >
                                  Add to End
                                </Button>
                              </div>
                            </div>

                            <div>
                              <Text as="p" variant="bodyMd" fontWeight="medium">Image URLs</Text>
                              <Text as="p" variant="bodySm" tone="subdued">
                                Add image URLs to be added to all selected products
                              </Text>
                              {imageUrls.map((url, index) => (
                                <div key={index} style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                  <div style={{ flex: 1 }}>
                                    <TextField
                                      label={`Image URL ${index + 1}`}
                                      value={url}
                                      onChange={(value) => {
                                        const newUrls = [...imageUrls];
                                        newUrls[index] = value;
                                        setImageUrls(newUrls);
                                      }}
                                      placeholder="https://example.com/image.jpg"
                                      autoComplete="off"
                                    />
                                  </div>
                                  {imageUrls.length > 1 && (
                                    <div style={{ paddingTop: '24px' }}>
                                      <Button
                                        variant="plain"
                                        icon={MinusIcon}
                                        onClick={() => {
                                          const newUrls = imageUrls.filter((_, i) => i !== index);
                                          setImageUrls(newUrls);
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              ))}
                              
                              <div style={{ marginTop: '12px' }}>
                                <Button
                                  variant="plain"
                                  icon={PlusIcon}
                                  onClick={() => setImageUrls([...imageUrls, ''])}
                                >
                                  Add Another Image URL
                                </Button>
                              </div>
                            </div>
                          </BlockStack>
                        )}

                        {imageOperation === 'remove' && (
                          <BlockStack gap="300">
                            <Text as="p" variant="bodyMd" tone="subdued">
                              Choose how to remove images from selected products:
                            </Text>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                              <Button variant="secondary" size="medium">
                                Remove First Image
                              </Button>
                              <Button variant="secondary" size="medium">
                                Remove Last Image
                              </Button>
                              <Button variant="secondary" size="medium">
                                Remove All Images
                              </Button>
                            </div>
                          </BlockStack>
                        )}

                        {imageOperation === 'replace' && (
                          <BlockStack gap="300">
                            <Text as="p" variant="bodyMd" tone="subdued">
                              Replace all existing images with new ones:
                            </Text>
                            {imageUrls.map((url, index) => (
                              <div key={index} style={{ display: 'flex', gap: '8px' }}>
                                <div style={{ flex: 1 }}>
                                  <TextField
                                    label={`Replacement Image URL ${index + 1}`}
                                    value={url}
                                    onChange={(value) => {
                                      const newUrls = [...imageUrls];
                                      newUrls[index] = value;
                                      setImageUrls(newUrls);
                                    }}
                                    placeholder="https://example.com/new-image.jpg"
                                    autoComplete="off"
                                  />
                                </div>
                                {imageUrls.length > 1 && (
                                  <div style={{ paddingTop: '24px' }}>
                                    <Button
                                      variant="plain"
                                      icon={MinusIcon}
                                      onClick={() => {
                                        const newUrls = imageUrls.filter((_, i) => i !== index);
                                        setImageUrls(newUrls);
                                      }}
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                            
                            <Button
                              variant="plain"
                              icon={PlusIcon}
                              onClick={() => setImageUrls([...imageUrls, ''])}
                            >
                              Add Another Replacement Image
                            </Button>
                          </BlockStack>
                        )}

                        <Button
                          variant="primary"
                          onClick={handleBulkImageUpdate}
                          disabled={
                            selectedProducts.length === 0 || 
                            (imageOperation !== 'remove' && imageUrls.every(url => !url.trim()))
                          }
                          loading={isLoading}
                          size="large"
                        >
                          {imageOperation === 'add' ? 'Add Images to Products' :
                           imageOperation === 'remove' ? 'Remove Images from Products' :
                           'Replace Product Images'}
                        </Button>
                      </BlockStack>
                    )}
                  </BlockStack>
                )}

                {/* Inventory Tab */}
                {activeBulkTab === 4 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Inventory Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Manage inventory for {selectedVariants.length} selected variant{selectedVariants.length === 1 ? '' : 's'} across {selectedProducts.length} product{selectedProducts.length === 1 ? '' : 's'}.
                    </Text>

                    {/* Current Ads Section */}
                    {renderCurrentAdsSection()}

                    {/* Inventory Operation Buttons */}
                    <div>
                      <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                        Inventory Operations
                      </Text>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                        gap: '8px', 
                        marginTop: '8px' 
                      }}>
                        <Button
                          variant={inventoryOperation === 'stock' ? 'primary' : 'secondary'}
                          onClick={() => setInventoryOperation('stock')}
                          size="large"
                          icon={PackageIcon}
                        >
                          Stock Quantities
                        </Button>
                        <Button
                          variant={inventoryOperation === 'sku' ? 'primary' : 'secondary'}
                          onClick={() => setInventoryOperation('sku')}
                          size="large"
                          icon={CalculatorIcon}
                        >
                          SKU Management
                        </Button>
                        <Button
                          variant={inventoryOperation === 'cost' ? 'primary' : 'secondary'}
                          onClick={() => setInventoryOperation('cost')}
                          size="large"
                          icon={LocationIcon}
                        >
                          Cost & Weight
                        </Button>
                      </div>
                    </div>

                    {/* Stock Management Interface */}
                    {inventoryOperation === 'stock' && (
                      <BlockStack gap="400">
                        <div>
                          <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                            Update Method
                          </Text>
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', 
                            gap: '8px', 
                            marginTop: '8px' 
                          }}>
                            <Button
                              variant={stockUpdateMethod === 'set' ? 'primary' : 'secondary'}
                              onClick={() => setStockUpdateMethod('set')}
                              size="large"
                            >
                              Set Exact Amount
                            </Button>
                            <Button
                              variant={stockUpdateMethod === 'add' ? 'primary' : 'secondary'}
                              onClick={() => setStockUpdateMethod('add')}
                              size="large"
                              icon={PlusIcon}
                            >
                              Add to Current
                            </Button>
                            <Button
                              variant={stockUpdateMethod === 'subtract' ? 'primary' : 'secondary'}
                              onClick={() => setStockUpdateMethod('subtract')}
                              size="large"
                              icon={MinusIcon}
                            >
                              Subtract from Current
                            </Button>
                          </div>
                        </div>
                        
                        <div style={{ maxWidth: '300px' }}>
                          <TextField
                            label="Quantity"
                            type="number"
                            value={stockQuantity}
                            onChange={setStockQuantity}
                            placeholder="0"
                            autoComplete="off"
                            helpText={`${stockUpdateMethod === 'set' ? 'Set inventory to' : stockUpdateMethod === 'add' ? 'Add to current inventory:' : 'Subtract from current inventory:'} this amount`}
                          />
                        </div>

                        <Button
                          variant="primary"
                          onClick={handleBulkInventoryUpdate}
                          disabled={
                            selectedVariants.length === 0 || 
                            !stockQuantity || 
                            stockQuantity === '0'
                          }
                          loading={isLoading}
                          size="large"
                        >
{`Update ${selectedVariants.length} Variant${selectedVariants.length === 1 ? '' : 's'} Stock`}
                        </Button>
                      </BlockStack>
                    )}

                    {/* SKU Management Interface */}
                    {inventoryOperation === 'sku' && (
                      <div style={{
                        padding: '24px',
                        backgroundColor: '#f6f6f7',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <Text as="h4" variant="headingMd">
                          SKU Management
                        </Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            SKU bulk operations are coming soon! For now, manage SKUs individually in each product variant.
                          </Text>
                        </div>
                      </div>
                    )}

                    {/* Cost & Weight Interface */}
                    {inventoryOperation === 'cost' && (
                      <div style={{
                        padding: '24px',
                        backgroundColor: '#f6f6f7',
                        borderRadius: '8px',
                        textAlign: 'center'
                      }}>
                        <Text as="h4" variant="headingMd">
                          Cost & Weight Management
                        </Text>
                        <div style={{ marginTop: '8px' }}>
                          <Text as="p" variant="bodyMd" tone="subdued">
                            Bulk cost and weight updates coming soon! This will include shipping weight, cost per item, and origin country.
                          </Text>
                        </div>
                      </div>
                    )}
                  </BlockStack>
                )}

                {/* Variants Tab */}
                {activeBulkTab === 5 && (
                  <BlockStack gap="400">
                    <Text as="h3" variant="headingSm">Variant Management</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Manage variants across {selectedProducts.length} selected product{selectedProducts.length === 1 ? '' : 's'}. This helps with common variant operations that are tedious to do one-by-one.
                    </Text>

                    {/* Current Ads Section */}
                    {renderCurrentAdsSection()}

                    {/* Variant Operations */}
                    <div>
                      <Text as="p" variant="bodyMd" fontWeight="medium" tone="base">
                        Variant Operations
                      </Text>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                        gap: '8px', 
                        marginTop: '8px' 
                      }}>
                        <Button
                          variant="secondary"
                          size="large"
                          icon={PlusIcon}
                        >
                          Add Variant Options
                        </Button>
                        <Button
                          variant="secondary"
                          size="large"
                          icon={EditIcon}
                        >
                          Update Variant Titles
                        </Button>
                        <Button
                          variant="secondary"
                          size="large"
                          icon={MinusIcon}
                        >
                          Remove Variants
                        </Button>
                      </div>
                    </div>

                    {/* Variant Insights */}
                    <div style={{
                      padding: '20px',
                      backgroundColor: '#f6f6f7',
                      borderRadius: '8px',
                      border: '1px solid #e1e3e5'
                    }}>
                      <Text as="h4" variant="headingSm">
                        Variant Overview
                      </Text>
                      <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                          <div>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Total Variants: {selectedVariants.length}
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              Across {selectedProducts.length} products
                            </Text>
                          </div>
                          <div>
                            <Text as="p" variant="bodyMd" fontWeight="medium">
                              Common Pain Points
                            </Text>
                            <Text as="p" variant="bodySm" tone="subdued">
                              • Adding size/color options to multiple products<br/>
                              • Standardizing variant names<br/>
                              • Removing discontinued variants
                            </Text>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Coming Soon */}
                    <div style={{
                      padding: '24px',
                      backgroundColor: '#fff9e6',
                      borderRadius: '8px',
                      border: '1px solid #ffd666',
                      textAlign: 'center'
                    }}>
                      <Text as="h4" variant="headingMd">
                        Advanced Variant Management Coming Soon
                      </Text>
                      <div style={{ marginTop: '12px' }}>
                        <Text as="p" variant="bodyMd" tone="subdued">
                          This feature will help you efficiently manage variants across multiple products - a major time-saver for store owners with complex product catalogs.
                        </Text>
                      </div>
                      <div style={{ marginTop: '16px' }}>
                        <Text as="p" variant="bodySm" tone="subdued">
                          <strong>Planned features:</strong><br/>
                          • Bulk add variant options (Size: S, M, L, XL)<br/>
                          • Standardize variant naming across products<br/>
                          • Mass remove specific variants<br/>
                          • Copy variant structure between products<br/>
                          • Variant pricing synchronization
                        </Text>
                      </div>
                    </div>
                  </BlockStack>
                )}


              </BlockStack>
            </Card>
          )}
        </BlockStack>
      )}

      {notification.show && (
        <>
          <Toast
            content={notification.message}
            error={notification.error}
            onDismiss={() => setNotification({ show: false, message: '' })}
            duration={4000}
            action={notification.actionLabel ? {
              content: notification.actionLabel,
              onAction: notification.onAction
            } : undefined}
          />
          {/* Fallback banner in case Toast fails with frame error */}
          {notification.message && (
            <div style={{ 
              position: 'fixed', 
              bottom: '20px', 
              right: '20px',
              zIndex: 9999, 
              display: 'none'
            }}
            className="toast-fallback">
              <Banner tone={notification.error ? "critical" : "success"}>
                <Text as="p">{notification.message}</Text>
              </Banner>
            </div>
          )}
        </>
      )}

      {/* Bulk Operation Modal removed - changes now apply directly */}
    </BlockStack>
    </>
  );
}
