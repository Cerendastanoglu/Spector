import {
  Card,
  Text,
  BlockStack,
  InlineStack,
  Button,
  Box,
  Badge,
  Divider,
  TextField,
  Select,
  Banner,
  Tooltip,
  Icon,
} from "@shopify/polaris";
import {
  HashtagIcon,
  CollectionIcon,
  CalendarIcon,
  PlusIcon,
  DeleteIcon,
  EditIcon,
  ClockIcon,
  ProductIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";

interface AutomationRule {
  id: string;
  name: string;
  type: 'collection' | 'tag';
  enabled: boolean;
  conditions: {
    field: string;
    operator: string;
    value: string;
  }[];
  action: {
    type: 'add_to_collection' | 'remove_from_collection' | 'add_tag' | 'remove_tag';
    value: string;
  };
  lastRun?: string;
  matchCount?: number;
}

interface ScheduleRule {
  id: string;
  name: string;
  productId: string;
  productTitle: string;
  scheduleType: 'daily_reset' | 'date_specific' | 'recurring' | 'preorder';
  enabled: boolean;
  dailyQuantity?: number;
  resetTime?: string;
  specificDates?: string[];
  recurringDays?: string[];
  preorderDate?: string;
  preorderLimit?: number;
}

interface AutomationProps {
  shopDomain?: string;
  isTrialMode?: boolean;
  isDevelopmentStore?: boolean;
}

export function Automation({ shopDomain: _shopDomain, isTrialMode = false, isDevelopmentStore = false }: AutomationProps) {
  const [activeSubTab, setActiveSubTab] = useState<'collections' | 'tags' | 'scheduling'>('collections');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  
  // Scheduling state
  const [scheduleRules, setScheduleRules] = useState<ScheduleRule[]>([]);
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [newScheduleType, setNewScheduleType] = useState<ScheduleRule['scheduleType']>('daily_reset');
  const [newScheduleProduct, setNewScheduleProduct] = useState('');
  const [newScheduleProductId, setNewScheduleProductId] = useState('');
  const [productSearchResults, setProductSearchResults] = useState<Array<{id: string; title: string; currentStock: number}>>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [newDailyQuantity, setNewDailyQuantity] = useState('10');
  const [newResetTime, setNewResetTime] = useState('00:00');
  const [newPreorderDate, setNewPreorderDate] = useState('');
  const [newPreorderLimit, setNewPreorderLimit] = useState('50');
  const [selectedDays, setSelectedDays] = useState<string[]>(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [runningSchedule, setRunningSchedule] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newRuleName, setNewRuleName] = useState('');
  const [newRuleType, setNewRuleType] = useState<'collection' | 'tag'>('tag');
  const [newConditionField, setNewConditionField] = useState('title');
  const [newConditionOperator, setNewConditionOperator] = useState('contains');
  const [newConditionValue, setNewConditionValue] = useState('');
  const [newActionValue, setNewActionValue] = useState('');
  const [savingRule, setSavingRule] = useState(false);
  
  // Preview state for rule creation
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<Array<{id: string; title: string}>>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const shouldApplyTrialRestrictions = isTrialMode && !isDevelopmentStore;

  const conditionFieldOptions = [
    { label: 'Title', value: 'title' },
    { label: 'Product Type', value: 'product_type' },
    { label: 'Vendor', value: 'vendor' },
    { label: 'Price', value: 'price' },
    { label: 'Compare at Price', value: 'compare_at_price' },
    { label: 'Inventory Quantity', value: 'inventory' },
    { label: 'SKU', value: 'sku' },
    { label: 'Status', value: 'status' },
    { label: 'Tags', value: 'tags' },
  ];

  const conditionOperatorOptions = [
    { label: 'Contains', value: 'contains' },
    { label: 'Does not contain', value: 'not_contains' },
    { label: 'Equals', value: 'equals' },
    { label: 'Does not equal', value: 'not_equals' },
    { label: 'Greater than', value: 'greater_than' },
    { label: 'Less than', value: 'less_than' },
    { label: 'Starts with', value: 'starts_with' },
    { label: 'Ends with', value: 'ends_with' },
  ];

  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const [runResult, setRunResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleCreateRule = useCallback(async () => {
    if (!newRuleName || !newConditionValue || !newActionValue) return;
    
    // First preview to validate the rule works
    if (previewCount === null) {
      // Force a preview first
      setPreviewError('Please click "Preview Matches" to test your rule first');
      return;
    }
    
    setSavingRule(true);
    
    const newRule: AutomationRule = {
      id: Date.now().toString(),
      name: newRuleName,
      type: newRuleType,
      enabled: true,
      conditions: [
        { field: newConditionField, operator: newConditionOperator, value: newConditionValue }
      ],
      action: { 
        type: newRuleType === 'tag' ? 'add_tag' : 'add_to_collection', 
        value: newActionValue 
      },
      matchCount: previewCount
    };
    
    // Actually run the rule to apply it immediately
    try {
      const response = await fetch('/app/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', rule: newRule })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Mark as applied with lastRun
        const appliedRule = { 
          ...newRule, 
          lastRun: 'Just now', 
          matchCount: data.matchCount || previewCount 
        };
        setRules(prev => [...prev, appliedRule]);
        setRunResult({ success: true, message: data.message || `Applied to ${data.updatedCount || previewCount} products` });
      } else {
        setRunResult({ success: false, message: data.error || 'Failed to apply rule' });
        // Still save the rule but without lastRun
        setRules(prev => [...prev, newRule]);
      }
    } catch (error) {
      setRunResult({ success: false, message: 'Network error - rule saved but not applied' });
      setRules(prev => [...prev, newRule]);
    }
    
    setIsCreating(false);
    setNewRuleName('');
    setNewConditionValue('');
    setNewActionValue('');
    setPreviewProducts([]);
    setPreviewCount(null);
    setPreviewError(null);
    setSavingRule(false);
  }, [newRuleName, newRuleType, newConditionField, newConditionOperator, newConditionValue, newActionValue, previewCount]);

  // Preview matching products for rule creation
  const handlePreviewRule = useCallback(async () => {
    if (!newConditionValue) {
      setPreviewError('Please enter a condition value');
      return;
    }
    
    setPreviewLoading(true);
    setPreviewError(null);
    setPreviewProducts([]);
    setPreviewCount(null);
    
    try {
      const response = await fetch('/app/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'preview',
          condition: {
            field: newConditionField,
            operator: newConditionOperator,
            value: newConditionValue
          }
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setPreviewProducts(data.products || []);
        setPreviewCount(data.count);
        if (data.count === 0) {
          setPreviewError('No products match this condition. Try different criteria.');
        }
      } else {
        setPreviewError(data.error || 'Failed to preview products');
      }
    } catch (error) {
      setPreviewError('Network error - please try again');
    }
    
    setPreviewLoading(false);
  }, [newConditionField, newConditionOperator, newConditionValue]);

  // Product search for scheduling
  const handleProductSearch = useCallback(async (query: string) => {
    setNewScheduleProduct(query);
    setNewScheduleProductId('');
    
    if (query.length < 2) {
      setProductSearchResults([]);
      return;
    }
    
    setSearchingProducts(true);
    try {
      const response = await fetch('/app/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'searchProducts', query })
      });
      const data = await response.json();
      if (data.success) {
        setProductSearchResults(data.products);
      }
    } catch {
      setProductSearchResults([]);
    }
    setSearchingProducts(false);
  }, []);

  const handleSelectProduct = useCallback((product: { id: string; title: string }) => {
    setNewScheduleProduct(product.title);
    setNewScheduleProductId(product.id);
    setProductSearchResults([]);
  }, []);

  const renderSubTabs = () => (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: '#f6f6f7',
      borderRadius: '10px',
      padding: '4px',
      marginBottom: '16px'
    }}>
      {[
        { id: 'collections', label: 'Collections', icon: CollectionIcon, locked: false },
        { id: 'tags', label: 'Tags', icon: HashtagIcon, locked: false },
        { id: 'scheduling', label: 'Scheduling', icon: CalendarIcon, locked: true }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => !tab.locked && setActiveSubTab(tab.id as typeof activeSubTab)}
          title={tab.locked ? "Coming soon" : undefined}
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            padding: '10px 12px',
            border: 'none',
            borderRadius: '8px',
            background: activeSubTab === tab.id ? 'white' : 'transparent',
            boxShadow: activeSubTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
            color: tab.locked ? '#b5b5b5' : (activeSubTab === tab.id ? '#2c2c2c' : '#6d6d6d'),
            fontWeight: activeSubTab === tab.id ? '600' : '500',
            fontSize: '13px',
            cursor: tab.locked ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            opacity: tab.locked ? 0.6 : 1
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Icon source={tab.icon} />
            <span>{tab.label}</span>
          </span>
        </button>
      ))}
    </div>
  );

  const renderRuleCard = (rule: AutomationRule) => (
    <Box 
      key={rule.id} 
      padding="400" 
      background="bg-surface" 
      borderRadius="200"
      borderWidth="025"
      borderColor="border"
    >
      <BlockStack gap="300">
        <InlineStack align="space-between" blockAlign="start">
          <InlineStack gap="300" blockAlign="center">
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: rule.type === 'tag' ? '#EBF0FF' : '#E3F4EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: rule.type === 'tag' ? '#5C6AC4' : '#008060'
            }}>
              <Icon source={rule.type === 'tag' ? HashtagIcon : CollectionIcon} />
            </div>
            <BlockStack gap="050">
              <Text as="p" variant="bodyMd" fontWeight="semibold">{rule.name}</Text>
              <InlineStack gap="200">
                {rule.lastRun && (
                  <Badge tone="success">Applied</Badge>
                )}
                {rule.matchCount !== undefined && (
                  <Text as="span" variant="bodySm" tone="subdued">
                    {rule.matchCount} products matched
                  </Text>
                )}
              </InlineStack>
            </BlockStack>
          </InlineStack>
          
          <InlineStack gap="200">
            {rule.lastRun && (
              <Tooltip content={`Last run: ${rule.lastRun}`}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8c8c8c' }}>
                  <Icon source={ClockIcon} tone="subdued" />
                  <Text as="span" variant="bodySm" tone="subdued">{rule.lastRun}</Text>
                </div>
              </Tooltip>
            )}
          </InlineStack>
        </InlineStack>
        
        {/* Rule conditions summary */}
        <Box padding="200" background="bg-surface-secondary" borderRadius="100">
          <InlineStack gap="200" wrap>
            <Text as="span" variant="bodySm" fontWeight="semibold">IF</Text>
            {rule.conditions.map((cond, idx) => (
              <Badge key={idx} tone="info">
                {`${conditionFieldOptions.find(f => f.value === cond.field)?.label || cond.field} ${cond.operator.replace('_', ' ')} "${cond.value}"`}
              </Badge>
            ))}
            <Text as="span" variant="bodySm" fontWeight="semibold">THEN</Text>
            <Badge tone="success">
              {`${rule.action.type.replace(/_/g, ' ')}: ${rule.action.value}`}
            </Badge>
          </InlineStack>
        </Box>
        
        {/* Actions */}
        <InlineStack align="end" gap="200">
          <Button
            size="slim"
            icon={EditIcon}
            onClick={() => {/* TODO: Edit rule */}}
          >
            Edit
          </Button>
          <Button
            size="slim"
            icon={DeleteIcon}
            tone="critical"
            onClick={() => handleDeleteRule(rule.id)}
          >
            Delete
          </Button>
        </InlineStack>
      </BlockStack>
    </Box>
  );

  const renderCreateRuleForm = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">
            {newRuleType === 'tag' ? 'Create Tag Rule' : 'Create Collection Rule'}
          </Text>
          <Button variant="plain" onClick={() => {
            setIsCreating(false);
            setPreviewProducts([]);
            setPreviewCount(null);
            setPreviewError(null);
          }}>Cancel</Button>
        </InlineStack>
        
        <Divider />
        
        <TextField
          label="Rule Name"
          value={newRuleName}
          onChange={setNewRuleName}
          placeholder={newRuleType === 'tag' ? 'e.g., Tag products on sale' : 'e.g., Low stock items collection'}
          autoComplete="off"
        />
        
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">When product matches:</Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-start' }}>
            <div style={{ minWidth: '150px' }}>
              <Select
                label="Field"
                labelHidden
                options={conditionFieldOptions}
                value={newConditionField}
                onChange={(val) => {
                  setNewConditionField(val);
                  setPreviewCount(null);
                  setPreviewProducts([]);
                }}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Select
                label="Operator"
                labelHidden
                options={conditionOperatorOptions}
                value={newConditionOperator}
                onChange={(val) => {
                  setNewConditionOperator(val);
                  setPreviewCount(null);
                  setPreviewProducts([]);
                }}
              />
            </div>
            <div style={{ minWidth: '150px', flex: 1 }}>
              <TextField
                label="Value"
                labelHidden
                value={newConditionValue}
                onChange={(val) => {
                  setNewConditionValue(val);
                  setPreviewCount(null);
                  setPreviewProducts([]);
                }}
                placeholder="Enter value..."
                autoComplete="off"
              />
            </div>
            <Button
              onClick={handlePreviewRule}
              loading={previewLoading}
              disabled={!newConditionValue}
            >
              Preview Matches
            </Button>
          </div>
        </BlockStack>
        
        {/* Preview Results */}
        {previewError && (
          <Banner tone="warning" onDismiss={() => setPreviewError(null)}>
            <p>{previewError}</p>
          </Banner>
        )}
        
        {previewCount !== null && previewCount > 0 && (
          <Box padding="300" background="bg-surface-success" borderRadius="200">
            <BlockStack gap="200">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                <Badge tone="success">{`${previewCount} products found`}</Badge>
                <Text as="span" variant="bodySm" tone="success">
                  These products will be affected by this rule
                </Text>
              </div>
              {previewProducts.length > 0 && (
                <div style={{ 
                  maxHeight: '150px', 
                  overflowY: 'auto',
                  background: 'white',
                  borderRadius: '8px',
                  padding: '12px'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {previewProducts.slice(0, 10).map(p => (
                        <tr key={p.id}>
                          <td style={{ width: '24px', padding: '4px 8px 4px 0', verticalAlign: 'middle' }}>
                            <Icon source={ProductIcon} tone="subdued" />
                          </td>
                          <td style={{ padding: '4px 0', verticalAlign: 'middle', textAlign: 'left' }}>
                            <Text as="span" variant="bodySm">{p.title}</Text>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {previewProducts.length > 10 && (
                    <div style={{ marginTop: '8px' }}>
                      <Text as="p" variant="bodySm" tone="subdued">
                        +{previewProducts.length - 10} more products...
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </BlockStack>
          </Box>
        )}
        
        <TextField
          label={newRuleType === 'tag' ? 'Tag to Apply' : 'Collection Name'}
          value={newActionValue}
          onChange={setNewActionValue}
          placeholder={newRuleType === 'tag' ? 'e.g., Sale, New Arrival' : 'e.g., Low Stock Items'}
          autoComplete="off"
          helpText={newRuleType === 'tag'
            ? 'This tag will be added to all matching products' 
            : 'Products will be added to this collection (will be created if it doesn\'t exist)'
          }
        />
        
        <InlineStack align="end" gap="200">
          <Button onClick={() => {
            setIsCreating(false);
            setPreviewProducts([]);
            setPreviewCount(null);
            setPreviewError(null);
          }}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateRule}
            loading={savingRule}
            disabled={!newRuleName || !newConditionValue || !newActionValue || previewCount === null || previewCount === 0}
          >
            {savingRule 
              ? 'Applying...'
              : previewCount !== null && previewCount > 0 
                ? `Apply to ${previewCount} Products` 
                : 'Create Rule'
            }
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  const renderCollectionsTab = () => {
    const collectionRules = rules.filter(r => r.type === 'collection');
    
    return (
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Auto Collections</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Automatically add products to collections based on conditions
            </Text>
          </BlockStack>
          <Button 
            icon={PlusIcon} 
            variant="primary"
            onClick={() => {
              setNewRuleType('collection');
              setIsCreating(true);
            }}
          >
            Create Rule
          </Button>
        </InlineStack>
        
        {collectionRules.length === 0 ? (
          <Card>
            <Box padding="600">
              <BlockStack gap="300" inlineAlign="center">
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#E3F4EE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#008060'
                }}>
                  <Icon source={CollectionIcon} />
                </div>
                <Text as="p" variant="bodyMd" alignment="center">
                  No collection rules yet
                </Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  Create rules to automatically organize products into collections
                </Text>
                <Button 
                  variant="primary"
                  onClick={() => {
                    setNewRuleType('collection');
                    setIsCreating(true);
                  }}
                >
                  Create Your First Rule
                </Button>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          <BlockStack gap="300">
            {collectionRules.map(renderRuleCard)}
          </BlockStack>
        )}
      </BlockStack>
    );
  };

  const renderTagsTab = () => {
    const tagRules = rules.filter(r => r.type === 'tag');
    
    return (
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Auto Tags</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Automatically apply or remove tags based on product attributes
            </Text>
          </BlockStack>
          <Button 
            icon={PlusIcon} 
            variant="primary"
            onClick={() => {
              setNewRuleType('tag');
              setIsCreating(true);
            }}
          >
            Create Rule
          </Button>
        </InlineStack>
        
        {tagRules.length === 0 ? (
          <Card>
            <Box padding="600">
              <BlockStack gap="300" inlineAlign="center">
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: '#EBF0FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#5C6AC4'
                }}>
                  <Icon source={HashtagIcon} />
                </div>
                <Text as="p" variant="bodyMd" alignment="center">
                  No tag rules yet
                </Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  Create rules to automatically tag products based on conditions
                </Text>
                <Button 
                  variant="primary"
                  onClick={() => {
                    setNewRuleType('tag');
                    setIsCreating(true);
                  }}
                >
                  Create Your First Rule
                </Button>
              </BlockStack>
            </Box>
          </Card>
        ) : (
          <BlockStack gap="300">
            {tagRules.map(renderRuleCard)}
          </BlockStack>
        )}
      </BlockStack>
    );
  };

  const handleCreateSchedule = useCallback(async () => {
    if (!newScheduleName || !newScheduleProduct) return;
    
    setSavingSchedule(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const newSchedule: ScheduleRule = {
      id: Date.now().toString(),
      name: newScheduleName,
      productId: newScheduleProductId || newScheduleProduct,
      productTitle: newScheduleProduct,
      scheduleType: newScheduleType,
      enabled: true,
      dailyQuantity: parseInt(newDailyQuantity) || 10,
      resetTime: newResetTime,
      recurringDays: selectedDays,
      preorderDate: newPreorderDate,
      preorderLimit: parseInt(newPreorderLimit) || 50,
    };
    
    setScheduleRules(prev => [...prev, newSchedule]);
    setIsCreatingSchedule(false);
    setNewScheduleName('');
    setNewScheduleProduct('');
    setNewScheduleProductId('');
    setProductSearchResults([]);
    setSavingSchedule(false);
  }, [newScheduleName, newScheduleProduct, newScheduleProductId, newScheduleType, newDailyQuantity, newResetTime, selectedDays, newPreorderDate, newPreorderLimit]);

  const handleToggleSchedule = useCallback((scheduleId: string) => {
    setScheduleRules(prev => prev.map(s => 
      s.id === scheduleId ? { ...s, enabled: !s.enabled } : s
    ));
  }, []);

  const handleDeleteSchedule = useCallback((scheduleId: string) => {
    setScheduleRules(prev => prev.filter(s => s.id !== scheduleId));
  }, []);

  const handleRunSchedule = useCallback(async (scheduleId: string) => {
    setRunningSchedule(scheduleId);
    const schedule = scheduleRules.find(s => s.id === scheduleId);
    if (!schedule) return;
    
    try {
      const response = await fetch('/app/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'runSchedule', schedule })
      });
      
      const data = await response.json();
      setRunResult({ 
        success: data.success, 
        message: data.message || (data.success ? 'Inventory updated successfully' : 'Failed to update inventory')
      });
    } catch {
      setRunResult({ success: false, message: 'Network error - please try again' });
    }
    
    setRunningSchedule(null);
  }, [scheduleRules]);

  const renderScheduleCard = (schedule: ScheduleRule) => {
    const typeLabels: Record<ScheduleRule['scheduleType'], string> = {
      'daily_reset': 'Daily',
      'date_specific': 'One-time',
      'recurring': 'Weekly',
      'preorder': 'Pre-order'
    };

    const getScheduleDescription = () => {
      switch (schedule.scheduleType) {
        case 'daily_reset':
          return `${schedule.dailyQuantity} units at ${schedule.resetTime}`;
        case 'recurring': {
          const days = schedule.recurringDays?.map(d => d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)).join(', ');
          return `${schedule.dailyQuantity} units on ${days}`;
        }
        case 'preorder':
          return `Available ${schedule.preorderDate}, max ${schedule.preorderLimit}`;
        case 'date_specific':
          return `Available on ${schedule.preorderDate}`;
        default:
          return '';
      }
    };

    return (
      <Box 
        key={schedule.id} 
        padding="400" 
        background="bg-surface" 
        borderRadius="200"
        borderWidth="025"
        borderColor="border"
      >
        <InlineStack align="space-between" blockAlign="center">
          <InlineStack gap="400" blockAlign="center">
            <div style={{
              width: '8px',
              height: '40px',
              borderRadius: '4px',
              background: schedule.enabled ? '#008060' : '#8c8c8c'
            }} />
            <BlockStack gap="100">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text as="p" variant="bodyMd" fontWeight="semibold">{schedule.name}</Text>
                <Badge tone="info">{typeLabels[schedule.scheduleType]}</Badge>
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                {schedule.productTitle} • {getScheduleDescription()}
              </Text>
            </BlockStack>
          </InlineStack>
          
          <InlineStack gap="200">
            <Button
              size="slim"
              onClick={() => handleRunSchedule(schedule.id)}
              loading={runningSchedule === schedule.id}
              disabled={runningSchedule !== null}
            >
              {runningSchedule === schedule.id ? 'Updating...' : 'Update Now'}
            </Button>
            <Button
              size="slim"
              onClick={() => handleToggleSchedule(schedule.id)}
            >
              {schedule.enabled ? 'Pause' : 'Activate'}
            </Button>
            <Button
              size="slim"
              icon={DeleteIcon}
              tone="critical"
              onClick={() => handleDeleteSchedule(schedule.id)}
            />
          </InlineStack>
        </InlineStack>
      </Box>
    );
  };

  const renderCreateScheduleForm = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">New Inventory Schedule</Text>
          <Button variant="plain" onClick={() => setIsCreatingSchedule(false)}>Cancel</Button>
        </InlineStack>
        
        <Divider />
        
        {/* Step 1: Select Product */}
        <BlockStack gap="200">
          <Text as="p" variant="bodyMd" fontWeight="semibold">1. Select Product</Text>
          <TextField
            label=""
            value={newScheduleProduct}
            onChange={handleProductSearch}
            placeholder="Search products..."
            autoComplete="off"
            loading={searchingProducts}
          />
          {productSearchResults.length > 0 && !newScheduleProductId && (
            <Box 
              padding="200" 
              background="bg-surface-secondary" 
              borderRadius="200"
            >
              <BlockStack gap="100">
                {productSearchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '6px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#e8e8e8'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Text as="span" variant="bodySm">{product.title}</Text>
                    <Badge tone="info">{`${product.currentStock} in stock`}</Badge>
                  </button>
                ))}
              </BlockStack>
            </Box>
          )}
          {newScheduleProductId && (
            <Box padding="200" background="bg-surface-success" borderRadius="200">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                <Icon source={ProductIcon} tone="success" />
                <Text as="span" variant="bodySm" fontWeight="semibold">{newScheduleProduct}</Text>
                <Button size="slim" variant="plain" onClick={() => {
                  setNewScheduleProductId('');
                  setNewScheduleProduct('');
                }}>Change</Button>
              </div>
            </Box>
          )}
        </BlockStack>
        
        {/* Step 2: Choose Schedule Type */}
        {newScheduleProductId && (
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">2. Schedule Type</Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {[
                { value: 'daily_reset', label: 'Daily Reset', desc: 'Set quantity each day' },
                { value: 'recurring', label: 'Weekly Schedule', desc: 'Specific days only' },
                { value: 'date_specific', label: 'Specific Dates', desc: 'One-time availability' },
                { value: 'preorder', label: 'Pre-order', desc: 'Future availability' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setNewScheduleType(opt.value as ScheduleRule['scheduleType'])}
                  style={{
                    padding: '16px',
                    border: newScheduleType === opt.value ? '2px solid #008060' : '1px solid #e1e1e1',
                    borderRadius: '8px',
                    background: newScheduleType === opt.value ? '#f0fdf4' : 'white',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <Text as="p" variant="bodySm" fontWeight="semibold">{opt.label}</Text>
                  <Text as="p" variant="bodySm" tone="subdued">{opt.desc}</Text>
                </button>
              ))}
            </div>
          </BlockStack>
        )}
        
        {/* Step 3: Configure Details */}
        {newScheduleProductId && (
          <BlockStack gap="200">
            <Text as="p" variant="bodyMd" fontWeight="semibold">3. Configure</Text>
            
            <TextField
              label="Schedule Name"
              value={newScheduleName}
              onChange={setNewScheduleName}
              placeholder="e.g., Daily Fresh Bread"
              autoComplete="off"
            />
            
            {newScheduleType === 'daily_reset' && (
              <InlineStack gap="300">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Quantity"
                    type="number"
                    value={newDailyQuantity}
                    onChange={setNewDailyQuantity}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Reset Time"
                    type="time"
                    value={newResetTime}
                    onChange={setNewResetTime}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
            )}
            
            {newScheduleType === 'recurring' && (
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" fontWeight="semibold">Available Days</Text>
                  <InlineStack gap="200" wrap>
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => {
                      const dayValue = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'][i];
                      const isSelected = selectedDays.includes(dayValue);
                      return (
                        <button
                          key={day}
                          onClick={() => {
                            if (isSelected) {
                              setSelectedDays(selectedDays.filter(d => d !== dayValue));
                            } else {
                              setSelectedDays([...selectedDays, dayValue]);
                            }
                          }}
                          style={{
                            padding: '8px 16px',
                            border: 'none',
                            borderRadius: '6px',
                            background: isSelected ? '#008060' : '#e1e1e1',
                            color: isSelected ? 'white' : '#333',
                            cursor: 'pointer',
                            fontWeight: 500
                          }}
                        >
                          {day}
                        </button>
                      );
                    })}
                  </InlineStack>
                  <TextField
                    label="Daily Quantity on Active Days"
                    type="number"
                    value={newDailyQuantity}
                    onChange={setNewDailyQuantity}
                    autoComplete="off"
                  />
                </BlockStack>
              </Box>
            )}
            
            {newScheduleType === 'preorder' && (
              <InlineStack gap="300">
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Available Date"
                    type="date"
                    value={newPreorderDate}
                    onChange={setNewPreorderDate}
                    autoComplete="off"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <TextField
                    label="Max Pre-orders"
                    type="number"
                    value={newPreorderLimit}
                    onChange={setNewPreorderLimit}
                    autoComplete="off"
                  />
                </div>
              </InlineStack>
            )}

            {newScheduleType === 'date_specific' && (
              <TextField
                label="Available Date"
                type="date"
                value={newPreorderDate}
                onChange={setNewPreorderDate}
                helpText="Product will only be available on this date"
                autoComplete="off"
              />
            )}
          </BlockStack>
        )}
        
        <Divider />
        
        <InlineStack align="end" gap="200">
          <Button onClick={() => setIsCreatingSchedule(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateSchedule}
            loading={savingSchedule}
            disabled={!newScheduleName || !newScheduleProductId}
          >
            Create & Activate
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  const renderSchedulingTab = () => (
    <BlockStack gap="400">
      {!isCreatingSchedule && (
        <InlineStack align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text as="h3" variant="headingMd">Inventory Schedules</Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Automate inventory for perishables, events, and limited items
            </Text>
          </BlockStack>
          <Button 
            icon={PlusIcon} 
            variant="primary"
            onClick={() => setIsCreatingSchedule(true)}
          >
            New Schedule
          </Button>
        </InlineStack>
      )}
      
      {isCreatingSchedule && renderCreateScheduleForm()}
      
      {!isCreatingSchedule && scheduleRules.length === 0 ? (
        <Card>
          <Box padding="500">
            <BlockStack gap="400" inlineAlign="center">
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#f0f0f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Icon source={CalendarIcon} />
              </div>
              <BlockStack gap="200" inlineAlign="center">
                <Text as="h3" variant="headingMd" alignment="center">
                  No Schedules Yet
                </Text>
                <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                  Create schedules to automatically manage inventory based on time
                </Text>
              </BlockStack>
              
              <Box padding="300" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm">
                    <strong>Daily</strong> - Reset stock to a fixed amount each day
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Weekly</strong> - Available only on specific days
                  </Text>
                  <Text as="p" variant="bodySm">
                    <strong>Pre-order</strong> - Accept reservations for future dates
                  </Text>
                </BlockStack>
              </Box>
              
              <Button 
                variant="primary"
                onClick={() => setIsCreatingSchedule(true)}
              >
                Create Schedule
              </Button>
            </BlockStack>
          </Box>
        </Card>
      ) : !isCreatingSchedule && (
        <BlockStack gap="200">
          {scheduleRules.map(renderScheduleCard)}
        </BlockStack>
      )}
    </BlockStack>
  );

  return (
    <BlockStack gap="400">
      {/* Run Result Banner */}
      {runResult && (
        <Banner 
          tone={runResult.success ? 'success' : 'critical'}
          onDismiss={() => setRunResult(null)}
        >
          <Text as="p" variant="bodySm">{runResult.message}</Text>
        </Banner>
      )}
      
      {/* Trial Mode Banner */}
      {shouldApplyTrialRestrictions && (
        <Banner tone="warning">
          <Text as="p" variant="bodySm">
            Automation rules are limited during your trial. Subscribe to create unlimited rules.
          </Text>
        </Banner>
      )}
      
      {/* Header Card */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Text as="h2" variant="headingLg">Automation</Text>
                <Badge tone="success">Beta</Badge>
              </div>
              <Text as="p" variant="bodySm" tone="subdued">
                Set up rules to automatically organize and tag your products
              </Text>
            </BlockStack>
          </InlineStack>
          
          {!isCreating && renderSubTabs()}
          
          {isCreating ? (
            renderCreateRuleForm()
          ) : (
            <>
              {activeSubTab === 'collections' && renderCollectionsTab()}
              {activeSubTab === 'tags' && renderTagsTab()}
              {activeSubTab === 'scheduling' && renderSchedulingTab()}
            </>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}

export default Automation;
