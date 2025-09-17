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
  // Banner,
  Tabs,
} from '@shopify/polaris';
// Import only the icons we actually use
import { ProductIcon, EditIcon, ViewIcon, ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon, ChevronUpIcon } from "@shopify/polaris-icons";

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
  // const exportSettings = {
  //   format: 'csv' as const
  // };
  
  const fetcher = useFetcher<{ products: Product[]; hasNextPage: boolean; endCursor?: string; error?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
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
  const [pricePercentage, setPricePercentage] = useState('');
  const [roundingRule, setRoundingRule] = useState<'nearest' | 'up' | 'down'>('nearest');
  const [compareAtPrice, setCompareAtPrice] = useState('');
  const [applyToComparePrice, setApplyToComparePrice] = useState(false);
  
  // Collection Management State
  const [collectionOperation, setCollectionOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [availableCollections, setAvailableCollections] = useState<{id: string, title: string}[]>([]);
  const [collectionSearchQuery, setCollectionSearchQuery] = useState('');
  
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
  const [shippingRequirements, setShippingRequirements] = useState<string[]>([]);
  
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

  // Reset slider when filters change
  useEffect(() => {
    setProductResultsSliderIndex(0);
  }, [searchQuery, currentCategory, showDraftProducts, sortField, sortDirection]);

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
    
    if ((priceOperation === 'increase' || priceOperation === 'decrease') && (!pricePercentage || parseFloat(pricePercentage) <= 0)) {
      setError("Please enter a valid percentage greater than 0.");
      return;
    }
    
    if (priceOperation === 'decrease' && parseFloat(pricePercentage) >= 100) {
      setError("Decrease percentage must be less than 100%.");
      return;
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
          const currentPrice = parseFloat(product.variants.edges[0]?.node.price || '0');
          
          if (currentPrice === 0 && priceOperation !== 'set') {
            failed.push(`${product.title}: No current price found. Please set a fixed price first.`);
            continue;
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
            failed.push(`${product.title}: Calculated price ($${newPrice.toFixed(2)}) is below minimum ($0.01)`);
            continue;
          }

          updates.push({
            productId,
            variantId: product.variants.edges[0]?.node.id,
            productTitle: product.title,
            price: newPrice.toFixed(2),
            compareAtPrice: applyToComparePrice ? compareAtPrice : undefined
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
                      price: update.newPrice || edge.node.price
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
      
      // Reset form and selections only if completely successful
      if (failed.length === 0) {
        setPriceValue('');
        setPricePercentage('');
        setCompareAtPrice('');
        setSelectedProducts([]);
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
    console.log(null);
    
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
      console.log(`Successfully ${actionText} ${selectedCollections.length} collections for ${selectedProducts.length} products!`);
      
      // Reset selections
      setSelectedCollections([]);
      setSelectedProducts([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => console.log(null), 3000);
      
      // Refresh products
      await fetchAllProducts();
      
    } catch (error) {
      console.error('Failed to update collections:', error);
      setError(`Failed to update collections: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      setSelectedProducts([]);
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
      setSelectedProducts([]);
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
      setSelectedProducts([]);
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

  const renderTableView = () => {
    const paginatedProducts = filteredProducts.slice(productResultsSliderIndex, productResultsSliderIndex + productsPerPage);
    const rows = paginatedProducts.map(product => {
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
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="200" blockAlign="center" wrap={false}>
                    <Checkbox
                      checked={selectedProducts.includes(product.id)}
                      onChange={(checked) => handleBulkSelect(product.id, checked)}
                      label=""
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text as="h3" variant="bodyMd" fontWeight="semibold" truncate>
                        {product.title}
                      </Text>
                    </div>
                  </InlineStack>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    <Badge tone={getBadgeTone(inventory)}>
                      {`${inventory}`}
                    </Badge>
                    <Badge tone={
                      product.status === 'ACTIVE' ? 'success' : 
                      product.status === 'DRAFT' ? 'attention' : 
                      product.status === 'ARCHIVED' ? 'critical' : undefined
                    }>
                      {product.status}
                    </Badge>
                    <Button
                      icon={expandedProducts.has(product.id) ? ChevronUpIcon : ChevronDownIcon}
                      variant="plain"
                      size="slim"
                      onClick={() => toggleProductExpansion(product.id)}
                      accessibilityLabel={`${expandedProducts.has(product.id) ? 'Collapse' : 'Expand'} product details`}
                    />
                    <Button
                      icon={ViewIcon}
                      variant="plain"
                      size="slim"
                      onClick={() => navigateToProduct(product, 'storefront')}
                      accessibilityLabel={`${product.status === 'ACTIVE' ? 'View live' : 'View admin'} ${product.title}`}
                    />
                  </div>
                </InlineStack>

                {/* Expandable Details Section */}
                {expandedProducts.has(product.id) && (
                  <Box paddingBlockStart="300" paddingInlineStart="400">
                    <Card background="bg-surface-secondary" padding="300">
                      <BlockStack gap="300">
                        {/* Basic Info Row */}
                        <InlineStack gap="600" wrap>
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="bodySm" fontWeight="medium">Handle:</Text>
                            <Text as="span" variant="bodySm" tone="subdued">{product.handle}</Text>
                          </InlineStack>
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="span" variant="bodySm" fontWeight="medium">Variants:</Text>
                            <Text as="span" variant="bodySm" tone="subdued">{product.variants.edges.length}</Text>
                          </InlineStack>
                        </InlineStack>
                        
                        {/* Variant Details */}
                        {product.variants.edges.length > 0 && (
                          <BlockStack gap="200">
                            <Text as="p" variant="bodySm" fontWeight="medium">
                              Pricing & Inventory
                            </Text>
                            <div style={{ 
                              display: 'grid', 
                              gridTemplateColumns: '1fr auto auto auto', 
                              gap: '12px 16px',
                              alignItems: 'center',
                              fontSize: '13px'
                            }}>
                              {/* Headers */}
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Variant</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Price</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">Stock</Text>
                              <Text as="span" variant="bodyXs" fontWeight="medium" tone="subdued">SKU</Text>
                              
                              {/* Data rows */}
                              {product.variants.edges.slice(0, 3).map((variant) => (
                                <>
                                  <Text key={`${variant.node.id}-title`} as="span" variant="bodyXs">
                                    {variant.node.title !== 'Default Title' ? variant.node.title : 'Default'}
                                  </Text>
                                  <Text key={`${variant.node.id}-price`} as="span" variant="bodyXs" fontWeight="medium">
                                    ${variant.node.price}
                                  </Text>
                                  <Text key={`${variant.node.id}-stock`} as="span" variant="bodyXs">
                                    {variant.node.inventoryQuantity || 0}
                                  </Text>
                                  <Text key={`${variant.node.id}-sku`} as="span" variant="bodyXs" tone="subdued">
                                    {variant.node.sku || '-'}
                                  </Text>
                                </>
                              ))}
                            </div>
                            {product.variants.edges.length > 3 && (
                              <Text as="p" variant="bodyXs" tone="subdued" alignment="center">
                                ... and {product.variants.edges.length - 3} more variants
                              </Text>
                            )}
                          </BlockStack>
                        )}
                      </BlockStack>
                    </Card>
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

      {/* Main Layout - Left: Management Controls, Right: Product List */}
      <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 120px)' }}>
        {/* Left Column - Product Management Controls */}
        <div style={{ 
          width: '400px', 
          minWidth: '380px', 
          paddingRight: '8px'
        }}>
          <BlockStack gap="400">
            {/* Compact Header */}
            <Card>
                <BlockStack gap="300">
                  <Text as="h3" variant="headingMd">
                    Product Management
                  </Text>
                  <InlineStack gap="200" wrap={false}>
                    <Badge tone={filteredProducts.length === 0 ? 'attention' : 'info'}>
                      {`${filteredProducts.length} found`}
                    </Badge>
                    {selectedProducts.length > 0 && (
                      <Badge tone="success">
                        {`${selectedProducts.length} selected`}
                      </Badge>
                    )}
                  </InlineStack>
                  <Button 
                    onClick={fetchAllProducts} 
                    loading={isLoading || fetcher.state === 'submitting'} 
                    variant="primary"
                    size="slim"
                  >
                    Refresh Data
                  </Button>
                </BlockStack>
              </Card>

            {/* Bulk Operations Tabs */}
            <Card background="bg-surface-secondary" padding="400">
              <BlockStack gap="400">
                <InlineStack align="space-between" blockAlign="center">
                  <Text as="h4" variant="headingSm">Bulk Operations</Text>
                  <Badge tone={selectedProducts.length > 0 ? 'success' : 'attention'}>
                    {selectedProducts.length > 0 ? `${selectedProducts.length} products selected` : 'No products selected'}
                  </Badge>
                </InlineStack>

                <div style={{ overflowX: 'auto', paddingBottom: '12px', marginBottom: '8px' }}>
                  <Tabs
                    tabs={[
                      { id: '0', content: 'Pricing', disabled: selectedProducts.length === 0 },
                      { id: '1', content: 'Collections', disabled: selectedProducts.length === 0 },
                      { id: '2', content: 'Titles', disabled: selectedProducts.length === 0 },
                      { id: '3', content: 'Descriptions', disabled: selectedProducts.length === 0 },
                      { id: '4', content: 'Tags', disabled: selectedProducts.length === 0 },
                      { id: '5', content: 'Inventory', disabled: selectedProducts.length === 0 },
                      { id: '6', content: 'Shipping', disabled: selectedProducts.length === 0 },
                      { id: '7', content: 'Media', disabled: selectedProducts.length === 0 },
                      { id: '8', content: 'History', disabled: selectedProducts.length === 0 },
                    ]}
                    selected={activeBulkTab}
                    onSelect={setActiveBulkTab}
                  />
                </div>

                {/* Bulk Operation Content */}
                {selectedProducts.length > 0 && (
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
                              { label: 'Round Prices - Round to nearest dollar/cent', value: 'round' },
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
                              prefix="$"
                              helpText="Set the same price for all selected products"
                            />
                          )}
                          
                          {(priceOperation === 'increase' || priceOperation === 'decrease') && (
                            <TextField
                              label={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} Percentage`}
                              type="number"
                              value={pricePercentage}
                              onChange={setPricePercentage}
                              placeholder="10" autoComplete="off"
                              suffix="%"
                              helpText={`${priceOperation === 'increase' ? 'Increase' : 'Decrease'} current prices by this percentage`}
                            />
                          )}
                          
                          {priceOperation === 'round' && (
                            <ChoiceList
                              title="Rounding Rule"
                              choices={[
                                { label: 'Round to nearest dollar', value: 'nearest' },
                                { label: 'Round up to next dollar', value: 'up' },
                                { label: 'Round down to previous dollar', value: 'down' },
                              ]}
                              selected={[roundingRule]}
                              onChange={(value) => setRoundingRule(value[0] as any)}
                            />
                          )}
                          
                              <Button
                                variant="primary"
                                onClick={handleBulkPricing}
                            disabled={!priceValue && !pricePercentage}
                              >
                            Apply Pricing Changes
                              </Button>
                    </BlockStack>
                      )}

                      {activeBulkTab === 1 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Collection Management</Text>
                          <ChoiceList
                            title="Collection Operation"
                            choices={[
                              { label: 'Add to Collections - Add products to selected collections', value: 'add' },
                              { label: 'Remove from Collections - Remove products from selected collections', value: 'remove' },
                              { label: 'Replace Collections - Replace all collections with selected ones', value: 'replace' },
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
                          
                          <Button
                            variant="primary"
                            onClick={handleBulkCollections}
                            disabled={selectedCollections.length === 0}
                          >
                            Apply Collection Changes
                          </Button>
                              </BlockStack>
                      )}

                      {activeBulkTab === 2 && (
                      <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Title Updates</Text>
                          <ChoiceList
                            title="Title Operation"
                            choices={[
                              { label: 'Add Prefix - Add text to beginning of titles', value: 'prefix' },
                              { label: 'Add Suffix - Add text to end of titles', value: 'suffix' },
                              { label: 'Find & Replace - Replace text in titles', value: 'replace' },
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
                            onClick={() => {/* TODO: Implement title updates */}}
                            disabled={!titleValue && !titleReplaceFrom}
                          >
                            Apply Title Changes
                                    </Button>
                                </BlockStack>
                              )}

                      {activeBulkTab === 3 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Description Updates</Text>
                          <ChoiceList
                            title="Description Operation"
                            choices={[
                              { label: 'Append Text - Add text to end of descriptions', value: 'append' },
                              { label: 'Prepend Text - Add text to beginning of descriptions', value: 'prepend' },
                              { label: 'Find & Replace - Replace text in descriptions', value: 'replace' },
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
                            onClick={() => {/* TODO: Implement description updates */}}
                            disabled={!descriptionValue && !descriptionReplaceFrom}
                              >
                            Apply Description Changes
                                    </Button>
                        </BlockStack>
                      )}

                      {activeBulkTab === 4 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Tag Management</Text>
                          <ChoiceList
                            title="Tag Operation"
                            choices={[
                              { label: 'Add Tags - Add new tags to products', value: 'add' },
                              { label: 'Remove Tags - Remove specific tags from products', value: 'remove' },
                              { label: 'Replace Tags - Replace all tags with new ones', value: 'replace' },
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
                                        variant="primary"
                            onClick={() => {/* TODO: Implement tag updates */}}
                            disabled={!tagValue && !tagRemoveValue}
                          >
                            Apply Tag Changes
                                      </Button>
                          </BlockStack>
                      )}


                      {activeBulkTab === 5 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Inventory Management</Text>
                          <TextField
                            label="Product Cost"
                            type="number"
                            value={costValue}
                            onChange={setCostValue}
                            placeholder="0.00" autoComplete="off"
                            prefix="$"
                            helpText="Set the cost price for all selected products"
                          />
                          
                                      <TextField
                            label="Weight"
                            type="number"
                            value={weightValue}
                            onChange={setWeightValue}
                            placeholder="0.0" autoComplete="off"
                            suffix="lbs"
                            helpText="Set the weight for all selected products"
                          />
                          
                          <TextField
                            label="Origin Country"
                            value={originCountry}
                            onChange={setOriginCountry}
                            placeholder="Enter country code (e.g., US, CA, UK)" autoComplete="off"
                            helpText="Set the origin country for all selected products"
                          />
                          
                              <Button
                            variant="primary"
                            onClick={() => {/* TODO: Implement inventory updates */}}
                            disabled={!costValue && !weightValue && !originCountry}
                          >
                            Apply Inventory Changes
                              </Button>
                    </BlockStack>
                      )}

                      {activeBulkTab === 6 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Shipping Management</Text>
                                            <ChoiceList
                            title="Shipping Requirements"
                            choices={[
                              { label: 'Requires shipping', value: 'shipping' },
                              { label: 'Digital product', value: 'digital' },
                              { label: 'Fragile item', value: 'fragile' },
                              { label: 'Hazardous material', value: 'hazardous' },
                            ]}
                            selected={shippingRequirements}
                            onChange={setShippingRequirements}
                                              allowMultiple
                          />
                          
                                        <Button
                                          variant="primary"
                            onClick={() => {/* TODO: Implement shipping updates */}}
                            disabled={shippingRequirements.length === 0}
                          >
                            Apply Shipping Changes
                                        </Button>
                              </BlockStack>
                      )}

                      {activeBulkTab === 7 && (
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

                      {activeBulkTab === 8 && (
                        <BlockStack gap="400">
                          <Text as="h5" variant="headingSm">Operation History</Text>
                          <Text as="p" variant="bodySm" tone="subdued">
                            Track all bulk operations and their results. This will include:
                          </Text>
                          <ul>
                            <li>Operation history and timestamps</li>
                            <li>Success/failure reports</li>
                            <li>Change previews before applying</li>
                            <li>Export change reports</li>
                          </ul>
                          <Button
                            variant="secondary"
                            disabled
                          >
                            Coming Soon
                          </Button>
                                      </BlockStack>
                                )}
                    </BlockStack>
                  </Card>
                )}
              </BlockStack>
            </Card>
            </BlockStack>
        </div>

        {/* Right Column - Product Results */}
        <div style={{ 
          flex: 1, 
          height: 'calc(100vh - 120px)', 
          overflowY: 'auto' 
        }}>
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
                      <Text as="span" variant="bodySm" fontWeight="medium">{selectedProducts.length}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">Selected</Text>
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
                  <InlineStack gap="200" wrap>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        const activeProducts = filteredProducts.filter(p => p.status === 'ACTIVE').map(p => p.id);
                        setSelectedProducts(activeProducts);
                      }}
                      disabled={filteredProducts.filter(p => p.status === 'ACTIVE').length === 0}
                    >
                      Select All Active
                    </Button>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => {
                        const outOfStockProducts = filteredProducts.filter(p => p.totalInventory === 0).map(p => p.id);
                        setSelectedProducts(outOfStockProducts);
                      }}
                      disabled={filteredProducts.filter(p => p.totalInventory === 0).length === 0}
                    >
                      Select Out of Stock
                    </Button>
                    <Button
                      variant="tertiary"
                      size="slim"
                      onClick={() => setSelectedProducts([])}
                      disabled={selectedProducts.length === 0}
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
              
              {renderCardView()}
            </BlockStack>
          )}
        </BlockStack>
      </Card>
          </BlockStack>
        </div>
      </div>
    </BlockStack>
  );
}
