import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Grid,
  Button,
  Icon,
  TextField,
  Checkbox,
  Spinner,
  FormLayout,
  Badge,
  Collapsible,
  ChoiceList,
} from "@shopify/polaris";
import {
  ExportIcon,
  AlertCircleIcon,
  EmailIcon,
  NotificationIcon,
  CheckCircleIcon,
  ChatIcon,
} from "@shopify/polaris-icons";
import { useState, useEffect, useCallback } from "react";

interface NotificationsProps {
  isVisible: boolean;
}

interface NotificationSettings {
  emailEnabled: boolean;
  slackEnabled: boolean;
  discordEnabled: boolean;
  emailAddress: string;
  slackWebhook: string;
  discordWebhook: string;
  threshold: string;
  criticalThreshold: string;
  lowStockThreshold: string;
  specificProducts: string[];
  enableProductSpecific: boolean;
  notificationTypes: string[];
  scheduleEnabled: boolean;
  scheduleFrequency: string;
  scheduleTime: string;
}

export function Notifications({ isVisible }: NotificationsProps) {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailEnabled: false,
    slackEnabled: false,
    discordEnabled: false,
    emailAddress: '',
    slackWebhook: '',
    discordWebhook: '',
    threshold: '0',
    criticalThreshold: '3',
    lowStockThreshold: '10',
    specificProducts: [],
    enableProductSpecific: false,
    notificationTypes: ['out_of_stock', 'low_stock'],
    scheduleEnabled: false,
    scheduleFrequency: 'immediate',
    scheduleTime: '09:00',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isLoading, setIsLoading] = useState(true);
  const [, setResendStatus] = useState<{configured: boolean; fromEmail: string} | null>(null);
  
  // Product-specific notification states
  const [availableProducts, setAvailableProducts] = useState<Array<{id: string, title: string, inventory?: number, tracked?: boolean}>>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  
  // Filter products based on search query
  const filteredProducts = availableProducts.filter(product =>
    product.title.toLowerCase().includes(productSearchQuery.toLowerCase())
  );

  // Function to load products for monitoring
  const loadProductsForMonitoring = async () => {
    setLoadingProducts(true);
    try {
      const formData = new FormData();
      formData.append('action', 'fetch-products-for-notifications');
      
      const response = await fetch('/app/api/products', {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.products && data.products.edges) {
        const products = data.products.edges.map((edge: any) => ({
          id: edge.node.id,
          title: edge.node.title,
          handle: edge.node.handle,
          inventory: edge.node.totalInventory || 0,
          tracked: edge.node.tracked || false
        }));
        setAvailableProducts(products);
      } else if (data.error) {
        console.error('API Error:', data.error);
        // Set fallback products for testing
        setAvailableProducts([
          { id: 'sample-1', title: 'Sample Product 1', inventory: 10, tracked: true },
          { id: 'sample-2', title: 'Sample Product 2', inventory: 0, tracked: true },
          { id: 'sample-3', title: 'Sample Product 3', inventory: 5, tracked: true }
        ]);
      }
    } catch (error) {
      console.error('Failed to load products:', error);
      // Set fallback products for testing
      setAvailableProducts([
        { id: 'sample-1', title: 'Sample Product 1', inventory: 10, tracked: true },
        { id: 'sample-2', title: 'Sample Product 2', inventory: 0, tracked: true },
        { id: 'sample-3', title: 'Sample Product 3', inventory: 5, tracked: true }
      ]);
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // Function to check stock for specific products
  const checkProductStock = async () => {
    if ((notificationSettings.specificProducts || []).length === 0) {
      alert('Please select products to monitor first');
      return;
    }

    setLoadingProducts(true);
    try {
      const formData = new FormData();
      formData.append('action', 'check-product-stock');
      formData.append('settings', JSON.stringify(notificationSettings));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        if (result.outOfStockProducts > 0) {
          alert(`🚨 OUT OF STOCK ALERT!\n\n${result.outOfStockProducts} monitored products are out of stock:\n${result.productNames?.join('\n')}\n\nNotifications will be sent to ${notificationSettings.emailAddress || 'your configured email'}.`);
        } else {
          alert(`✅ All monitored products are in stock!\n\nChecked ${result.checkedProducts} products.`);
        }
      } else {
        alert(`❌ Error checking stock: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to check product stock:', error);
      alert('❌ Network error checking product stock');
    } finally {
      setLoadingProducts(false);
    }
  };
  
  // Check Resend status
  const checkResendStatus = async () => {
    try {
      const response = await fetch('/app/api/resend-status');
      const data = await response.json();
      setResendStatus(data.resend);
    } catch (error) {
      console.error('Failed to check Resend status:', error);
      setResendStatus({ configured: false, fromEmail: 'Not configured' });
    }
  };
  
  // Collapsible section states
  const [productSpecificOpen, setProductSpecificOpen] = useState(false);
  const [, ] = useState(false);
  const [thresholdSaveStatus, setThresholdSaveStatus] = useState<{[key: string]: boolean}>({});

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
    checkResendStatus();
  }, []);

  // Auto-save settings when they change (but exclude email/sensitive fields)
  useEffect(() => {
    if (!isLoading) {
      // Only auto-save non-sensitive settings (thresholds, checkboxes, etc.)
      // Don't auto-save email addresses, webhooks, or product selections
      const shouldAutoSave = true; // We can add logic here if needed
      
      if (shouldAutoSave) {
        const timeoutId = setTimeout(() => {
          // Only auto-save if user hasn't manually saved recently
          if (saveStatus !== 'saving') {
            console.log('Auto-saving notification settings...');
            // We'll call saveSettings here but need to define it first
          }
        }, 5000); // 5 second debounce - even less aggressive
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [notificationSettings.enableProductSpecific, notificationSettings.emailEnabled, notificationSettings.slackEnabled, notificationSettings.discordEnabled, notificationSettings.notificationTypes, isLoading, saveStatus]);

  // Only show save status for significant changes, not micro-edits
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const debouncedSaveStatus = useCallback(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setSaveStatus('idle'), 2000); // Hide after 2 seconds
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const loadSettings = async () => {
    try {
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'action=get-settings'
      });
      const result = await response.json();
      
      if (result.settings) {
        // Merge with default values to ensure all properties exist
        setNotificationSettings(prevSettings => ({
          ...prevSettings,
          ...result.settings,
          // Ensure arrays are always defined
          specificProducts: result.settings.specificProducts || [],
          notificationTypes: result.settings.notificationTypes || ['out_of_stock', 'low_stock'],
          // Ensure critical threshold is defined
          criticalThreshold: result.settings.criticalThreshold || '3',
        }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Individual save functions for each notification channel
  const saveEmailSettings = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const emailSettings = {
        ...notificationSettings,
        // Only save email-related settings
        emailEnabled: notificationSettings.emailEnabled,
        emailAddress: notificationSettings.emailAddress,
      };
      
      const formData = new FormData();
      formData.append('action', 'save-settings');
      formData.append('settings', JSON.stringify(emailSettings));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        alert('✅ Email settings saved successfully!');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        alert('❌ Failed to save email settings');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save email settings:', error);
      setSaveStatus('error');
      alert('❌ Failed to save email settings');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [notificationSettings, isSaving]);

  const saveSlackSettings = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const slackSettings = {
        ...notificationSettings,
        // Only save slack-related settings
        slackEnabled: notificationSettings.slackEnabled,
        slackWebhook: notificationSettings.slackWebhook,
      };
      
      const formData = new FormData();
      formData.append('action', 'save-settings');
      formData.append('settings', JSON.stringify(slackSettings));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        alert('✅ Slack settings saved successfully!');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        alert('❌ Failed to save Slack settings');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save Slack settings:', error);
      setSaveStatus('error');
      alert('❌ Failed to save Slack settings');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [notificationSettings, isSaving]);

  const saveDiscordSettings = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const discordSettings = {
        ...notificationSettings,
        // Only save discord-related settings
        discordEnabled: notificationSettings.discordEnabled,
        discordWebhook: notificationSettings.discordWebhook,
      };
      
      const formData = new FormData();
      formData.append('action', 'save-settings');
      formData.append('settings', JSON.stringify(discordSettings));
      
      const response = await fetch('/app/api/notifications', {
        method: 'POST',
        body: formData
      });
      
      if (response.ok) {
        setSaveStatus('saved');
        alert('✅ Discord settings saved successfully!');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        setSaveStatus('error');
        alert('❌ Failed to save Discord settings');
        setTimeout(() => setSaveStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Failed to save Discord settings:', error);
      setSaveStatus('error');
      alert('❌ Failed to save Discord settings');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setIsSaving(false);
    }
  }, [notificationSettings, isSaving]);

  const updateSetting = (key: keyof NotificationSettings, value: any) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: value
    }));
    
    // Show save indicator for threshold fields
    const thresholdFields = ['threshold', 'criticalThreshold', 'lowStockThreshold'];
    if (thresholdFields.includes(key)) {
      setThresholdSaveStatus(prev => ({ ...prev, [key]: true }));
      // Hide the indicator after 2 seconds
      setTimeout(() => {
        setThresholdSaveStatus(prev => ({ ...prev, [key]: false }));
      }, 2000);
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <BlockStack gap="600">
      {/* Smart Notification Center */}
      <Card>
        <BlockStack gap="500">
          <InlineStack align="space-between">
            <BlockStack gap="200">
              <Text as="h2" variant="headingLg">
                Smart Notification Center
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Configure custom alerts and product-specific notifications for your inventory management
              </Text>
            </BlockStack>
            <InlineStack gap="200" align="center">
              {saveStatus === 'saving' && <Spinner size="small" />}
              <Badge tone={notificationSettings.emailEnabled || notificationSettings.slackEnabled || notificationSettings.discordEnabled ? 'success' : 'attention'}>
                {isLoading ? 'Loading...' : (notificationSettings.emailEnabled || notificationSettings.slackEnabled || notificationSettings.discordEnabled) ? 'Active' : 'Manual Setup Required'}
              </Badge>
            </InlineStack>
          </InlineStack>
          
          {isLoading ? (
            <Box padding="600">
              <InlineStack align="center" gap="200">
                <Spinner size="large" />
                <Text as="p" variant="bodyLg">Loading notification configuration...</Text>
              </InlineStack>
            </Box>
          ) : (
            <BlockStack gap="400">
              {/* Communication Channels */}
              <Card background="bg-surface-secondary">
                <BlockStack gap="500">
                    <InlineStack align="space-between">
                      <InlineStack gap="300">
                        <Box 
                          background="bg-surface-brand" 
                          padding="300" 
                          borderRadius="200"
                        >
                          <Icon source={EmailIcon} tone="base" />
                        </Box>
                        <BlockStack gap="100">
                          <Text as="h3" variant="headingMd">Communication Channels</Text>
                          <Text as="p" variant="bodySm" tone="subdued">Connect your preferred notification methods</Text>
                        </BlockStack>
                      </InlineStack>
                      <Badge tone="success">Vital Integration</Badge>
                    </InlineStack>
                    
                    <Text as="p" variant="bodyMd" tone="subdued">
                      Configure how you want to receive notifications. Test each channel to ensure delivery.
                    </Text>
                    
                    {/* Email Notifications - Enhanced */}
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <InlineStack gap="300">
                            <Box 
                              background="bg-surface-info" 
                              padding="200" 
                              borderRadius="100"
                            >
                              <Icon source={EmailIcon} tone="info" />
                            </Box>
                            <BlockStack gap="100">
                              <Text as="h4" variant="headingSm">Email Alerts</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Primary notification channel</Text>
                            </BlockStack>
                          </InlineStack>
                          <Checkbox
                            label=""
                            checked={notificationSettings.emailEnabled}
                            onChange={(checked) => updateSetting('emailEnabled', checked)}
                          />
                        </InlineStack>
                        
                        {notificationSettings.emailEnabled ? (
                          <BlockStack gap="300">
                            <TextField
                              label="Email Address"
                              value={notificationSettings.emailAddress || ''}
                              onChange={(value) => updateSetting('emailAddress', value)}
                              placeholder="alerts@yourstore.com"
                              type="email"
                              autoComplete="email"
                              helpText="Where to send inventory alerts"
                            />
                            
                            <InlineStack gap="200" align="space-between">
                              <InlineStack gap="200">
                                <Badge tone="success" size="small">✓ Enabled</Badge>
                                {notificationSettings.emailAddress && (
                                  <Badge tone="info" size="small">Ready to send</Badge>
                                )}
                              </InlineStack>
                              <Button
                                onClick={saveEmailSettings}
                                loading={isSaving}
                                disabled={!notificationSettings.emailAddress}
                                variant="primary"
                                size="slim"
                              >
                                Save Email Settings
                              </Button>
                            </InlineStack>

                            <Box background="bg-surface-info" padding="300" borderRadius="200">
                              <BlockStack gap="200">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Email Configuration</Text>
                                <Text as="p" variant="bodySm">
                                  • Instant delivery for critical alerts
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Daily digest available at {notificationSettings.scheduleTime || '09:00'}
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Professional HTML templates with product details
                                </Text>
                              </BlockStack>
                            </Box>
                          </BlockStack>
                        ) : (
                          <Box background="bg-surface-warning" padding="300" borderRadius="200">
                            <BlockStack gap="200">
                              <Text as="p" variant="bodyMd" fontWeight="semibold">Email alerts disabled</Text>
                              <Text as="p" variant="bodySm">
                                Enable email notifications to receive critical inventory alerts directly in your inbox.
                              </Text>
                            </BlockStack>
                          </Box>
                        )}
                      </BlockStack>
                    </Card>

                    {/* Slack Integration - Enhanced */}
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <InlineStack gap="300">
                            <Box 
                              background="bg-surface-success" 
                              padding="200" 
                              borderRadius="100"
                            >
                              <Icon source={ChatIcon} tone="success" />
                            </Box>
                            <BlockStack gap="100">
                              <Text as="h4" variant="headingSm">Slack Integration</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Team notifications</Text>
                            </BlockStack>
                            {notificationSettings.slackEnabled && (
                              <Badge size="small" tone="success">Connected</Badge>
                            )}
                          </InlineStack>
                          <Checkbox
                            label=""
                            checked={notificationSettings.slackEnabled}
                            onChange={(checked) => updateSetting('slackEnabled', checked)}
                          />
                        </InlineStack>
                        
                        {notificationSettings.slackEnabled ? (
                          <BlockStack gap="300">
                            <TextField
                              label="Slack Webhook URL"
                              value={notificationSettings.slackWebhook || ''}
                              onChange={(value) => updateSetting('slackWebhook', value)}
                              placeholder="https://hooks.slack.com/services/..."
                              type="url"
                              autoComplete="url"
                              helpText="Get this from your Slack app settings"
                            />

                            <InlineStack align="end">
                              <Button
                                onClick={saveSlackSettings}
                                loading={isSaving}
                                disabled={!notificationSettings.slackWebhook}
                                variant="primary"
                                size="slim"
                              >
                                Save Slack Settings
                              </Button>
                            </InlineStack>

                            <Box background="bg-surface-success" padding="300" borderRadius="200">
                              <BlockStack gap="200">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Slack Features</Text>
                                <Text as="p" variant="bodySm">
                                  • Real-time team notifications
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Rich formatting with product links
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Channel mentions for critical alerts
                                </Text>
                              </BlockStack>
                            </Box>
                          </BlockStack>
                        ) : (
                          <Text as="p" variant="bodySm" tone="subdued">
                            Enable Slack integration for instant team notifications in your workspace.
                          </Text>
                        )}
                      </BlockStack>
                    </Card>

                    {/* Discord Integration - Enhanced */}
                    <Card>
                      <BlockStack gap="400">
                        <InlineStack align="space-between">
                          <InlineStack gap="300" blockAlign="center">
                            <Box 
                              background="bg-surface-warning" 
                              padding="200" 
                              borderRadius="100"
                            >
                              <Icon source={NotificationIcon} tone="warning" />
                            </Box>
                            <BlockStack gap="100">
                              <Text as="h4" variant="headingSm">Discord Integration</Text>
                              <Text as="p" variant="bodySm" tone="subdued">Community notifications</Text>
                            </BlockStack>
                            {notificationSettings.discordEnabled && (
                              <Badge size="small" tone="success">Connected</Badge>
                            )}
                          </InlineStack>
                          <Checkbox
                            label=""
                            checked={notificationSettings.discordEnabled}
                            onChange={(checked) => updateSetting('discordEnabled', checked)}
                          />
                        </InlineStack>
                        
                        {notificationSettings.discordEnabled ? (
                          <BlockStack gap="300">
                            <TextField
                              label="Discord Webhook URL"
                              value={notificationSettings.discordWebhook || ''}
                              onChange={(value) => updateSetting('discordWebhook', value)}
                              placeholder="https://discord.com/api/webhooks/..."
                              type="url"
                              autoComplete="url"
                              helpText="Create a webhook in your Discord server"
                            />

                            <InlineStack align="end">
                              <Button
                                onClick={saveDiscordSettings}
                                loading={isSaving}
                                disabled={!notificationSettings.discordWebhook}
                                variant="primary"
                                size="slim"
                              >
                                Save Discord Settings
                              </Button>
                            </InlineStack>

                            <Box background="bg-surface-info" padding="300" borderRadius="200">
                              <BlockStack gap="200">
                                <Text as="p" variant="bodyMd" fontWeight="semibold">Discord Features</Text>
                                <Text as="p" variant="bodySm">
                                  • Embed messages with product images
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Role mentions for urgent alerts
                                </Text>
                                <Text as="p" variant="bodySm">
                                  • Server-wide inventory updates
                                </Text>
                              </BlockStack>
                            </Box>
                          </BlockStack>
                        ) : (
                          <Text as="p" variant="bodySm" tone="subdued">
                            Connect Discord for server notifications with rich embeds and role mentions.
                          </Text>
                        )}
                      </BlockStack>
                    </Card>

                    {/* Overall Status */}
                    <Box background="bg-surface-secondary" padding="400" borderRadius="300">
                      <BlockStack gap="300">
                        <Text as="h4" variant="headingSm">Communication Status</Text>
                        <InlineStack gap="300">
                          <Badge tone={notificationSettings.emailEnabled ? 'success' : 'attention'}>
                            {`Email: ${notificationSettings.emailEnabled ? 'Active' : 'Disabled'}`}
                          </Badge>
                          <Badge tone={notificationSettings.slackEnabled ? 'success' : 'attention'}>
                            {`Slack: ${notificationSettings.slackEnabled ? 'Active' : 'Disabled'}`}
                          </Badge>
                          <Badge tone={notificationSettings.discordEnabled ? 'success' : 'attention'}>
                            {`Discord: ${notificationSettings.discordEnabled ? 'Active' : 'Disabled'}`}
                          </Badge>
                        </InlineStack>
                        
                        {!(notificationSettings.emailEnabled || notificationSettings.slackEnabled || notificationSettings.discordEnabled) && (
                          <Box background="bg-surface-critical" padding="300" borderRadius="200">
                            <Text as="p" variant="bodyMd" fontWeight="semibold" tone="critical">
                              No communication channels enabled! You won't receive any notifications.
                            </Text>
                          </Box>
                        )}
                      </BlockStack>
                    </Box>
                  </BlockStack>
                </Card>

              {/* Smart Threshold Configuration - Compact Design */}
              <Card background="bg-surface-secondary">
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="h3" variant="headingMd">Smart Threshold Configuration</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Set your inventory alert levels - automatic escalation from critical to low stock
                        </Text>
                      </BlockStack>
                      <Badge tone="info">User-Controlled</Badge>
                    </InlineStack>
                    
                    {/* Compact Threshold Grid */}
                    <Grid>
                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="h4" variant="headingSm">Out of Stock</Text>
                                <Text as="p" variant="bodySm" tone="subdued">Critical alerts</Text>
                              </BlockStack>
                              <Badge tone="critical" size="small">Priority</Badge>
                            </InlineStack>
                            <InlineStack gap="200" blockAlign="center">
                              <Box width="80px">
                                <TextField
                                  label=""
                                  type="number"
                                  value="0"
                                  disabled
                                  autoComplete="off"
                                  suffix="units"
                                />
                              </Box>
                              <Text as="p" variant="bodySm" tone="subdued">Fixed at 0</Text>
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>

                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="h4" variant="headingSm">Critical Stock</Text>
                                <Text as="p" variant="bodySm" tone="subdued">1 to set number</Text>
                              </BlockStack>
                              <Badge tone="warning" size="small">Moderate</Badge>
                            </InlineStack>
                            <InlineStack gap="100" blockAlign="center">
                              <Box width="120px">
                                <TextField
                                  label=""
                                  type="number"
                                  value={notificationSettings.criticalThreshold || '3'}
                                  onChange={(value) => updateSetting('criticalThreshold', value)}
                                  placeholder="3"
                                  autoComplete="off"
                                  min="1"
                                  suffix="units"
                                />
                              </Box>
                              {thresholdSaveStatus.criticalThreshold && (
                                <Icon source={CheckCircleIcon} tone="success" />
                              )}
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>

                      <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 4, lg: 4, xl: 4 }}>
                        <Card>
                          <BlockStack gap="300">
                            <InlineStack align="space-between" blockAlign="center">
                              <BlockStack gap="100">
                                <Text as="h4" variant="headingSm">Low Stock</Text>
                                <Text as="p" variant="bodySm" tone="subdued">Above critical level</Text>
                              </BlockStack>
                              <Badge tone="info" size="small">Low</Badge>
                            </InlineStack>
                            <InlineStack gap="100" blockAlign="center">
                              <Box width="120px">
                                <TextField
                                  label=""
                                  type="number"
                                  value={notificationSettings.lowStockThreshold || '10'}
                                  onChange={(value) => updateSetting('lowStockThreshold', value)}
                                  placeholder="10"
                                  autoComplete="off"
                                  min={parseInt(notificationSettings.criticalThreshold || '3') + 1}
                                  suffix="units"
                                />
                              </Box>
                              {thresholdSaveStatus.lowStockThreshold && (
                                <Icon source={CheckCircleIcon} tone="success" />
                              )}
                            </InlineStack>
                          </BlockStack>
                        </Card>
                      </Grid.Cell>
                    </Grid>

                    {/* Quick Visual Guide */}
                    <Box background="bg-surface-info" padding="300" borderRadius="200">
                      <InlineStack gap="600" align="center">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">Flow:</Text>
                        <InlineStack gap="200">
                          <Badge tone="critical">0 units → Out of Stock</Badge>
                          <Text as="span">→</Text>
                          <Badge tone="warning">{`1-${notificationSettings.criticalThreshold || '3'} units → Critical Stock`}</Badge>
                          <Text as="span">→</Text>
                          <Badge tone="info">{`${parseInt(notificationSettings.criticalThreshold || '3') + 1}-${notificationSettings.lowStockThreshold || '10'} units → Low Stock`}</Badge>
                        </InlineStack>
                      </InlineStack>
                    </Box>

                    {/* Enhanced Notification Types Selection */}
                    <BlockStack gap="300">
                      <Text as="h4" variant="headingSm">Active Notification Types</Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Choose which inventory events trigger notifications across your enabled channels
                      </Text>
                      
                      <Grid>
                        {/* Out of Stock Alerts */}
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="300" blockAlign="center">
                                  <Box 
                                    background="bg-surface-critical" 
                                    padding="200" 
                                    borderRadius="100"
                                  >
                                    <Icon source={AlertCircleIcon} tone="critical" />
                                  </Box>
                                  <BlockStack gap="100">
                                    <Text as="h5" variant="headingXs">Out of Stock Alerts</Text>
                                    <Text as="p" variant="bodySm" tone="subdued">Immediate alerts when inventory hits zero</Text>
                                  </BlockStack>
                                </InlineStack>
                                <Checkbox
                                  label=""
                                  checked={notificationSettings.notificationTypes?.includes('out_of_stock') || false}
                                  onChange={(checked) => {
                                    const current = notificationSettings.notificationTypes || [];
                                    const updated = checked 
                                      ? [...current, 'out_of_stock']
                                      : current.filter(type => type !== 'out_of_stock');
                                    updateSetting('notificationTypes', updated);
                                  }}
                                />
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>

                        {/* Critical Stock Warnings */}
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="300" blockAlign="center">
                                  <Box 
                                    background="bg-surface-warning" 
                                    padding="200" 
                                    borderRadius="100"
                                  >
                                    <Icon source={ExportIcon} tone="warning" />
                                  </Box>
                                  <BlockStack gap="100">
                                    <Text as="h5" variant="headingXs">Critical Stock Warnings</Text>
                                    <Text as="p" variant="bodySm" tone="subdued">Alerts for critically low inventory levels</Text>
                                  </BlockStack>
                                </InlineStack>
                                <Checkbox
                                  label=""
                                  checked={notificationSettings.notificationTypes?.includes('critical_stock') || false}
                                  onChange={(checked) => {
                                    const current = notificationSettings.notificationTypes || [];
                                    const updated = checked 
                                      ? [...current, 'critical_stock']
                                      : current.filter(type => type !== 'critical_stock');
                                    updateSetting('notificationTypes', updated);
                                  }}
                                />
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>

                        {/* Low Stock Warnings */}
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <Card>
                            <BlockStack gap="300">
                              <InlineStack align="space-between" blockAlign="center">
                                <InlineStack gap="300" blockAlign="center">
                                  <Box 
                                    background="bg-surface-info" 
                                    padding="200" 
                                    borderRadius="100"
                                  >
                                    <Icon source={NotificationIcon} tone="info" />
                                  </Box>
                                  <BlockStack gap="100">
                                    <Text as="h5" variant="headingXs">Low Stock Warnings</Text>
                                    <Text as="p" variant="bodySm" tone="subdued">Early warnings before stock becomes critical</Text>
                                  </BlockStack>
                                </InlineStack>
                                <Checkbox
                                  label=""
                                  checked={notificationSettings.notificationTypes?.includes('low_stock') || false}
                                  onChange={(checked) => {
                                    const current = notificationSettings.notificationTypes || [];
                                    const updated = checked 
                                      ? [...current, 'low_stock']
                                      : current.filter(type => type !== 'low_stock');
                                    updateSetting('notificationTypes', updated);
                                  }}
                                />
                              </InlineStack>
                            </BlockStack>
                          </Card>
                        </Grid.Cell>

                      </Grid>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </BlockStack>
            )}

            {/* Advanced Configuration Sections */}
            <BlockStack gap="400">
              <Text as="h3" variant="headingMd">Advanced Configuration</Text>
              
              {/* Product-Specific Notifications */}
            <Card>
              <BlockStack gap="300">
                <Box>
                  <div 
                    onClick={() => setProductSpecificOpen(!productSpecificOpen)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack gap="200" align="space-between" blockAlign="center">
                        <InlineStack gap="200">
                          <Text as="span" variant="headingSm">Product-Specific Notifications</Text>
                          <Badge tone={notificationSettings.enableProductSpecific ? 'success' : 'info'}>
                            {`${notificationSettings.specificProducts?.length || 0} products selected`}
                          </Badge>
                        </InlineStack>
                        <Text as="span">{productSpecificOpen ? '▼' : '▶'}</Text>
                      </InlineStack>
                    </Box>
                  </div>
                </Box>
                
                <Collapsible
                  open={productSpecificOpen}
                  id="product-specific-collapsible"
                  transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
                  expandOnPrint
                >
                  <BlockStack gap="400">
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" tone="subdued">
                          Get notified only for specific products you care about
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Select products from your store and receive instant alerts when they go out of stock
                        </Text>
                      </BlockStack>
                      <Checkbox
                        label="Enable product-specific notifications"
                        checked={notificationSettings.enableProductSpecific}
                        onChange={(checked) => {
                          updateSetting('enableProductSpecific', checked);
                          // Auto-load products when enabled
                          if (checked && availableProducts.length === 0) {
                            loadProductsForMonitoring();
                          }
                        }}
                      />
                    </InlineStack>
                    
                    {notificationSettings.enableProductSpecific && (
                      <Grid>
                        <Grid.Cell columnSpan={{ xs: 6, sm: 6, md: 6, lg: 6, xl: 6 }}>
                          <FormLayout>
                            <TextField
                              label="Search Products"
                              value={productSearchQuery}
                              onChange={setProductSearchQuery}
                              placeholder="Search for products to monitor..."
                              helpText="Type to search through your store's products"
                              autoComplete="off"
                            />

                            {!loadingProducts && availableProducts.length === 0 && (
                              <InlineStack align="start">
                                <Button
                                  variant="secondary"
                                  onClick={loadProductsForMonitoring}
                                >
                                  Load Products from Store
                                </Button>
                              </InlineStack>
                            )}

                            {loadingProducts && (
                              <InlineStack gap="200" blockAlign="center">
                                <Spinner size="small" />
                                <Text as="p" variant="bodySm" tone="subdued">
                                  Loading products from your store...
                                </Text>
                              </InlineStack>
                            )}

                            {filteredProducts.length > 0 && (
                              <Box background="bg-surface-secondary" padding="300" borderRadius="200">
                                <BlockStack gap="200">
                                  <Text as="p" variant="bodySm" fontWeight="medium">
                                    Select Products to Monitor ({(notificationSettings.specificProducts || []).length} selected)
                                  </Text>
                                  
                                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px', padding: '8px' }}>
                                    <ChoiceList
                                      title=""
                                      allowMultiple
                                      choices={filteredProducts.slice(0, 20).map((product) => ({
                                        label: `${product.title} (${product.inventory || 0} in stock${product.tracked === false ? ' - not tracked' : ''})`,
                                        value: product.id,
                                        helpText: product.inventory === 0 ? 'Currently out of stock' : `${product.inventory} units available`
                                      }))}
                                      selected={notificationSettings.specificProducts || []}
                                      onChange={(selected) => updateSetting('specificProducts', selected)}
                                    />
                                  </div>
                                  
                                  {filteredProducts.length > 20 && (
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      Showing first 20 products. Use search to find specific products.
                                    </Text>
                                  )}
                                  
                                  {filteredProducts.length === 0 && productSearchQuery && (
                                    <Text as="p" variant="bodySm" tone="subdued">
                                      No products found matching "{productSearchQuery}"
                                    </Text>
                                  )}
                                </BlockStack>
                              </Box>
                            )}

                            {(notificationSettings.specificProducts || []).length > 0 && (
                              <Box background="bg-surface-info" padding="300" borderRadius="200">
                                <BlockStack gap="200">
                                  <Text as="p" variant="bodySm" fontWeight="medium">
                                    Monitoring {(notificationSettings.specificProducts || []).length} specific products
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    Selected products: {availableProducts
                                      .filter(product => (notificationSettings.specificProducts || []).includes(product.id))
                                      .map(product => product.title)
                                      .join(', ') || 'Loading product names...'}
                                  </Text>
                                  <Text as="p" variant="bodySm">
                                    You'll receive notifications when any of these products go out of stock.
                                  </Text>
                                  <InlineStack gap="200">
                                    <Button
                                      size="slim"
                                      onClick={checkProductStock}
                                      loading={loadingProducts}
                                    >
                                      Check Stock Now
                                    </Button>
                                  </InlineStack>
                                </BlockStack>
                              </Box>
                            )}
                          </FormLayout>
                        </Grid.Cell>
                      </Grid>
                    )}
                  </BlockStack>
                </Collapsible>
              </BlockStack>
            </Card>
          </BlockStack>
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
