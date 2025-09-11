import { NamespaceUtils } from './namespaceUtils';

interface Product {
  id: string;
  title: string;
  handle: string;
  totalInventory: number;
  status: string;
  adminUrl?: string;
  storefrontUrl?: string;
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        inventoryQuantity: number;
        price: string;
        sku?: string;
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
    const headers = [
      'Product ID',
      'Title', 
      'Handle',
      'Status',
      'Total Inventory',
      'Admin URL'
    ];

    if (includeVariants) {
      headers.push('Variant Count', 'Variant Details');
    }

    const csvContent = [
      headers.join(','),
      ...products.map(product => {
        const baseData = [
          `"${product.id}"`,
          `"${product.title}"`,
          `"${product.handle}"`,
          `"${product.status}"`,
          product.totalInventory.toString(),
          `"${product.adminUrl || ''}"`
        ];

        if (includeVariants) {
          const variantCount = product.variants.edges.length;
          const variantDetails = product.variants.edges
            .map(edge => `${edge.node.title} (${edge.node.price})`)
            .join('; ');
          
          baseData.push(variantCount.toString(), `"${variantDetails}"`);
        }

        return baseData.join(',');
      })
    ].join('\n');

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

  private static createCSVBlob(products: Product[], includeVariants: boolean): Blob {
    const headers = [
      'Product ID',
      'Title',
      'Handle', 
      'Status',
      'Total Inventory',
      'Admin URL'
    ];

    if (includeVariants) {
      headers.push('Variant Count', 'Variant Details');
    }

    const csvContent = [
      headers.join(','),
      ...products.map(product => {
        const baseData = [
          `"${product.id}"`,
          `"${product.title}"`,
          `"${product.handle}"`,
          `"${product.status}"`,
          product.totalInventory.toString(),
          `"${product.adminUrl || ''}"`
        ];

        if (includeVariants) {
          const variantCount = product.variants.edges.length;
          const variantDetails = product.variants.edges
            .map(edge => `${edge.node.title} (${edge.node.price})`)
            .join('; ');
          
          baseData.push(variantCount.toString(), `"${variantDetails}"`);
        }

        return baseData.join(',');
      })
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private static createJSONBlob(products: Product[]): Blob {
    const jsonContent = JSON.stringify(products, null, 2);
    return new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  }
}
