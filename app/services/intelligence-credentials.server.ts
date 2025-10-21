/**
 * Intelligence API Credential Management
 * Server-side utilities for encrypted credential storage
 */

import db from '../db.server';
import { encryptData, decryptData } from '../utils/encryption';

/**
 * Store encrypted credentials for a provider
 */
export async function storeProviderCredentials(
  shop: string,
  providerId: string,
  apiKey: string
): Promise<boolean> {
  try {
    // Encrypt the API key
    const encryptedApiKey = encryptData(apiKey);
    
    // Store or update encrypted credentials in database
    await db.intelligenceCredentials.upsert({
      where: {
        shop_providerId: {
          shop,
          providerId,
        },
      },
      update: {
        encryptedApiKey,
        isActive: true,
        updatedAt: new Date(),
      },
      create: {
        shop,
        providerId,
        encryptedApiKey,
        isActive: true,
      },
    });
    
    console.log(`✅ Encrypted credentials stored for ${shop}:${providerId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error storing credentials for ${shop}:${providerId}:`, error);
    return false;
  }
}

/**
 * Check if provider credentials exist and are active
 */
export async function checkProviderCredentials(
  shop: string,
  providerId: string
): Promise<boolean> {
  try {
    const credential = await db.intelligenceCredentials.findUnique({
      where: {
        shop_providerId: {
          shop,
          providerId,
        },
      },
      select: {
        isActive: true,
        encryptedApiKey: true,
      },
    });
    
    // Return true if credentials exist and are active
    return !!credential?.isActive && !!credential?.encryptedApiKey;
  } catch (error) {
    console.error(`❌ Error checking credentials for ${shop}:${providerId}:`, error);
    return false;
  }
}

/**
 * Retrieve and decrypt provider credentials
 */
export async function getProviderCredentials(
  shop: string,
  providerId: string
): Promise<string | null> {
  try {
    const credential = await db.intelligenceCredentials.findUnique({
      where: {
        shop_providerId: {
          shop,
          providerId,
        },
      },
      select: {
        isActive: true,
        encryptedApiKey: true,
      },
    });
    
    if (!credential?.isActive || !credential?.encryptedApiKey) {
      return null;
    }
    
    // Decrypt and return API key
    const decryptedData = decryptData(credential.encryptedApiKey);
    return decryptedData as string;
  } catch (error) {
    console.error(`❌ Error retrieving credentials for ${shop}:${providerId}:`, error);
    return null;
  }
}

/**
 * Deactivate credentials for a provider
 */
export async function deactivateProviderCredentials(
  shop: string,
  providerId: string
): Promise<boolean> {
  try {
    await db.intelligenceCredentials.update({
      where: {
        shop_providerId: {
          shop,
          providerId,
        },
      },
      data: {
        isActive: false,
        updatedAt: new Date(),
      },
    });
    
    console.log(`✅ Credentials deactivated for ${shop}:${providerId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deactivating credentials for ${shop}:${providerId}:`, error);
    return false;
  }
}

/**
 * Delete credentials for a provider
 */
export async function deleteProviderCredentials(
  shop: string,
  providerId: string
): Promise<boolean> {
  try {
    await db.intelligenceCredentials.delete({
      where: {
        shop_providerId: {
          shop,
          providerId,
        },
      },
    });
    
    console.log(`✅ Credentials deleted for ${shop}:${providerId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error deleting credentials for ${shop}:${providerId}:`, error);
    return false;
  }
}

/**
 * Get all active providers for a shop
 */
export async function getActiveProviders(shop: string): Promise<string[]> {
  try {
    const credentials = await db.intelligenceCredentials.findMany({
      where: {
        shop,
        isActive: true,
      },
      select: {
        providerId: true,
      },
    });
    
    return credentials.map(c => c.providerId);
  } catch (error) {
    console.error(`❌ Error getting active providers for ${shop}:`, error);
    return [];
  }
}
