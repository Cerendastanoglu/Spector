import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { authenticate } from "~/shopify.server";
import prisma from "~/db.server";
import { logger } from "~/utils/logger";

// GraphQL mutation to publish/unpublish products
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

// GET - List scheduled actions for a shop
export async function loader({ request }: LoaderFunctionArgs) {
  try {
    const { session } = await authenticate.admin(request);
    const shop = session.shop;

    const scheduledActions = await prisma.scheduledAction.findMany({
      where: { 
        shop,
        status: { in: ['pending', 'executing'] }
      },
      orderBy: { scheduledFor: 'asc' },
    });

    // Also get recent completed/failed for history
    const recentHistory = await prisma.scheduledAction.findMany({
      where: { 
        shop,
        status: { in: ['completed', 'failed', 'cancelled'] }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20,
    });

    return json({ 
      success: true, 
      scheduled: scheduledActions,
      history: recentHistory,
    });
  } catch (error) {
    logger.error('[Scheduling] Error loading scheduled actions:', error);
    return json({ success: false, error: 'Failed to load scheduled actions' }, { status: 500 });
  }
}

// POST - Create, update, or delete scheduled actions
export async function action({ request }: ActionFunctionArgs) {
  try {
    const { admin, session } = await authenticate.admin(request);
    const shop = session.shop;
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case 'create': {
        const { productId, productTitle, actionType, scheduledFor } = data;
        
        if (!productId || !actionType || !scheduledFor) {
          return json({ success: false, error: 'Missing required fields' }, { status: 400 });
        }

        // Validate scheduled time is in the future
        const scheduledDate = new Date(scheduledFor);
        if (scheduledDate <= new Date()) {
          return json({ success: false, error: 'Scheduled time must be in the future' }, { status: 400 });
        }

        // Check for duplicate scheduling
        const existingAction = await prisma.scheduledAction.findFirst({
          where: {
            shop,
            productId,
            actionType,
            status: 'pending',
          },
        });

        if (existingAction) {
          // Update existing instead of creating duplicate
          const updated = await prisma.scheduledAction.update({
            where: { id: existingAction.id },
            data: { 
              scheduledFor: scheduledDate,
              productTitle,
            },
          });
          
          logger.info(`[Scheduling] Updated scheduled action for ${productTitle}:`, {
            shop,
            actionType,
            scheduledFor: scheduledDate.toISOString(),
          });
          
          return json({ success: true, scheduledAction: updated, updated: true });
        }

        // Create new scheduled action
        const scheduledAction = await prisma.scheduledAction.create({
          data: {
            shop,
            productId,
            productTitle: productTitle || 'Unknown Product',
            actionType,
            scheduledFor: scheduledDate,
            status: 'pending',
          },
        });

        logger.info(`[Scheduling] Created scheduled action for ${productTitle}:`, {
          shop,
          actionType,
          scheduledFor: scheduledDate.toISOString(),
        });

        return json({ success: true, scheduledAction });
      }

      case 'cancel': {
        const { id } = data;
        
        if (!id) {
          return json({ success: false, error: 'Missing action ID' }, { status: 400 });
        }

        const scheduledAction = await prisma.scheduledAction.update({
          where: { id },
          data: { status: 'cancelled' },
        });

        logger.info(`[Scheduling] Cancelled scheduled action:`, { id, shop });

        return json({ success: true, scheduledAction });
      }

      case 'execute-now': {
        // Manually execute a scheduled action immediately
        const { id } = data;
        
        if (!id) {
          return json({ success: false, error: 'Missing action ID' }, { status: 400 });
        }

        const scheduledAction = await prisma.scheduledAction.findUnique({
          where: { id },
        });

        if (!scheduledAction || scheduledAction.shop !== shop) {
          return json({ success: false, error: 'Action not found' }, { status: 404 });
        }

        // Execute the action
        const result = await executeScheduledAction(admin, scheduledAction);
        
        return json(result);
      }

      case 'get-publications': {
        // Get available publications for the shop
        const response = await admin.graphql(GET_PUBLICATIONS_QUERY);
        const { data: gqlData } = await response.json();
        
        return json({ 
          success: true, 
          publications: gqlData?.publications?.nodes || [] 
        });
      }

      default:
        return json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    logger.error('[Scheduling] Error in action:', error);
    return json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to process request' 
    }, { status: 500 });
  }
}

// Helper function to execute a scheduled action
async function executeScheduledAction(admin: any, scheduledAction: any) {
  const { id, productId, actionType } = scheduledAction;

  try {
    // Mark as executing
    await prisma.scheduledAction.update({
      where: { id },
      data: { status: 'executing' },
    });

    let result;
    
    if (actionType === 'publish' || actionType === 'unpublish') {
      // Get the online store publication
      const pubResponse = await admin.graphql(GET_PUBLICATIONS_QUERY);
      const { data: pubData } = await pubResponse.json();
      
      // Find online store publication (usually named "Online Store")
      const onlineStorePublication = pubData?.publications?.nodes?.find(
        (p: any) => p.name === 'Online Store' || p.name.includes('Online')
      );

      if (!onlineStorePublication) {
        throw new Error('Online Store publication not found');
      }

      const mutation = actionType === 'publish' 
        ? PUBLISH_PRODUCT_MUTATION 
        : UNPUBLISH_PRODUCT_MUTATION;

      const response = await admin.graphql(mutation, {
        variables: {
          id: productId,
          input: [{ publicationId: onlineStorePublication.id }],
        },
      });

      result = await response.json();
      
      const userErrors = actionType === 'publish'
        ? result.data?.publishablePublish?.userErrors
        : result.data?.publishableUnpublish?.userErrors;

      if (userErrors && userErrors.length > 0) {
        throw new Error(userErrors[0].message);
      }
    } else if (actionType === 'draft' || actionType === 'archive' || actionType === 'active') {
      // Update product status
      const statusMap: Record<string, string> = {
        'draft': 'DRAFT',
        'archive': 'ARCHIVED',
        'active': 'ACTIVE',
      };

      const response = await admin.graphql(UPDATE_PRODUCT_STATUS_MUTATION, {
        variables: {
          product: {
            id: productId,
            status: statusMap[actionType],
          },
        },
      });

      result = await response.json();
      
      if (result.data?.productUpdate?.userErrors?.length > 0) {
        throw new Error(result.data.productUpdate.userErrors[0].message);
      }
    }

    // Mark as completed
    await prisma.scheduledAction.update({
      where: { id },
      data: { 
        status: 'completed',
        executedAt: new Date(),
      },
    });

    logger.info(`[Scheduling] Successfully executed action:`, {
      id,
      productId,
      actionType,
    });

    return { success: true, executed: true };
  } catch (error) {
    // Mark as failed
    await prisma.scheduledAction.update({
      where: { id },
      data: { 
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date(),
      },
    });

    logger.error(`[Scheduling] Failed to execute action:`, {
      id,
      productId,
      actionType,
      error,
    });

    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to execute action' 
    };
  }
}
