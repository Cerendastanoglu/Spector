import type { 
  IntelProvider, 
  IntelCapability, 
  IntelRequest, 
  ShopSecrets,
  ComplianceConfig 
} from './types.js';

/**
 * Provider Registry - Central management of intelligence providers
 */
export class ProviderRegistry {
  private providers = new Map<string, IntelProvider>();
  private complianceConfig: ComplianceConfig = {
    allowedProviders: [],
    blockedRegions: [],
    requiresExplicitConsent: true, // ON by default for ToS compliance
    robotsTxtRespect: true
  };

  constructor(complianceConfig?: Partial<ComplianceConfig>) {
    if (complianceConfig) {
      this.complianceConfig = { ...this.complianceConfig, ...complianceConfig };
    }
  }

  /**
   * Add a provider to the registry
   */
  addProvider(provider: IntelProvider): void {
    if (!this.isProviderAllowed(provider.name)) {
      throw new Error(`Provider ${provider.name} is not in allowed list`);
    }

    this.providers.set(provider.name, provider);
    console.log(`✅ Registered provider: ${provider.name} (${provider.capabilities.join(', ')})`);
  }

  /**
   * Get providers by capability
   */
  getByCapability(capability: IntelCapability): IntelProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => 
        provider.capabilities.includes(capability) &&
        this.isProviderAllowed(provider.name)
      );
  }

  /**
   * Get all configured providers for a shop
   */
  async getConfiguredProviders(shopId: string): Promise<IntelProvider[]> {
    const configuredProviders: IntelProvider[] = [];
    
    for (const provider of this.providers.values()) {
      if (await provider.isConfigured(shopId)) {
        configuredProviders.push(provider);
      }
    }
    
    return configuredProviders;
  }

  /**
   * Get provider by name
   */
  getProvider(name: string): IntelProvider | undefined {
    return this.providers.get(name);
  }

  /**
   * Get all providers
   */
  getAllProviders(): IntelProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Run health check for all providers
   */
  async runHealthChecks(): Promise<Record<string, { ok: boolean; details?: any }>> {
    const results: Record<string, { ok: boolean; details?: any }> = {};
    
    const healthCheckPromises = Array.from(this.providers.entries()).map(
      async ([name, provider]) => {
        try {
          const health = await provider.healthcheck();
          results[name] = health;
        } catch (error) {
          results[name] = {
            ok: false,
            details: { error: error instanceof Error ? error.message : 'Unknown error' }
          };
        }
      }
    );

    await Promise.all(healthCheckPromises);
    return results;
  }

  /**
   * Get providers for a specific request
   */
  async getPlanProviders(request: IntelRequest, shopId: string): Promise<IntelProvider[]> {
    const requestedCapabilities = request.capabilities || [];
    if (requestedCapabilities.length === 0) {
      return [];
    }

    const availableProviders = new Set<IntelProvider>();
    
    // Get providers for each capability
    for (const capability of requestedCapabilities) {
      const providers = this.getByCapability(capability);
      providers.forEach(provider => availableProviders.add(provider));
    }

    // Filter by configured status
    const configuredProviders: IntelProvider[] = [];
    for (const provider of availableProviders) {
      if (await provider.isConfigured(shopId)) {
        configuredProviders.push(provider);
      }
    }

    return configuredProviders;
  }

  /**
   * Check if provider is allowed by compliance config
   */
  private isProviderAllowed(providerName: string): boolean {
    if (this.complianceConfig.allowedProviders.length === 0) {
      return true; // No restrictions if empty
    }
    return this.complianceConfig.allowedProviders.includes(providerName);
  }

  /**
   * Update compliance configuration
   */
  updateCompliance(config: Partial<ComplianceConfig>): void {
    this.complianceConfig = { ...this.complianceConfig, ...config };
    console.log('🔒 Updated compliance configuration');
  }

  /**
   * Get compliance status for a region
   */
  isRegionBlocked(region: string): boolean {
    return this.complianceConfig.blockedRegions.includes(region);
  }

  /**
   * Export registry status for health dashboard
   */
  async exportStatus(shopId: string): Promise<{
    totalProviders: number;
    configuredProviders: number;
    capabilityCoverage: Record<IntelCapability, number>;
    compliance: ComplianceConfig;
  }> {
    const configuredProviders = await this.getConfiguredProviders(shopId);
    
    const capabilityCoverage: Record<IntelCapability, number> = {
      keywords: 0,
      traffic: 0,
      pricing: 0,
      serp: 0,
      reviews: 0,
      social: 0,
      company_profile: 0
    };

    // Count providers per capability
    for (const provider of configuredProviders) {
      for (const capability of provider.capabilities) {
        capabilityCoverage[capability]++;
      }
    }

    return {
      totalProviders: this.providers.size,
      configuredProviders: configuredProviders.length,
      capabilityCoverage,
      compliance: this.complianceConfig
    };
  }
}

/**
 * Shop secrets management (BYOK)
 */
export class SecretsManager {
  private secrets = new Map<string, ShopSecrets>();

  /**
   * Get shop secrets (encrypted keys per provider)
   */
  async getShopSecrets(shopId: string): Promise<Record<string, string>> {
    const shopSecrets = this.secrets.get(shopId);
    if (!shopSecrets) {
      return {};
    }

    // In production, decrypt the secrets here
    // For now, return as-is (they should be encrypted in storage)
    return shopSecrets.secrets;
  }

  /**
   * Set provider secret for shop
   */
  async setProviderSecret(shopId: string, provider: string, secret: string): Promise<void> {
    let shopSecrets = this.secrets.get(shopId);
    
    if (!shopSecrets) {
      shopSecrets = {
        shopId,
        secrets: {},
        lastUpdated: new Date().toISOString()
      };
    }

    // In production, encrypt the secret before storing
    // DO NOT LOG THE SECRET
    shopSecrets.secrets[provider] = secret; // Should be encrypted
    shopSecrets.lastUpdated = new Date().toISOString();
    
    this.secrets.set(shopId, shopSecrets);
    
    console.log(`🔐 Updated secret for provider ${provider} (shop: ${shopId})`);
  }

  /**
   * Check if provider is configured for shop
   */
  async isProviderConfigured(shopId: string, provider: string): Promise<boolean> {
    const secrets = await this.getShopSecrets(shopId);
    return Boolean(secrets[provider]);
  }

  /**
   * Delete all secrets for shop
   */
  async deleteShopSecrets(shopId: string): Promise<void> {
    this.secrets.delete(shopId);
    console.log(`🗑️ Deleted all secrets for shop: ${shopId}`);
  }

  /**
   * Get provider secret (for provider internal use)
   */
  async getProviderSecret(shopId: string, provider: string): Promise<string | null> {
    const secrets = await this.getShopSecrets(shopId);
    return secrets[provider] || null;
  }
}

// Global instances
export const providerRegistry = new ProviderRegistry({
  allowedProviders: [
    'ahrefs',
    'semrush', 
    'similarweb',
    'serpapi',
    'price2spy',
    'trustpilot',
    'brandwatch'
  ],
  requiresExplicitConsent: true,
  robotsTxtRespect: true
});

export const secretsManager = new SecretsManager();

// Register actual provider implementations
import { ahrefsProvider } from './providers/AhrefsProvider.js';
import { serpApiProvider } from './providers/SerpApiProvider.js';

// Add providers to registry
providerRegistry.addProvider(ahrefsProvider);
providerRegistry.addProvider(serpApiProvider);

console.log('🚀 Intelligence v2 system initialized with provider stubs');