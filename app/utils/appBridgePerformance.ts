// App Bridge performance optimizations for Core Web Vitals
import { useAppBridge } from '@shopify/app-bridge-react';
import { useEffect } from 'react';
import { logger } from "~/utils/logger";

interface AppBridgePerformanceConfig {
  // Enable performance monitoring
  enableMetrics?: boolean;
  // Preload critical resources
  preloadResources?: string[];
  // Optimize loading strategy
  loadingStrategy?: 'eager' | 'lazy' | 'auto';
}

/**
 * Hook to optimize App Bridge performance for Core Web Vitals
 */
export function useAppBridgePerformance(config: AppBridgePerformanceConfig = {}) {
  const app = useAppBridge();
  
  const {
    enableMetrics = true,
    preloadResources = [],
    loadingStrategy = 'auto'
  } = config;

  useEffect(() => {
    if (!app) return;

    // Performance optimization configurations
    const performanceConfig = {
      // Reduce initial bundle size
      lazyComponents: loadingStrategy === 'lazy',
      
      // Preconnect to Shopify CDN
      preconnectDomains: [
        'https://cdn.shopify.com',
        'https://shopify.com',
      ],
      
      // Critical resource hints
      resourceHints: {
        preload: preloadResources,
        prefetch: [
          // Prefetch likely navigation targets
          '/app/products',
          '/app/notifications',
          '/app/dashboard'
        ]
      }
    };

    // Apply performance optimizations
    if (enableMetrics) {
      // Monitor App Bridge performance
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        
        entries.forEach((entry) => {
          if (entry.name.includes('app-bridge') || entry.name.includes('shopify')) {
            logger.info('🚀 App Bridge Performance:', {
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        });
      });

      try {
        observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
      } catch (error) {
        logger.warn('Performance Observer not fully supported:', error);
      }

      return () => observer.disconnect();
    }

    // Add resource hints to document head
    performanceConfig.preconnectDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = domain;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
    });

    // Preload critical resources
    performanceConfig.resourceHints.preload.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'script'; // Adjust based on resource type
      document.head.appendChild(link);
    });

  }, [app, enableMetrics, preloadResources, loadingStrategy]);

  return {
    // Performance utilities
    markPerformanceMilestone: (name: string) => {
      if (typeof performance !== 'undefined' && performance.mark) {
        performance.mark(`app-bridge-${name}`);
      }
    },
    
    measurePerformance: (name: string, startMark: string) => {
      if (typeof performance !== 'undefined' && performance.measure) {
        try {
          performance.measure(`app-bridge-${name}`, `app-bridge-${startMark}`);
        } catch (error) {
          logger.warn('Performance measurement failed:', error);
        }
      }
    }
  };
}

/**
 * Optimized App Bridge loading strategy
 */
export function optimizeAppBridgeLoading() {
  // Ensure App Bridge loads with high priority
  if (typeof document !== 'undefined') {
    const scripts = document.querySelectorAll('script[src*="app-bridge"]');
    scripts.forEach(script => {
      (script as HTMLScriptElement).fetchPriority = 'high';
    });
  }

  // Preload Polaris styles for faster rendering
  if (typeof document !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = 'https://cdn.shopify.com/static/fonts/inter/v4/styles.css';
    link.as = 'style';
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  }
}

/**
 * Core Web Vitals specific optimizations for Shopify Apps
 */
export const ShopifyAppPerformance = {
  
  // Optimize LCP (Largest Contentful Paint)
  optimizeLCP: () => {
    // Prioritize loading of hero images and critical content
    const criticalImages = document.querySelectorAll('img[data-critical="true"]');
    criticalImages.forEach(img => {
      (img as HTMLImageElement).loading = 'eager';
      (img as HTMLImageElement).fetchPriority = 'high';
    });
    
    // Preload critical CSS
    const criticalCSS = [
      'https://cdn.shopify.com/static/fonts/inter/v4/styles.css'
    ];
    
    criticalCSS.forEach(href => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = 'style';
      document.head.appendChild(link);
    });
  },

  // Optimize CLS (Cumulative Layout Shift)
  optimizeCLS: () => {
    // Reserve space for dynamic content
    const style = document.createElement('style');
    style.textContent = `
      .loading-skeleton {
        min-height: 60px;
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s infinite;
      }
      
      @keyframes loading {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      
      .polaris-layout-reserved {
        contain: layout style size;
      }
    `;
    document.head.appendChild(style);
  },

  // Optimize INP (Interaction to Next Paint)
  optimizeINP: () => {
    // Debounce rapid interactions
    let interactionTimeout: NodeJS.Timeout;
    
    document.addEventListener('click', () => {
      clearTimeout(interactionTimeout);
      interactionTimeout = setTimeout(() => {
        // Process interaction after debounce (silent)
      }, 16); // ~1 frame at 60fps
    }, { passive: true });

    // Use requestIdleCallback for non-critical updates
    if ('requestIdleCallback' in window) {
      const deferNonCriticalWork = (callback: () => void) => {
        requestIdleCallback(callback, { timeout: 100 });
      };
      
      // Make it globally available
      (window as any).deferNonCriticalWork = deferNonCriticalWork; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
  },

  // Initialize all optimizations
  initialize: () => {
    ShopifyAppPerformance.optimizeLCP();
    ShopifyAppPerformance.optimizeCLS();
    ShopifyAppPerformance.optimizeINP();
    optimizeAppBridgeLoading();
  }
};
