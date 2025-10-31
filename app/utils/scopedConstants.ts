import { logger } from "~/utils/logger";

/**
 * Scoped application constants to avoid namespace collisions
 * Uses IIFE pattern to ensure constants are properly encapsulated
 */

/**
 * Product management constants wrapped in IIFE for namespace safety
 */
export const ProductConstants = (() => {
  // Private constants scoped within IIFE
  const thresholds = {
    critical: 3,
    lowStock: 10,
    maxRetries: 3,
  };

  const categories = [
    { label: 'All Products', value: 'all' },
    { label: 'Out of Stock', value: 'out-of-stock' },
    { label: 'Critical Stock (1-3)', value: 'critical' },
    { label: 'Low Stock (4-10)', value: 'low-stock' },
    { label: 'In Stock', value: 'in-stock' },
  ];

  const sortOptions = [
    { label: 'Product Name (A-Z)', value: 'title-asc' },
    { label: 'Product Name (Z-A)', value: 'title-desc' },
    { label: 'Inventory (Low to High)', value: 'inventory-asc' },
    { label: 'Inventory (High to Low)', value: 'inventory-desc' },
    { label: 'Recently Added Products', value: 'created-desc' },
    { label: 'Oldest Products First', value: 'created-asc' },
    { label: 'Recently Updated', value: 'updated-desc' },
    { label: 'Least Recently Updated', value: 'updated-asc' },
    { label: 'Price (Low to High)', value: 'price-asc' },
    { label: 'Price (High to Low)', value: 'price-desc' },
    { label: 'Most Variants', value: 'variants-desc' },
    { label: 'Least Variants', value: 'variants-asc' },
  ];

  const tableHeaders = ['Product', 'Price', 'Inventory', 'Status', 'Variants', 'Actions'] as const;

  // Public API
  return {
    get CRITICAL_THRESHOLD() { return thresholds.critical; },
    get LOW_STOCK_THRESHOLD() { return thresholds.lowStock; },
    get MAX_RETRIES() { return thresholds.maxRetries; },
    get CATEGORY_OPTIONS() { return categories; },
    get SORT_OPTIONS() { return sortOptions; },
    get TABLE_HEADINGS() { return tableHeaders; },
    
    // Utility methods
    getStockStatus(inventory: number): 'critical' | 'warning' | 'success' {
      if (inventory === 0) return 'critical';
      if (inventory <= thresholds.critical) return 'warning';
      return 'success';
    },
    
    getBadgeTone(inventory: number): 'critical' | 'warning' | 'success' {
      return this.getStockStatus(inventory);
    }
  };
})();

/**
 * Export configuration wrapped in IIFE for namespace safety
 */
export const ExportConstants = (() => {
  const formats = [
    { label: 'CSV', value: 'csv' },
    { label: 'Excel', value: 'excel' },
    { label: 'JSON', value: 'json' },
    { label: 'PDF', value: 'pdf' },
  ] as const;

  const fields = [
    { id: 'title', label: 'Product Title', enabled: true },
    { id: 'handle', label: 'Handle', enabled: true },
    { id: 'inventory', label: 'Inventory Level', enabled: true },
    { id: 'status', label: 'Status', enabled: true },
    { id: 'pricing', label: 'Pricing Info', enabled: false },
    { id: 'suppliers', label: 'Supplier Info', enabled: false },
    { id: 'analytics', label: 'Analytics Data', enabled: false },
  ];

  return {
    get EXPORT_FORMATS() { return formats; },
    get EXPORT_FIELDS() { return fields; },
    
    getDefaultExportSettings() {
      return {
        format: 'csv' as const,
        fields: fields.filter(f => f.enabled).map(f => f.id),
        includeHeaders: true,
        filename: `products-export-${new Date().toISOString().split('T')[0]}`,
      };
    }
  };
})();

/**
 * Animation and UI constants wrapped in IIFE
 */
export const UIConstants = (() => {
  const timing = {
    debounceDelay: 300,
    animationDuration: 200,
    tooltipDelay: 500,
  };

  const breakpoints = {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1200px',
  };

  return {
    get DEBOUNCE_DELAY() { return timing.debounceDelay; },
    get ANIMATION_DURATION() { return timing.animationDuration; },
    get TOOLTIP_DELAY() { return timing.tooltipDelay; },
    get BREAKPOINTS() { return breakpoints; },
    
    // Media query helpers
    getMediaQuery(breakpoint: keyof typeof breakpoints): string {
      return `(min-width: ${breakpoints[breakpoint]})`;
    }
  };
})();

/**
 * Cleanup function for all constants
 */
export const cleanupConstants = () => {
  // Constants are immutable, but this allows for future cleanup if needed
  logger.debug('Constants cleanup called - no cleanup needed for immutable values');
};
