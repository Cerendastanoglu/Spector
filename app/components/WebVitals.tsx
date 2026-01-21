import { logger } from "~/utils/logger";
import { useEffect } from 'react';
import type { CLSMetric, FCPMetric, LCPMetric, INPMetric, TTFBMetric } from 'web-vitals';

// Define the metric interface to match web-vitals types
interface Metric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Core Web Vitals thresholds for 2025
const THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  INP: { good: 200, needsImprovement: 500 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 }
};

function sendToAnalytics(metric: Metric) {
  // Always log LCP to console so we can measure it for Built for Shopify
  // LCP needs to be < 2500ms (2.5 seconds) for good rating
  if (metric.name === 'LCP') {
    const statusEmoji = metric.value <= 2500 ? '✅' : metric.value <= 4000 ? '⚠️' : '❌';
    console.log(`${statusEmoji} LCP: ${metric.value.toFixed(0)}ms (${metric.rating}) - Target: <2500ms`);
  }
  
  // Log all vitals in development mode
  if (process.env.NODE_ENV === 'development') {
    logger.info('📊 Web Vital:', {
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType
    });
  }

  // Send to Shopify Partners dashboard if available
  if (typeof shopify !== 'undefined') {
    // Note: Shopify analytics integration would go here
    // This is a placeholder for future Shopify analytics integration
  }

  // You can also send to other analytics services
  // Example: Google Analytics 4
  if (typeof window !== 'undefined' && 'gtag' in window) {
    const gtag = (window as any).gtag; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (typeof gtag === 'function') {
      gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
  }
}

export function WebVitals() {
  useEffect(() => {
    let vitalsLoaded = false;

    const loadWebVitals = async () => {
      if (vitalsLoaded) return;
      vitalsLoaded = true;

      try {
        const { onCLS, onFCP, onLCP, onINP, onTTFB } = await import('web-vitals');

        // Largest Contentful Paint (should be < 2.5s for good)
        onLCP((metric: LCPMetric) => {
          const rating = metric.value <= THRESHOLDS.LCP.good ? 'good' : 
                        metric.value <= THRESHOLDS.LCP.needsImprovement ? 'needs-improvement' : 'poor';
          sendToAnalytics({
            ...metric,
            rating
          });
        });

        // Cumulative Layout Shift (should be < 0.1 for good)
        onCLS((metric: CLSMetric) => {
          const rating = metric.value <= THRESHOLDS.CLS.good ? 'good' : 
                        metric.value <= THRESHOLDS.CLS.needsImprovement ? 'needs-improvement' : 'poor';
          sendToAnalytics({
            ...metric,
            rating
          });
        });

        // Interaction to Next Paint (should be < 200ms for good)
        onINP((metric: INPMetric) => {
          const rating = metric.value <= THRESHOLDS.INP.good ? 'good' : 
                        metric.value <= THRESHOLDS.INP.needsImprovement ? 'needs-improvement' : 'poor';
          sendToAnalytics({
            ...metric,
            rating
          });
        });

        // First Contentful Paint
        onFCP((metric: FCPMetric) => {
          const rating = metric.value <= THRESHOLDS.FCP.good ? 'good' : 
                        metric.value <= THRESHOLDS.FCP.needsImprovement ? 'needs-improvement' : 'poor';
          sendToAnalytics({
            ...metric,
            rating
          });
        });

        // Time to First Byte
        onTTFB((metric: TTFBMetric) => {
          const rating = metric.value <= THRESHOLDS.TTFB.good ? 'good' : 
                        metric.value <= THRESHOLDS.TTFB.needsImprovement ? 'needs-improvement' : 'poor';
          sendToAnalytics({
            ...metric,
            rating
          });
        });

      } catch (error) {
        logger.error('Failed to load web-vitals:', error);
      }
    };

    // Load web vitals after the page has loaded
    if (document.readyState === 'complete') {
      loadWebVitals();
    } else {
      window.addEventListener('load', loadWebVitals);
    }

    return () => {
      window.removeEventListener('load', loadWebVitals);
    };
  }, []);

  return null; // This component doesn't render anything
}

// Hook for manual web vitals checking (useful for debugging)
export function useWebVitalsDebug() {
  useEffect(() => {
    const checkVitals = () => {
      logger.info('🔍 Web Vitals Debug - Check browser DevTools for performance metrics');
      
      // Use Performance Observer API to get current metrics
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          console.table(entries.map(entry => ({
            name: entry.name,
            type: entry.entryType,
            startTime: entry.startTime,
            duration: entry.duration
          })));
        });
        
        try {
          observer.observe({ entryTypes: ['navigation', 'paint', 'largest-contentful-paint'] });
        } catch (error) {
          logger.info('Performance Observer not fully supported');
        }
      }
    };

    // Add a global function to check vitals
    (window as any).checkWebVitals = checkVitals; // eslint-disable-line @typescript-eslint/no-explicit-any
  }, []);
}
