import type { LoaderFunctionArgs } from '@remix-run/node';
import type { 
  IntelRequest, 
  IntelStreamChunk, 
  NormalizedIntel,
  IntelProvider
} from '../intel-v2/types.js';
import { queryPlanner } from '../intel-v2/QueryPlanner.js';
import { requestCoordinator } from '../intel-v2/RequestCoordinator.js';
import { resultNormalizer } from '../intel-v2/ResultNormalizer.js';
import { intelCache } from '../intel-v2/IntelCache.js';
// import { complianceMiddleware } from '../intel-v2/ComplianceMiddleware.js';
import { providerRegistry } from '../intel-v2/ProviderRegistry.js';

/**
 * Streaming Intelligence API - Real-time competitor analysis via SSE
 * 
 * Usage:
 * const eventSource = new EventSource('/app/api/intel/stream?query=snowboard+companies&domain=burton.com&market=US');
 * eventSource.onmessage = (e) => console.log(JSON.parse(e.data));
 */
export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const shopId = 'test-shop'; // TODO: Get from session
  
  // Parse request parameters
  const intelRequest: IntelRequest = {
    query: url.searchParams.get('query') || '',
    domain: url.searchParams.get('domain') || undefined,
    market: url.searchParams.get('market') || undefined,
    locale: url.searchParams.get('locale') || undefined,
    maxResults: parseInt(url.searchParams.get('maxResults') || '20'),
    productIdentifiers: url.searchParams.getAll('productId').filter(Boolean),
    capabilities: url.searchParams.getAll('capability') as any[],
    hasUserConsent: url.searchParams.get('consent') === 'true'
  };
  
  // Validation
  if (!intelRequest.query && !intelRequest.domain) {
    throw new Response('Query or domain required', { status: 400 });
  }
  
  // Create streaming response
  const stream = new ReadableStream({
    start(controller) {
      executeIntelligenceQuery(intelRequest, shopId, controller)
        .catch(error => {
          const errorChunk: IntelStreamChunk = {
            type: 'error',
            requestId: 'unknown',
            timestamp: Date.now(),
            error: {
              code: 'EXECUTION_ERROR',
              message: error.message,
              provider: 'system'
            }
          };
          
          controller.enqueue(`data: ${JSON.stringify(errorChunk)}\\n\\n`);
          controller.close();
        });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}

/**
 * Execute intelligence query with real-time streaming
 */
async function executeIntelligenceQuery(
  request: IntelRequest,
  shopId: string,
  controller: ReadableStreamDefaultController
) {
  
  // 1. Create query plan
  const plan = await queryPlanner.planQueries(request, shopId);
  
  const planChunk: IntelStreamChunk = {
    type: 'plan',
    requestId: plan.requestId,
    timestamp: Date.now(),
    plan: {
      capabilities: plan.capabilities,
      providers: plan.selectedProviders,
      estimatedCost: plan.estimatedCost,
      estimatedDuration: plan.estimatedDuration,
      rateLimitWarnings: plan.rateLimitWarnings
    }
  };
  
  controller.enqueue(`data: ${JSON.stringify(planChunk)}\\n\\n`);
  
  // 2. Check cache first if requested
  if (plan.cacheStrategy === 'cache_first') {
    const cacheKey = `${request.query || ''}_${request.domain || ''}`;
    const cached = await intelCache.get(cacheKey);
    if (cached) {
      const cacheChunk: IntelStreamChunk = {
        type: 'cache_hit',
        requestId: plan.requestId,
        timestamp: Date.now(),
        data: cached
      };
      
      controller.enqueue(`data: ${JSON.stringify(cacheChunk)}\\n\\n`);
      controller.close();
      return;
    }
  }
  
  // 3. Execute providers in parallel with streaming results
  const providers = plan.selectedProviders
    .map((name: string) => providerRegistry.getProvider(name))
    .filter((provider): provider is IntelProvider => provider !== undefined);
  
  const allResults: NormalizedIntel[] = [];
  let completedProviders = 0;
  
  // Execute each provider
  const providerPromises = providers.map(async (provider) => {
    try {
      // Rate limit check
      const canMakeRequest = await requestCoordinator.canMakeRequest(provider.name, 0.05);
      if (!canMakeRequest.allowed) {
        const errorChunk: IntelStreamChunk = {
          type: 'provider_error',
          requestId: plan.requestId,
          timestamp: Date.now(),
          provider: provider.name,
          error: {
            code: 'RATE_LIMITED',
            message: canMakeRequest.reason || 'Rate limit exceeded',
            provider: provider.name
          }
        };
        
        controller.enqueue(`data: ${JSON.stringify(errorChunk)}\\n\\n`);
        return;
      }
      
      // Execute provider
      const startTime = Date.now();
      
      const statusChunk: IntelStreamChunk = {
        type: 'provider_start',
        requestId: plan.requestId,
        timestamp: startTime,
        provider: provider.name,
        status: {
          message: `Starting ${provider.name}...`,
          progress: 0
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(statusChunk)}\\n\\n`);
      
      const rawResults = await requestCoordinator.executeRequest(
        provider.name,
        async () => await provider.fetch(request),
        0.05
      );
      
      const duration = Date.now() - startTime;
      
      // Normalize results
      const normalized = await resultNormalizer.normalizeResults(rawResults);
      allResults.push(...normalized);
      
      // Stream provider completion
      const completionChunk: IntelStreamChunk = {
        type: 'provider_complete',
        requestId: plan.requestId,
        timestamp: Date.now(),
        provider: provider.name,
        data: normalized,
        meta: {
          duration,
          resultCount: normalized.length,
          cost: calculateProviderCost(provider.name, normalized.length)
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(completionChunk)}\\n\\n`);
      
    } catch (error) {
      const errorChunk: IntelStreamChunk = {
        type: 'provider_error',
        requestId: plan.requestId,
        timestamp: Date.now(),
        provider: provider.name,
        error: {
          code: 'PROVIDER_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
          provider: provider.name
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(errorChunk)}\\n\\n`);
    } finally {
      completedProviders++;
      
      // Progress update
      const progressChunk: IntelStreamChunk = {
        type: 'progress',
        requestId: plan.requestId,
        timestamp: Date.now(),
        status: {
          message: `Completed ${completedProviders}/${providers.length} providers`,
          progress: (completedProviders / providers.length) * 100
        }
      };
      
      controller.enqueue(`data: ${JSON.stringify(progressChunk)}\\n\\n`);
    }
  });
  
  // Wait for all providers to complete
  await Promise.allSettled(providerPromises);
  
  // 4. Final aggregation and deduplication
  const finalResults = allResults; // Simple aggregation for now
  
  // 5. Cache results for future requests
  if (finalResults.length > 0) {
    const cacheKey = `${request.query || ''}_${request.domain || ''}`;
    intelCache.set(cacheKey, finalResults, 600); // 10 minute TTL
  }
  
  // 6. Send final summary
  const summaryChunk: IntelStreamChunk = {
    type: 'complete',
    requestId: plan.requestId,
    timestamp: Date.now(),
    data: finalResults,
    summary: {
      totalResults: finalResults.length,
      providersUsed: completedProviders,
      totalDuration: Date.now() - Date.parse(planChunk.timestamp.toString()),
      totalCost: calculateTotalCost(providers.map(p => p.name), finalResults.length),
      capabilities: plan.capabilities
    }
  };
  
  controller.enqueue(`data: ${JSON.stringify(summaryChunk)}\\n\\n`);
  controller.close();
}

/**
 * Calculate provider-specific cost
 */
function calculateProviderCost(providerName: string, resultCount: number): number {
  const costPerResult: Record<string, number> = {
    ahrefs: 0.005,
    semrush: 0.004,
    similarweb: 0.007,
    serpapi: 0.0025,
    price2spy: 0.0015,
    trustpilot: 0.001,
    brandwatch: 0.006
  };
  
  return (costPerResult[providerName] || 0.003) * resultCount;
}

/**
 * Calculate total cost for all providers
 */
function calculateTotalCost(providers: string[], totalResults: number): number {
  return providers.reduce((total, provider) => {
    return total + calculateProviderCost(provider, Math.floor(totalResults / providers.length));
  }, 0);
}