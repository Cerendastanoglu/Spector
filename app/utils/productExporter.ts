import { NamespaceUtils } from './namespaceUtils';

interface Product {
  id: string;
  title: string;
  handle: string;
  totalInventory: number;
  status: string;
  description?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  adminUrl?: string;
  storefrontUrl?: string;
  featuredImage?: {
    url: string;
    altText?: string;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        inventoryQuantity: number;
        price: string;
        compareAtPrice?: string;
        sku?: string;
        barcode?: string;
        weight?: number;
        weightUnit?: string;
        requiresShipping?: boolean;
        taxable?: boolean;
        inventoryPolicy?: string;
      };
    }>;
  };
}

interface ExportOptions {
  format?: 'csv' | 'json';
  includeVariants?: boolean;
  filename?: string;
}

export class ProductExporter {
  static exportProducts(products: Product[], options: ExportOptions = {}) {
    const { format = 'csv', includeVariants = true, filename } = options;
    
    if (format === 'csv') {
      this.exportAsCSV(products, includeVariants, filename);
    } else if (format === 'json') {
      this.exportAsJSON(products, filename);
    }
  }

  private static exportAsCSV(products: Product[], includeVariants: boolean, customFilename?: string) {
    // Shopify official CSV format - required columns
    const headers = [
      'Handle',
      'Title',
      'Description',
      'Vendor',
      'Product category',
      'Type',
      'Tags',
      'Published on online store',
      'Option1 name',
      'Option1 value',
      'Option2 name',
      'Option2 value',
      'Option3 name',
      'Option3 value',
      'SKU',
      'Weight value (grams)',
      'Weight unit for display',
      'Inventory tracker',
      'Inventory quantity',
      'Continue selling when out of stock',
      'Fulfillment service',
      'Price',
      'Compare-at price',
      'Requires shipping',
      'Charge tax',
      'Barcode',
      'Product image URL',
      'Image position',
      'Image alt text',
      'Gift card',
      'SEO title',
      'SEO description',
      'Status'
    ];

    const rows: string[] = [];

    products.forEach(product => {
      const variants = product.variants.edges;
      const productPublished = product.status === 'ACTIVE' ? 'true' : 'false';
      const productStatus = product.status.toLowerCase();
      
      variants.forEach((variant, variantIndex) => {
        const v = variant.node;
        
        // Parse variant title for options (e.g., "Small / Black" -> Option1: Small, Option2: Black)
        const variantTitleParts = v.title !== 'Default Title' ? v.title.split(' / ') : [];
        
        const row = [
          `"${product.handle}"`,
          variantIndex === 0 ? `"${product.title}"` : '""', // Title only on first variant
          variantIndex === 0 ? `"${product.description || ''}"` : '""', // Description only on first variant
          variantIndex === 0 ? `"${product.vendor || ''}"` : '""', // Vendor only on first variant
          '""', // Product category - empty for now
          variantIndex === 0 ? `"${product.productType || ''}"` : '""', // Type only on first variant
          variantIndex === 0 ? `"${product.tags?.join(', ') || ''}"` : '""', // Tags only on first variant
          variantIndex === 0 ? productPublished : '""', // Published only on first variant
          variantTitleParts.length > 0 ? '"Size"' : '"Title"', // Option1 name
          variantTitleParts.length > 0 ? `"${variantTitleParts[0] || ''}"` : '"Default Title"', // Option1 value
          variantTitleParts.length > 1 ? '"Color"' : '""', // Option2 name
          variantTitleParts.length > 1 ? `"${variantTitleParts[1] || ''}"` : '""', // Option2 value
          variantTitleParts.length > 2 ? '"Material"' : '""', // Option3 name
          variantTitleParts.length > 2 ? `"${variantTitleParts[2] || ''}"` : '""', // Option3 value
          `"${v.sku || ''}"`, // SKU
          v.weight ? v.weight.toString() : '0', // Weight value (grams)
          `"${v.weightUnit || 'g'}"`, // Weight unit
          '"shopify"', // Inventory tracker
          v.inventoryQuantity.toString(), // Inventory quantity
          v.inventoryPolicy === 'CONTINUE' ? '"continue"' : '"deny"', // Continue selling when out of stock
          '"manual"', // Fulfillment service
          `"${v.price}"`, // Price
          `"${v.compareAtPrice || ''}"`, // Compare-at price
          v.requiresShipping !== false ? '"true"' : '"false"', // Requires shipping
          v.taxable !== false ? '"true"' : '"false"', // Charge tax
          `"${v.barcode || ''}"`, // Barcode
          variantIndex === 0 && product.featuredImage ? `"${product.featuredImage.url}"` : '""', // Product image URL
          variantIndex === 0 && product.featuredImage ? '"1"' : '""', // Image position
          variantIndex === 0 && product.featuredImage?.altText ? `"${product.featuredImage.altText}"` : '""', // Image alt text
          '"false"', // Gift card
          '""', // SEO title - empty for now
          '""', // SEO description - empty for now
          variantIndex === 0 ? `"${productStatus}"` : '""' // Status only on first variant
        ];

        rows.push(row.join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const filename = customFilename || `products-export-${new Date().toISOString().split('T')[0]}.csv`;
    
    // Create download using browser utilities
    this.triggerDownload(blob, filename);
  }

  private static exportAsJSON(products: Product[], customFilename?: string) {
    const jsonContent = JSON.stringify(products, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const filename = customFilename || `products-export-${new Date().toISOString().split('T')[0]}.json`;
    
    this.triggerDownload(blob, filename);
  }

  private static triggerDownload(blob: Blob, filename: string) {
    // Use namespaced downloader to avoid global URL pollution
    const downloader = NamespaceUtils.createScopedDownloader();
    downloader.downloadBlob(blob, filename);
  }

  static async exportProductsAsync(products: Product[], options: ExportOptions = {}): Promise<Blob> {
    const { format = 'csv', includeVariants = true } = options;
    
    if (format === 'csv') {
      return this.createCSVBlob(products, includeVariants);
    } else if (format === 'json') {
      return this.createJSONBlob(products);
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  }

  private static createCSVBlob(products: Product[], _includeVariants: boolean): Blob {
    // Shopify official CSV format - required columns
    const headers = [
      'Handle',
      'Title',
      'Description',
      'Vendor',
      'Product category',
      'Type',
      'Tags',
      'Published on online store',
      'Option1 name',
      'Option1 value',
      'Option2 name',
      'Option2 value',
      'Option3 name',
      'Option3 value',
      'SKU',
      'Weight value (grams)',
      'Weight unit for display',
      'Inventory tracker',
      'Inventory quantity',
      'Continue selling when out of stock',
      'Fulfillment service',
      'Price',
      'Compare-at price',
      'Requires shipping',
      'Charge tax',
      'Barcode',
      'Product image URL',
      'Image position',
      'Image alt text',
      'Gift card',
      'SEO title',
      'SEO description',
      'Status'
    ];

    const rows: string[] = [];

    products.forEach(product => {
      const variants = product.variants.edges;
      const productPublished = product.status === 'ACTIVE' ? 'true' : 'false';
      const productStatus = product.status.toLowerCase();
      
      variants.forEach((variant, variantIndex) => {
        const v = variant.node;
        
        // Parse variant title for options (e.g., "Small / Black" -> Option1: Small, Option2: Black)
        const variantTitleParts = v.title !== 'Default Title' ? v.title.split(' / ') : [];
        
        const row = [
          `"${product.handle}"`,
          variantIndex === 0 ? `"${product.title}"` : '""', // Title only on first variant
          variantIndex === 0 ? `"${product.description || ''}"` : '""', // Description only on first variant
          variantIndex === 0 ? `"${product.vendor || ''}"` : '""', // Vendor only on first variant
          '""', // Product category - empty for now
          variantIndex === 0 ? `"${product.productType || ''}"` : '""', // Type only on first variant
          variantIndex === 0 ? `"${product.tags?.join(', ') || ''}"` : '""', // Tags only on first variant
          variantIndex === 0 ? productPublished : '""', // Published only on first variant
          variantTitleParts.length > 0 ? '"Size"' : '"Title"', // Option1 name
          variantTitleParts.length > 0 ? `"${variantTitleParts[0] || ''}"` : '"Default Title"', // Option1 value
          variantTitleParts.length > 1 ? '"Color"' : '""', // Option2 name
          variantTitleParts.length > 1 ? `"${variantTitleParts[1] || ''}"` : '""', // Option2 value
          variantTitleParts.length > 2 ? '"Material"' : '""', // Option3 name
          variantTitleParts.length > 2 ? `"${variantTitleParts[2] || ''}"` : '""', // Option3 value
          `"${v.sku || ''}"`, // SKU
          v.weight ? v.weight.toString() : '0', // Weight value (grams)
          `"${v.weightUnit || 'g'}"`, // Weight unit
          '"shopify"', // Inventory tracker
          v.inventoryQuantity.toString(), // Inventory quantity
          v.inventoryPolicy === 'CONTINUE' ? '"continue"' : '"deny"', // Continue selling when out of stock
          '"manual"', // Fulfillment service
          `"${v.price}"`, // Price
          `"${v.compareAtPrice || ''}"`, // Compare-at price
          v.requiresShipping !== false ? '"true"' : '"false"', // Requires shipping
          v.taxable !== false ? '"true"' : '"false"', // Charge tax
          `"${v.barcode || ''}"`, // Barcode
          variantIndex === 0 && product.featuredImage ? `"${product.featuredImage.url}"` : '""', // Product image URL
          variantIndex === 0 && product.featuredImage ? '"1"' : '""', // Image position
          variantIndex === 0 && product.featuredImage?.altText ? `"${product.featuredImage.altText}"` : '""', // Image alt text
          '"false"', // Gift card
          '""', // SEO title - empty for now
          '""', // SEO description - empty for now
          variantIndex === 0 ? `"${productStatus}"` : '""' // Status only on first variant
        ];

        rows.push(row.join(','));
      });
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private static createJSONBlob(products: Product[]): Blob {
    const jsonContent = JSON.stringify(products, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }
}
