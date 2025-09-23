import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Button,
  Icon,
  TextField,
  Checkbox,
  Spinner,
  FormLayout,
  Badge,
  Banner,
  Select,
  ResourceList,
  ResourceItem,
  Avatar,
  Thumbnail,
  Tooltip,
  ChoiceList,
  Modal,
  Grid,
  Collapsible,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  EmailIcon,
  ChatIcon,
  NotificationIcon,
  SearchIcon,
  // SettingsIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  // ArrowRightIcon,
  CheckIcon,
  PlayIcon,
  ProductIcon,
} from "@shopify/polaris-icons";
import { useState, useEffect } from "react";
import { ProductTable } from "./ProductTable";
import { ProductConstants } from "../utils/scopedConstants";
import styles from "./StepsUI.module.css";

interface NotificationsProps {
  isVisible: boolean;
}

interface ProductVariant {
  id: string;
  title: string;
  sku: string;
  price: string;
  inventoryQuantity: number;
  inventoryPolicy: 'DENY' | 'CONTINUE';
  inventoryItem: {
    id: string;
    tracked: boolean;
  };
}

interface Product {
  id: string;
  title: string;
  inventory: number;
  status: 'ACTIVE' | 'DRAFT' | 'ARCHIVED';
  tags: string[];
  productType: string;
  vendor: string;
  variants: ProductVariant[];
  locations: {
    locationId: string;
    quantity: number;
  }[];
  imageUrl?: string;
}

interface Collection {
  id: string;
  title: string;
  productCount: number;
  products: Product[];
}

interface NotificationRecipient {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff';
  enabled: boolean;
}

interface NotificationChannel {
  id: string;
  type: 'email' | 'slack' | 'discord' | 'webflow' | 'csv';
  name: string;
  config: {
    emails?: string[];
    recipients?: NotificationRecipient[];
    webhookUrl?: string;
    channel?: string;
    webflowSiteId?: string;
    webflowToken?: string;
    csvSchedule?: 'daily' | 'weekly' | 'monthly';
  };
  enabled: boolean;
  verified: boolean;
}

interface VariantThreshold {
  variantId: string;
  variantTitle: string;
  threshold: number;
  locationId?: string; // Optional: specific location
}

interface NotificationRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggers: {
    type: 'inventory' | 'sales' | 'performance';
    condition: 'below' | 'above' | 'equals';
    value: number;
    level: 'product' | 'variant'; // NEW: Product or variant level
  }[];
  targets: {
    type: 'all' | 'category' | 'tags' | 'specific' | 'collection';
    values: string[];
    variantThresholds?: VariantThreshold[]; // NEW: Variant-specific thresholds
    locationIds?: string[]; // NEW: Location-based filtering
  };
  channels: string[]; // Channel IDs
  schedule: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    timezone: string;
    time?: string; // For scheduled alerts
  };
  limits: {
    maxProducts: number; // NEW: Product limits per plan
    currentProducts: number;
  };
}

export function Notifications({ isVisible }: NotificationsProps) {
  // Add CSS animations for smooth transitions
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
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }
      .step-card-hover {
        transition: all 0.3s ease-in-out;
      }
      .step-card-hover:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }
    `;
    document.head.appendChild(styles);
    return () => {
      document.head.removeChild(styles);
    };
  }, []);

  const [currentStep, setCurrentStep] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Product Selection (Enhanced with 100-product limit)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);

  const [selectionMode, setSelectionMode] = useState<'all' | 'category' | 'tags' | 'specific' | 'collection'>('specific');
  const [selectedLocations] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [productLimit] = useState(150); // Basic Plan limit
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]); // Track which products have expanded variant config
  const [variantThresholds] = useState<{[variantId: string]: number}>({}); // Track threshold values for each variant
  const [selectedProductsSliderIndex, setSelectedProductsSliderIndex] = useState(0); // Track slider position for selected products
  const [summarySliderIndex, setSummarySliderIndex] = useState(0); // Track slider position for summary section
  const [currentPage, setCurrentPage] = useState(0); // Track current page for product table pagination
  
  // Filter & Search states
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [filterByCollection, setFilterByCollection] = useState('');
  const [filterByStatus, setFilterByStatus] = useState('all');
  const [filterByTags, setFilterByTags] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [inventoryRange, setInventoryRange] = useState({ min: '', max: '' });
  const [hasImages, setHasImages] = useState('all');
  const [showDraftProducts, setShowDraftProducts] = useState(true);
  const [sortField, setSortField] = useState('inventory');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [tagSearchQuery, setTagSearchQuery] = useState<string>('');
  const [isTagFilterOpen, setIsTagFilterOpen] = useState(false);
  
  // Constants
  const productsPerPage = 20; // Limit products per page
  
  // Track step completion based on actual saves
  const [hasProductConfigSaved, setHasProductConfigSaved] = useState(false);
  const [hasNotificationConfigSaved, setHasNotificationConfigSaved] = useState(false);

  
  // Step 2: Notification Channels
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  
  // Legacy Rules Configuration (not used in 2-step flow)
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  
  // Existing Rules Management

  const [existingRules, setExistingRules] = useState<NotificationRule[]>([
    // Mock data - in real app this would come from API
    {
      id: '1',
      name: 'Low Stock Alert - Electronics',
      description: 'Alert when electronics products fall below 5 units',
      enabled: true,
      triggers: [{
        type: 'inventory',
        condition: 'below',
        value: 5,
        level: 'product'
      }],
      targets: {
        type: 'tags',
        values: ['electronics']
      },
      channels: ['email-1'],
      schedule: { frequency: 'immediate', timezone: 'UTC' },
      limits: { maxProducts: 100, currentProducts: 23 }
    },
    {
      id: '2', 
      name: 'Out of Stock - Featured Products',
      description: 'Alert when featured products are completely out of stock',
      enabled: false,
      triggers: [{
        type: 'inventory',
        condition: 'equals',
        value: 0,
        level: 'product'
      }],
      targets: {
        type: 'collection',
        values: ['featured-products']
      },
      channels: ['email-1', 'webflow-1'],
      schedule: { frequency: 'daily', time: '09:00', timezone: 'America/New_York' },
      limits: { maxProducts: 100, currentProducts: 8 }
    }
  ]);
  
  // Check if setup is complete
  const isSetupComplete = (selectedProducts.length > 0 || selectionMode !== 'specific') && channels.some(c => c.enabled && c.verified);

  const steps = [
    { 
      title: 'Select Products', 
      description: 'Choose which products to monitor with thresholds',
      completed: selectedProducts.length > 0 || selectionMode !== 'specific'
    },
    { 
      title: 'Setup Notifications', 
      description: 'Configure how you want to be notified about low stock',
      completed: channels.some(c => c.enabled && c.verified)
    },
    { 
      title: 'Review & Activate', 
      description: 'Review your settings and activate monitoring',
      completed: false
    },
  ];

  // Reset pagination when search query changes
  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  // Load collections data
  const loadCollections = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'fetch-collections');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.collections && data.collections.edges) {
        const collections = data.collections.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          productCount: edge.node.productsCount?.count || 0,
          products: [], // Will be loaded when needed
        }));
        setAvailableCollections(collections);
      }
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  };

  // Load locations data
  const loadLocations = async () => {
    try {
      const formData = new FormData();
      formData.append('action', 'fetch-locations');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData,
      });
      
      await response.json();
      
      // if (data.locations && data.locations.edges) {
      //   const locations = data.locations.edges.map((edge: any) => ({
      //     id: edge.node.id,
      //     name: edge.node.name,
      //     address: edge.node.address?.formatted || edge.node.address?.address1 || '',
      //     fulfillsOnlineOrders: edge.node.fulfillsOnlineOrders || false,
      //   }));
      //   setAvailableLocations(locations);
      // }
    } catch (error) {
      console.error('Failed to load locations:', error);
    }
  };

  // Load initial data
  useEffect(() => {
    if (isVisible) {
      loadProducts();
      loadExistingConfiguration();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Load actual products using the same API call as ProductManagement
      const formData = new FormData();
      formData.append('action', 'get-all-products');
      
      console.log('🔄 Making API call to fetch products...');
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData,
      });
      
      console.log('🔄 API response status:', response.status);
      const data = await response.json();
      console.log('🔄 API response data:', data);
      
      if (data.error) {
        console.error('🚨 API returned an error:', data.error);
        throw new Error(`API Error: ${data.error}`);
      }
      
      if (data.products && data.products.length > 0) {
        const products = data.products.map((node: any) => {
          
          // Map variants with inventory data - note: get-all-products returns variants.edges format
          const variants = node.variants?.edges?.map((variantEdge: any) => {
            const variant = variantEdge.node;
            return {
              id: variant.id,
              title: variant.title,
              sku: variant.sku || '',
              price: variant.price || '0.00',
              inventoryQuantity: variant.inventoryQuantity || 0,
              inventoryPolicy: variant.inventoryPolicy || 'DENY',
              inventoryItem: {
                id: variant.inventoryItem?.id || '',
                tracked: variant.inventoryItem?.tracked || false,
              }
            };
          }) || [];
          
          // Map location inventory data (will be populated from inventory levels query)
          const locations: { locationId: string; quantity: number; }[] = [];
          
          const imageUrl = node.featuredMedia?.preview?.image?.url || 
                           node.media?.edges?.[0]?.node?.image?.url;
          
          return {
            id: node.id,
            title: node.title,
            inventory: node.totalInventory || 0,
            status: node.status,
            tags: node.tags || [],
            productType: node.productType || 'General',
            vendor: node.vendor || 'Store',
            variants: variants,
            locations: locations,
            imageUrl: imageUrl,
          };
        });
        
        console.log('🔍 Products loaded:', products);
        console.log('🔍 First product variants:', products[0]?.variants);
        setAvailableProducts(products);
        
        // Extract available tags for filtering
        const allTags = products.flatMap((p: Product) => p.tags || []);
        const uniqueTags = [...new Set(allTags)].sort() as string[];
        setAvailableTags(uniqueTags);
        
        // Also load collections and locations
        await loadCollections();
        await loadLocations();
        
      } else {
        console.log('No products found in API response, using empty state');
        setAvailableProducts([]);
      }
    } catch (error) {
      console.error('🚨 Failed to load products:', error);
      console.error('🚨 Using fallback data instead');
      // Fallback data on error
      setAvailableProducts([
        { 
          id: '1', 
          title: 'Sample Product', 
          inventory: 5, 
          status: 'ACTIVE', 
          tags: ['sample'], 
          productType: 'General', 
          vendor: 'Store',
          variants: [
            { id: 'vs1', title: 'Default', sku: 'SAMPLE', price: '10.00', inventoryQuantity: 5, inventoryPolicy: 'DENY', inventoryItem: { id: 'is1', tracked: true } }
          ],
          locations: [
            { locationId: 'loc1', quantity: 5 }
          ],
          imageUrl: 'https://via.placeholder.com/100x100/e3f2fd/1976d2?text=Product'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingConfiguration = async () => {
    try {
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=get-notification-config'
      });
      const result = await response.json();
      
      if (result.channels) {
        setChannels(result.channels);
      }
      if (result.rules) {
        setRules(result.rules);
      }
      if (result.selectionMode) {
        setSelectionMode(result.selectionMode);
      }
      if (result.selectedProducts) {
        setSelectedProducts(result.selectedProducts);
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
    }
    
    // If no configuration exists, enter setup mode
    if (channels.length === 0 && rules.length === 0) {
      setIsSetupMode(true);
    }
  };

  const handleStartSetup = () => {
    setIsSetupMode(true);
    setCurrentStep(0);
  };

  const handleStepComplete = () => {
    // Mark the current step as completed when user proceeds
    if (currentStep === 0) {
      setHasProductConfigSaved(true);
    } else if (currentStep === 1) {
      setHasNotificationConfigSaved(true);
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setIsSetupMode(false);
      saveConfiguration();
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      // Save complete configuration including real customer alerts
      const configData = {
        channels,
        rules,
        selectedProducts,
        selectionMode,
        // Add configuration for real customer notifications
        customerAlerts: {
          enabled: true,
          webflowIntegration: channels.some(c => c.type === 'webflow' && c.enabled),
          realTimeAlerts: true,
        }
      };
      
      const formData = new FormData();
      formData.append('action', 'save-notification-config');
      formData.append('config', JSON.stringify(configData));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Trigger real customer alert setup
        await setupCustomerAlerts(configData);
        console.log('✅ Smart notification system activated with real customer alerts!');
      } else {
        console.error('❌ Failed to save configuration:', result.error);
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  // Setup real customer alerts integration
  const setupCustomerAlerts = async (config: any) => {
    try {
      // Configure Webflow integration for customer notifications
      const webflowChannels = config.channels.filter((c: NotificationChannel) => 
        c.type === 'webflow' && c.enabled && c.verified
      );
      
      if (webflowChannels.length > 0) {
        const formData = new FormData();
        formData.append('action', 'setup-webflow-alerts');
        formData.append('webflowConfig', JSON.stringify({
          channels: webflowChannels,
          rules: config.rules,
          customerFacing: true,
          alertTypes: ['out_of_stock', 'low_stock', 'back_in_stock']
        }));
        
        const response = await fetch('/app/api/webflow-integration', {
          method: 'POST',
          body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('🎉 Webflow customer alerts activated!');
        }
      }
      
      // Setup real-time inventory monitoring
      await setupRealTimeMonitoring(config);
      
    } catch (error) {
      console.error('Failed to setup customer alerts:', error);
    }
  };

  // Setup real-time inventory monitoring for immediate customer notifications
  const setupRealTimeMonitoring = async (config: any) => {
    try {
      const formData = new FormData();
      formData.append('action', 'setup-realtime-monitoring');
      formData.append('monitoringConfig', JSON.stringify({
        products: config.selectionMode === 'all' ? 'all' : config.selectedProducts,
        rules: config.rules,
        channels: config.channels.filter((c: NotificationChannel) => c.enabled),
        customerNotifications: true,
        webhookEndpoint: '/app/api/inventory-webhook',
      }));
      
      const response = await fetch('/app/api/inventory-monitor', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('⚡ Real-time inventory monitoring activated!');
      }
    } catch (error) {
      console.error('Failed to setup real-time monitoring:', error);
    }
  };

  const addChannel = (channel: Omit<NotificationChannel, 'id'>) => {
    const newChannel: NotificationChannel = {
      ...channel,
      id: `channel_${Date.now()}`,
    };
    setChannels([...channels, newChannel]);
    setShowChannelModal(false);
    setEditingChannel(null);
  };

  const updateChannel = (id: string, updates: Partial<NotificationChannel>) => {
    setChannels(channels.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteChannel = (id: string) => {
    setChannels(channels.filter(c => c.id !== id));
  };

  const addRule = (rule: Omit<NotificationRule, 'id'>) => {
    const newRule: NotificationRule = {
      ...rule,
      id: `rule_${Date.now()}`,
    };
    setRules([...rules, newRule]);
    setExistingRules([...existingRules, newRule]);
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const updateRule = (id: string, updates: Partial<NotificationRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
    setExistingRules(existingRules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  // Adapter function to convert Notification Product to ProductTable Product format
  const convertToTableProduct = (product: Product) => {
    return {
      id: product.id,
      title: product.title,
      handle: product.title.toLowerCase().replace(/\s+/g, '-'),
      featuredMedia: product.imageUrl ? {
        preview: {
          image: {
            url: product.imageUrl,
            altText: product.title
          }
        }
      } : undefined,
      status: product.status,
      totalInventory: product.inventory,
      tags: product.tags || [],
      collections: { edges: [] },
      variants: {
        edges: product.variants?.map(variant => ({
          node: {
            id: variant.id,
            title: variant.title,
            inventoryQuantity: variant.inventoryQuantity,
            price: variant.price,
            sku: variant.sku,
            inventoryItem: {
              id: `${variant.id}_inv`,
              tracked: true
            }
          }
        })) || []
      }
    };
  };

  const filteredProducts = availableProducts.filter(product => {
    // Draft products filter (same as ProductManagement)
    if (!showDraftProducts && product.status === 'DRAFT') {
      return false;
    }

    // Search filter (same as ProductManagement)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const searchableText = [
        product.title,
        product.id,
        ...((product.variants || []).map(v => v.sku || ''))
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // Category filter (same as ProductManagement)
    const inventory = product.inventory;
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

    // Collection filter (TODO: implement when collections are added to Product interface)
    if (filterByCollection) {
      // For now, skip collection filtering since collections aren't in the Product interface
      // This will be implemented when we add collections to the Notifications Product interface
    }

    // Tags filter (same as ProductManagement)
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

    // Status filter (same as ProductManagement)
    if (filterByStatus !== 'all' && product.status !== filterByStatus.toUpperCase()) {
      return false;
    }

    // Images filter (same as ProductManagement)
    if (hasImages !== 'all') {
      const productHasImages = product.imageUrl;
      if (hasImages === 'with' && !productHasImages) {
        return false;
      }
      if (hasImages === 'without' && productHasImages) {
        return false;
      }
    }

    // Price range filter (same as ProductManagement)
    if (priceRange.min || priceRange.max) {
      const productPrice = parseFloat(product.variants?.[0]?.price || '0');
      if (priceRange.min && productPrice < parseFloat(priceRange.min)) {
        return false;
      }
      if (priceRange.max && productPrice > parseFloat(priceRange.max)) {
        return false;
      }
    }

    // Inventory range filter (same as ProductManagement)
    if (inventoryRange.min || inventoryRange.max) {
      const inventoryValue = product.inventory;
      if (inventoryRange.min && inventoryValue < parseInt(inventoryRange.min)) {
        return false;
      }
      if (inventoryRange.max && inventoryValue > parseInt(inventoryRange.max)) {
        return false;
      }
    }

    // Additional filters for Notifications selection modes
    // Tags selection mode filter
    const matchesTagsMode = selectionMode !== 'tags' || selectedTags.length === 0 ||
      product.tags?.some(tag => selectedTags.includes(tag));
    
    // Location filter (if locations are selected)
    const matchesLocation = selectedLocations.length === 0 || 
      product.locations?.some(loc => selectedLocations.includes(loc.locationId));
    
    // Collection selection mode filter
    const matchesCollectionMode = selectionMode !== 'collection' || selectedCollections.length === 0;
    
    return matchesTagsMode && matchesLocation && matchesCollectionMode;
  }).sort((a, b) => {
    const getValue = (product: Product) => {
      switch (sortField) {
        case 'title': return product.title;
        case 'inventory': return product.inventory;
        case 'status': return product.status;
        case 'created': 
          // Since createdAt is not available, sort by ID (newer products have later IDs)
          return product.id;
        case 'updated': 
          // Since updatedAt is not available, fallback to title for now
          return product.title;
        case 'price': {
          // Get price from first variant or 0 if no variants
          const firstVariant = product.variants?.[0];
          return firstVariant ? parseFloat(firstVariant.price) : 0;
        }
        case 'variants': return product.variants?.length || 0;
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

  // Reset functionality when filters change - pagination removed, no slider to reset

  // Reset summary slider when selected products change
  useEffect(() => {
    setSummarySliderIndex(0);
  }, [selectedProducts]);

  // Reset product config completion flag when configuration changes
  useEffect(() => {
    if (hasProductConfigSaved) {
      setHasProductConfigSaved(false);
    }
  }, [selectedProducts, selectionMode, selectedTags, selectedCollections, hasProductConfigSaved]);

  // Reset notification config completion flag when channels change
  useEffect(() => {
    if (hasNotificationConfigSaved) {
      setHasNotificationConfigSaved(false);
    }
  }, [channels, hasNotificationConfigSaved]);

  const renderSetupProgress = () => (
    <div className={styles.stepsContainer}>
      {/* Step 1: Product Selection */}
      <div className={`${styles.stepCard} ${currentStep === 0 ? `${styles.active} ${styles.activeInfo}` : ''}`}>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <div className={`${styles.stepIcon} ${currentStep === 0 ? styles.active : ''}`}>
                  <Box 
                    background={currentStep >= 0 ? "bg-fill-info" : "bg-fill-disabled"} 
                    padding="200" 
                    borderRadius="100"
                  >
                    <Icon 
                      source={ProductIcon} 
                      tone={currentStep >= 0 ? undefined : "subdued"} 
                    />
                  </Box>
                </div>
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Step 1: Products
                    </Text>
                    <div className={`${styles.stepProgress} ${currentStep === 0 ? styles.current : hasProductConfigSaved ? styles.completed : styles.pending}`}>
                      {currentStep === 0 ? "Current" : hasProductConfigSaved ? "✓ Done" : "1 of 3"}
                    </div>
                  </InlineStack>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Select products
                  </Text>
                </BlockStack>
              </InlineStack>
            </InlineStack>
            
            <Text as="p" variant="bodySm" tone="subdued">
              Choose products and set alert thresholds.
            </Text>
            
            {currentStep > 0 && selectedProducts.length > 0 && (
              <div className={styles.stepSuccess}>
                <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} configured
                </Text>
              </div>
            )}
          </BlockStack>
        </Card>
      </div>

      {/* Step 2: Notification Channels */}
      <div className={`${styles.stepCard} ${currentStep === 1 ? `${styles.active} ${styles.activeInfo}` : ''}`}>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <div className={`${styles.stepIcon} ${currentStep === 1 ? styles.active : ''}`}>
                  <Box 
                    background={currentStep >= 1 ? "bg-fill-info" : "bg-fill-disabled"} 
                    padding="200" 
                    borderRadius="100"
                  >
                    <Icon 
                      source={NotificationIcon} 
                      tone={currentStep >= 1 ? undefined : "subdued"} 
                    />
                  </Box>
                </div>
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Step 2: Notifications
                    </Text>
                    <div className={`${styles.stepProgress} ${currentStep === 1 ? styles.current : hasNotificationConfigSaved ? styles.completed : styles.pending}`}>
                      {currentStep === 1 ? "Current" : hasNotificationConfigSaved ? "✓ Done" : "2 of 3"}
                    </div>
                  </InlineStack>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Setup alerts
                  </Text>
                </BlockStack>
              </InlineStack>
            </InlineStack>
            
            <Text as="p" variant="bodySm" tone="subdued">
              Configure email and integration channels.
            </Text>
            
            {currentStep > 1 && channels.filter(c => c.enabled && c.verified).length > 0 && (
              <div className={styles.stepSuccess}>
                <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                  {channels.filter(c => c.enabled && c.verified).length} channel{channels.filter(c => c.enabled && c.verified).length !== 1 ? 's' : ''} ready
                </Text>
              </div>
            )}
          </BlockStack>
        </Card>
      </div>

      {/* Step 3: Review & Activate */}
      <div className={`${styles.stepCard} ${currentStep === 2 ? `${styles.active} ${styles.activeInfo}` : ''}`}>
        <Card>
          <BlockStack gap="300">
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="200" blockAlign="center">
                <div className={`${styles.stepIcon} ${currentStep === 2 ? styles.active : ''}`}>
                  <Box 
                    background={currentStep >= 2 ? "bg-fill-info" : "bg-fill-disabled"} 
                    padding="200" 
                    borderRadius="100"
                  >
                    <Icon 
                      source={currentStep >= 2 ? CheckIcon : PlayIcon} 
                      tone={currentStep >= 2 ? undefined : "subdued"} 
                    />
                  </Box>
                </div>
                <BlockStack gap="050">
                  <InlineStack gap="200" blockAlign="center">
                    <Text as="h3" variant="headingSm" fontWeight="semibold">
                      Step 3: Activate
                    </Text>
                    <div className={`${styles.stepProgress} ${currentStep === 2 ? styles.current : (hasProductConfigSaved && hasNotificationConfigSaved) ? styles.completed : styles.pending}`}>
                      {currentStep === 2 ? "Current" : (hasProductConfigSaved && hasNotificationConfigSaved) ? "✓ Done" : "3 of 3"}
                    </div>
                  </InlineStack>
                  <Text as="p" variant="bodyXs" tone="subdued">
                    Launch system
                  </Text>
                </BlockStack>
              </InlineStack>
            </InlineStack>
            
            <Text as="p" variant="bodySm" tone="subdued">
              Review settings and activate monitoring.
            </Text>
            
            {isSetupComplete && (
              <div className={styles.stepSuccess}>
                <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                  Monitoring active
                </Text>
              </div>
            )}
          </BlockStack>
        </Card>
      </div>
    </div>
  );

  const renderProductSelection = () => (
    <Card>
      <BlockStack gap="300">
        <BlockStack gap="200">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <InlineStack gap="200" blockAlign="center">
                <Text as="h3" variant="headingMd">Step 1: Select Products & Configure Thresholds</Text>
                <Badge tone="info" size="medium">
                  {`${selectedProducts.length} of ${productLimit} selected`}
                </Badge>
              </InlineStack>
              <Text as="p" variant="bodySm" tone="subdued">
                Choose which products to monitor for low stock alerts and configure alert thresholds.
              </Text>
            </BlockStack>
            <Button 
              onClick={loadProducts} 
              loading={loading} 
              variant="secondary"
              size="slim"
            >
              Refresh Products
            </Button>
          </InlineStack>
        </BlockStack>

        {showLimitWarning && (
          <Banner tone="warning" onDismiss={() => setShowLimitWarning(false)}>
            <Text as="p">
              <strong>Plan Limit Reached:</strong> You have {availableProducts.length} products, but your current plan supports monitoring up to {productLimit} products. 
              Consider upgrading to monitor all products or select specific products/collections under the limit.
            </Text>
          </Banner>
        )}

        {selectionMode === 'collection' && (
          <BlockStack gap="300">
            <Text as="h4" variant="headingSm">Select Collections to Monitor</Text>
            <Card background="bg-surface-secondary">
              <ResourceList
                resourceName={{ singular: 'collection', plural: 'collections' }}
                items={availableCollections}
                renderItem={(collection) => {
                  const exceedsLimit = collection.productCount > productLimit;
                  const isSelected = selectedCollections.includes(collection.id);
                  return (
                    <ResourceItem
                      id={collection.id}
                      onClick={() => {
                        if (exceedsLimit) {
                          setShowLimitWarning(true);
                          return;
                        }
                        // Toggle collection selection
                        if (isSelected) {
                          setSelectedCollections(selectedCollections.filter(id => id !== collection.id));
                        } else {
                          setSelectedCollections([...selectedCollections, collection.id]);
                        }
                      }}
                    >
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Checkbox 
                            checked={isSelected} 
                            onChange={() => { /* Handled by ResourceItem onClick */ }}
                            disabled={exceedsLimit}
                            label=""
                          />
                          <Avatar name={collection.title} />
                          <BlockStack gap="100">
                            <Text as="p" variant="bodyMd" fontWeight="semibold">{collection.title}</Text>
                            <InlineStack gap="200">
                              <Badge tone={exceedsLimit ? 'critical' : 'success'}>
                                {collection.productCount.toString() + " products"}
                              </Badge>
                              {exceedsLimit && (
                                <Badge tone="critical">Exceeds Limit</Badge>
                              )}
                            </InlineStack>
                          </BlockStack>
                        </InlineStack>
                        {exceedsLimit && (
                          <Text as="p" variant="bodySm" tone="critical">
                            Collection too large for current plan
                          </Text>
                        )}
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            </Card>

          </BlockStack>
        )}

        {selectionMode === 'tags' && (
          <BlockStack gap="300">
            <Text as="h4" variant="headingSm">Select Tags to Monitor</Text>
            <Card background="bg-surface-secondary">
              <BlockStack gap="300">
                <Text as="p" variant="bodySm" tone="subdued">
                  Choose product tags to monitor. All products with these tags will be included (up to {productLimit} products total).
                </Text>
                <ChoiceList
                  title="Available Tags"
                  choices={
                    // Get unique tags from all available products
                    Array.from(
                      new Set(
                        availableProducts.flatMap(product => product.tags || [])
                      )
                    ).map(tag => ({
                      label: tag,
                      value: tag,
                      helpText: `${availableProducts.filter(p => p.tags?.includes(tag)).length} products`
                    }))
                  }
                  selected={selectedTags}
                  onChange={setSelectedTags}
                  allowMultiple
                />
                {selectedTags.length > 0 && (
                  <Banner tone="info">
                    <Text as="p">
                      <strong>Selected tags:</strong> {selectedTags.join(', ')} 
                      ({availableProducts.filter(p => p.tags?.some(tag => selectedTags.includes(tag))).length} products will be monitored)
                    </Text>
                  </Banner>
                )}
              </BlockStack>
            </Card>
          </BlockStack>
        )}

        {(selectionMode === 'specific' || selectionMode === 'tags' || selectionMode === 'category') && (
          <BlockStack gap="300">
                  {/* Filters & Search Section */}
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
                                onChange={(value) => setCurrentCategory(value)}
                                options={ProductConstants.CATEGORY_OPTIONS as any}
                              />
                            </div>
                            <div style={{ flex: 1 }}>
                              <Select
                                label="Collection"
                                options={[
                                  { label: 'All Collections', value: '' },
                                  ...availableCollections.map(collection => ({
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
                                  setSortField(field);
                                  setSortDirection(direction as 'asc' | 'desc');
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

                                    {/* Available Tags Grid */}
                                    <div style={{ 
                                      maxHeight: '200px', 
                                      overflowY: 'auto', 
                                      border: '1px solid #e1e3e5', 
                                      borderRadius: '6px', 
                                      padding: '12px',
                                      backgroundColor: '#ffffff'
                                    }}>
                                      <Text as="p" variant="bodySm" fontWeight="medium" tone="subdued">
                                        Available Tags ({availableTags.filter(tag => 
                                          !tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase())
                                        ).filter(tag => !filterByTags.includes(tag)).length})
                                        {availableTags.filter(tag => !tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase())).filter(tag => !filterByTags.includes(tag)).length > 0 && 
                                          " - Click to add"
                                        }
                                      </Text>
                                      <div style={{ marginTop: '8px' }}>
                                        <InlineStack gap="150" wrap>
                                          {availableTags
                                            .filter(tag => !tagSearchQuery || tag.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                                            .filter(tag => !filterByTags.includes(tag))
                                            .map(tag => (
                                              <div
                                                key={tag}
                                                style={{ cursor: 'pointer', padding: '4px 8px', border: '1px solid #e1e3e5', borderRadius: '4px', backgroundColor: '#f6f6f7' }}
                                                onClick={() => {
                                                  setFilterByTags(prev => [...prev, tag]);
                                                  setTagSearchQuery('');
                                                }}
                                              >
                                                <InlineStack gap="100" blockAlign="center">
                                                  <Badge>{tag}</Badge>
                                                  <Text as="span" variant="bodySm" tone="subdued">
                                                    ({availableProducts.filter(p => p.tags?.includes(tag)).length} products)
                                                  </Text>
                                                </InlineStack>
                                              </div>
                                            ))
                                          }
                                        </InlineStack>
                                      </div>
                                    </div>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      ({availableProducts.filter(p => p.tags?.some(tag => selectedTags.includes(tag))).length} products will be monitored)
                                    </Text>
                                  </BlockStack>
                                </div>
                              </Collapsible>
                            </div>
                          )}
                        </BlockStack>
                      </div>
                    )}
                  </Card>
                  
                  <div style={{ minHeight: '400px', maxHeight: '600px', overflow: 'auto' }}>
                    <ProductTable
                      products={filteredProducts.slice(currentPage * productsPerPage, (currentPage + 1) * productsPerPage).map(convertToTableProduct)}
                      selectedProducts={selectedProducts}
                      selectedVariants={[]}
                      expandedProducts={new Set(expandedVariants)}
                      onProductSelect={(productId: string, selected: boolean) => {
                        if (selected && selectedProducts.length < productLimit) {
                          setSelectedProducts([...selectedProducts, productId]);
                        } else if (!selected) {
                          setSelectedProducts(selectedProducts.filter(id => id !== productId));
                        } else {
                          setShowLimitWarning(true);
                        }
                      }}
                      onVariantSelect={() => { /* Not used in notifications context */ }}
                      onExpandProduct={(productId: string) => {
                        const isExpanded = expandedVariants.includes(productId);
                        if (isExpanded) {
                          setExpandedVariants(expandedVariants.filter(id => id !== productId));
                        } else {
                          setExpandedVariants([...expandedVariants, productId]);
                        }
                      }}
                      onViewProduct={(product) => {
                        // Open product in new tab/window
                        const shopUrl = window.location.origin.includes('.myshopify.com') 
                          ? window.location.origin 
                          : 'https://admin.shopify.com';
                        const productUrl = `${shopUrl}/admin/products/${product.id.replace('gid://shopify/Product/', '')}`;
                        window.open(productUrl, '_blank');
                      }}
                      onEditProduct={(product) => {
                        // Open product edit page in new tab/window
                        const shopUrl = window.location.origin.includes('.myshopify.com') 
                          ? window.location.origin 
                          : 'https://admin.shopify.com';
                        const editUrl = `${shopUrl}/admin/products/${product.id.replace('gid://shopify/Product/', '')}`;
                        window.open(editUrl, '_blank');
                      }}
                      totalCount={filteredProducts.length}
                    />
                  </div>
                  
                  {/* Pagination Controls */}
                  {filteredProducts.length > productsPerPage && (
                    <Card background="bg-surface-secondary" padding="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Button
                          size="slim"
                          disabled={currentPage === 0}
                          onClick={() => setCurrentPage(currentPage - 1)}
                        >
                          Previous
                        </Button>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Page {currentPage + 1} of {Math.ceil(filteredProducts.length / productsPerPage)}
                        </Text>
                        <Button
                          size="slim"
                          disabled={currentPage >= Math.ceil(filteredProducts.length / productsPerPage) - 1}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        >
                          Next
                        </Button>
                      </InlineStack>
                    </Card>
                  )}
          </BlockStack>
        )}

        {/* Selected Products Preview */}
        {selectedProducts.length > 0 && (
          <Card>
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <BlockStack gap="100">
                  <Text as="h4" variant="headingSm">Selected for Monitoring</Text>
                  <Text as="p" variant="bodySm" tone="subdued">
                    Products configured for inventory alerts
                  </Text>
                </BlockStack>
                <Badge tone="success" size="medium">
                  {`${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}`}
                </Badge>
              </InlineStack>
              
              {selectedProducts.length > 0 && (
                <div className={styles.stepSuccess}>
                  <Text as="p" variant="bodySm" tone="base" fontWeight="medium">
                    {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected for monitoring
                  </Text>
                </div>
              )}
              
              <BlockStack gap="300">
                {/* Slider Controls */}
                {selectedProducts.length > 5 && (
                  <InlineStack align="space-between" blockAlign="center">
                    <Button
                      size="micro"
                      disabled={selectedProductsSliderIndex === 0}
                      onClick={() => setSelectedProductsSliderIndex(Math.max(0, selectedProductsSliderIndex - 5))}
                      icon={ChevronLeftIcon}
                    >
                      Previous
                    </Button>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {Math.min(selectedProductsSliderIndex + 1, selectedProducts.length)} - {Math.min(selectedProductsSliderIndex + 5, selectedProducts.length)} of {selectedProducts.length}
                    </Text>
                    <Button
                      size="micro"
                      disabled={selectedProductsSliderIndex + 5 >= selectedProducts.length}
                      onClick={() => setSelectedProductsSliderIndex(Math.min(selectedProducts.length - 5, selectedProductsSliderIndex + 5))}
                      icon={ChevronRightIcon}
                    >
                      Next
                    </Button>
                  </InlineStack>
                )}
                
                {/* Product Cards Slider */}
                <Grid>
                  {selectedProducts.slice(selectedProductsSliderIndex, selectedProductsSliderIndex + 5).map((productId) => {
                    const product = availableProducts.find(p => p.id === productId);
                    if (!product) return null;
                    
                    return (
                      <Grid.Cell key={product.id} columnSpan={{ xs: 6, sm: 4, md: 3, lg: 2, xl: 2 }}>
                        <Tooltip content={`${product.title} • ${product.inventory} in stock • Alert at ≤${variantThresholds[product.id] || 5} units`}>
                          <Card background="bg-surface" padding="200">
                            <BlockStack gap="200" align="center">
                              <Box position="relative">
                                {product.imageUrl ? (
                                  <Thumbnail
                                    source={product.imageUrl}
                                    alt={product.title}
                                    size="small"
                                  />
                                ) : (
                                  <Avatar name={product.title} size="sm" />
                                )}
                                <Box 
                                  position="absolute" 
                                  insetBlockStart="0" 
                                  insetInlineEnd="0"
                                >
                                  <Button
                                    size="micro"
                                    tone="critical"
                                    onClick={() => {
                                      const newSelected = selectedProducts.filter(id => id !== product.id);
                                      setSelectedProducts(newSelected);
                                      // Reset slider to beginning if we're on a page that no longer exists
                                      if (selectedProductsSliderIndex >= newSelected.length && newSelected.length > 0) {
                                        setSelectedProductsSliderIndex(Math.max(0, Math.floor((newSelected.length - 1) / 5) * 5));
                                      } else if (newSelected.length === 0) {
                                        setSelectedProductsSliderIndex(0);
                                      }
                                    }}
                                    icon={XCircleIcon}
                                  />
                                </Box>
                              </Box>
                              <Badge 
                                tone={product.inventory > 10 ? 'success' : product.inventory > 0 ? 'attention' : 'critical'}
                                size="small"
                              >
                                {product.inventory.toString()}
                              </Badge>
                            </BlockStack>
                          </Card>
                        </Tooltip>
                      </Grid.Cell>
                    );
                  })}
                </Grid>
              </BlockStack>
            </BlockStack>
          </Card>
        )}
            
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodySm" tone="subdued">
            {selectedProducts.length} of {productLimit} products selected for monitoring
          </Text>
          {selectedProducts.length >= productLimit && (
            <Badge tone="warning">Plan Limit Reached</Badge>
          )}
        </InlineStack>
        
        {selectedProducts.length >= productLimit && (
          <Banner tone="warning">
            <Text as="p">
              <strong>Product Limit Reached:</strong> You've selected the maximum number of products ({productLimit}) for your current plan. 
              Upgrade to monitor more products or manage your selections.
            </Text>
          </Banner>
        )}

        <InlineStack align="end">
          <Button 
            variant="primary" 
            onClick={handleStepComplete}
            disabled={selectionMode === 'specific' && selectedProducts.length === 0}
          >
            Continue to Channels →
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  const renderChannelSetup = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">Step 2: Notification Channels</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Configure how customers will receive real inventory alerts
            </Text>
          </BlockStack>
          <Button 
            icon={PlusIcon}
            onClick={() => {
              setEditingChannel(null);
              setShowChannelModal(true);
            }}
          >
            Add Channel
          </Button>
        </InlineStack>

        <Banner tone="info">
          <Text as="p">
            <strong>Store Notifications:</strong> Configure how you want to be notified when your inventory runs low.
          </Text>
        </Banner>

        {channels.length === 0 ? (
          <Box padding="600" background="bg-surface-secondary" borderRadius="300">
            <BlockStack gap="300" align="center">
              <Icon source={EmailIcon} tone="subdued" />
              <Text as="p" variant="bodyMd" alignment="center">
                No notification channels configured yet
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Add email notifications for low stock alerts
              </Text>
            </BlockStack>
          </Box>
        ) : (
          <ResourceList
            resourceName={{ singular: 'channel', plural: 'channels' }}
            items={channels}
            renderItem={(channel) => (
              <ResourceItem id={channel.id} onClick={() => { /* Handle channel click */ }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Icon 
                      source={channel.type === 'email' ? EmailIcon : 
                             channel.type === 'webflow' ? NotificationIcon : ChatIcon} 
                      tone={channel.verified ? 'success' : 'warning'}
                    />
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{channel.name}</Text>
                        <Badge tone={channel.verified ? 'success' : 'warning'}>
                          {channel.verified ? 'Verified' : 'Unverified'}
                        </Badge>
                        <Badge tone={channel.enabled ? 'info' : undefined}>
                          {channel.enabled ? 'Enabled' : 'Disabled'}
                        </Badge>
                        {channel.type === 'webflow' && (
                          <Badge tone="success">Customer Alerts</Badge>
                        )}
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {channel.type === 'webflow' ? 'Webflow Customer Integration' :
                         channel.type === 'email' ? (channel.config.emails || []).join(', ') : 
                         channel.type === 'csv' ? `CSV Export (${channel.config.csvSchedule})` :
                         channel.config.channel || 'Webhook configured'}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Checkbox 
                      checked={channel.enabled}
                      onChange={(checked) => updateChannel(channel.id, { enabled: checked })}
                      label="Enabled"
                    />
                    <Button 
                      icon={EditIcon}
                      size="slim"
                      onClick={() => {
                        setEditingChannel(channel);
                        setShowChannelModal(true);
                      }}
                    />
                    <Button 
                      icon={DeleteIcon}
                      size="slim"
                      tone="critical"
                      onClick={() => deleteChannel(channel.id)}
                    />
                  </InlineStack>
                </InlineStack>
              </ResourceItem>
            )}
          />
        )}

        <InlineStack align="space-between">
          <Button onClick={() => setCurrentStep(0)}>← Back</Button>
          <Button 
            variant="primary" 
            onClick={handleStepComplete}
            disabled={!channels.some(c => c.enabled && c.verified)}
          >
            Review and Activate →
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  // const renderRulesSetup = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">Notification Rules (Optional)</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Advanced rules for customized notification logic
            </Text>
          </BlockStack>
          <Button 
            icon={PlusIcon}
            onClick={() => {
              setEditingRule(null);
              setShowRuleModal(true);
            }}
          >
            Add Rule
          </Button>
        </InlineStack>

        {rules.length === 0 ? (
          <Box padding="600" background="bg-surface-secondary" borderRadius="300">
            <BlockStack gap="300" align="center">
              <Icon source={AlertCircleIcon} tone="subdued" />
              <Text as="p" variant="bodyMd" alignment="center">
                No customer alert rules configured yet
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Create rules to automatically notify customers about inventory changes
              </Text>
            </BlockStack>
          </Box>
        ) : (
          <ResourceList
            resourceName={{ singular: 'rule', plural: 'rules' }}
            items={rules}
            renderItem={(rule) => (
              <ResourceItem id={rule.id} onClick={() => { /* Handle rule click */ }}>
                <InlineStack align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Icon 
                      source={AlertCircleIcon} 
                      tone={rule.enabled ? 'warning' : 'subdued'}
                    />
                    <BlockStack gap="100">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{rule.name}</Text>
                        <Badge tone={rule.enabled ? 'success' : undefined}>
                          {rule.enabled ? 'Active' : 'Inactive'}
                        </Badge>
                        <Badge tone="info">Customer Alert</Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {rule.description}
                      </Text>
                    </BlockStack>
                  </InlineStack>
                  <InlineStack gap="200">
                    <Checkbox 
                      checked={rule.enabled}
                      onChange={(checked) => updateRule(rule.id, { enabled: checked })}
                      label="Active"
                    />
                    <Button 
                      icon={EditIcon}
                      size="slim"
                      onClick={() => {
                        setEditingRule(rule);
                        setShowRuleModal(true);
                      }}
                    />
                    <Button 
                      icon={DeleteIcon}
                      size="slim"
                      tone="critical"
                      onClick={() => deleteRule(rule.id)}
                    />
                  </InlineStack>
                </InlineStack>
              </ResourceItem>
            )}
          />
        )}

        <InlineStack align="space-between">
          <Button onClick={() => setCurrentStep(1)}>← Back</Button>
          <Button 
            variant="primary" 
            onClick={handleStepComplete}
            disabled={!rules.some(r => r.enabled)}
            loading={loading}
          >
            Continue to Summary →
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  // );

  const renderSummary = () => {
    const selectedProductsDetails = selectedProducts
      .map(id => availableProducts.find(p => p.id === id))
      .filter(Boolean);
    
    const enabledChannels = channels.filter(c => c.enabled);
    
    return (
      <Card>
        <BlockStack gap="500">
          <BlockStack gap="300">
            <Text as="h3" variant="headingLg">Setup Summary</Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Review your inventory monitoring configuration before activation
            </Text>
          </BlockStack>

          {/* Products Summary */}
          <Card background="bg-surface-secondary">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h4" variant="headingMd">Selected Products</Text>
                <Badge tone="success" size="medium">
                  {`${selectedProducts.length} product${selectedProducts.length !== 1 ? 's' : ''}`}
                </Badge>
              </InlineStack>
              
              {selectionMode === 'all' ? (
                <Text as="p" variant="bodyMd">
                  Monitoring all {availableProducts.length} products in your store
                </Text>
              ) : selectionMode === 'tags' ? (
                <Text as="p" variant="bodyMd">
                  Monitoring products with tags: {selectedTags.join(', ')} ({selectedProductsDetails.length} products)
                </Text>
              ) : (
                <BlockStack gap="300">
                  {/* Summary Slider Controls */}
                  {selectedProductsDetails.length > 5 && (
                    <Card background="bg-surface-secondary" padding="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Showing {Math.min(summarySliderIndex + 1, selectedProductsDetails.length)} - {Math.min(summarySliderIndex + 5, selectedProductsDetails.length)} of {selectedProductsDetails.length} products
                        </Text>
                        <InlineStack gap="200" blockAlign="center">
                          <Button
                            size="micro"
                            disabled={summarySliderIndex === 0}
                            onClick={() => setSummarySliderIndex(Math.max(0, summarySliderIndex - 5))}
                            icon={ChevronLeftIcon}
                          >
                            Previous
                          </Button>
                          <Button
                            size="micro"
                            disabled={summarySliderIndex + 5 >= selectedProductsDetails.length}
                            onClick={() => setSummarySliderIndex(Math.min(selectedProductsDetails.length - 5, summarySliderIndex + 5))}
                            icon={ChevronRightIcon}
                          >
                            Next
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  )}
                  
                  <BlockStack gap="200">
                    {selectedProductsDetails.slice(summarySliderIndex, summarySliderIndex + 5).map((product) => {
                      if (!product) return null;
                      return (
                        <InlineStack key={product.id} gap="200" blockAlign="center">
                          <Text as="p" variant="bodySm">
                            • {product.title} (Alert at ≤ {variantThresholds[product.id] || 5} units)
                          </Text>
                        </InlineStack>
                      );
                    })}
                    {selectedProductsDetails.length > 5 && selectedProductsDetails.length > summarySliderIndex + 5 && (
                      <Text as="p" variant="bodySm" tone="subdued">
                        ... and {selectedProductsDetails.length - (summarySliderIndex + 5)} more products
                      </Text>
                    )}
                  </BlockStack>
                </BlockStack>
              )}
            </BlockStack>
          </Card>

          {/* Notification Channels Summary */}
          <Card background="bg-surface-secondary">
            <BlockStack gap="300">
              <InlineStack align="space-between" blockAlign="center">
                <Text as="h4" variant="headingMd">Notification Channels</Text>
                <Badge tone="info" size="medium">
                  {`${enabledChannels.length} active`}
                </Badge>
              </InlineStack>
              
              <Text as="p" variant="bodyMd">
                {enabledChannels.map((channel) => {
                  const channelText = channel.type === 'email' ? 
                    `Email (${channel.config.recipients?.[0]?.email || channel.config.emails?.[0] || 'configured'})` :
                    channel.type === 'slack' ? 
                    `Slack (#${channel.config.channel || 'slack-channel'})` :
                    'System Notifications';
                  return channelText;
                }).join(' • ')}
              </Text>
            </BlockStack>
          </Card>

          {/* Final Action */}
          <Card background="bg-surface-success">
            <BlockStack gap="200" align="center">
              <InlineStack gap="200" blockAlign="center">
                <div style={{ fontSize: '14px' }}>
                  <Icon source={CheckCircleIcon} tone="success" />
                </div>
                <Text as="h4" variant="headingSm">Ready to Activate</Text>
              </InlineStack>
              <Text as="p" variant="bodySm" alignment="center" tone="subdued">
                Your inventory monitoring system is configured and ready to start.
              </Text>
            </BlockStack>
          </Card>

          <InlineStack align="space-between" blockAlign="center">
            <Button onClick={() => setCurrentStep(1)}>← Back to Notifications</Button>
            <Button 
              variant="primary" 
              onClick={handleStepComplete}
              loading={loading}
              tone="success"
            >
              ✅ Activate Monitoring
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>
    );
  };

  const renderDashboard = () => (
    <BlockStack gap="500">
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">Inventory Alert Center</Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Real-time inventory notifications for your customers are active
              </Text>
            </BlockStack>
            <Button onClick={handleStartSetup}>
              Add More Rules
            </Button>
          </InlineStack>

          <Banner tone="success">
            <Text as="p">
              <strong>Inventory Monitoring Active!</strong> {channels.filter(c => c.enabled).length} channels • 
              {rules.filter(r => r.enabled).length} smart rules • Real-time monitoring enabled
            </Text>
          </Banner>
        </BlockStack>
      </Card>

      <Grid>
        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">📬 Active Customer Channels</Text>
              {channels.length === 0 ? (
                <Text as="p" tone="subdued">No channels configured</Text>
              ) : (
                <BlockStack gap="200">
                  {channels.map(channel => (
                    <InlineStack key={channel.id} gap="300" blockAlign="center">
                      <Icon source={channel.type === 'webflow' ? NotificationIcon : 
                                   channel.type === 'email' ? EmailIcon : ChatIcon} tone="success" />
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd">{channel.name}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {channel.type === 'webflow' ? 'Real customer alerts via Webflow' : 
                           `${channel.type.charAt(0).toUpperCase() + channel.type.slice(1)} notifications`}
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Grid.Cell>

        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
          <Card>
            <BlockStack gap="300">
              <Text as="h3" variant="headingMd">Active Customer Rules</Text>
              {rules.length === 0 ? (
                <Text as="p" tone="subdued">No rules configured</Text>
              ) : (
                <BlockStack gap="200">
                  {rules.map(rule => (
                    <InlineStack key={rule.id} gap="300" blockAlign="center">
                      <Icon source={AlertCircleIcon} tone="warning" />
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd">{rule.name}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {rule.description} • Customer notifications enabled
                        </Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              )}
            </BlockStack>
          </Card>
        </Grid.Cell>
      </Grid>
    </BlockStack>
  );

  if (!isVisible) return null;

  if (loading && !isSetupMode) {
    return (
      <Box padding="600">
        <BlockStack gap="400" align="center">
          <Spinner size="large" />
          <BlockStack gap="200" align="center">
            <Text as="h3" variant="headingMd">Setting up inventory monitoring</Text>
            <Text as="p" variant="bodyMd" tone="subdued">Preparing your alert dashboard...</Text>
          </BlockStack>
        </BlockStack>
      </Box>
    );
  }

  return (
    <BlockStack gap="300">
      {isSetupMode && renderSetupProgress()}
      
      {isSetupMode ? (
        <>
          {currentStep === 0 && renderProductSelection()}
          {currentStep === 1 && renderChannelSetup()}
          {currentStep === 2 && renderSummary()}
        </>
      ) : (
        isSetupComplete ? renderDashboard() : (
          <Card>
            <BlockStack gap="400" align="center">
              <Icon source={NotificationIcon} tone="subdued" />
              <BlockStack gap="200" align="center">
                <Text as="h2" variant="headingMd">Smart Customer Alerts</Text>
                <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                  Set up intelligent notifications that send real alerts to your customers about inventory changes.
                  Includes Webflow integration for seamless customer experience.
                </Text>
              </BlockStack>
              <Button variant="primary" size="large" onClick={handleStartSetup}>
                Start Smart Setup
              </Button>
            </BlockStack>
          </Card>
        )
      )}

      {/* Existing Notification Rules Grid */}
      {isSetupComplete && (
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between" blockAlign="center">
              <BlockStack gap="100">
                <Text as="h3" variant="headingMd">Existing Notification Rules</Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Manage your active notification rules and their settings
                </Text>
              </BlockStack>
              <Button
                variant="primary"
                icon={PlusIcon}
                onClick={() => setShowRuleModal(true)}
              >
                Add Rule
              </Button>
            </InlineStack>

            {existingRules.length === 0 ? (
              <Box padding="400">
                <BlockStack gap="200" align="center">
                  <Icon source={NotificationIcon} tone="subdued" />
                  <Text as="p" variant="bodyMd" tone="subdued" alignment="center">
                    No notification rules created yet. Add your first rule to start monitoring.
                  </Text>
                </BlockStack>
              </Box>
            ) : (
              <Grid>
                {existingRules.map((rule) => (
                  <Grid.Cell key={rule.id} columnSpan={{ xs: 6, sm: 3, md: 4, lg: 6, xl: 4 }}>
                    <Card>
                      <BlockStack gap="300">
                        <InlineStack align="space-between" blockAlign="start">
                          <BlockStack gap="100">
                            <InlineStack gap="200" blockAlign="center">
                              <Text as="h4" variant="headingSm" fontWeight="semibold">
                                {rule.name}
                              </Text>
                              <Badge tone={rule.enabled ? "success" : "critical"}>
                                {rule.enabled ? "Active" : "Inactive"}
                              </Badge>
                            </InlineStack>
                            <Text as="p" variant="bodySm" tone="subdued">
                              {rule.description}
                            </Text>
                          </BlockStack>
                          <InlineStack gap="100">
                            <Button
                              variant="plain"
                              icon={EditIcon}
                              onClick={() => {
                                setEditingRule(rule);
                                setShowRuleModal(true);
                              }}
                              accessibilityLabel={`Edit ${rule.name}`}
                            />
                            <Button
                              variant="plain"
                              icon={DeleteIcon}
                              tone="critical"
                              onClick={() => {
                                setExistingRules(rules => rules.filter(r => r.id !== rule.id));
                              }}
                              accessibilityLabel={`Delete ${rule.name}`}
                            />
                          </InlineStack>
                        </InlineStack>

                        <BlockStack gap="200">
                          <InlineStack gap="200" wrap={false}>
                            <Text as="p" variant="bodyXs" tone="subdued">Trigger:</Text>
                            <Text as="p" variant="bodyXs">
                              {rule.triggers[0]?.type === 'inventory' ? 'Inventory' : rule.triggers[0]?.type} {rule.triggers[0]?.condition} {rule.triggers[0]?.value}
                            </Text>
                          </InlineStack>
                          
                          <InlineStack gap="200" wrap={false}>
                            <Text as="p" variant="bodyXs" tone="subdued">Target:</Text>
                            <Text as="p" variant="bodyXs">
                              {rule.targets.type === 'collection' ? 'Collection' : 
                               rule.targets.type === 'tags' ? 'Tags' : 
                               rule.targets.type} ({rule.targets.values.join(', ')})
                            </Text>
                          </InlineStack>

                          <InlineStack gap="200" wrap={false}>
                            <Text as="p" variant="bodyXs" tone="subdued">Schedule:</Text>
                            <Text as="p" variant="bodyXs">
                              {rule.schedule.frequency === 'immediate' ? 'Immediate' : 
                               `${rule.schedule.frequency.charAt(0).toUpperCase() + rule.schedule.frequency.slice(1)} at ${rule.schedule.time || 'N/A'}`}
                            </Text>
                          </InlineStack>

                          <InlineStack gap="200" wrap={false}>
                            <Text as="p" variant="bodyXs" tone="subdued">Channels:</Text>
                            <Text as="p" variant="bodyXs">
                              {rule.channels.length} channel{rule.channels.length !== 1 ? 's' : ''} configured
                            </Text>
                          </InlineStack>

                          <InlineStack gap="200" wrap={false}>
                            <Text as="p" variant="bodyXs" tone="subdued">Products:</Text>
                            <Text as="p" variant="bodyXs">
                              {rule.limits.currentProducts} / {rule.limits.maxProducts} monitored
                            </Text>
                          </InlineStack>
                        </BlockStack>

                        <InlineStack gap="200">
                          <Button
                            variant={rule.enabled ? "secondary" : "primary"}
                            size="slim"
                            onClick={() => {
                              setExistingRules(rules => rules.map(r => 
                                r.id === rule.id ? { ...r, enabled: !r.enabled } : r
                              ));
                            }}
                          >
                            {rule.enabled ? "Disable" : "Enable"}
                          </Button>
                          <Button
                            variant="secondary"
                            size="slim"
                            onClick={() => {
                              // In real app, this would test the rule
                              alert(`Testing rule: ${rule.name}`);
                            }}
                          >
                            Test Rule
                          </Button>
                        </InlineStack>
                      </BlockStack>
                    </Card>
                  </Grid.Cell>
                ))}
              </Grid>
            )}
          </BlockStack>
        </Card>
      )}

      {/* Channel Configuration Modal */}
      <ChannelModal
        open={showChannelModal}
        onClose={() => {
          setShowChannelModal(false);
          setEditingChannel(null);
        }}
        onSave={addChannel}
        editingChannel={editingChannel}
      />

      {/* Rule Configuration Modal */}
      <RuleModal
        open={showRuleModal}
        onClose={() => {
          setShowRuleModal(false);
          setEditingRule(null);
        }}
        onSave={addRule}
        editingRule={editingRule}
        availableChannels={channels.filter(c => c.verified)}
      />
    </BlockStack>
  );
}

// Enhanced Channel Configuration Modal with Webflow Integration
function ChannelModal({ 
  open, 
  onClose, 
  onSave, 
  editingChannel 
}: {
  open: boolean;
  onClose: () => void;
  onSave: (channel: Omit<NotificationChannel, 'id'>) => void;
  editingChannel: NotificationChannel | null;
}) {
  const [channelType, setChannelType] = useState<'email' | 'slack' | 'discord' | 'webflow' | 'csv'>('email');
  const [name, setName] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [recipients, setRecipients] = useState<NotificationRecipient[]>([]);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [channel, setChannel] = useState('');
  const [webflowSiteId, setWebflowSiteId] = useState('');
  const [webflowToken, setWebflowToken] = useState('');
  const [csvSchedule, setCsvSchedule] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (editingChannel) {
      setChannelType(editingChannel.type);
      setName(editingChannel.name);
      setEmails(editingChannel.config.emails || []);
      setRecipients(editingChannel.config.recipients || []);
      setWebhookUrl(editingChannel.config.webhookUrl || '');
      setChannel(editingChannel.config.channel || '');
      setWebflowSiteId(editingChannel.config.webflowSiteId || '');
      setWebflowToken(editingChannel.config.webflowToken || '');
      setCsvSchedule(editingChannel.config.csvSchedule || 'daily');
    } else {
      // Reset form
      setName('');
      setEmails([]);
      setRecipients([]);
      setWebhookUrl('');
      setChannel('');
      setWebflowSiteId('');
      setWebflowToken('');
      setCsvSchedule('daily');
    }
  }, [editingChannel, open]);

  const testConnection = async () => {
    setTesting(true);
    try {
      const formData = new FormData();
      formData.append('action', 'test-channel');
      formData.append('channelType', channelType);
      formData.append('config', JSON.stringify({
        emails,
        recipients,
        webhookUrl,
        channel,
        webflowSiteId,
        webflowToken,
        csvSchedule,
      }));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        alert('✅ Connection test successful!');
      } else {
        alert(`❌ Connection test failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Test failed:', error);
      alert('❌ Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    const channelConfig: Omit<NotificationChannel, 'id'> = {
      type: channelType,
      name,
      config: {
        ...(channelType === 'email' && { emails, recipients }),
        ...(channelType === 'webflow' && { webflowSiteId, webflowToken }),
        ...(channelType === 'csv' && { csvSchedule }),
        ...(channelType !== 'email' && channelType !== 'webflow' && channelType !== 'csv' && { webhookUrl, channel }),
      },
      enabled: true,
      verified: true, // In real app, this would be set after verification
    };
    
    onSave(channelConfig);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingChannel ? 'Edit Customer Alert Channel' : 'Add Customer Alert Channel'}
      primaryAction={{
        content: editingChannel ? 'Update' : 'Add Channel',
        onAction: handleSave,
        disabled: !name || 
          (channelType === 'email' && emails.length === 0) ||
          (channelType === 'webflow' && (!webflowSiteId || !webflowToken)) ||
          (channelType !== 'email' && channelType !== 'webflow' && channelType !== 'csv' && !webhookUrl),
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <FormLayout>
          <Select
            label="Channel Type"
            options={[
              { label: 'Email (Team Notifications)', value: 'email' },
              { label: 'Webflow (Customer Alerts)', value: 'webflow' },
              { label: 'CSV Export', value: 'csv' },
              { label: 'Slack', value: 'slack' },
              { label: 'Discord', value: 'discord' },
            ]}
            value={channelType}
            onChange={(value) => setChannelType(value as any)}
          />
          
          <TextField
            label="Channel Name"
            value={name}
            onChange={setName}
            placeholder={`e.g., ${channelType === 'webflow' ? 'Customer Alerts' : 'Primary Email'}`}
            autoComplete="false"
          />

          {channelType === 'email' && (
            <>
              <Banner tone="info">
                <Text as="p">
                  👥 <strong>Multi-Recipient Support:</strong> Add multiple team members to receive inventory alerts!
                </Text>
              </Banner>
              <TextField
                label="Email Addresses (comma-separated)"
                type="email"
                value={emails.join(', ')}
                onChange={(value) => setEmails(value.split(',').map(e => e.trim()).filter(e => e))}
                placeholder="alerts@yourstore.com, manager@yourstore.com, inventory@yourstore.com"
                helpText="Add multiple email addresses separated by commas for team notifications"
                autoComplete="email"
              />
            </>
          )}

          {channelType === 'csv' && (
            <>
              <Banner tone="info">
                <Text as="p">
                  <strong>CSV Export:</strong> Automatically generate inventory reports for offline analysis!
                </Text>
              </Banner>
              <Select
                label="Export Schedule"
                options={[
                  { label: 'Daily Export', value: 'daily' },
                  { label: 'Weekly Export', value: 'weekly' },
                  { label: 'Monthly Export', value: 'monthly' },
                ]}
                value={csvSchedule}
                onChange={(value) => setCsvSchedule(value as any)}
              />
            </>
          )}

          {channelType === 'webflow' && (
            <>
              <Banner tone="info">
                <Text as="p">
                  <strong>Webflow Integration:</strong> This will send real inventory alerts directly to your customers through your Webflow site!
                </Text>
              </Banner>
              <TextField
                label="Webflow Site ID"
                value={webflowSiteId}
                onChange={setWebflowSiteId}
                placeholder="5f1a2b3c4d5e6f7g8h9i0j1k"
                helpText="Found in your Webflow site settings"
                autoComplete="false"
              />
              <TextField
                label="Webflow API Token"
                type="password"
                value={webflowToken}
                onChange={setWebflowToken}
                placeholder="••••••••••••••••••••••••••••••••"
                helpText="Generate in your Webflow account settings"
                autoComplete="false"
              />
            </>
          )}

          {(channelType === 'slack' || channelType === 'discord') && (
            <>
              <TextField
                label="Webhook URL"
                value={webhookUrl}
                onChange={setWebhookUrl}
                placeholder={`https://hooks.${channelType}.com/services/...`}
                autoComplete="false"
              />
              <TextField
                label="Channel/Username"
                value={channel}
                onChange={setChannel}
                placeholder={channelType === 'slack' ? '#general' : 'username'}
                autoComplete="false"
              />
            </>
          )}

          <InlineStack align="end">
            <Button onClick={testConnection} loading={testing}>
              Test Connection
            </Button>
          </InlineStack>
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

// Enhanced Rule Configuration Modal for Customer Alerts
function RuleModal({ 
  open, 
  onClose, 
  onSave, 
  editingRule,
  availableChannels 
}: {
  open: boolean;
  onClose: () => void;
  onSave: (rule: Omit<NotificationRule, 'id'>) => void;
  editingRule: NotificationRule | null;
  availableChannels: NotificationChannel[];
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'inventory' | 'sales' | 'performance'>('inventory');
  const [triggerLevel, setTriggerLevel] = useState<'product' | 'variant'>('product');
  const [condition, setCondition] = useState<'below' | 'above' | 'equals'>('below');
  const [value, setValue] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'category' | 'tags' | 'specific' | 'collection'>('all');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedLocations, setSelectedRuleLocations] = useState<string[]>([]);
  const [frequency, setFrequency] = useState<'immediate' | 'daily' | 'weekly' | 'monthly'>('immediate');
  const [timezone, setTimezone] = useState('UTC');
  const [scheduledTime, setScheduledTime] = useState('');

  useEffect(() => {
    if (editingRule) {
      setName(editingRule.name);
      setDescription(editingRule.description);
      setTriggerType(editingRule.triggers[0]?.type || 'inventory');
      setCondition(editingRule.triggers[0]?.condition || 'below');
      setValue(editingRule.triggers[0]?.value?.toString() || '');
      setTargetType(editingRule.targets.type);
      setSelectedChannels(editingRule.channels);
      setFrequency(editingRule.schedule.frequency);
    } else {
      // Reset form with customer-focused defaults
      setName('Customer Low Stock Alert');
      setDescription('Notify customers when products are running low');
      setValue('5');
      setSelectedChannels(availableChannels.map(c => c.id));
    }
  }, [editingRule, open, availableChannels]);

  const handleSave = () => {
    const rule: Omit<NotificationRule, 'id'> = {
      name,
      description: description + ' (Customer Alert)',
      enabled: true,
      triggers: [{
        type: triggerType,
        condition,
        value: parseInt(value) || 5,
        level: triggerLevel,
      }],
      targets: {
        type: targetType,
        values: [], // Would be populated based on targetType
      },
      channels: selectedChannels,
      schedule: {
        frequency,
        timezone,
        ...(scheduledTime && { time: scheduledTime }),
      },
      limits: {
        maxProducts: 100,
        currentProducts: 0,
      },
    };
    
    onSave(rule);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editingRule ? 'Edit Customer Alert Rule' : 'Create Customer Alert Rule'}
      primaryAction={{
        content: editingRule ? 'Update Rule' : 'Create Customer Alert',
        onAction: handleSave,
        disabled: !name || !value || selectedChannels.length === 0,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <FormLayout>
          <Banner tone="success">
            <Text as="p">
              <strong>Customer Impact:</strong> This rule will send real notifications to your customers!
            </Text>
          </Banner>
          
          <TextField
            label="Rule Name"
            value={name}
            onChange={setName}
            placeholder="e.g., Customer Low Stock Alert"
            autoComplete="false"
          />
          
          <TextField
            label="Description"
            value={description}
            onChange={setDescription}
            placeholder="What this alert does for customers"
            multiline={2}
            autoComplete="false"
          />

          <Select
            label="Alert Trigger"
            options={[
              { label: 'Inventory Level', value: 'inventory' },
              { label: 'Sales Performance', value: 'sales' },
              { label: 'Product Performance', value: 'performance' },
            ]}
            value={triggerType}
            onChange={(value) => setTriggerType(value as any)}
          />

          {triggerType === 'inventory' && (
            <>
              <Banner tone="success">
                <Text as="p">
                  <strong>Variant-Level Precision:</strong> Set different thresholds for each product variant!
                </Text>
              </Banner>
              <Select
                label="Monitoring Level"
                options={[
                  { label: 'Product Level (All Variants Combined)', value: 'product' },
                  { label: 'Variant Level (Individual Variant Thresholds)', value: 'variant' },
                ]}
                value={triggerLevel}
                onChange={(value) => setTriggerLevel(value as any)}
              />
            </>
          )}

          <InlineStack gap="200">
            <Box minWidth="120px">
              <Select
                label="Condition"
                options={[
                  { label: 'Below', value: 'below' },
                  { label: 'Above', value: 'above' },
                  { label: 'Equals', value: 'equals' },
                ]}
                value={condition}
                onChange={(value) => setCondition(value as any)}
              />
            </Box>
            <TextField
              label="Value"
              type="number"
              value={value}
              onChange={setValue}
              placeholder="5"
              suffix={triggerType === 'inventory' ? 'units' : '%'}
              autoComplete="false"
            />
          </InlineStack>

          <Select
            label="Apply to"
            options={[
              { label: 'All Products', value: 'all' },
              { label: 'Product Collection', value: 'collection' },
              { label: 'Product Category', value: 'category' },
              { label: 'Product Tags', value: 'tags' },
              { label: 'Specific Products', value: 'specific' },
            ]}
            value={targetType}
            onChange={(value) => setTargetType(value as any)}
          />

          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">Location Filtering (Optional)</Text>
            <Text as="p" variant="bodySm" tone="subdued">Only monitor inventory at specific locations</Text>
            <ChoiceList
              title=""
              choices={[
                { label: 'Main Warehouse', value: 'loc1', helpText: '🌐 Online Orders' },
                { label: 'Retail Store', value: 'loc2', helpText: '🏪 In-Store Only' }
              ]}
              selected={selectedLocations}
              onChange={setSelectedRuleLocations}
              allowMultiple
            />
          </BlockStack>

          <ChoiceList
            title="Customer Notification Channels"
            choices={availableChannels.map(channel => ({
              label: `${channel.name} ${channel.type === 'webflow' ? '(Direct Customer Alerts)' : ''}`,
              value: channel.id,
              helpText: channel.type === 'webflow' ? 
                'Sends real alerts to customers on your website' : 
                `${channel.type.charAt(0).toUpperCase() + channel.type.slice(1)} notification`,
            }))}
            selected={selectedChannels}
            onChange={setSelectedChannels}
            allowMultiple
          />

          <Card background="bg-surface-secondary">
            <BlockStack gap="300">
              <InlineStack gap="300" blockAlign="center">
                <Icon source={CheckCircleIcon} tone="success" />
                <Text as="h5" variant="headingSm">Hourly Inventory Monitoring</Text>
              </InlineStack>
              <Text as="p" tone="subdued">
                Your selected products are automatically checked every hour. When inventory hits your threshold, 
                you'll receive an email alert within the next hour. This provides reliable monitoring without 
                overwhelming your team with constant notifications.
              </Text>
              <Box padding="300" background="bg-surface-tertiary" borderRadius="200">
                <Text as="p" variant="bodySm">
                  <strong>Why hourly?</strong> It's the perfect balance of timely alerts and system reliability. 
                  Most inventory changes don't require instant action - hourly alerts keep you informed without alert fatigue.
                </Text>
              </Box>
            </BlockStack>
          </Card>

          <Select
            label="Email Alert Preference"
            options={[
              { label: 'Send individual alerts (recommended)', value: 'immediate' },
              { label: 'Daily summary at 9 AM', value: 'daily' },
              { label: 'Weekly summary on Mondays', value: 'weekly' },
            ]}
            value={frequency}
            onChange={(value) => setFrequency(value as any)}
            helpText="Choose how you want to receive notifications when thresholds are hit during hourly checks"
          />

          {frequency !== 'immediate' && (
            <>
              <Select
                label="Timezone"
                options={[
                  { label: 'UTC (Coordinated Universal Time)', value: 'UTC' },
                  { label: 'EST (Eastern Standard Time)', value: 'America/New_York' },
                  { label: 'PST (Pacific Standard Time)', value: 'America/Los_Angeles' },
                  { label: 'GMT (Greenwich Mean Time)', value: 'Europe/London' },
                  { label: 'CET (Central European Time)', value: 'Europe/Paris' },
                ]}
                value={timezone}
                onChange={setTimezone}
              />
              
              <TextField
                label="Scheduled Time (24-hour format)"
                type="time"
                value={scheduledTime}
                onChange={setScheduledTime}
                placeholder="09:00"
                helpText="Time when scheduled alerts will be sent"
                autoComplete="false"
              />
            </>
          )}
        </FormLayout>
      </Modal.Section>
    </Modal>
  );
}

export default Notifications;