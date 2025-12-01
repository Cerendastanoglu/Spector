/// <reference types="vite/client" />
/// <reference types="@remix-run/node" />

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Shopify App Configuration (Required)
      SHOPIFY_API_KEY: string;
      SHOPIFY_API_SECRET: string;
      SHOPIFY_APP_URL: string;
      SCOPES: string;
      
      // Database (Required)
      DATABASE_URL: string;
      
      // Security (Required)
      ENCRYPTION_KEY: string;
      
      // Redis Queue (Optional)
      UPSTASH_REDIS_REST_URL?: string;
      UPSTASH_REDIS_REST_TOKEN?: string;
      
      // Optional Configuration
      SHOP_CUSTOM_DOMAIN?: string;
      ENABLE_PROD_LOGGING?: string;
      
      // System Variables
      NODE_ENV: 'development' | 'production' | 'test';
      PORT?: string;
      HOST?: string;
      FRONTEND_PORT?: string;
    }
  }
}

export {}
