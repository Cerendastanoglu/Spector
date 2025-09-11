/**
 * Modern browser utility functions for Shopify apps
 * Uses IIFE patterns to avoid namespace collisions as per Shopify guidelines
 * Reference: https://shopify.dev/docs/storefronts/themes/best-practices/performance
 */

import { NamespaceUtils, BrowserFeatures } from './namespaceUtils';

/**
 * Download data as CSV file using scoped utilities to avoid global collisions
 * Wrapped in IIFE pattern for namespace safety
 */
export const downloadCSV = (() => {
  // Private CSV utilities scoped within IIFE
  const csvUtils = {
    escapeField(value: any): string {
      const stringValue = String(value ?? '');
      const escaped = stringValue.replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
        ? `"${escaped}"` 
        : escaped;
    },

    generateContent(data: Array<Record<string, any>>, headers: string[]): string {
      return [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => csvUtils.escapeField(row[header])).join(',')
        )
      ].join('\n');
    }
  };

  // Return the actual function
  return function(
    data: Array<Record<string, any>>,
    filename: string,
    headers?: string[]
  ): void {
    if (!data.length) return;

    const csvHeaders = headers || Object.keys(data[0]);
    const csvContent = csvUtils.generateContent(data, csvHeaders);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Use namespaced downloader to avoid global pollution
    const downloader = NamespaceUtils.createScopedDownloader();
    const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    downloader.downloadBlob(blob, finalFilename);
  };
})();

/**
 * Open URL in new tab with security best practices
 * Uses scoped window operations to avoid global namespace pollution
 */
export function openInNewTab(url: string, fallback?: () => void): void {
  const scopedWindow = NamespaceUtils.createScopedWindow();
  scopedWindow.openSecure(url, fallback);
}

/**
 * Copy text to clipboard using namespaced utilities
 * Avoids global clipboard object pollution
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  const clipboard = NamespaceUtils.createScopedClipboard();
  return clipboard.copy(text);
}

/**
 * Debounce function using scoped timers to avoid global pollution
 * Each debounced function gets its own namespace
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delay: number,
  key?: string
): (...args: Parameters<T>) => void {
  // Generate unique key if not provided
  const debounceKey = key || `debounce_${Math.random().toString(36).substr(2, 9)}`;
  return NamespaceUtils.createScopedDebounce(func, delay, debounceKey);
}

/**
 * Format file size in human readable format
 * Pure function with no global dependencies
 */
export const formatFileSize = (() => {
  // Constants scoped within IIFE
  const BYTE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;
  const KILOBYTE = 1024;

  return function(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    if (bytes < 0) return 'Invalid size';
    
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(KILOBYTE));
    const clampedIndex = Math.min(unitIndex, BYTE_UNITS.length - 1);
    const size = bytes / Math.pow(KILOBYTE, clampedIndex);
    
    return `${parseFloat(size.toFixed(2))} ${BYTE_UNITS[clampedIndex]}`;
  };
})();

/**
 * Check if device prefers reduced motion using cached feature detection
 */
export function prefersReducedMotion(): boolean {
  return BrowserFeatures.prefersReducedMotion();
}
