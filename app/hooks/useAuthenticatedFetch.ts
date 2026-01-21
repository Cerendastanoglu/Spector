/**
 * Authenticated fetch hook for Shopify embedded apps
 * 
 * This hook provides a fetch function that automatically includes
 * the session token in the Authorization header, which is required
 * for Shopify's session token authentication.
 * 
 * Usage:
 *   const fetch = useAuthenticatedFetch();
 *   const response = await fetch('/app/api/products', { method: 'POST', body: formData });
 */

import { useCallback } from 'react';
import { useAppBridge } from '@shopify/app-bridge-react';
import { authenticatedFetch } from '@shopify/app-bridge/utilities';

/**
 * Returns an authenticated fetch function that includes session tokens
 */
export function useAuthenticatedFetch() {
  const app = useAppBridge();
  
  const fetchWithAuth = useCallback(
    async (uri: string, options?: RequestInit): Promise<Response> => {
      const authFetch = authenticatedFetch(app);
      return authFetch(uri, options);
    },
    [app]
  );

  return fetchWithAuth;
}

/**
 * Type for the authenticated fetch function
 */
export type AuthenticatedFetch = (uri: string, options?: RequestInit) => Promise<Response>;
