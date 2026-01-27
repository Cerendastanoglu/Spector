import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import prisma from "~/db.server";
import { logger } from "~/utils/logger";

// This webhook is called by Cloud Scheduler every minute to execute pending scheduled actions
// It doesn't require Shopify authentication since it's triggered externally

// GraphQL mutations
const PUBLISH_PRODUCT_MUTATION = `#graphql
  mutation publishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UNPUBLISH_PRODUCT_MUTATION = `#graphql
  mutation publishableUnpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const UPDATE_PRODUCT_STATUS_MUTATION = `#graphql
  mutation productUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_PUBLICATIONS_QUERY = `#graphql
  query getPublications {
    publications(first: 10) {
      nodes {
        id
        name
      }
    }
  }
`;

// Verify the request is from Cloud Scheduler (basic security)
function verifySchedulerRequest(request: Request): boolean {
  // In production, you should verify the OIDC token from Cloud Scheduler
  // For now, we'll use a simple secret header
  const schedulerSecret = process.env.SCHEDULER_SECRET;
  const providedSecret = request.headers.get('X-Scheduler-Secret');
  
  // If no secret is configured, allow the request (dev mode)
  if (!schedulerSecret) {
    logger.warn('[Scheduler Webhook] No SCHEDULER_SECRET configured - allowing request');
    return true;
  }
  
  return providedSecret === schedulerSecret;
}

export async function action({ request }: ActionFunctionArgs) {
  // Only allow POST
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  // Verify the request
  if (!verifySchedulerRequest(request)) {
    logger.warn('[Scheduler Webhook] Unauthorized request');
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startTime = Date.now();
  logger.info('[Scheduler Webhook] Processing pending scheduled actions...');

  try {
    // Find all pending actions that should be executed now
    const now = new Date();
    const pendingActions = await prisma.scheduledAction.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
      },
      take: 10, // Process up to 10 at a time to avoid timeouts
    });

    if (pendingActions.length === 0) {
      logger.info('[Scheduler Webhook] No pending actions to execute');
      return json({ 
        success: true, 
        message: 'No pending actions',
        processed: 0,
        duration: Date.now() - startTime,
      });
    }

    logger.info(`[Scheduler Webhook] Found ${pendingActions.length} actions to execute`);

    const results = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Group actions by shop to batch API calls
    const actionsByShop = pendingActions.reduce((acc: Record<string, any[]>, action: any) => {
      if (!acc[action.shop]) {
        acc[action.shop] = [];
      }
      acc[action.shop].push(action);
      return acc;
    }, {} as Record<string, any[]>);

    // Process each shop's actions
    for (const [shop, actions] of Object.entries(actionsByShop) as [string, any[]][]) {
      try {
        // Get the shop's session for API access
        const session = await prisma.session.findFirst({
          where: { shop },
          orderBy: { expires: 'desc' },
        });

        if (!session || !session.accessToken) {
          logger.error(`[Scheduler Webhook] No valid session for shop: ${shop}`);
          
          // Mark all actions for this shop as failed
          for (const action of actions) {
            await prisma.scheduledAction.update({
              where: { id: action.id },
              data: { 
                status: 'failed',
                error: 'No valid session found',
                executedAt: new Date(),
              },
            });
            results.failed++;
          }
          continue;
        }

        // Execute each action for this shop
        for (const action of actions) {
          results.processed++;
          
          try {
            // Mark as executing
            await prisma.scheduledAction.update({
              where: { id: action.id },
              data: { status: 'executing' },
            });

            // Execute the action using Shopify Admin API directly
            await executeAction(shop, session.accessToken, action);

            // Mark as completed
            await prisma.scheduledAction.update({
              where: { id: action.id },
              data: { 
                status: 'completed',
                executedAt: new Date(),
              },
            });

            results.succeeded++;
            logger.info(`[Scheduler Webhook] Executed ${action.actionType} for product ${action.productId}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Mark as failed
            await prisma.scheduledAction.update({
              where: { id: action.id },
              data: { 
                status: 'failed',
                error: errorMessage,
                executedAt: new Date(),
              },
            });

            results.failed++;
            results.errors.push(`${action.productTitle}: ${errorMessage}`);
            logger.error(`[Scheduler Webhook] Failed to execute action:`, { action, error });
          }
        }
      } catch (shopError) {
        logger.error(`[Scheduler Webhook] Error processing shop ${shop}:`, shopError);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`[Scheduler Webhook] Completed in ${duration}ms:`, results);

    return json({ 
      success: true, 
      ...results,
      duration,
    });
  } catch (error) {
    logger.error('[Scheduler Webhook] Fatal error:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      duration: Date.now() - startTime,
    }, { status: 500 });
  }
}

// Execute a scheduled action using the Shopify Admin API
async function executeAction(shop: string, accessToken: string, action: any) {
  const apiUrl = `https://${shop}/admin/api/2024-10/graphql.json`;
  
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Access-Token': accessToken,
  };

  if (action.actionType === 'publish' || action.actionType === 'unpublish') {
    // First, get the online store publication ID
    const pubResponse = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: GET_PUBLICATIONS_QUERY }),
    });
    
    const pubData = await pubResponse.json();
    
    if (pubData.errors) {
      throw new Error(pubData.errors[0]?.message || 'Failed to get publications');
    }

    const onlineStorePublication = pubData.data?.publications?.nodes?.find(
      (p: any) => p.name === 'Online Store' || p.name.includes('Online')
    );

    if (!onlineStorePublication) {
      throw new Error('Online Store publication not found');
    }

    // Execute publish/unpublish
    const mutation = action.actionType === 'publish' 
      ? PUBLISH_PRODUCT_MUTATION 
      : UNPUBLISH_PRODUCT_MUTATION;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: mutation,
        variables: {
          id: action.productId,
          input: [{ publicationId: onlineStorePublication.id }],
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    const userErrors = action.actionType === 'publish'
      ? result.data?.publishablePublish?.userErrors
      : result.data?.publishableUnpublish?.userErrors;

    if (userErrors && userErrors.length > 0) {
      throw new Error(userErrors[0].message);
    }
  } else if (['draft', 'archive', 'active'].includes(action.actionType)) {
    // Update product status
    const statusMap: Record<string, string> = {
      'draft': 'DRAFT',
      'archive': 'ARCHIVED',
      'active': 'ACTIVE',
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: UPDATE_PRODUCT_STATUS_MUTATION,
        variables: {
          product: {
            id: action.productId,
            status: statusMap[action.actionType],
          },
        },
      }),
    });

    const result = await response.json();
    
    if (result.errors) {
      throw new Error(result.errors[0]?.message || 'GraphQL error');
    }

    if (result.data?.productUpdate?.userErrors?.length > 0) {
      throw new Error(result.data.productUpdate.userErrors[0].message);
    }
  } else {
    throw new Error(`Unknown action type: ${action.actionType}`);
  }
}

// Also handle GET for health check
export async function loader() {
  return json({ status: 'ok', endpoint: 'scheduler-webhook' });
}
