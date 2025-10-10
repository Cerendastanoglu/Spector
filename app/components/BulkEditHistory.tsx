import React, { useState, useEffect } from "react";
import { useFetcher } from "@remix-run/react";
import {
  Text,
  Badge,
  Button,
  InlineStack,
  BlockStack,
  Collapsible,
  Box,
  Spinner,
  Icon,
  Modal,
  TextContainer,
} from '@shopify/polaris';
import {
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@shopify/polaris-icons";

interface BulkEditItem {
  id: string;
  productId: string;
  variantId?: string;
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
  const [expandedDetails, setExpandedDetails] = useState<Set<string>>(new Set());
  const [currentSlide, setCurrentSlide] = useState(0);
  
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

  const renderHistory = () => {
    if (historyFetcher.state === 'loading') {
      return (
        <Box padding="200">
          <InlineStack align="center" gap="200">
            <Spinner size="small" />
            <Text as="p" variant="bodySm">Loading...</Text>
          </InlineStack>
        </Box>
      );
    }

    // Use real data from API
    const batches = historyFetcher.data?.batches || [];
    
    console.log(`🎨 BulkEditHistory Component: Rendering ${batches.length} batches`);
    batches.forEach((batch, idx) => {
      console.log(`  Batch ${idx + 1}: ${batch.operationName}`);
      console.log(`    - items array:`, batch.items);
      console.log(`    - items length:`, batch.items?.length || 0);
    });
    
    // Find the latest non-reverted batch (can only revert the most recent change)
    const latestNonRevertedBatch = batches.find(b => !b.isReverted);

    if (batches.length === 0) {
      return (
        <Box padding="200">
          <Text as="p" tone="subdued" variant="bodySm">
            No bulk edit history yet. Your named operations will appear here.
          </Text>
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

    // Slider functionality - show 2 items at a time
    const itemsPerSlide = 2;
    const totalSlides = Math.ceil(batches.length / itemsPerSlide);
    const startIndex = currentSlide * itemsPerSlide;
    const endIndex = startIndex + itemsPerSlide;
    const currentBatches = batches.slice(startIndex, endIndex);

    const nextSlide = () => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    };

    const prevSlide = () => {
      setCurrentSlide((prev) => (prev - 1 + totalSlides) % totalSlides);
    };

    return (
      <Box paddingInline="300" paddingBlock="300">
        <BlockStack gap="300">
          {/* Slider Navigation */}
          {totalSlides > 1 && (
            <InlineStack align="space-between" blockAlign="center">
              <Button
                icon={ChevronLeftIcon}
                variant="tertiary"
                size="micro"
                onClick={prevSlide}
                disabled={currentSlide === 0}
              />
              <InlineStack gap="100" align="center">
                {Array.from({ length: totalSlides }).map((_, index) => (
                  <div
                    key={index}
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: index === currentSlide ? '#007ace' : '#d1d5db',
                      cursor: 'pointer',
                      transition: 'background-color 0.2s ease',
                    }}
                    onClick={() => setCurrentSlide(index)}
                  />
                ))}
              </InlineStack>
              <Button
                icon={ChevronRightIcon}
                variant="tertiary"
                size="micro"
                onClick={nextSlide}
                disabled={currentSlide === totalSlides - 1}
              />
            </InlineStack>
          )}

          {/* Activity Items */}
          {currentBatches.map((batch) => (
            <div key={batch.id}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.8)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '1px solid rgba(229, 231, 235, 0.8)',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                  transition: 'all 0.2s ease-in-out',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)';
                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                }}
              >
                <InlineStack gap="400" align="space-between" blockAlign="center">
                  {/* Left: Operation info */}
                  <BlockStack gap="100">
                    <Text variant="bodyMd" as="p" fontWeight="semibold">
                      {batch.operationName}
                    </Text>
                    <InlineStack gap="300" align="center">
                      <Text variant="bodySm" tone="subdued" as="span">
                        {formatDate(batch.createdAt)}
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        •
                      </Text>
                      <Text variant="bodySm" tone="subdued" as="span">
                        {batch.totalProducts} products
                      </Text>
                    </InlineStack>
                  </BlockStack>

                  {/* Right: Status and actions */}
                  <InlineStack gap="200" align="center">
                    {getStatusBadge(batch)}
                    <Button
                      variant="tertiary"
                      size="micro"
                      onClick={() => toggleDetails(batch.id)}
                    >
                      {expandedDetails.has(batch.id) ? 'Hide' : 'Details'}
                    </Button>
                    {batch.canRevert && !batch.isReverted && (
                      <Button
                        size="micro"
                        variant="tertiary"
                        tone="critical"
                        loading={revertingBatchId === batch.id}
                        disabled={
                          revertingBatchId !== null || 
                          (latestNonRevertedBatch !== undefined && latestNonRevertedBatch.id !== batch.id)
                        }
                        onClick={() => handleRevert(batch)}
                      >
                        {latestNonRevertedBatch?.id === batch.id ? 'Revert' : 'Revert Latest First'}
                      </Button>
                    )}
                  </InlineStack>
                </InlineStack>
              </div>

              {/* Details Section */}
              <Collapsible
                open={expandedDetails.has(batch.id)}
                id={`batch-details-${batch.id}`}
                transition={{ duration: '200ms', timingFunction: 'ease-out' }}
              >
                <div style={{ marginTop: '8px' }}>
                  <Box 
                    paddingInline="400" 
                    paddingBlock="300"
                    background="bg-surface"
                    borderRadius="200"
                  >
                  <BlockStack gap="300">
                    {/* Summary Stats */}
                    <InlineStack gap="300">
                      <Text variant="bodySm" as="span" tone="subdued">
                        {batch.totalProducts} products affected
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

                    {/* Product List */}
                    {batch.items && batch.items.length > 0 && (
                      <div style={{
                        maxHeight: '200px',
                        overflowY: 'auto',
                        padding: '12px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <BlockStack gap="200">
                          <Text variant="bodyMd" as="p" fontWeight="semibold">
                            Affected Products:
                          </Text>
                          {/* Group by product */}
                          {(() => {
                            const productMap = new Map<string, any[]>();
                            batch.items.forEach(item => {
                              if (!productMap.has(item.productId)) {
                                productMap.set(item.productId, []);
                              }
                              productMap.get(item.productId)?.push(item);
                            });
                            
                            return Array.from(productMap.entries()).map(([productId, items]) => (
                              <div key={productId} style={{
                                padding: '8px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                border: '1px solid #e5e7eb'
                              }}>
                                <BlockStack gap="100">
                                  <Text variant="bodySm" as="p" fontWeight="semibold">
                                    {items[0].productTitle}
                                  </Text>
                                  {items.map((item) => (
                                    <div key={item.id} style={{ paddingLeft: '12px' }}>
                                      <Text variant="bodyXs" as="p" tone="subdued">
                                        {item.variantTitle && item.variantTitle !== 'Default' ? `• ${item.variantTitle}: ` : '• '}
                                        {item.fieldChanged === 'price' && item.oldValue && item.newValue && (
                                          <span>
                                            ${item.oldValue} → ${item.newValue}
                                            <span style={{ 
                                              marginLeft: '4px',
                                              color: parseFloat(item.newValue) > parseFloat(item.oldValue) ? '#16a34a' : '#dc2626',
                                              fontWeight: 600
                                            }}>
                                              ({parseFloat(item.newValue) > parseFloat(item.oldValue) ? '+' : ''}
                                              {((parseFloat(item.newValue) - parseFloat(item.oldValue)) / parseFloat(item.oldValue) * 100).toFixed(1)}%)
                                            </span>
                                          </span>
                                        )}
                                        {item.fieldChanged !== 'price' && (
                                          <span>
                                            {item.oldValue || 'None'} → {item.newValue || 'None'}
                                          </span>
                                        )}
                                      </Text>
                                    </div>
                                  ))}
                                </BlockStack>
                              </div>
                            ));
                          })()}
                        </BlockStack>
                      </div>
                    )}

                    {batch.isReverted && batch.revertedAt && (
                      <Text variant="bodySm" tone="critical" as="p">
                        Reverted on {formatDate(batch.revertedAt)}
                      </Text>
                    )}
                  </BlockStack>
                  </Box>
                </div>
              </Collapsible>
            </div>
          ))}
        </BlockStack>
      </Box>
    );
  };

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* Clean Rounded Header */}
      <Box 
        paddingBlock="300" 
        paddingInline="400"
        background="bg-surface-secondary"
        borderRadius="300"
      >
        <InlineStack gap="400" align="space-between" blockAlign="center">
          <BlockStack gap="100">
            <Text variant="headingSm" as="h3" fontWeight="semibold">Recent Activity</Text>
            <Text variant="bodySm" as="p" tone="subdued">Latest bulk operations</Text>
          </BlockStack>
          <InlineStack gap="200" align="center">
            <Badge tone="info" size="small">
              {(historyFetcher.data?.batches?.length || 0).toString()}
            </Badge>
            <Button
              variant="tertiary"
              size="large"
              icon={expanded ? ChevronUpIcon : ChevronDownIcon}
              onClick={() => setExpanded(!expanded)}
              accessibilityLabel={expanded ? "Hide recent activity" : "Show recent activity"}
            />
          </InlineStack>
        </InlineStack>
      </Box>

      <Collapsible
        open={expanded}
        id="bulk-edit-history"
        transition={{ duration: '300ms', timingFunction: 'ease-in-out' }}
      >
        <Box 
          background="bg-surface-secondary"
          paddingBlockEnd="300"
          borderRadius="300"
        >
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