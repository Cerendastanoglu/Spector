// Performance optimization utilities for Core Web Vitals

/**
 * Resource hints for better loading performance
 */
export const ResourceHints = {
  // Preload critical resources
  preloadCriticalCSS: (href: string) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'style';
    link.href = href;
    link.onload = () => {
      link.rel = 'stylesheet';
    };
    document.head.appendChild(link);
  },

  // Prefetch next page resources
  prefetchResource: (href: string, as?: string) => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = href;
    if (as) link.setAttribute('as', as);
    document.head.appendChild(link);
  },

  // DNS prefetch for external domains
  dnsPrefetch: (domain: string) => {
    const link = document.createElement('link');
    link.rel = 'dns-prefetch';
    link.href = domain;
    document.head.appendChild(link);
  }
};

/**
 * Layout Shift Prevention
 * Helps maintain CLS < 0.1
 */
export const LayoutShift = {
  // Reserve space for images to prevent CLS
  reserveImageSpace: (width: number, height: number) => ({
    aspectRatio: `${width} / ${height}`,
    width: '100%',
    height: 'auto'
  }),

  // Skeleton loader dimensions
  getSkeletonStyle: (width?: string | number, height?: string | number) => ({
    width: width || '100%',
    height: height || '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    animation: 'pulse 1.5s ease-in-out infinite alternate'
  })
};

/**
 * Interaction optimization for INP < 200ms
 */
export const InteractionOptimization = {
  // Debounce function for input handlers
  debounce: <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): ((...args: Parameters<T>) => void) => {
    let timeout: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
    };
  },

  // Throttle function for scroll/resize handlers
  throttle: <T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): ((...args: Parameters<T>) => void) => {
    let inThrottle: boolean;
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  },

  // Optimize button click handlers
  optimizeClickHandler: (handler: () => void) => {
    return (event: React.MouseEvent) => {
      event.preventDefault();
      // Use setTimeout to ensure the click is processed in the next frame
      setTimeout(handler, 0);
    };
  }
};

/**
 * Critical Resource Loading for LCP < 2.5s
 */
export const CriticalLoading = {
  // Load critical images with priority
  loadCriticalImage: (src: string, alt: string) => {
    const img = new Image();
    img.src = src;
    img.alt = alt;
    img.loading = 'eager';
    img.fetchPriority = 'high';
    return img;
  },

  // Lazy load non-critical resources
  lazyLoad: (callback: () => void) => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(callback);
    } else {
      setTimeout(callback, 100);
    }
  }
};

/**
 * Performance monitoring utilities
 */
export const PerformanceMonitoring = {
  // Mark performance milestones
  markMilestone: (name: string) => {
    if (typeof performance !== 'undefined' && performance.mark) {
      performance.mark(name);
    }
  },

  // Measure performance between marks
  measureBetween: (name: string, startMark: string, endMark: string) => {
    if (typeof performance !== 'undefined' && performance.measure) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        return measure.duration;
      } catch (error) {
        console.warn('Performance measurement failed:', error);
        return 0;
      }
    }
    return 0;
  },

  // Check if we're in a performance-critical state
  isPerformanceCritical: () => {
    if (typeof navigator !== 'undefined') {
      // Check for slow connection
      const connection = (navigator as any).connection;
      if (connection) {
        return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g';
      }
      
      // Check for low-end device
      if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
        return true;
      }
    }
    return false;
  }
};

/**
 * Bundle size optimization
 */
export const BundleOptimization = {
  // Dynamic import with error handling
  dynamicImport: async <T>(importFn: () => Promise<T>): Promise<T | null> => {
    try {
      return await importFn();
    } catch (error) {
      console.error('Dynamic import failed:', error);
      return null;
    }
  },

  // Code splitting helper
  loadComponentWhenVisible: (
    element: HTMLElement,
    importFn: () => Promise<any>
  ) => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            importFn();
            observer.unobserve(element);
          }
        });
      },
      { rootMargin: '50px' }
    );
    
    observer.observe(element);
    return () => observer.unobserve(element);
  }
};

// CSS for skeleton loading animation
export const skeletonCSS = `
@keyframes pulse {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.5;
  }
}

.skeleton {
  animation: pulse 1.5s ease-in-out infinite alternate;
}
`;
