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
  Divider,
  Tooltip,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import {
  ClockIcon,
  RefreshIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  InfoIcon,
  ChevronUpIcon,
  ChevronDownIcon,
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

  const getOperationIcon = (operationType: string) => {
    switch (operationType) {
      case 'pricing': return '💰';
      case 'collections': return '📁';
      case 'tags': return '🏷️';
      case 'content': return '📝';
      case 'inventory': return '📦';
      case 'variants': return '🔧';
      default: return '📋';
    }
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

    if (historyFetcher.data?.error || !historyFetcher.data?.success) {
      return (
        <Box padding="300">
          <EmptyState
            heading="Unable to load history"
            action={{
              content: 'Retry',
              onAction: () => historyFetcher.load('/app/api/bulk-history'),
            }}
            image=""
          >
            <Text as="p">There was an error loading your bulk edit history.</Text>
          </EmptyState>
        </Box>
      );
    }

    const batches = historyFetcher.data.batches || [];

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

    return (
      <BlockStack gap="300">
        {batches.map((batch) => (
          <Card key={batch.id} padding="400">
            <BlockStack gap="300">
              <InlineStack align="space-between" wrap={false}>
                <InlineStack gap="200" align="center">
                  <Text as="span">{getOperationIcon(batch.operationType)}</Text>
                  <BlockStack gap="100">
                    <Text variant="headingXs" as="h4">
                      {batch.operationName}
                    </Text>
                    <Text variant="bodySm" tone="subdued" as="p">
                      {formatDate(batch.createdAt)}
                    </Text>
                  </BlockStack>
                </InlineStack>
                
                <InlineStack gap="200" align="center">
                  {getStatusBadge(batch)}
                  {batch.canRevert && !batch.isReverted && (
                    <Tooltip content="Revert this bulk edit">
                      <Button
                        size="micro"
                        variant="tertiary"
                        icon={RefreshIcon}
                        loading={revertingBatchId === batch.id}
                        disabled={revertingBatchId !== null}
                        onClick={() => handleRevert(batch)}
                      />
                    </Tooltip>
                  )}
                </InlineStack>
              </InlineStack>

              <InlineStack gap="400">
                <Text variant="bodySm" as="p">
                  <Text as="span" fontWeight="semibold">{batch.totalProducts}</Text> products
                </Text>
                {batch.totalVariants > 0 && (
                  <Text variant="bodySm" as="p">
                    <Text as="span" fontWeight="semibold">{batch.totalVariants}</Text> variants
                  </Text>
                )}
              </InlineStack>

              {batch.description && (
                <Text variant="bodySm" tone="subdued" as="p">
                  {batch.description}
                </Text>
              )}

              {batch.isReverted && batch.revertedAt && (
                <Box
                  background="bg-fill-critical-secondary"
                  padding="200"
                  borderRadius="100"
                >
                  <InlineStack gap="200" align="center">
                    <Icon source={AlertTriangleIcon} tone="critical" />
                    <Text variant="bodySm" tone="critical" as="p">
                      Reverted on {formatDate(batch.revertedAt)}
                    </Text>
                  </InlineStack>
                </Box>
              )}

              <Collapsible
                open={selectedBatch?.id === batch.id}
                id={`batch-details-${batch.id}`}
                transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
              >
                <Box paddingBlockStart="300">
                  <Divider />
                  <Box paddingBlockStart="300">
                    {renderBatchDetails(batch)}
                  </Box>
                </Box>
              </Collapsible>

              <InlineStack align="center">
                <Button
                  variant="plain"
                  size="micro"
                  icon={selectedBatch?.id === batch.id ? CheckCircleIcon : InfoIcon}
                  onClick={() => 
                    setSelectedBatch(selectedBatch?.id === batch.id ? null : batch)
                  }
                >
                  {selectedBatch?.id === batch.id ? 'Hide Details' : 'Show Details'}
                </Button>
              </InlineStack>
            </BlockStack>
          </Card>
        ))}
      </BlockStack>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      <Card>
        <Box padding="200" background="bg-surface-secondary">
          <InlineStack align="space-between" blockAlign="center">
            <InlineStack gap="150" align="center">
              <Icon source={ClockIcon} />
              <Text variant="bodySm" as="h3" fontWeight="medium">
                Bulk Edit History
              </Text>
              {historyFetcher.data?.batches && historyFetcher.data.batches.length > 0 && (
                <Badge tone="info" size="small">
                  {`${historyFetcher.data.batches.length}`}
                </Badge>
              )}
            </InlineStack>
            
            <Button
              variant="plain"
              size="micro"
              icon={expanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? 'Hide' : 'Show'}
            </Button>
          </InlineStack>
        </Box>

        <Collapsible
          open={expanded}
          id="bulk-edit-history"
          transition={{ duration: '200ms', timingFunction: 'ease-in-out' }}
        >
          <Box paddingInline="200" paddingBlockEnd="200" background="bg-surface-tertiary">
            <Divider />
            <Box paddingBlockStart="200">
              {renderHistory()}
            </Box>
          </Box>
        </Collapsible>
      </Card>

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