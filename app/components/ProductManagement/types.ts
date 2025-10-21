// Shared types for ProductManagement components

export interface Product {
  id: string;
  title: string;
  handle: string;
  featuredMedia?: {
    preview?: {
      image?: {
        url: string;
        altText?: string;
      };
    };
  };
  media?: {
    edges: Array<{
      node: {
        id: string;
        image?: {
          url: string;
          altText?: string;
        };
      };
    }>;
  };
  totalInventory: number;
  status: string;
  tags?: string[];
  adminUrl?: string;
  storefrontUrl?: string;
  collections?: {
    edges: Array<{
      node: {
        id: string;
        handle: string;
        title: string;
      };
    }>;
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
        inventoryItem?: {
          id: string;
          tracked: boolean;
        };
      };
    }>;
  };
}

export type InventoryCategory = 'all' | 'in-stock' | 'low-stock' | 'out-of-stock';
export type SortField = 'title' | 'inventory' | 'price' | 'status';
export type SortDirection = 'asc' | 'desc';

export interface Collection {
  id: string;
  title: string;
}

export interface NotificationState {
  show: boolean;
  message: string;
  error?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}
