import { type LoaderFunctionArgs, type ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { authenticate } from '../shopify.server';
import type { IntelRequest, StreamChunk } from '../intel/types';
import { providerRegistry } from '../intel/ProviderRegistry';
import { QueryPlanner } from '../intel/QueryPlanner';

/**
 * On-Demand Intelligence API Route
 * 
 * Provides streaming competitor intelligence using BYOK credentials
 * Supports real-time research without database storage
 */

export async function loader({ request }: LoaderFunctionArgs) {
  await authenticate.admin(request);
  
  const url = new URL(request.url);
  const action = url.searchParams.get('action');
  
  switch (action) {
    case 'providers': {
      const allMetrics = providerRegistry.getMetrics() as Map<string, any>;
      return json({
        providers: providerRegistry.getAllProviders(),
        metrics: Object.fromEntries(allMetrics)
      });
    }
      
    case 'health': {
      return json({
        status: 'healthy',
        providers: providerRegistry.getAllProviders().map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          healthy: providerRegistry.isHealthy(p.id)
        }))
      });
    }
      
    default:
      return json({ error: 'Invalid action' }, { status: 400 });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  await authenticate.admin(request);
  // Extract shop domain from session or request
  const shop = request.url.match(/https:\/\/([^.]+)\.myshopify\.com/)?.[1] || 'demo-shop';
  
  if (!shop) {
    return json({ error: 'Could not identify shop' }, { status: 400 });
  }

  const body = await request.json();
  const { action } = body;

  switch (action) {
    case 'intelligence':
      return handleIntelligenceRequest(body, shop, request);
    case 'credentials':
      return handleCredentialsUpdate(body, shop);
    default:
      return json({ error: 'Invalid action' }, { status: 400 });
  }
}

/**
 * Handle streaming intelligence requests
 */
async function handleIntelligenceRequest(
  body: { request: IntelRequest },
  shop: string,
  request: Request
) {
  try {
    const { request: intelRequest } = body;

    // Validate request
    if (!intelRequest.type || !intelRequest.target || !intelRequest.providers) {
      return json({ 
        error: 'Missing required fields: type, target, providers' 
      }, { status: 400 });
    }

    // Check if client accepts streaming
    const acceptsStream = request.headers.get('accept')?.includes('text/stream') ||
                         request.headers.get('accept')?.includes('text/event-stream');

    if (acceptsStream) {
      // Return streaming response
      return createStreamingResponse(intelRequest, shop);
    } else {
      // Return regular JSON response
      return await executeIntelRequest(intelRequest, shop);
    }

  } catch (error) {
    console.error('Intelligence request error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Request failed' 
    }, { status: 500 });
  }
}

/**
 * Create Server-Sent Events streaming response
 */
function createStreamingResponse(intelRequest: IntelRequest, shop: string) {
  const stream = new ReadableStream({
    start(controller) {
      executeStreamingIntel(intelRequest, shop, controller);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * Execute streaming intelligence request
 */
async function executeStreamingIntel(
  intelRequest: IntelRequest,
  shop: string,
  controller: ReadableStreamDefaultController
) {
  try {
    const queryPlanner = new QueryPlanner();
    
    // Send initial status
    sendSSE(controller, 'status', { 
      message: 'Starting intelligence query...',
      request: intelRequest 
    });

    // Create execution plan
    const plan = await queryPlanner.createPlan(intelRequest);
    
    sendSSE(controller, 'plan', {
      requestId: plan.requestId,
      providers: plan.providers.map(p => ({ id: p.id, name: p.name })),
      estimatedDuration: plan.estimatedDuration,
      cacheStrategy: plan.cacheStrategy
    });

    // Execute plan with streaming chunks
    const result = await queryPlanner.executePlan(plan, intelRequest, (chunk: StreamChunk) => {
      sendSSE(controller, 'chunk', chunk);
    });

    // Send final result
    sendSSE(controller, 'complete', {
      requestId: plan.requestId,
      result,
      metadata: {
        completedAt: new Date().toISOString(),
        providersUsed: plan.providers.length,
        cached: false
      }
    });

  } catch (error) {
    sendSSE(controller, 'error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    controller.close();
  }
}

/**
 * Execute non-streaming intelligence request
 */
async function executeIntelRequest(intelRequest: IntelRequest, _shop: string) {
  const queryPlanner = new QueryPlanner();
  const plan = await queryPlanner.createPlan(intelRequest);
  
  const chunks: StreamChunk[] = [];
  const result = await queryPlanner.executePlan(plan, intelRequest, (chunk) => {
    chunks.push(chunk);
  });

  return json({
    requestId: plan.requestId,
    result,
    chunks,
    metadata: {
      completedAt: new Date().toISOString(),
      providersUsed: plan.providers.length,
      estimatedDuration: plan.estimatedDuration
    }
  });
}

/**
 * Handle credential updates for BYOK
 */
async function handleCredentialsUpdate(
  body: { providerId: string; credentials: Record<string, string> },
  shop: string
) {
  try {
    const { providerId, credentials } = body;

    if (!providerId || !credentials) {
      return json({ error: 'Missing providerId or credentials' }, { status: 400 });
    }

    // Validate credentials object structure
    if (typeof credentials !== 'object' || !credentials.apiKey) {
      return json({ error: 'Invalid credentials format. Expected { apiKey: string }' }, { status: 400 });
    }

    // Import credential management service
    const { storeProviderCredentials } = await import('../services/intelligence-credentials.server');
    
    // Store encrypted credentials
    const success = await storeProviderCredentials(shop, providerId, credentials.apiKey);
    
    if (!success) {
      return json({ 
        error: 'Failed to store credentials securely' 
      }, { status: 500 });
    }
    
    return json({ 
      success: true,
      message: `Credentials securely stored for ${providerId}` 
    });

  } catch (error) {
    console.error('❌ Credential update error:', error);
    return json({ 
      error: error instanceof Error ? error.message : 'Update failed' 
    }, { status: 500 });
  }
}

/**
 * Send Server-Sent Event
 */
function sendSSE(
  controller: ReadableStreamDefaultController,
  event: string,
  data: any
) {
  const message = `event: ${event}\\ndata: ${JSON.stringify(data)}\\n\\n`;
  controller.enqueue(new TextEncoder().encode(message));
}

/**
 * Get available provider types for shop
 */
export function getAvailableProviders(_shop: string) {
  // TODO: Filter providers based on shop's credentials
  // For now return all providers
  return providerRegistry.getAllProviders();
}