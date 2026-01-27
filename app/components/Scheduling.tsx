import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Badge,
  Banner,
  EmptyState,
  Spinner,
  Modal,
  TextField,
  Select,
  Icon,
  Box,
  Autocomplete,
  Tag,
} from "@shopify/polaris";
import {
  DeleteIcon,
  PlayIcon,
  ProductIcon,
  CheckIcon,
  XIcon,
  SearchIcon,
} from "@shopify/polaris-icons";

interface ScheduledAction {
  id: string;
  productId: string;
  productTitle: string;
  actionType: string;
  scheduledFor: string;
  status: string;
  executedAt?: string;
  error?: string;
  createdAt: string;
}

interface Product {
  id: string;
  title: string;
  status: string;
}

interface SchedulingProps {
  products?: Product[];
  isTrialMode?: boolean;
}

export function Scheduling({ products: initialProducts = [], isTrialMode = false }: SchedulingProps) {
  const [scheduled, setScheduled] = useState<ScheduledAction[]>([]);
  const [history, setHistory] = useState<ScheduledAction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedProductTitle, setSelectedProductTitle] = useState<string>("");
  const [productSearchValue, setProductSearchValue] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("publish");
  const [scheduledDateTime, setScheduledDateTime] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  
  // Products state - fetch when modal opens
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // Fetch products when modal opens
  const fetchProducts = useCallback(async () => {
    setIsLoadingProducts(true);
    try {
      const response = await fetch('/app/api/products');
      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        const mappedProducts = data.products.map((p: any) => ({
          id: p.id,
          title: p.title,
          status: p.status || 'ACTIVE',
        }));
        setProducts(mappedProducts);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setIsLoadingProducts(false);
    }
  }, []);

  // Open modal and fetch products
  const handleOpenModal = useCallback(() => {
    setShowModal(true);
    fetchProducts();
  }, [fetchProducts]);

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!productSearchValue) return products;
    const searchLower = productSearchValue.toLowerCase();
    return products.filter(p => 
      p.title.toLowerCase().includes(searchLower)
    );
  }, [products, productSearchValue]);

  // Autocomplete options
  const productOptions = useMemo(() => {
    return filteredProducts.map(p => ({
      value: p.id,
      label: `${p.title} (${p.status})`,
    }));
  }, [filteredProducts]);

  const handleProductSelect = useCallback((selected: string[]) => {
    if (selected.length > 0) {
      const productId = selected[0];
      const product = products.find(p => p.id === productId);
      setSelectedProduct(productId);
      setSelectedProductTitle(product?.title || '');
      setProductSearchValue(product?.title || '');
    }
  }, [products]);

  const handleProductSearchChange = useCallback((value: string) => {
    setProductSearchValue(value);
    // If they clear the input, clear the selection
    if (!value) {
      setSelectedProduct("");
      setSelectedProductTitle("");
    }
  }, []);

  const handleClearProduct = useCallback(() => {
    setSelectedProduct("");
    setSelectedProductTitle("");
    setProductSearchValue("");
  }, []);

  // Load scheduled actions on mount
  useEffect(() => {
    loadScheduledActions();
  }, []);

  const loadScheduledActions = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/app/api/scheduling');
      const data = await response.json();
      if (data.success) {
        setScheduled(data.scheduled || []);
        setHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to load scheduled actions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!selectedProduct || !scheduledDateTime) return;
    
    setIsCreating(true);
    try {
      const response = await fetch('/app/api/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          productId: selectedProduct,
          productTitle: selectedProductTitle || 'Unknown',
          actionType: selectedAction,
          scheduledFor: new Date(scheduledDateTime).toISOString(),
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setShowModal(false);
        setSelectedProduct("");
        setSelectedProductTitle("");
        setProductSearchValue("");
        setSelectedAction("publish");
        setScheduledDateTime("");
        loadScheduledActions();
      } else {
        alert(data.error || 'Failed to create schedule');
      }
    } catch (error) {
      console.error('Failed to create schedule:', error);
      alert('Failed to create schedule');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCancelSchedule = async (id: string) => {
    try {
      const response = await fetch('/app/api/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', id }),
      });
      
      const data = await response.json();
      if (data.success) {
        loadScheduledActions();
      }
    } catch (error) {
      console.error('Failed to cancel schedule:', error);
    }
  };

  const handleExecuteNow = async (id: string) => {
    try {
      const response = await fetch('/app/api/scheduling', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute-now', id }),
      });
      
      const data = await response.json();
      if (data.success) {
        loadScheduledActions();
      } else {
        alert(data.error || 'Failed to execute action');
      }
    } catch (error) {
      console.error('Failed to execute action:', error);
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType) {
      case 'publish':
        return <Badge tone="success">Publish</Badge>;
      case 'unpublish':
        return <Badge tone="warning">Unpublish</Badge>;
      case 'draft':
        return <Badge tone="info">Set Draft</Badge>;
      case 'archive':
        return <Badge tone="critical">Archive</Badge>;
      case 'active':
        return <Badge tone="success">Set Active</Badge>;
      default:
        return <Badge>{actionType}</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge tone="attention">⏱️ Pending</Badge>;
      case 'executing':
        return <Badge tone="info">⚙️ Executing</Badge>;
      case 'completed':
        return <Badge tone="success">✓ Completed</Badge>;
      case 'failed':
        return <Badge tone="critical">✗ Failed</Badge>;
      case 'cancelled':
        return <Badge>Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeUntil = (dateString: string) => {
    const diff = new Date(dateString).getTime() - Date.now();
    if (diff <= 0) return 'Now';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `in ${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  // Trial limit: 2 scheduled actions
  const TRIAL_SCHEDULE_LIMIT = 2;
  const canCreateMore = !isTrialMode || scheduled.length < TRIAL_SCHEDULE_LIMIT;

  // Get min datetime for scheduler (now + 1 minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  if (isLoading) {
    return (
      <Card>
        <BlockStack gap="400" inlineAlign="center">
          <Spinner size="large" />
          <Text as="p" variant="bodySm" tone="subdued">Loading scheduled actions...</Text>
        </BlockStack>
      </Card>
    );
  }

  return (
    <BlockStack gap="400">
      {/* Trial Banner */}
      {isTrialMode && (
        <Banner tone="warning">
          <Text as="p" variant="bodySm">
            ⏱️ 3-day free trial • {TRIAL_SCHEDULE_LIMIT - scheduled.length} scheduled actions remaining
          </Text>
        </Banner>
      )}

      {/* Header */}
      <Card>
        <BlockStack gap="400">
          <InlineStack align="space-between" blockAlign="center">
            <BlockStack gap="100">
              <Text as="h2" variant="headingMd">
                📅 Product Scheduling
              </Text>
              <Text as="p" variant="bodySm" tone="subdued">
                Schedule products to publish or unpublish at specific times
              </Text>
            </BlockStack>
            <Button
              variant="primary"
              onClick={handleOpenModal}
              disabled={!canCreateMore}
            >
              + Schedule Action
            </Button>
          </InlineStack>
        </BlockStack>
      </Card>

      {/* Scheduled Actions */}
      <Card>
        <BlockStack gap="400">
          <Text as="h3" variant="headingSm">
            Upcoming Scheduled Actions ({scheduled.length})
          </Text>
          
          {scheduled.length === 0 ? (
            <EmptyState
              heading="No scheduled actions"
              image=""
            >
              <Text as="p" variant="bodySm" tone="subdued">
                Schedule your first product action to automatically publish or unpublish products.
              </Text>
            </EmptyState>
          ) : (
            <BlockStack gap="300">
              {scheduled.map((action) => (
                <Box
                  key={action.id}
                  padding="400"
                  background="bg-surface-secondary"
                  borderRadius="200"
                >
                  <InlineStack align="space-between" blockAlign="center">
                    <InlineStack gap="400" blockAlign="center">
                      <Icon source={ProductIcon} tone="subdued" />
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">
                          {action.productTitle}
                        </Text>
                        <InlineStack gap="200">
                          {getActionBadge(action.actionType)}
                          {getStatusBadge(action.status)}
                        </InlineStack>
                      </BlockStack>
                    </InlineStack>
                    
                    <InlineStack gap="400" blockAlign="center">
                      <BlockStack gap="100" inlineAlign="end">
                        <Text as="p" variant="bodySm" fontWeight="semibold">
                          {formatDateTime(action.scheduledFor)}
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {getTimeUntil(action.scheduledFor)}
                        </Text>
                      </BlockStack>
                      
                      <InlineStack gap="200">
                        <Button
                          size="slim"
                          icon={PlayIcon}
                          onClick={() => handleExecuteNow(action.id)}
                          disabled={action.status !== 'pending'}
                        >
                          Run Now
                        </Button>
                        <Button
                          size="slim"
                          icon={DeleteIcon}
                          tone="critical"
                          onClick={() => handleCancelSchedule(action.id)}
                          disabled={action.status !== 'pending'}
                        >
                          Cancel
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          )}
        </BlockStack>
      </Card>

      {/* History */}
      {history.length > 0 && (
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingSm">
              Recent History
            </Text>
            
            <BlockStack gap="200">
              {history.slice(0, 5).map((action) => (
                <InlineStack key={action.id} align="space-between" blockAlign="center">
                  <InlineStack gap="300" blockAlign="center">
                    <Icon 
                      source={action.status === 'completed' ? CheckIcon : XIcon} 
                      tone={action.status === 'completed' ? 'success' : 'critical'} 
                    />
                    <Text as="p" variant="bodySm">
                      {action.productTitle}
                    </Text>
                    {getActionBadge(action.actionType)}
                  </InlineStack>
                  <InlineStack gap="200" blockAlign="center">
                    {getStatusBadge(action.status)}
                    <Text as="p" variant="bodySm" tone="subdued">
                      {action.executedAt ? formatDateTime(action.executedAt) : '-'}
                    </Text>
                  </InlineStack>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>
      )}

      {/* Create Schedule Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Schedule Product Action"
        primaryAction={{
          content: isCreating ? 'Scheduling...' : 'Schedule',
          onAction: handleCreateSchedule,
          disabled: !selectedProduct || !scheduledDateTime || isCreating,
          loading: isCreating,
        }}
        secondaryActions={[
          {
            content: 'Cancel',
            onAction: () => setShowModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {/* Product Search/Select */}
            <BlockStack gap="200">
              <Text as="span" variant="bodyMd">Select Product</Text>
              {selectedProduct ? (
                <InlineStack gap="200" blockAlign="center">
                  <Tag onRemove={handleClearProduct}>
                    {selectedProductTitle}
                  </Tag>
                </InlineStack>
              ) : isLoadingProducts ? (
                <InlineStack gap="200" blockAlign="center">
                  <Spinner size="small" />
                  <Text as="p" variant="bodySm" tone="subdued">Loading products...</Text>
                </InlineStack>
              ) : (
                <Autocomplete
                  options={productOptions}
                  selected={selectedProduct ? [selectedProduct] : []}
                  onSelect={handleProductSelect}
                  textField={
                    <Autocomplete.TextField
                      onChange={handleProductSearchChange}
                      value={productSearchValue}
                      label="Search products"
                      labelHidden
                      prefix={<Icon source={SearchIcon} tone="base" />}
                      placeholder={`Search ${products.length} products...`}
                      autoComplete="off"
                    />
                  }
                  listTitle={`Products (${products.length})`}
                  emptyState={
                    <BlockStack inlineAlign="center">
                      <Text as="p" variant="bodySm" tone="subdued">
                        {products.length === 0 ? 'No products available' : productSearchValue ? 'No products found' : 'Start typing to search products'}
                      </Text>
                    </BlockStack>
                  }
                />
              )}
              <Text as="p" variant="bodySm" tone="subdued">
                {products.length > 0 ? `${products.length} products available` : 'Type to search and select a product from the list'}
              </Text>
            </BlockStack>
            
            <Select
              label="Action"
              options={[
                { label: '🟢 Publish to Online Store', value: 'publish' },
                { label: '🔴 Unpublish from Online Store', value: 'unpublish' },
                { label: '📝 Set as Draft', value: 'draft' },
                { label: '📦 Archive Product', value: 'archive' },
                { label: '✅ Set as Active', value: 'active' },
              ]}
              value={selectedAction}
              onChange={setSelectedAction}
              helpText={
                selectedAction === 'publish' ? 'Product will become visible on your store' :
                selectedAction === 'unpublish' ? 'Product will be hidden from your store' :
                selectedAction === 'draft' ? 'Product will be set to draft status' :
                selectedAction === 'archive' ? 'Product will be archived' :
                'Product will be set to active status'
              }
            />
            
            <TextField
              label="Scheduled Date & Time"
              type="datetime-local"
              value={scheduledDateTime}
              onChange={setScheduledDateTime}
              min={getMinDateTime()}
              helpText="Select when this action should be executed"
              autoComplete="off"
            />
            
            {selectedProduct && scheduledDateTime && (
              <Banner tone="info">
                <Text as="p" variant="bodySm">
                  <strong>{selectedProductTitle}</strong> will be{' '}
                  <strong>{selectedAction}ed</strong> on{' '}
                  <strong>{formatDateTime(scheduledDateTime)}</strong>
                </Text>
              </Banner>
            )}
          </BlockStack>
        </Modal.Section>
      </Modal>
    </BlockStack>
  );
}
