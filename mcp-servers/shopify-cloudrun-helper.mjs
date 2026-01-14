#!/usr/bin/env node
/**
 * Shopify + Cloud Run + Upstash Redis MCP Server
 * 
 * This MCP server provides tools and knowledge for developing
 * Shopify apps deployed on Google Cloud Run with Upstash Redis.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "shopify-cloudrun-helper",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// ============================================
// KNOWLEDGE BASE
// ============================================

const KNOWLEDGE_BASE = {
  cloudRunBestPractices: `
# Cloud Run Best Practices for Shopify Apps

## Container Configuration
- Use multi-stage Docker builds for smaller images
- Set memory limit to 512Mi-1Gi for typical Shopify apps
- Set CPU to 1-2 for request handling
- Enable CPU throttling for cost savings
- Set min instances to 0 for dev, 1+ for production

## Environment Variables (set in Cloud Run)
- DATABASE_URL: Cloud SQL connection string
- REDIS_URL: Upstash Redis URL
- SHOPIFY_API_KEY: From Partners dashboard
- SHOPIFY_API_SECRET: From Partners dashboard
- SCOPES: Required Shopify scopes
- HOST: Your Cloud Run URL

## Startup & Health
- Implement /health endpoint for Cloud Run health checks
- Set startup probe timeout to 60s for cold starts
- Use connection pooling for database (PgBouncer or Prisma pool)

## Secrets Management
- Use Google Secret Manager for sensitive values
- Mount secrets as environment variables in Cloud Run
- Never commit secrets to repository

## Dockerfile Example for Shopify Remix:
\`\`\`dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM base AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/package.json ./
COPY --from=build /app/prisma ./prisma

EXPOSE 8080
CMD ["npm", "run", "docker-start"]
\`\`\`
`,

  upstashRedisBestPractices: `
# Upstash Redis Best Practices for Shopify Apps

## Connection Setup
\`\`\`typescript
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});
\`\`\`

## Common Use Cases

### 1. Session Storage
\`\`\`typescript
// Store session
await redis.set(\`session:\${sessionId}\`, JSON.stringify(sessionData), { ex: 86400 });

// Get session
const session = await redis.get(\`session:\${sessionId}\`);
\`\`\`

### 2. Rate Limiting
\`\`\`typescript
async function checkRateLimit(shop: string, limit = 100, window = 60) {
  const key = \`ratelimit:\${shop}\`;
  const current = await redis.incr(key);
  
  if (current === 1) {
    await redis.expire(key, window);
  }
  
  return current <= limit;
}
\`\`\`

### 3. Caching API Responses
\`\`\`typescript
async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl = 300
): Promise<T> {
  const cached = await redis.get(key);
  if (cached) return cached as T;
  
  const fresh = await fetcher();
  await redis.set(key, JSON.stringify(fresh), { ex: ttl });
  return fresh;
}
\`\`\`

### 4. Webhook Deduplication
\`\`\`typescript
async function isWebhookProcessed(webhookId: string): Promise<boolean> {
  const key = \`webhook:\${webhookId}\`;
  const exists = await redis.exists(key);
  
  if (!exists) {
    await redis.set(key, '1', { ex: 86400 }); // 24h TTL
    return false;
  }
  return true;
}
\`\`\`

### 5. Job Queues (Simple)
\`\`\`typescript
// Add job
await redis.lpush('jobs:inventory', JSON.stringify({ productId, action }));

// Process job
const job = await redis.rpop('jobs:inventory');
\`\`\`

## Performance Tips
- Use pipelining for multiple operations
- Set appropriate TTLs to avoid memory bloat
- Use hash types for structured data
- Prefix keys by feature (session:, cache:, etc.)
`,

  shopifyWebhookPatterns: `
# Shopify Webhook Patterns for Cloud Run

## Webhook Handler Structure
\`\`\`typescript
// app/routes/webhooks.tsx
import { authenticate } from "../shopify.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  
  switch (topic) {
    case "APP_UNINSTALLED":
      await handleUninstall(shop, payload);
      break;
    case "PRODUCTS_UPDATE":
      await handleProductUpdate(shop, payload);
      break;
    // ... more handlers
  }
  
  return new Response(null, { status: 200 });
};
\`\`\`

## Webhook Best Practices
1. **Always respond quickly** (< 5s) - defer heavy work
2. **Implement idempotency** - webhooks can be sent multiple times
3. **Use Redis for deduplication** - track processed webhook IDs
4. **Log webhook payloads** - helpful for debugging
5. **Handle APP_UNINSTALLED** - clean up shop data

## Required Webhooks for App Store
- APP_UNINSTALLED
- CUSTOMERS_DATA_REQUEST (GDPR)
- CUSTOMERS_REDACT (GDPR)
- SHOP_REDACT (GDPR)

## Registering Webhooks (shopify.app.toml)
\`\`\`toml
[webhooks]
api_version = "2025-01"

[[webhooks.subscriptions]]
topics = ["app/uninstalled"]
uri = "/webhooks"

[[webhooks.subscriptions]]
topics = ["products/update", "products/delete"]
uri = "/webhooks"
\`\`\`
`,

  cloudSqlSetup: `
# Cloud SQL Setup for Shopify Apps

## Connection from Cloud Run
1. Enable Cloud SQL Admin API
2. Add Cloud SQL connection to Cloud Run service
3. Use Unix socket connection string

## Connection String Format
\`\`\`
# For Cloud Run (Unix socket)
DATABASE_URL="postgresql://USER:PASSWORD@localhost/DATABASE?host=/cloudsql/PROJECT:REGION:INSTANCE"

# For local development (Cloud SQL Proxy)
DATABASE_URL="postgresql://USER:PASSWORD@127.0.0.1:5432/DATABASE"
\`\`\`

## Prisma Setup
\`\`\`prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
\`\`\`

## Connection Pooling with Prisma
\`\`\`typescript
// app/db.server.ts
import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient;

declare global {
  var __prisma: PrismaClient | undefined;
}

if (process.env.NODE_ENV === "production") {
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
} else {
  if (!global.__prisma) {
    global.__prisma = new PrismaClient();
  }
  prisma = global.__prisma;
}

export default prisma;
\`\`\`

## Essential Tables for Shopify Apps
\`\`\`prisma
model Session {
  id            String    @id
  shop          String
  state         String
  isOnline      Boolean   @default(false)
  scope         String?
  expires       DateTime?
  accessToken   String?
  userId        BigInt?
}

model Shop {
  id            String   @id @default(uuid())
  shop          String   @unique
  accessToken   String?
  installedAt   DateTime @default(now())
  uninstalledAt DateTime?
}
\`\`\`
`,

  deploymentChecklist: `
# Deployment Checklist for Shopify Apps on Cloud Run

## Pre-Deployment
- [ ] All environment variables configured in Cloud Run
- [ ] Database migrations applied
- [ ] Secrets stored in Secret Manager
- [ ] Dockerfile builds successfully
- [ ] Health endpoint implemented

## Cloud Run Configuration
- [ ] Memory: 512Mi - 1Gi
- [ ] CPU: 1-2
- [ ] Min instances: 1 (production)
- [ ] Max instances: 10-100
- [ ] Request timeout: 300s
- [ ] Cloud SQL connection added
- [ ] VPC connector (if needed)

## Shopify App Configuration
- [ ] App URL updated in Partners dashboard
- [ ] Redirect URLs configured
- [ ] Webhooks registered
- [ ] Scopes defined in shopify.app.toml
- [ ] GDPR webhooks implemented

## Post-Deployment
- [ ] Test OAuth flow
- [ ] Test webhooks (use Shopify CLI)
- [ ] Monitor Cloud Run logs
- [ ] Set up alerting
- [ ] Test rate limiting

## gcloud Commands
\`\`\`bash
# Build and push
gcloud builds submit --tag gcr.io/PROJECT_ID/spector

# Deploy
gcloud run deploy spector \\
  --image gcr.io/PROJECT_ID/spector \\
  --platform managed \\
  --region us-central1 \\
  --allow-unauthenticated \\
  --add-cloudsql-instances PROJECT:REGION:INSTANCE \\
  --set-env-vars "NODE_ENV=production" \\
  --set-secrets "SHOPIFY_API_SECRET=shopify-api-secret:latest"

# View logs
gcloud run logs read spector --region us-central1
\`\`\`
`,

  commonIssues: `
# Common Issues & Solutions

## 1. Cold Start Timeouts
**Problem**: First request times out after deploy
**Solution**: 
- Set startup probe timeout to 120s
- Add min instances = 1
- Optimize initialization code

## 2. Database Connection Errors
**Problem**: "Connection refused" or timeout
**Solution**:
- Verify Cloud SQL connection is added to Cloud Run
- Check DATABASE_URL format (Unix socket for Cloud Run)
- Ensure Cloud SQL Admin API is enabled

## 3. Session Not Persisting
**Problem**: Users logged out unexpectedly
**Solution**:
- Verify Prisma session storage is working
- Check session TTL settings
- Ensure cookie settings match HOST domain

## 4. Webhooks Not Received
**Problem**: Shopify webhooks not hitting your app
**Solution**:
- Verify webhook URL in shopify.app.toml
- Check Cloud Run allows unauthenticated requests
- Deploy with \`shopify app deploy\`
- Use \`shopify app webhook trigger\` to test

## 5. Redis Connection Issues
**Problem**: Upstash Redis timeout or errors
**Solution**:
- Use REST client (@upstash/redis) not ioredis
- Verify UPSTASH_REDIS_REST_URL and TOKEN
- Check Upstash dashboard for rate limits

## 6. GraphQL Rate Limiting
**Problem**: 429 errors from Shopify API
**Solution**:
- Implement request queuing
- Use bulk operations for large data
- Cache responses in Redis
- Respect X-Shopify-Shop-Api-Call-Limit header

## 7. CORS Errors in Embedded App
**Problem**: Cross-origin errors in Shopify admin
**Solution**:
- Ensure app is properly embedded
- Use App Bridge for API calls
- Check CSP headers

## 8. Memory Issues on Cloud Run
**Problem**: Container killed (OOMKilled)
**Solution**:
- Increase memory limit
- Add memory monitoring
- Check for memory leaks (especially in dev)
- Use streaming for large responses
`,
};

// ============================================
// TOOLS
// ============================================

const TOOLS = [
  {
    name: "get_cloudrun_best_practices",
    description: "Get best practices for deploying Shopify apps on Google Cloud Run, including Dockerfile templates, environment variables, and configuration.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_upstash_redis_patterns",
    description: "Get code patterns and best practices for using Upstash Redis in Shopify apps, including session storage, rate limiting, caching, and job queues.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_webhook_patterns",
    description: "Get Shopify webhook implementation patterns for Cloud Run, including handler structure, idempotency, and required GDPR webhooks.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_cloudsql_setup",
    description: "Get Cloud SQL setup guide for Shopify apps, including connection strings, Prisma configuration, and essential database tables.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "get_deployment_checklist",
    description: "Get a comprehensive deployment checklist for Shopify apps on Cloud Run, including gcloud commands.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "troubleshoot_issue",
    description: "Get solutions for common issues when developing Shopify apps on Cloud Run with Upstash Redis.",
    inputSchema: {
      type: "object",
      properties: {
        issue: {
          type: "string",
          description: "The issue you're facing (e.g., 'cold start', 'database connection', 'webhooks', 'redis', 'rate limiting')",
        },
      },
      required: ["issue"],
    },
  },
  {
    name: "generate_redis_helper",
    description: "Generate a Redis helper utility for a specific use case in your Shopify app.",
    inputSchema: {
      type: "object",
      properties: {
        useCase: {
          type: "string",
          enum: ["session", "cache", "rate-limit", "queue", "webhook-dedup"],
          description: "The use case for the Redis helper",
        },
      },
      required: ["useCase"],
    },
  },
];

// ============================================
// PROMPTS
// ============================================

const PROMPTS = [
  {
    name: "setup-new-shopify-cloudrun-app",
    description: "Guide for setting up a new Shopify app with Cloud Run and Upstash Redis",
  },
  {
    name: "optimize-performance",
    description: "Tips for optimizing Shopify app performance on Cloud Run",
  },
  {
    name: "debug-deployment",
    description: "Help debugging deployment issues",
  },
];

// ============================================
// HANDLERS
// ============================================

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "get_cloudrun_best_practices":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.cloudRunBestPractices }],
      };

    case "get_upstash_redis_patterns":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.upstashRedisBestPractices }],
      };

    case "get_webhook_patterns":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.shopifyWebhookPatterns }],
      };

    case "get_cloudsql_setup":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.cloudSqlSetup }],
      };

    case "get_deployment_checklist":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.deploymentChecklist }],
      };

    case "troubleshoot_issue":
      return {
        content: [{ type: "text", text: KNOWLEDGE_BASE.commonIssues }],
      };

    case "generate_redis_helper": {
      const useCase = args?.useCase;
      const helpers = {
        session: `
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface SessionData {
  shop: string;
  accessToken: string;
  scope: string;
  expires?: Date;
}

export async function storeSession(sessionId: string, data: SessionData, ttlSeconds = 86400) {
  await redis.set(\`session:\${sessionId}\`, JSON.stringify(data), { ex: ttlSeconds });
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const data = await redis.get<string>(\`session:\${sessionId}\`);
  return data ? JSON.parse(data) : null;
}

export async function deleteSession(sessionId: string) {
  await redis.del(\`session:\${sessionId}\`);
}
`,
        cache: `
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function cached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: { ttl?: number; prefix?: string } = {}
): Promise<T> {
  const { ttl = 300, prefix = 'cache' } = options;
  const cacheKey = \`\${prefix}:\${key}\`;
  
  // Try cache first
  const cached = await redis.get<T>(cacheKey);
  if (cached !== null) {
    return cached;
  }
  
  // Fetch fresh data
  const fresh = await fetcher();
  
  // Store in cache
  await redis.set(cacheKey, JSON.stringify(fresh), { ex: ttl });
  
  return fresh;
}

export async function invalidateCache(key: string, prefix = 'cache') {
  await redis.del(\`\${prefix}:\${key}\`);
}

export async function invalidateCachePattern(pattern: string) {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
`,
        "rate-limit": `
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(
  identifier: string,
  options: { limit?: number; windowSeconds?: number; prefix?: string } = {}
): Promise<RateLimitResult> {
  const { limit = 100, windowSeconds = 60, prefix = 'ratelimit' } = options;
  const key = \`\${prefix}:\${identifier}\`;
  
  const [current, ttl] = await Promise.all([
    redis.incr(key),
    redis.ttl(key),
  ]);
  
  // Set expiry on first request
  if (current === 1 || ttl === -1) {
    await redis.expire(key, windowSeconds);
  }
  
  const allowed = current <= limit;
  const remaining = Math.max(0, limit - current);
  const resetIn = ttl > 0 ? ttl : windowSeconds;
  
  return { allowed, remaining, resetIn };
}

export function rateLimitMiddleware(options = {}) {
  return async (request: Request): Promise<Response | null> => {
    const shop = request.headers.get('x-shopify-shop-domain') || 'unknown';
    const result = await checkRateLimit(shop, options);
    
    if (!result.allowed) {
      return new Response('Too Many Requests', {
        status: 429,
        headers: {
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetIn.toString(),
          'Retry-After': result.resetIn.toString(),
        },
      });
    }
    
    return null; // Continue processing
  };
}
`,
        queue: `
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface Job<T = any> {
  id: string;
  type: string;
  payload: T;
  createdAt: string;
  attempts: number;
}

export async function enqueueJob<T>(
  queueName: string,
  type: string,
  payload: T
): Promise<string> {
  const job: Job<T> = {
    id: crypto.randomUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  
  await redis.lpush(\`queue:\${queueName}\`, JSON.stringify(job));
  return job.id;
}

export async function dequeueJob<T>(queueName: string): Promise<Job<T> | null> {
  const data = await redis.rpop<string>(\`queue:\${queueName}\`);
  if (!data) return null;
  
  const job = JSON.parse(data) as Job<T>;
  job.attempts++;
  return job;
}

export async function requeueJob<T>(queueName: string, job: Job<T>): Promise<void> {
  // Add back to end of queue for retry
  await redis.rpush(\`queue:\${queueName}\`, JSON.stringify(job));
}

export async function getQueueLength(queueName: string): Promise<number> {
  return await redis.llen(\`queue:\${queueName}\`);
}

// Dead letter queue for failed jobs
export async function moveToDeadLetter<T>(queueName: string, job: Job<T>, error: string): Promise<void> {
  const deadJob = { ...job, error, failedAt: new Date().toISOString() };
  await redis.lpush(\`queue:\${queueName}:dead\`, JSON.stringify(deadJob));
}
`,
        "webhook-dedup": `
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

/**
 * Check if a webhook has already been processed (idempotency)
 * Returns true if this is a duplicate webhook
 */
export async function isWebhookDuplicate(
  webhookId: string,
  options: { ttlSeconds?: number; prefix?: string } = {}
): Promise<boolean> {
  const { ttlSeconds = 86400, prefix = 'webhook' } = options; // 24h default
  const key = \`\${prefix}:\${webhookId}\`;
  
  // Try to set the key - returns null if already exists
  const result = await redis.set(key, Date.now().toString(), { 
    ex: ttlSeconds, 
    nx: true  // Only set if not exists
  });
  
  // If result is null, key already existed = duplicate
  return result === null;
}

/**
 * Wrapper for webhook handlers with deduplication
 */
export function withDeduplication<T>(
  handler: (payload: T) => Promise<void>
) {
  return async (webhookId: string, payload: T): Promise<{ processed: boolean }> => {
    if (await isWebhookDuplicate(webhookId)) {
      console.log(\`Skipping duplicate webhook: \${webhookId}\`);
      return { processed: false };
    }
    
    await handler(payload);
    return { processed: true };
  };
}

// Usage in webhook route:
// const handleProductUpdate = withDeduplication(async (payload) => {
//   // Your logic here
// });
// await handleProductUpdate(webhookId, payload);
`,
      };

      return {
        content: [{ 
          type: "text", 
          text: helpers[useCase] || "Unknown use case. Available: session, cache, rate-limit, queue, webhook-dedup" 
        }],
      };
    }

    default:
      return {
        content: [{ type: "text", text: `Unknown tool: ${name}` }],
        isError: true,
      };
  }
});

server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: PROMPTS,
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name } = request.params;

  switch (name) {
    case "setup-new-shopify-cloudrun-app":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me set up a new Shopify app with the following stack:
- Shopify Remix template
- Google Cloud Run for hosting
- Cloud SQL (PostgreSQL) for database
- Upstash Redis for caching/sessions
- Prisma ORM

Please provide:
1. Initial project setup commands
2. Required configuration files
3. Environment variables needed
4. Deployment steps`,
            },
          },
        ],
      };

    case "optimize-performance":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me optimize my Shopify app's performance on Cloud Run. Consider:
1. Cold start optimization
2. Database query optimization
3. Redis caching strategies
4. API response times
5. Memory usage`,
            },
          },
        ],
      };

    case "debug-deployment":
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Help me debug my Shopify app deployment on Cloud Run. I need to check:
1. Container logs
2. Database connectivity
3. Environment variables
4. Webhook registration
5. OAuth flow`,
            },
          },
        ],
      };

    default:
      return {
        messages: [],
      };
  }
});

// ============================================
// START SERVER
// ============================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Shopify Cloud Run Helper MCP server running...");
}

main().catch(console.error);
