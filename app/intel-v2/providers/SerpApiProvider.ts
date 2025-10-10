import type { 
  IntelProvider, 
  IntelRequest, 
  IntelDatum, 
  IntelCapability,
  PricingPayload
} from '../types.js';

/**
 * SerpApi Provider - SERP and pricing intelligence
 */
export class SerpApiProvider implements IntelProvider {
  name = 'serpapi';
  capabilities: IntelCapability[] = ['serp', 'pricing'];

  async isConfigured(_shopId: string): Promise<boolean> {
    // TODO: Check if shop has configured SerpApi key
    return true; // Mock: always configured for testing
  }

  async healthcheck(): Promise<{ ok: boolean; details?: any }> {
    // Simulate API health check
    await new Promise(resolve => setTimeout(resolve, 150));
    
    return {
      ok: Math.random() > 0.05, // 95% success rate
      details: {
        responseTime: Math.floor(Math.random() * 300) + 100,
        apiVersion: 'v1',
        searchesLeft: Math.floor(Math.random() * 10000),
        accountType: 'professional'
      }
    };
  }

  async fetch(req: IntelRequest): Promise<IntelDatum[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 800));
    
    const results: IntelDatum[] = [];
    
    // Generate pricing data if requested
    if (this.capabilities.includes('pricing') && req.productIdentifiers?.length) {
      const pricingPayload: PricingPayload = {
        products: req.productIdentifiers.map((productId, index) => ({
          productId,
          name: `Product ${index + 1} - ${req.query}`,
          price: Math.round((50 + Math.random() * 150) * 100) / 100,
          currency: 'USD',
          seller: 'Amazon',
          availability: Math.random() > 0.2 ? 'in_stock' : 'out_of_stock',
          lastSeenAt: new Date().toISOString()
        }))
      };

      results.push({
        provider: this.name,
        capability: 'pricing',
        payload: pricingPayload,
        meta: {
          confidence: 0.90 + Math.random() * 0.05,
          timestamp: new Date().toISOString(),
          currency: 'USD',
          source: 'serpapi-shopping'
        }
      });
    }

    // Generate SERP data
    if (this.capabilities.includes('serp')) {
      // Mock SERP results - would normally parse actual search results
      const serpPayload = {
        query: req.query,
        results: this.generateSerpResults(req.query),
        ads: this.generateAdResults(req.query),
        featuredSnippet: Math.random() > 0.7 ? this.generateFeaturedSnippet(req.query) : null
      };

      results.push({
        provider: this.name,
        capability: 'serp',
        payload: serpPayload,
        meta: {
          confidence: 0.95,
          timestamp: new Date().toISOString(),
          source: 'serpapi-google'
        }
      });
    }

    return results;
  }

  private generatePriceHistory(): Array<{ date: string; price: number; currency: string }> {
    const prices = [];
    const basePrice = 20 + Math.random() * 200; // $20-220
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const price = Math.round((basePrice * (1 + variation)) * 100) / 100;
      
      prices.push({
        date: date.toISOString().split('T')[0],
        price,
        currency: 'USD'
      });
    }
    
    return prices;
  }

  private generateCompetitorPrices(productId: string): Array<{
    retailer: string;
    price: number;
    currency: string;
    availability: 'in_stock' | 'out_of_stock' | 'limited';
    url?: string;
  }> {
    const retailers = [
      'Amazon', 'eBay', 'Walmart', 'Target', 'Best Buy', 
      'Alibaba', 'AliExpress', 'Newegg'
    ];
    
    const basePrice = 50 + Math.random() * 150;
    
    return retailers.slice(0, Math.floor(Math.random() * 5) + 3).map(retailer => ({
      retailer,
      price: Math.round((basePrice * (0.8 + Math.random() * 0.4)) * 100) / 100,
      currency: 'USD',
      availability: Math.random() > 0.15 ? 'in_stock' : 'out_of_stock',
      url: `https://${retailer.toLowerCase().replace(' ', '')}.com/product/${productId}`
    }));
  }

  private generateSerpResults(query: string): Array<{
    position: number;
    title: string;
    link: string;
    snippet: string;
  }> {
    const results = [];
    
    for (let i = 1; i <= 10; i++) {
      results.push({
        position: i,
        title: `${query} - Result ${i} | Example Site ${i}`,
        link: `https://example-site-${i}.com/${query.replace(' ', '-')}`,
        snippet: `Learn about ${query} from our comprehensive guide. We cover everything you need to know about ${query} including tips, pricing, and reviews.`
      });
    }
    
    return results;
  }

  private generateAdResults(query: string): Array<{
    position: number;
    title: string;
    link: string;
    description: string;
    advertiser: string;
  }> {
    if (Math.random() > 0.6) return []; // 40% chance of ads
    
    return [
      {
        position: 1,
        title: `Best ${query} Deals | Shop Now`,
        link: `https://shop-example.com/${query}`,
        description: `Find the best ${query} with free shipping. Compare prices and save today!`,
        advertiser: 'Shop Example'
      },
      {
        position: 2,
        title: `${query} Reviews & Ratings`,
        link: `https://reviews-site.com/${query}`,
        description: `Read real customer reviews for ${query}. Make informed decisions with verified reviews.`,
        advertiser: 'Review Site'
      }
    ];
  }

  private generateFeaturedSnippet(query: string): {
    title: string;
    snippet: string;
    link: string;
  } {
    return {
      title: `What is ${query}?`,
      snippet: `${query} is a popular product category that offers various benefits including improved functionality and enhanced user experience. Key features include durability, ease of use, and competitive pricing.`,
      link: `https://wikipedia.org/wiki/${query.replace(' ', '_')}`
    };
  }
}

// Export singleton
export const serpApiProvider = new SerpApiProvider();