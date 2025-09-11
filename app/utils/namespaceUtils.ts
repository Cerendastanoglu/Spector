/**
 * Namespace utility for avoiding global scope collisions
 * Implements IIFE (Immediately Invoked Function Expression) patterns
 * as recommended by Shopify performance guidelines
 */

/**
 * IIFE wrapper for utility functions to avoid global namespace pollution
 * This pattern ensures all utilities are scoped within the function
 */
export const NamespaceUtils = (() => {
  // Private variables scoped within IIFE
  const privateConfig = {
    debounceTimers: new Map<string, NodeJS.Timeout>(),
    clipboardFallbackSupported: typeof document !== 'undefined' && document.execCommand,
  };

  // Private helper functions
  const createSecureElement = (tag: string) => {
    if (typeof document === 'undefined') return null;
    return document.createElement(tag);
  };

  const cleanupElement = (element: HTMLElement) => {
    if (element.parentNode) {
      element.parentNode.removeChild(element);
    }
  };

  // Public API returned from IIFE
  return {
    /**
     * Scoped debounce function to prevent global timer pollution
     */
    createScopedDebounce: <T extends (...args: any[]) => any>(
      func: T,
      delay: number,
      key: string
    ): ((...args: Parameters<T>) => void) => {
      return (...args: Parameters<T>) => {
        // Clear existing timer for this key
        const existingTimer = privateConfig.debounceTimers.get(key);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        // Set new timer
        const newTimer = setTimeout(() => {
          func(...args);
          privateConfig.debounceTimers.delete(key);
        }, delay);

        privateConfig.debounceTimers.set(key, newTimer);
      };
    },

    /**
     * Scoped clipboard operations to avoid window object pollution
     */
    createScopedClipboard: () => {
      return {
        async copy(text: string): Promise<boolean> {
          try {
            // Check for modern clipboard API in secure context
            if (typeof navigator !== 'undefined' && 
                navigator.clipboard && 
                typeof window !== 'undefined' && 
                window.isSecureContext) {
              await navigator.clipboard.writeText(text);
              return true;
            }

            // Fallback for older browsers - scoped within this function
            if (!privateConfig.clipboardFallbackSupported) {
              return false;
            }

            const textArea = createSecureElement('textarea') as HTMLTextAreaElement;
            if (!textArea) return false;

            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-9999px';
            textArea.style.top = '-9999px';
            textArea.setAttribute('readonly', '');

            document.body.appendChild(textArea);
            textArea.select();
            textArea.setSelectionRange(0, 99999);

            const result = document.execCommand('copy');
            cleanupElement(textArea);

            return result;
          } catch (error) {
            console.error('Scoped clipboard operation failed:', error);
            return false;
          }
        }
      };
    },

    /**
     * Scoped file download to avoid global URL pollution
     */
    createScopedDownloader: () => {
      const activeUrls = new Set<string>();

      return {
        downloadBlob(blob: Blob, filename: string): void {
          if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
          }

          try {
            const url = window.URL.createObjectURL(blob);
            activeUrls.add(url);

            const link = createSecureElement('a') as HTMLAnchorElement;
            if (!link) return;

            link.href = url;
            link.download = filename;
            link.style.display = 'none';

            document.body.appendChild(link);
            link.click();
            
            // Cleanup after a short delay
            setTimeout(() => {
              cleanupElement(link);
              if (activeUrls.has(url)) {
                window.URL.revokeObjectURL(url);
                activeUrls.delete(url);
              }
            }, 100);
          } catch (error) {
            console.error('Scoped download failed:', error);
          }
        },

        cleanup(): void {
          // Clean up any remaining URLs
          activeUrls.forEach(url => {
            try {
              window.URL.revokeObjectURL(url);
            } catch (error) {
              console.error('Error cleaning up URL:', error);
            }
          });
          activeUrls.clear();
        }
      };
    },

    /**
     * Scoped window operations to avoid global pollution
     */
    createScopedWindow: () => {
      return {
        openSecure(url: string, fallback?: () => void): void {
          if (typeof window === 'undefined') {
            fallback?.();
            return;
          }

          try {
            const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
              fallback?.();
            }
          } catch (error) {
            console.error('Scoped window open failed:', error);
            fallback?.();
          }
        }
      };
    },

    /**
     * Clean up all namespaced resources
     */
    cleanup(): void {
      // Clear all debounce timers
      privateConfig.debounceTimers.forEach(timer => clearTimeout(timer));
      privateConfig.debounceTimers.clear();
    }
  };
})();

/**
 * IIFE wrapper for browser feature detection
 * Avoids global pollution of feature detection results
 */
export const BrowserFeatures = (() => {
  // Private feature cache within IIFE scope
  const featureCache = new Map<string, boolean>();

  const detectFeature = (key: string, detector: () => boolean): boolean => {
    if (featureCache.has(key)) {
      return featureCache.get(key) as boolean; // We know it exists due to has() check
    }

    try {
      const result = detector();
      featureCache.set(key, result);
      return result;
    } catch (error) {
      featureCache.set(key, false);
      return false;
    }
  };

  // Public API
  return {
    hasClipboardAPI(): boolean {
      return detectFeature('clipboard', () => 
        typeof navigator !== 'undefined' && 
        'clipboard' in navigator &&
        typeof window !== 'undefined' &&
        window.isSecureContext
      );
    },

    hasDownloadSupport(): boolean {
      return detectFeature('download', () => 
        typeof document !== 'undefined' &&
        'download' in document.createElement('a')
      );
    },

    prefersReducedMotion(): boolean {
      return detectFeature('reducedMotion', () =>
        typeof window !== 'undefined' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    },

    hasLocalStorage(): boolean {
      return detectFeature('localStorage', () => {
        if (typeof window === 'undefined') return false;
        try {
          const test = '__storage_test__';
          window.localStorage.setItem(test, test);
          window.localStorage.removeItem(test);
          return true;
        } catch {
          return false;
        }
      });
    },

    clearCache(): void {
      featureCache.clear();
    }
  };
})();

/**
 * Export a cleanup function for the entire namespace
 */
export const cleanupNamespace = () => {
  NamespaceUtils.cleanup();
  BrowserFeatures.clearCache();
};
