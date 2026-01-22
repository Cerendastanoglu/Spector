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
  ChoiceList,
} from "@shopify/polaris";
import {
  HashtagIcon,
  CollectionIcon,
  CalendarIcon,
  PlusIcon,
  DeleteIcon,
  PlayIcon,
  PageIcon,
  EditIcon,
  ClockIcon,
  RefreshIcon,
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
  const [runningRule, setRunningRule] = useState<string | null>(null);

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

  const handleToggleRule = useCallback((ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
    ));
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    setRules(prev => prev.filter(rule => rule.id !== ruleId));
  }, []);

  const [runResult, setRunResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleRunRule = useCallback(async (ruleId: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (!rule) return;
    
    setRunningRule(ruleId);
    setRunResult(null);
    
    try {
      const response = await fetch('/app/api/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', rule })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setRules(prev => prev.map(r => 
          r.id === ruleId ? { ...r, lastRun: 'Just now', matchCount: data.matchCount || 0 } : r
        ));
        setRunResult({ success: true, message: data.message || `Updated ${data.updatedCount || 0} products` });
      } else {
        setRunResult({ success: false, message: data.error || 'Failed to run rule' });
      }
    } catch (error) {
      setRunResult({ success: false, message: 'Network error - please try again' });
    }
    
    setRunningRule(null);
  }, [rules]);

  const handleCreateRule = useCallback(async () => {
    if (!newRuleName || !newConditionValue || !newActionValue) return;
    
    setSavingRule(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
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
      matchCount: 0
    };
    
    setRules(prev => [...prev, newRule]);
    setIsCreating(false);
    setNewRuleName('');
    setNewConditionValue('');
    setNewActionValue('');
    setSavingRule(false);
  }, [newRuleName, newRuleType, newConditionField, newConditionOperator, newConditionValue, newActionValue]);

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
        { id: 'collections', label: 'Collections', icon: CollectionIcon },
        { id: 'tags', label: 'Tags', icon: HashtagIcon },
        { id: 'scheduling', label: 'Scheduling', icon: CalendarIcon }
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveSubTab(tab.id as typeof activeSubTab)}
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
            color: activeSubTab === tab.id ? '#2c2c2c' : '#6d6d6d',
            fontWeight: activeSubTab === tab.id ? '600' : '500',
            fontSize: '13px',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
            <Icon source={tab.icon} />
            <span>{tab.label}</span>
          </div>
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
                <Badge tone={rule.enabled ? 'success' : 'new'}>
                  {rule.enabled ? 'Active' : 'Paused'}
                </Badge>
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
            icon={runningRule === rule.id ? undefined : PlayIcon}
            onClick={() => handleRunRule(rule.id)}
            loading={runningRule === rule.id}
            disabled={!rule.enabled || runningRule !== null}
          >
            {runningRule === rule.id ? 'Running...' : 'Run Now'}
          </Button>
          <Button
            size="slim"
            icon={rule.enabled ? PageIcon : PlayIcon}
            onClick={() => handleToggleRule(rule.id)}
          >
            {rule.enabled ? 'Pause' : 'Enable'}
          </Button>
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
          <Button variant="plain" onClick={() => setIsCreating(false)}>Cancel</Button>
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
          <InlineStack gap="200" wrap>
            <div style={{ minWidth: '150px' }}>
              <Select
                label="Field"
                labelHidden
                options={conditionFieldOptions}
                value={newConditionField}
                onChange={setNewConditionField}
              />
            </div>
            <div style={{ minWidth: '150px' }}>
              <Select
                label="Operator"
                labelHidden
                options={conditionOperatorOptions}
                value={newConditionOperator}
                onChange={setNewConditionOperator}
              />
            </div>
            <div style={{ minWidth: '150px', flex: 1 }}>
              <TextField
                label="Value"
                labelHidden
                value={newConditionValue}
                onChange={setNewConditionValue}
                placeholder="Enter value..."
                autoComplete="off"
              />
            </div>
          </InlineStack>
        </BlockStack>
        
        <TextField
          label={newRuleType === 'tag' ? 'Tag to Apply' : 'Collection Name'}
          value={newActionValue}
          onChange={setNewActionValue}
          placeholder={newRuleType === 'tag' ? 'e.g., Sale, New Arrival' : 'e.g., Low Stock Items'}
          autoComplete="off"
        />
        
        <InlineStack align="end" gap="200">
          <Button onClick={() => setIsCreating(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateRule}
            loading={savingRule}
            disabled={!newRuleName || !newConditionValue || !newActionValue}
          >
            Create Rule
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
      'daily_reset': 'Daily Reset',
      'date_specific': 'Date Specific',
      'recurring': 'Recurring',
      'preorder': 'Pre-order'
    };
    
    const typeColors: Record<ScheduleRule['scheduleType'], { bg: string; color: string }> = {
      'daily_reset': { bg: '#E3F4EE', color: '#008060' },
      'date_specific': { bg: '#EBF0FF', color: '#5C6AC4' },
      'recurring': { bg: '#FFF8E6', color: '#B98900' },
      'preorder': { bg: '#FFF4F4', color: '#D82C0D' }
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
        <BlockStack gap="300">
          <InlineStack align="space-between" blockAlign="start">
            <InlineStack gap="300" blockAlign="center">
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: typeColors[schedule.scheduleType].bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: typeColors[schedule.scheduleType].color
              }}>
                <Icon source={schedule.scheduleType === 'daily_reset' ? RefreshIcon : CalendarIcon} />
              </div>
              <BlockStack gap="050">
                <Text as="p" variant="bodyMd" fontWeight="semibold">{schedule.name}</Text>
                <InlineStack gap="200">
                  <Badge tone={schedule.enabled ? 'success' : 'new'}>
                    {schedule.enabled ? 'Active' : 'Paused'}
                  </Badge>
                  <Badge>{typeLabels[schedule.scheduleType]}</Badge>
                </InlineStack>
              </BlockStack>
            </InlineStack>
          </InlineStack>
          
          {/* Schedule details */}
          <Box padding="200" background="bg-surface-secondary" borderRadius="100">
            <InlineStack gap="400" wrap>
              <InlineStack gap="100">
                <Icon source={ProductIcon} tone="subdued" />
                <Text as="span" variant="bodySm">{schedule.productTitle}</Text>
              </InlineStack>
              {schedule.scheduleType === 'daily_reset' && (
                <>
                  <Text as="span" variant="bodySm">
                    <strong>{schedule.dailyQuantity}</strong> units/day
                  </Text>
                  <Text as="span" variant="bodySm">
                    Resets at <strong>{schedule.resetTime}</strong>
                  </Text>
                </>
              )}
              {schedule.scheduleType === 'recurring' && (
                <Text as="span" variant="bodySm">
                  {schedule.recurringDays?.map(d => d.charAt(0).toUpperCase() + d.slice(1, 3)).join(', ')}
                </Text>
              )}
              {schedule.scheduleType === 'preorder' && (
                <>
                  <Text as="span" variant="bodySm">
                    Available: <strong>{schedule.preorderDate}</strong>
                  </Text>
                  <Text as="span" variant="bodySm">
                    Limit: <strong>{schedule.preorderLimit}</strong>
                  </Text>
                </>
              )}
            </InlineStack>
          </Box>
          
          {/* Actions */}
          <InlineStack align="end" gap="200">
            <Button
              size="slim"
              icon={runningSchedule === schedule.id ? undefined : PlayIcon}
              onClick={() => handleRunSchedule(schedule.id)}
              loading={runningSchedule === schedule.id}
              disabled={!schedule.enabled || runningSchedule !== null}
            >
              {runningSchedule === schedule.id ? 'Running...' : 'Run Now'}
            </Button>
            <Button
              size="slim"
              icon={schedule.enabled ? PageIcon : PlayIcon}
              onClick={() => handleToggleSchedule(schedule.id)}
            >
              {schedule.enabled ? 'Pause' : 'Enable'}
            </Button>
            <Button
              size="slim"
              icon={DeleteIcon}
              tone="critical"
              onClick={() => handleDeleteSchedule(schedule.id)}
            >
              Delete
            </Button>
          </InlineStack>
        </BlockStack>
      </Box>
    );
  };

  const renderCreateScheduleForm = () => (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h3" variant="headingMd">Create Inventory Schedule</Text>
          <Button variant="plain" onClick={() => setIsCreatingSchedule(false)}>Cancel</Button>
        </InlineStack>
        
        <Divider />
        
        <TextField
          label="Schedule Name"
          value={newScheduleName}
          onChange={setNewScheduleName}
          placeholder="e.g., Fresh Bread Daily Limit"
          autoComplete="off"
        />
        
        <BlockStack gap="100">
          <TextField
            label="Product"
            value={newScheduleProduct}
            onChange={handleProductSearch}
            placeholder="Start typing to search products..."
            autoComplete="off"
            helpText={newScheduleProductId ? `Selected: ${newScheduleProduct}` : "Search and select a product"}
            loading={searchingProducts}
          />
          {productSearchResults.length > 0 && !newScheduleProductId && (
            <Box 
              padding="200" 
              background="bg-surface" 
              borderRadius="100"
              borderWidth="025"
              borderColor="border"
            >
              <BlockStack gap="100">
                {productSearchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => handleSelectProduct(product)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      cursor: 'pointer',
                      borderRadius: '4px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f6f6f7'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Text as="span" variant="bodySm">{product.title}</Text>
                    <Badge tone="info">{`${product.currentStock} in stock`}</Badge>
                  </button>
                ))}
              </BlockStack>
            </Box>
          )}
        </BlockStack>
        
        <Select
          label="Schedule Type"
          options={[
            { label: '🔄 Daily Reset - Reset inventory to fixed quantity each day', value: 'daily_reset' },
            { label: '📅 Date Specific - Available only on specific dates', value: 'date_specific' },
            { label: '📆 Recurring - Available on specific days of the week', value: 'recurring' },
            { label: '🎯 Pre-order - Accept orders for future availability date', value: 'preorder' }
          ]}
          value={newScheduleType}
          onChange={(v) => setNewScheduleType(v as ScheduleRule['scheduleType'])}
        />
        
        {newScheduleType === 'daily_reset' && (
          <BlockStack gap="300">
            <TextField
              label="Daily Quantity"
              type="number"
              value={newDailyQuantity}
              onChange={setNewDailyQuantity}
              helpText="Inventory will reset to this number each day"
              autoComplete="off"
            />
            <TextField
              label="Reset Time"
              type="time"
              value={newResetTime}
              onChange={setNewResetTime}
              helpText="When should inventory reset? (in your store's timezone)"
              autoComplete="off"
            />
          </BlockStack>
        )}
        
        {newScheduleType === 'recurring' && (
          <ChoiceList
            title="Available Days"
            allowMultiple
            choices={[
              { label: 'Monday', value: 'monday' },
              { label: 'Tuesday', value: 'tuesday' },
              { label: 'Wednesday', value: 'wednesday' },
              { label: 'Thursday', value: 'thursday' },
              { label: 'Friday', value: 'friday' },
              { label: 'Saturday', value: 'saturday' },
              { label: 'Sunday', value: 'sunday' },
            ]}
            selected={selectedDays}
            onChange={setSelectedDays}
          />
        )}
        
        {newScheduleType === 'preorder' && (
          <BlockStack gap="300">
            <TextField
              label="Availability Date"
              type="date"
              value={newPreorderDate}
              onChange={setNewPreorderDate}
              helpText="When will this product be available?"
              autoComplete="off"
            />
            <TextField
              label="Pre-order Limit"
              type="number"
              value={newPreorderLimit}
              onChange={setNewPreorderLimit}
              helpText="Maximum pre-orders to accept"
              autoComplete="off"
            />
          </BlockStack>
        )}
        
        <InlineStack align="end" gap="200">
          <Button onClick={() => setIsCreatingSchedule(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleCreateSchedule}
            loading={savingSchedule}
            disabled={!newScheduleName || !newScheduleProduct}
          >
            Create Schedule
          </Button>
        </InlineStack>
      </BlockStack>
    </Card>
  );

  const renderSchedulingTab = () => (
    <BlockStack gap="400">
      <InlineStack align="space-between" blockAlign="center">
        <BlockStack gap="100">
          <Text as="h3" variant="headingMd">Date-Based Inventory</Text>
          <Text as="p" variant="bodySm" tone="subdued">
            Perfect for perishables, events, and pre-orders
          </Text>
        </BlockStack>
        <Button 
          icon={PlusIcon} 
          variant="primary"
          onClick={() => setIsCreatingSchedule(true)}
        >
          Create Schedule
        </Button>
      </InlineStack>
      
      {isCreatingSchedule && renderCreateScheduleForm()}
      
      {!isCreatingSchedule && scheduleRules.length === 0 ? (
        <Card>
          <Box padding="600">
            <BlockStack gap="400" inlineAlign="center">
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: '#E3F4EE',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#008060'
              }}>
                <Icon source={CalendarIcon} />
              </div>
              <Text as="h3" variant="headingMd" alignment="center">
                Date-Based Inventory Management
              </Text>
              <Text as="p" variant="bodySm" tone="subdued" alignment="center">
                Automate inventory for perishable goods, event tickets, or limited daily offerings.
              </Text>
              
              <Box padding="400" background="bg-surface-secondary" borderRadius="200">
                <BlockStack gap="300">
                  <Text as="p" variant="bodySm" fontWeight="semibold">What you can do:</Text>
                  <BlockStack gap="200">
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#E3F4EE', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008060' }}>
                        <Icon source={RefreshIcon} />
                      </div>
                      <Text as="span" variant="bodySm"><strong>Daily Reset</strong> - "10 fresh loaves available each morning"</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#EBF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5C6AC4' }}>
                        <Icon source={CalendarIcon} />
                      </div>
                      <Text as="span" variant="bodySm"><strong>Date Specific</strong> - "Only available on Dec 25th"</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FFF8E6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B98900' }}>
                        <Icon source={ClockIcon} />
                      </div>
                      <Text as="span" variant="bodySm"><strong>Recurring</strong> - "Available Mon-Fri only"</Text>
                    </InlineStack>
                    <InlineStack gap="200" blockAlign="center">
                      <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#FFF4F4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#D82C0D' }}>
                        <Icon source={ProductIcon} />
                      </div>
                      <Text as="span" variant="bodySm"><strong>Pre-order</strong> - "Reserve for Jan 15th pickup"</Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Box>
              
              <Button 
                variant="primary"
                onClick={() => setIsCreatingSchedule(true)}
              >
                Create Your First Schedule
              </Button>
            </BlockStack>
          </Box>
        </Card>
      ) : !isCreatingSchedule && (
        <BlockStack gap="300">
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
              <InlineStack gap="100" blockAlign="center">
                <Text as="h2" variant="headingLg">Automation</Text>
                <Badge tone="success">Beta</Badge>
              </InlineStack>
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
