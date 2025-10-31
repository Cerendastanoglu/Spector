import { logger } from "~/utils/logger";
import { useEffect, useState } from 'react';
import { Card, Text, BlockStack, InlineStack, ProgressBar, Button, Badge } from '@shopify/polaris';
import { useWebVitalsDebug } from './WebVitals';

interface PerformanceMetric {
  name: string;
  value: number;
  threshold: {
    good: number;
    needsImprovement: number;
  };
  unit: string;
  description: string;
}

const CORE_WEB_VITALS: PerformanceMetric[] = [
  {
    name: 'LCP',
    value: 0,
    threshold: { good: 2500, needsImprovement: 4000 },
    unit: 'ms',
    description: 'Largest Contentful Paint - Main content loading time'
  },
  {
    name: 'CLS',
    value: 0,
    threshold: { good: 0.1, needsImprovement: 0.25 },
    unit: '',
    description: 'Cumulative Layout Shift - Visual stability'
  },
  {
    name: 'INP',
    value: 0,
    threshold: { good: 200, needsImprovement: 500 },
    unit: 'ms',
    description: 'Interaction to Next Paint - Responsiveness'
  }
];

function getRating(value: number, threshold: { good: number; needsImprovement: number }): 'good' | 'needs-improvement' | 'poor' {
  if (value <= threshold.good) return 'good';
  if (value <= threshold.needsImprovement) return 'needs-improvement';
  return 'poor';
}

function getBadgeStatus(rating: string): 'success' | 'warning' | 'critical' {
  switch (rating) {
    case 'good': return 'success';
    case 'needs-improvement': return 'warning';
    case 'poor': return 'critical';
    default: return 'warning';
  }
}

function getProgressValue(value: number, threshold: { good: number; needsImprovement: number }): number {
  const maxValue = threshold.needsImprovement * 1.5; // Show up to 150% of needs improvement threshold
  return Math.min((value / maxValue) * 100, 100);
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>(CORE_WEB_VITALS);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
  useWebVitalsDebug();

  useEffect(() => {
    const updateMetrics = async () => {
      try {
        // Get real performance metrics if available
        if (typeof PerformanceObserver !== 'undefined') {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            
            const updatedMetrics = [...metrics];
            
            entries.forEach((entry) => {
              if (entry.entryType === 'largest-contentful-paint') {
                const lcpIndex = updatedMetrics.findIndex(m => m.name === 'LCP');
                if (lcpIndex !== -1) {
                  updatedMetrics[lcpIndex].value = entry.startTime;
                }
              }
              
              if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) { // eslint-disable-line @typescript-eslint/no-explicit-any
                const clsIndex = updatedMetrics.findIndex(m => m.name === 'CLS');
                if (clsIndex !== -1) {
                  updatedMetrics[clsIndex].value += (entry as any).value; // eslint-disable-line @typescript-eslint/no-explicit-any
                }
              }
            });
            
            setMetrics(updatedMetrics);
            setLastUpdated(new Date());
          });
          
          try {
            observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
          } catch (error) {
            logger.warn('Some performance metrics not available:', error);
          }
          
          return () => observer.disconnect();
        }
      } catch (error) {
        logger.warn('Performance monitoring not available:', error);
      }
    };

    updateMetrics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshMetrics = () => {
    // Force a refresh of performance metrics
    if (typeof performance !== 'undefined') {
      // Clear existing marks and measures
      if (performance.clearMarks) performance.clearMarks();
      if (performance.clearMeasures) performance.clearMeasures();
      
      // Trigger a new measurement
      setLastUpdated(new Date());
      
      // Call the global checkWebVitals function if available
      if (typeof window !== 'undefined' && (window as any).checkWebVitals) { // eslint-disable-line @typescript-eslint/no-explicit-any
        (window as any).checkWebVitals(); // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <Text as="h2" variant="headingMd">
            Core Web Vitals Performance
          </Text>
          <Button onClick={refreshMetrics} size="slim">
            Refresh Metrics
          </Button>
        </InlineStack>
        
        <Text as="p" variant="bodyMd" tone="subdued">
          Monitor your app's performance against 2025 Core Web Vitals benchmarks.
          Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>

        <BlockStack gap="300">
          {metrics.map((metric) => {
            const rating = getRating(metric.value, metric.threshold);
            const badgeStatus = getBadgeStatus(rating);
            const progressValue = getProgressValue(metric.value, metric.threshold);
            
            return (
              <Card key={metric.name} background="bg-surface-secondary">
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="050">
                      <InlineStack gap="200" blockAlign="center">
                        <Text as="h3" variant="headingSm">
                          {metric.name}
                        </Text>
                        <Badge tone={badgeStatus}>
                          {rating.replace('-', ' ')}
                        </Badge>
                      </InlineStack>
                      <Text as="p" variant="bodySm" tone="subdued">
                        {metric.description}
                      </Text>
                    </BlockStack>
                    
                    <Text as="p" variant="headingLg">
                      {metric.value > 0 ? (
                        metric.name === 'CLS' ? 
                        metric.value.toFixed(3) : 
                        `${Math.round(metric.value)}${metric.unit}`
                      ) : (
                        '--'
                      )}
                    </Text>
                  </InlineStack>

                  <BlockStack gap="100">
                    <ProgressBar
                      progress={progressValue}
                    />
                    
                    <InlineStack gap="400" align="space-between">
                      <Text as="p" variant="bodySm" tone="subdued">
                        Good: ≤ {metric.name === 'CLS' ? metric.threshold.good.toFixed(1) : `${metric.threshold.good}${metric.unit}`}
                      </Text>
                      <Text as="p" variant="bodySm" tone="subdued">
                        Needs Improvement: ≤ {metric.name === 'CLS' ? metric.threshold.needsImprovement.toFixed(1) : `${metric.threshold.needsImprovement}${metric.unit}`}
                      </Text>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            );
          })}
        </BlockStack>

        <Card background="bg-surface-secondary">
          <BlockStack gap="200">
            <Text as="h3" variant="headingSm">
              Performance Tips
            </Text>
            <BlockStack gap="100">
              <Text as="p" variant="bodySm">
                • <strong>LCP &lt; 2.5s:</strong> Optimize images, use CDN, minimize server response time
              </Text>
              <Text as="p" variant="bodySm">
                • <strong>CLS &lt; 0.1:</strong> Set image dimensions, avoid inserting content above existing content
              </Text>
              <Text as="p" variant="bodySm">
                • <strong>INP &lt; 200ms:</strong> Minimize JavaScript execution time, use efficient event handlers
              </Text>
            </BlockStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Card>
  );
}
