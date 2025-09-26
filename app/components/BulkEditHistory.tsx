import React, { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Card,
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Collapsible,
  Box,
  Spinner,
  EmptyState,
  Icon,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "@shopify/polaris-icons";

interface BulkEditItem {
  id: string;
  productTitle: string;
  variantTitle?: string;
  fieldChanged: string;
  oldValue?: string;
  newValue?: string;
  changeType: string;
}

interface BulkEditBatch {
  id: string;
  operationType: string;
  operationName: string;
  description?: string;
  totalProducts: number;
  totalVariants: number;
  createdAt: string;
  canRevert: boolean;
  isReverted: boolean;
  revertedAt?: string;
  items: BulkEditItem[];
}

interface BulkEditHistoryProps {
  isVisible: boolean;
}

export function BulkEditHistory({ isVisible }: BulkEditHistoryProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState<BulkEditBatch | null>(null);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [revertingBatchId, setRevertingBatchId] = useState<string | null>(null);
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  
  const historyFetcher = useFetcher<{
    success: boolean;
    batches?: BulkEditBatch[];
    error?: string;
  }>();
  
  const revertFetcher = useFetcher<{
    success: boolean;
    revertedCount?: number;
    errors?: string[];
    error?: string;
  }>();

  // Load history when component becomes visible or when expanded
  useEffect(() => {
    if (isVisible && expanded && !historyFetcher.data && historyFetcher.state === 'idle') {
      historyFetcher.load('/app/api/bulk-history');
    }
  }, [isVisible, expanded, historyFetcher]);

  // Handle revert completion
  useEffect(() => {
    if (revertFetcher.data && revertFetcher.state === 'idle') {
      if (revertFetcher.data.success) {
        setShowRevertModal(false);
        setRevertingBatchId(null);
        setSelectedBatch(null);
        // Reload history to show updated status
        historyFetcher.load('/app/api/bulk-history');
      }
    }
  }, [revertFetcher.data, revertFetcher.state, historyFetcher]);

  const handleRevert = (batch: BulkEditBatch) => {
    setSelectedBatch(batch);
    setShowRevertModal(true);
  };

  const confirmRevert = () => {
    if (selectedBatch) {
      setRevertingBatchId(selectedBatch.id);
      
      const formData = new FormData();
      formData.append('action', 'revert');
      formData.append('batchId', selectedBatch.id);
      
      revertFetcher.submit(formData, {
        method: 'POST',
        action: '/app/api/bulk-history',
      });
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };



  const getStatusBadge = (batch: BulkEditBatch) => {
    if (batch.isReverted) {
      return <Badge tone="critical">Reverted</Badge>;
    }
    if (!batch.canRevert) {
      return <Badge tone="attention">Cannot Revert</Badge>;
    }
    return <Badge tone="success">Active</Badge>;
  };

  const renderBatchDetails = (batch: BulkEditBatch) => {
    if (!batch.items || batch.items.length === 0) {
      return <Text as="p">No details available</Text>;
    }

    // Group items by product for better display
    const itemsByProduct = new Map<string, BulkEditItem[]>();
    for (const item of batch.items) {
      if (!itemsByProduct.has(item.productTitle)) {
        itemsByProduct.set(item.productTitle, []);
      }
      const items = itemsByProduct.get(item.productTitle);
      if (items) {
        items.push(item);
      }
    }

    return (
      <BlockStack gap="300">
        {Array.from(itemsByProduct.entries()).slice(0, 5).map(([productTitle, items]) => (
          <Card key={productTitle} padding="300">
            <BlockStack gap="200">
              <Text variant="headingXs" as="h4">{productTitle}</Text>
              {items.map((item) => (
                <Box key={item.id} paddingInlineStart="400">
                  <InlineStack gap="200" align="space-between">
                    <Text variant="bodySm" as="p">
                      {item.variantTitle && `${item.variantTitle} - `}
                      {item.fieldChanged}: 
                      {item.oldValue && <Text as="span" tone="subdued"> {item.oldValue}</Text>}
                      {' → '}
                      {item.newValue && <Text as="span" fontWeight="semibold">{item.newValue}</Text>}
                    </Text>
                    <Badge size="small" tone="info">{item.changeType}</Badge>
                  </InlineStack>
                </Box>
              ))}
            </BlockStack>
          </Card>
        ))}
        {itemsByProduct.size > 5 && (
          <Text tone="subdued" alignment="center" as="p">
            ...and {itemsByProduct.size - 5} more products
          </Text>
        )}
      </BlockStack>
    );
  };

  // Mock data for demonstration
  const mockBatches: BulkEditBatch[] = [
    {
      id: "1",
      operationType: "pricing",
      operationName: "Price Update - Winter Sale",
      description: "Applied 15% discount to seasonal products for holiday promotion",
      totalProducts: 24,
      totalVariants: 48,
      createdAt: "2025-09-26T13:30:00Z",
      canRevert: true,
      isReverted: false,
      items: []
    },
    {
      id: "2", 
      operationType: "tags",
      operationName: "Holiday Tags Batch Update",
      description: "Added 'holiday-2025' and 'gift-item' tags to seasonal products",
      totalProducts: 18,
      totalVariants: 18,
      createdAt: "2025-09-25T14:15:00Z",
      canRevert: true,
      isReverted: false,
      items: []
    },
    {
      id: "3",
      operationType: "content",
      operationName: "SEO Meta Refresh - Q4",
      description: "Updated product titles and descriptions for better search visibility",
      totalProducts: 32,
      totalVariants: 0,
      createdAt: "2025-09-24T09:45:00Z",
      canRevert: true,
      isReverted: true,
      revertedAt: "2025-09-24T16:20:00Z",
      items: []
    },
    {
      id: "4",
      operationType: "inventory",
      operationName: "Warehouse Sync - Sept",
      description: "Adjusted inventory levels based on physical warehouse count",
      totalProducts: 56,
      totalVariants: 112,
      createdAt: "2025-09-23T11:20:00Z",
      canRevert: false,
      isReverted: false,
      items: []
    },
    {
      id: "5",
      operationType: "collections",
      operationName: "Fall Collection Launch",
      description: "Added products to 'Fall 2025' and 'Autumn Essentials' collections",
      totalProducts: 28,
      totalVariants: 0,
      createdAt: "2025-09-22T16:10:00Z",
      canRevert: true,
      isReverted: false,
      items: []
    },
    {
      id: "6",
      operationType: "pricing",
      operationName: "Cost Adjustment - Q4 Update",
      description: "Applied 5% price increase across catalog due to supplier cost changes",
      totalProducts: 42,
      totalVariants: 84,
      createdAt: "2025-09-21T08:30:00Z",
      canRevert: true,
      isReverted: false,
      items: []
    }
  ];

  const renderHistory = () => {
    if (historyFetcher.state === 'loading') {
      return (
        <Box padding="300">
          <InlineStack align="center" gap="200">
            <Spinner size="small" />
            <Text as="p" variant="bodySm">Loading history...</Text>
          </InlineStack>
        </Box>
      );
    }

    // Use mock data for now, fallback to API data if available
    const displayLimit = showAllBatches ? mockBatches.length : 5;
    const batches = mockBatches.slice(0, displayLimit);
    const hasMoreBatches = mockBatches.length > 5;

    if (batches.length === 0) {
      return (
        <Box padding="300">
          <EmptyState
            heading="No bulk edits yet"
            image=""
          >
            <Text as="p">Complete your first bulk operation above and it will appear here with full revert capability.</Text>
          </EmptyState>
        </Box>
      );
    }

    const toggleDetails = (batchId: string) => {
      const newExpanded = new Set(expandedDetails);
      if (newExpanded.has(batchId)) {
        newExpanded.delete(batchId);
      } else {
        newExpanded.add(batchId);
      }
      setExpandedDetails(newExpanded);
    };

    return (
      <BlockStack gap="100">
        {batches.map((batch) => (
          <div key={batch.id}>
            {/* Enhanced List Item */}
            <Box 
              paddingBlock="200" 
              paddingInline="300"
            >
              <InlineStack align="space-between" blockAlign="center">
                {/* Action Buttons on Left */}
                <InlineStack gap="200" align="center">
                  <Button
                    variant="secondary"
                    size="micro"
                    onClick={() => toggleDetails(batch.id)}
                  >
                    {expandedDetails.has(batch.id) ? 'Hide' : 'Details'}
                  </Button>
                  {batch.canRevert && !batch.isReverted && (
                    <Button
                      size="micro"
                      variant="secondary"
                      tone="critical"
                      loading={revertingBatchId === batch.id}
                      disabled={revertingBatchId !== null}
                      onClick={() => handleRevert(batch)}
                    >
                      Revert
                    </Button>
                  )}
                </InlineStack>
                
                {/* Content on Right */}
                <InlineStack gap="300" align="center" wrap={false}>
                  <Text variant="bodyMd" as="span" fontWeight="semibold">
                    {batch.operationName}
                  </Text>
                  <Text variant="bodySm" tone="subdued" as="span">
                    {formatDate(batch.createdAt)}
                  </Text>
                  {getStatusBadge(batch)}
                </InlineStack>
              </InlineStack>
            </Box>

            {/* Minimal Details */}
            <Collapsible
              open={expandedDetails.has(batch.id)}
              id={`batch-details-${batch.id}`}
              transition={{ duration: '150ms', timingFunction: 'ease-out' }}
            >
              <Box 
                paddingInline="300" 
                paddingBlock="200"
                background="bg-surface-secondary"
              >
                <BlockStack gap="200">
                  <InlineStack gap="300">
                    <Text variant="bodySm" as="span" tone="subdued">
                      {batch.totalProducts} products
                    </Text>
                    {batch.totalVariants > 0 && (
                      <Text variant="bodySm" as="span" tone="subdued">
                        • {batch.totalVariants} variants
                      </Text>
                    )}
                  </InlineStack>

                  {batch.description && (
                    <Text variant="bodySm" tone="subdued" as="p">
                      {batch.description}
                    </Text>
                  )}

                  {batch.isReverted && batch.revertedAt && (
                    <Text variant="bodySm" tone="critical" as="p">
                      ⚠️ Reverted on {formatDate(batch.revertedAt)}
                    </Text>
                  )}
                </BlockStack>
              </Box>
            </Collapsible>
          </div>
        ))}
        {hasMoreBatches && !showAllBatches && (
          <Box paddingBlock="200" paddingInline="200">
            <Button
              variant="plain"
              size="micro"
              onClick={() => setShowAllBatches(true)}
            >
              Show {(mockBatches.length - 5).toString()} more...
            </Button>
          </Box>
        )}
      </BlockStack>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Enhanced Header */}
      <Box paddingBlock="200" paddingInline="200">
        <InlineStack gap="200" align="center">
          <Button
            variant="plain"
            size="large"
            icon={expanded ? ChevronUpIcon : ChevronDownIcon}
            onClick={() => setExpanded(!expanded)}
          >
            Recent Activity
          </Button>
          <Badge tone="info" size="small">
            {mockBatches.length.toString()}
          </Badge>
        </InlineStack>
      </Box>

      <Collapsible
        open={expanded}
        id="bulk-edit-history"
        transition={{ duration: '150ms', timingFunction: 'ease-out' }}
      >
        <Box paddingInline="200" paddingBlockStart="100" paddingBlockEnd="200">
          {renderHistory()}
        </Box>
      </Collapsible>

      {/* Revert Confirmation Modal */}
      {showRevertModal && selectedBatch && (
        <Modal
          open={showRevertModal}
          onClose={() => setShowRevertModal(false)}
          title="Confirm Revert"
          primaryAction={{
            content: 'Revert Changes',
            loading: revertFetcher.state === 'submitting',
            destructive: true,
            onAction: confirmRevert,
          }}
          secondaryActions={[{
            content: 'Cancel',
            onAction: () => setShowRevertModal(false),
          }]}
        >
          <Modal.Section>
            <TextContainer>
              <BlockStack gap="300">
                <Text as="p">
                  Are you sure you want to revert the bulk edit "{selectedBatch.operationName}"?
                </Text>
                
                <Box
                  background="bg-fill-caution-secondary"
                  padding="300"
                  borderRadius="100"
                >
                  <InlineStack gap="200" align="start">
                    <Icon source={AlertTriangleIcon} tone="caution" />
                    <BlockStack gap="200">
                      <Text variant="bodySm" fontWeight="semibold" as="p">
                        This will affect:
                      </Text>
                      <Text variant="bodySm" as="p">
                        • {selectedBatch.totalProducts} products
                        {selectedBatch.totalVariants > 0 && 
                          ` • ${selectedBatch.totalVariants} variants`
                        }
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="p">
                        This action cannot be undone.
                      </Text>
                    </BlockStack>
                  </InlineStack>
                </Box>

                {revertFetcher.data?.errors && (
                  <Box
                    background="bg-fill-critical-secondary"
                    padding="300"
                    borderRadius="100"
                  >
                    <BlockStack gap="200">
                      <Text variant="bodySm" fontWeight="semibold" tone="critical" as="p">
                        Previous revert had errors:
                      </Text>
                      {revertFetcher.data.errors.map((error, index) => (
                        <Text key={index} variant="bodySm" tone="critical" as="p">
                          • {error}
                        </Text>
                      ))}
                    </BlockStack>
                  </Box>
                )}
              </BlockStack>
            </TextContainer>
          </Modal.Section>
        </Modal>
      )}
    </>
  );
}