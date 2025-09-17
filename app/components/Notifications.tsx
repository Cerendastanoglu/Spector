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
  ProgressBar,
  Grid,
} from "@shopify/polaris";
import {
  AlertCircleIcon,
  EmailIcon,
  ChatIcon,
  NotificationIcon,
  SearchIcon,
  SettingsIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback, useEffect } from "react";

interface NotificationsProps {
  isVisible: boolean;
}

interface Location {
  id: string;
  name: string;
  address: string;
  fulfillsOnlineOrders: boolean;
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
  const [currentStep, setCurrentStep] = useState(0);
  const [isSetupMode, setIsSetupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Product Selection (Enhanced with 100-product limit)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [availableCollections, setAvailableCollections] = useState<Collection[]>([]);
  const [availableLocations, setAvailableLocations] = useState<Location[]>([]);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectionMode, setSelectionMode] = useState<'all' | 'category' | 'tags' | 'specific' | 'collection'>('specific');
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [productLimit] = useState(150); // Basic Plan limit
  const [showLimitWarning, setShowLimitWarning] = useState(false);
  const [expandedVariants, setExpandedVariants] = useState<string[]>([]); // Track which products have expanded variant config
  const [variantThresholds, setVariantThresholds] = useState<{[variantId: string]: number}>({}); // Track threshold values for each variant
  const [selectedProductsSliderIndex, setSelectedProductsSliderIndex] = useState(0); // Track slider position for selected products
  const [summarySliderIndex, setSummarySliderIndex] = useState(0); // Track slider position for summary section
  const [productSelectionSliderIndex, setProductSelectionSliderIndex] = useState(0); // Track slider position for product selection
  const [productsPerPage] = useState(6); // Number of products to show per page in selection
  
  // Step 2: Notification Channels
  const [channels, setChannels] = useState<NotificationChannel[]>([]);
  const [showChannelModal, setShowChannelModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<NotificationChannel | null>(null);
  
  // Legacy Rules Configuration (not used in 2-step flow)
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [editingRule, setEditingRule] = useState<NotificationRule | null>(null);
  
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
      
      const data = await response.json();
      
      if (data.locations && data.locations.edges) {
        const locations = data.locations.edges.map((edge: any) => ({
          id: edge.node.id,
          name: edge.node.name,
          address: edge.node.address?.formatted || edge.node.address?.address1 || '',
          fulfillsOnlineOrders: edge.node.fulfillsOnlineOrders || false,
        }));
        setAvailableLocations(locations);
      }
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
  }, [isVisible]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Load actual products with variants and inventory locations from Shopify API
      const formData = new FormData();
      formData.append('action', 'fetch-products-with-variants-and-locations');
      
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
      
      if (data.products && data.products.edges) {
        const products = data.products.edges.map((edge: any) => {
          const node = edge.node;
          
          // Map variants with inventory data
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
    setShowRuleModal(false);
    setEditingRule(null);
  };

  const updateRule = (id: string, updates: Partial<NotificationRule>) => {
    setRules(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const deleteRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const filteredProducts = availableProducts.filter(product => {
    // Text search filter
    const matchesSearch = product.title.toLowerCase().includes(productSearchQuery.toLowerCase());
    
    // Location filter (if locations are selected)
    const matchesLocation = selectedLocations.length === 0 || 
      product.locations?.some(loc => selectedLocations.includes(loc.locationId));
    
    // Tags filter for tags selection mode
    const matchesTags = selectionMode !== 'tags' || selectedTags.length === 0 ||
      product.tags?.some(tag => selectedTags.includes(tag));
    
    // Collection filter for collection selection mode
    const matchesCollection = selectionMode !== 'collection' || selectedCollections.length === 0;
    // TODO: Add collection filtering when we have collection-product relationships
    
    return matchesSearch && matchesLocation && matchesTags && matchesCollection;
  });

  // Reset sliders when filters change
  useEffect(() => {
    setProductSelectionSliderIndex(0);
  }, [productSearchQuery, selectionMode, selectedLocations, selectedTags, selectedCollections]);

  // Reset summary slider when selected products change
  useEffect(() => {
    setSummarySliderIndex(0);
  }, [selectedProducts]);

  const renderSetupProgress = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Inventory Alert Setup
          </Text>
          <Badge tone="info">
            {Math.round(((currentStep + 1) / steps.length) * 100).toString() + "% Complete"}
          </Badge>
        </InlineStack>
        
        <ProgressBar progress={(currentStep / (steps.length - 1)) * 100} size="small" />
        
        <InlineStack gap="200" align="center" blockAlign="center">
          <InlineStack gap="150" blockAlign="center">
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: '20px', 
              backgroundColor: currentStep >= 0 ? '#f6f6f7' : '#fafbfb',
              border: currentStep === 0 ? '1px solid #8c9196' : '1px solid #e1e3e5',
              color: currentStep >= 0 ? '#303030' : '#8c9196',
              fontSize: '13px',
              fontWeight: currentStep === 0 ? '500' : '400',
              transition: 'all 0.2s ease'
            }}>
              Select Products
            </div>
            <div style={{ 
              width: '20px', 
              height: '1px', 
              backgroundColor: currentStep > 0 ? '#8c9196' : '#e1e3e5',
              transition: 'background-color 0.2s ease'
            }} />
          </InlineStack>
          
          <InlineStack gap="150" blockAlign="center">
            <div style={{ 
              padding: '6px 12px', 
              borderRadius: '20px', 
              backgroundColor: currentStep >= 1 ? '#f6f6f7' : '#fafbfb',
              border: currentStep === 1 ? '1px solid #8c9196' : '1px solid #e1e3e5',
              color: currentStep >= 1 ? '#303030' : '#8c9196',
              fontSize: '13px',
              fontWeight: currentStep === 1 ? '500' : '400',
              transition: 'all 0.2s ease'
            }}>
              Setup Notifications
            </div>
            <div style={{ 
              width: '20px', 
              height: '1px', 
              backgroundColor: currentStep > 1 ? '#8c9196' : '#e1e3e5',
              transition: 'background-color 0.2s ease'
            }} />
          </InlineStack>
          
          <div style={{ 
            padding: '6px 12px', 
            borderRadius: '20px', 
            backgroundColor: currentStep >= 2 ? '#f6f6f7' : '#fafbfb',
            border: currentStep === 2 ? '1px solid #8c9196' : '1px solid #e1e3e5',
            color: currentStep >= 2 ? '#303030' : '#8c9196',
            fontSize: '13px',
            fontWeight: currentStep === 2 ? '500' : '400',
            transition: 'all 0.2s ease'
          }}>
            Review & Activate
          </div>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  const renderProductSelection = () => (
    <Card>
      <BlockStack gap="400">
        <BlockStack gap="200">
          <Text as="h3" variant="headingMd">Step 1: Select Products & Configure Thresholds</Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Choose which products to monitor for low stock alerts and configure alert thresholds.
          </Text>
        </BlockStack>

        <ChoiceList
          title="How do you want to select products to monitor?"
          choices={[
            { label: 'By Collection', value: 'collection', helpText: 'Monitor all products in specific collections (up to 150 products total)' },
            { label: 'By Product Tags', value: 'tags', helpText: 'Monitor products with specific tags (up to 150 products total)' },
            { label: 'Specific Products Only', value: 'specific', helpText: 'Manually choose individual products (recommended for precise control)' },
          ]}
          selected={[selectionMode]}
          onChange={(value) => {
            const newMode = value[0] as any;
            setSelectionMode(newMode);
            
            // Check limits when switching modes
            if (newMode === 'all' && availableProducts.length > productLimit) {
              setShowLimitWarning(true);
            }
          }}
        />

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
                            onChange={() => {}} // Handled by ResourceItem onClick
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
            <TextField
              label="Search Products"
              value={productSearchQuery}
              onChange={setProductSearchQuery}
              placeholder="Search by product name..."
              prefix={<Icon source={SearchIcon} />}
              autoComplete="false"
            />
            
            <Card>
              <BlockStack gap="500">
                <InlineStack align="space-between" blockAlign="center">
                  <BlockStack gap="100">
                    <Text as="h4" variant="headingMd">Select Products & Configure Thresholds</Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      Choose products to monitor and set custom alert thresholds
                    </Text>
                  </BlockStack>
                  <Badge tone="info" size="medium">
                    {`${selectedProducts.length} of ${productLimit} selected`}
                  </Badge>
                </InlineStack>
                
                <BlockStack gap="400">
                  {/* Product Selection Slider Controls */}
                  {filteredProducts.length > productsPerPage && (
                    <Card background="bg-surface-secondary" padding="300">
                      <InlineStack align="space-between" blockAlign="center">
                        <Text as="p" variant="bodySm" tone="subdued">
                          Showing {Math.min(productSelectionSliderIndex + 1, filteredProducts.length)} - {Math.min(productSelectionSliderIndex + productsPerPage, filteredProducts.length)} of {filteredProducts.length} products
                        </Text>
                        <InlineStack gap="200" blockAlign="center">
                          <Button
                            size="micro"
                            disabled={productSelectionSliderIndex === 0}
                            onClick={() => setProductSelectionSliderIndex(Math.max(0, productSelectionSliderIndex - productsPerPage))}
                            icon={ChevronLeftIcon}
                          >
                            Previous
                          </Button>
                          <Button
                            size="micro"
                            disabled={productSelectionSliderIndex + productsPerPage >= filteredProducts.length}
                            onClick={() => setProductSelectionSliderIndex(Math.min(filteredProducts.length - productsPerPage, productSelectionSliderIndex + productsPerPage))}
                            icon={ChevronRightIcon}
                          >
                            Next
                          </Button>
                        </InlineStack>
                      </InlineStack>
                    </Card>
                  )}
                  
                  {filteredProducts.slice(productSelectionSliderIndex, productSelectionSliderIndex + productsPerPage).map((product) => {
                    const isProductSelected = selectedProducts.includes(product.id);
                    const totalVariants = product.variants?.length || 1;
                    
                    return (
                      <Card 
                        key={product.id} 
                        background={isProductSelected ? "bg-surface-selected" : "bg-surface"} 
                        padding="400"
                      >
                        <BlockStack gap="400">
                          {/* Product Header */}
                          <InlineStack align="space-between" blockAlign="center">
                            <InlineStack gap="400" blockAlign="center">
                              <Checkbox
                                checked={isProductSelected}
                                onChange={() => {
                                  if (isProductSelected) {
                                    setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                  } else if (selectedProducts.length < productLimit) {
                                    setSelectedProducts([...selectedProducts, product.id]);
                                  } else {
                                    setShowLimitWarning(true);
                                  }
                                }}
                                label=""
                              />
                              {product.imageUrl ? (
                                <Thumbnail
                                  source={product.imageUrl}
                                  alt={product.title}
                                  size="medium"
                                />
                              ) : (
                                <Avatar name={product.title} size="md" />
                              )}
                              <BlockStack gap="200">
                                <Text as="h5" variant="headingSm">{product.title}</Text>
                                <InlineStack gap="300" wrap={false}>
                                  <Badge 
                                    tone={product.inventory > 10 ? 'success' : product.inventory > 0 ? 'attention' : 'critical'}
                                    size="small"
                                  >
                                    {`${product.inventory} in stock`}
                                  </Badge>
                                  <Badge tone="info" size="small">
                                    {`${totalVariants} variant${totalVariants !== 1 ? 's' : ''}`}
                                  </Badge>
                                  <Badge size="small">
                                    {`$${product.variants?.[0]?.price || '0.00'}`}
                                  </Badge>
                                </InlineStack>
                              </BlockStack>
                            </InlineStack>
                            
                            {isProductSelected && (
                              <Button 
                                size="micro"
                                onClick={() => {
                                  const isExpanded = expandedVariants.includes(product.id);
                                  if (isExpanded) {
                                    setExpandedVariants(expandedVariants.filter(id => id !== product.id));
                                  } else {
                                    setExpandedVariants([...expandedVariants, product.id]);
                                  }
                                }}
                                icon={expandedVariants.includes(product.id) ? XCircleIcon : EditIcon}
                              >
                                {expandedVariants.includes(product.id) ? 'Hide Variants' : 'Configure Variants'}
                              </Button>
                            )}
                          </InlineStack>

                          {/* Variant Configuration - Show when product is selected and expanded */}
                          {isProductSelected && expandedVariants.includes(product.id) && (
                            <Box padding="400" background="bg-surface-secondary" borderRadius="300">
                              <BlockStack gap="400">
                                <InlineStack align="space-between" blockAlign="center">
                                  <BlockStack gap="100">
                                    <Text as="h5" variant="headingSm">Configure Alert Thresholds</Text>
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Set when you want to be notified for each variant
                                    </Text>
                                  </BlockStack>
                                </InlineStack>
                                
                                {product.variants && product.variants.length > 0 ? (
                                  <Grid>
                                    {product.variants.map((variant) => (
                                      <Grid.Cell key={variant.id} columnSpan={{ xs: 6, sm: 6, md: 4, lg: 3, xl: 3 }}>
                                        <Card background="bg-surface" padding="300">
                                          <BlockStack gap="300">
                                            <BlockStack gap="200">
                                              <Text as="p" variant="bodyMd" fontWeight="medium">
                                                {variant.title !== 'Default Title' ? variant.title : 'Standard'}
                                              </Text>
                                              <InlineStack align="space-between" blockAlign="center">
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                  ${variant.price}
                                                </Text>
                                                <Badge 
                                                  tone={variant.inventoryQuantity > 10 ? 'success' : 
                                                       variant.inventoryQuantity > 0 ? 'attention' : 'critical'}
                                                  size="small"
                                                >
                                                  {`${variant.inventoryQuantity} left`}
                                                </Badge>
                                              </InlineStack>
                                            </BlockStack>
                                            
                                            <TextField
                                              label="Alert when stock reaches"
                                              type="number"
                                              value={variantThresholds[variant.id]?.toString() || "5"}
                                              onChange={(value) => {
                                                const numValue = parseInt(value) || 5;
                                                setVariantThresholds(prev => ({
                                                  ...prev,
                                                  [variant.id]: numValue
                                                }));
                                              }}
                                              placeholder="5"
                                              helpText={`Send alert when stock ≤ ${variantThresholds[variant.id] || 5} units`}
                                              suffix="units"
                                              autoComplete="off"
                                            />
                                          </BlockStack>
                                        </Card>
                                      </Grid.Cell>
                                    ))}
                                  </Grid>
                                ) : (
                                  <Card background="bg-surface" padding="300">
                                    <BlockStack gap="300">
                                      <Text as="p" variant="bodyMd" fontWeight="medium">Single Product Configuration</Text>
                                      <TextField
                                        label="Alert when stock reaches"
                                        type="number"
                                        value={variantThresholds[product.id]?.toString() || "5"}
                                        onChange={(value) => {
                                          const numValue = parseInt(value) || 5;
                                          setVariantThresholds(prev => ({
                                            ...prev,
                                            [product.id]: numValue
                                          }));
                                        }}
                                        placeholder="5"
                                        helpText={`Send alert when stock ≤ ${variantThresholds[product.id] || 5} units`}
                                        suffix="units"
                                        autoComplete="off"
                                      />
                                    </BlockStack>
                                  </Card>
                                )}
                                
                                <Box padding="300" background="bg-surface-info" borderRadius="200">
                                  <InlineStack gap="200" blockAlign="start">
                                    <Icon source={AlertCircleIcon} tone="info" />
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      <strong>Pro tip:</strong> Set thresholds based on your sales velocity. 
                                      Fast-moving products should have higher alert thresholds.
                                    </Text>
                                  </InlineStack>
                                </Box>
                              </BlockStack>
                            </Box>
                          )}
                        </BlockStack>
                      </Card>
                    );
                  })}
                </BlockStack>
              </BlockStack>
            </Card>
            

            
        
        {/* Selected Products Preview */}
        {selectedProducts.length > 0 && (
          <Box padding="400" background="bg-surface-secondary" borderRadius="300">
            <BlockStack gap="400">
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
          </Box>
        )}
            
        <InlineStack align="space-between" blockAlign="center">
          <Text as="p" variant="bodySm" tone="subdued">
            {selectedProducts.length} of {productLimit} products selected for monitoring
          </Text>
          {selectedProducts.length >= productLimit && (
            <Badge tone="warning">Plan Limit Reached</Badge>
          )}
        </InlineStack>            {selectedProducts.length >= productLimit && (
              <Banner tone="warning">
                <Text as="p">
                  <strong>Product Limit Reached:</strong> You've selected the maximum number of products ({productLimit}) for your current plan. 
                  Upgrade to monitor more products or manage your selections.
                </Text>
              </Banner>
            )}
          </BlockStack>
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
              <ResourceItem id={channel.id} onClick={() => {}}>
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

  const renderRulesSetup = () => (
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
              <ResourceItem id={rule.id} onClick={() => {}}>
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
  );

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
    <BlockStack gap="500">
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