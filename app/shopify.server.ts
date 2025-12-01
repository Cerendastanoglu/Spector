// Load environment variables FIRST (before any imports that use them)
import { config } from "dotenv";
config();

import "@shopify/shopify-app-remix/adapters/node";
import {
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import prisma from "./db.server";

// Debug: Log environment variable status
console.log('🔍 shopify.server.ts - Environment Variables:');
console.log('  SHOPIFY_API_KEY:', process.env.SHOPIFY_API_KEY ? '✅ SET (' + process.env.SHOPIFY_API_KEY.substring(0, 10) + '...)' : '❌ UNDEFINED');
console.log('  SHOPIFY_API_SECRET:', process.env.SHOPIFY_API_SECRET ? '✅ SET (' + process.env.SHOPIFY_API_SECRET.substring(0, 10) + '...)' : '❌ UNDEFINED');

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.October25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.October25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;
