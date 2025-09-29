import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  try {
    // authenticate.webhook automatically verifies HMAC signature
    const { payload, session, topic, shop } = await authenticate.webhook(request);
    
    console.log(`✅ Verified webhook: ${topic} for shop: ${shop}`);
    console.log(`🔐 HMAC signature verified successfully`);

    const current = payload.current as string[];
    
    if (session) {
      await db.session.update({   
        where: {
          id: session.id
        },
        data: {
          scope: current.toString(),
        },
      });
      console.log(`📝 Updated scopes for shop: ${shop} to: ${current.join(', ')}`);
    }

    // Log payload for debugging (remove in production)
    if (process.env.NODE_ENV === 'development') {
      console.log('Scopes update payload:', payload);
    }

    return new Response(null, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook verification failed:', error);
    
    // Return 401 for authentication failures (invalid HMAC)
    if (error instanceof Error && error.message.includes('verify')) {
      return new Response('Unauthorized - HMAC verification failed', { status: 401 });
    }

    // Return 500 for other errors
    return new Response('Internal Server Error', { status: 500 });
  }
};
