# On-Demand Intelligence Architecture

## Overview

This architecture provides real-time competitive intelligence for Shopify merchants through a modular, provider-agnostic system that respects ToS, implements proper rate limiting, and delivers streaming results for optimal UX.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (React)                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐   │
│  │  Intel Request  │ │ Streaming UI    │ │   Results       │   │
│  │     Form        │ │   Components    │ │   Display       │   │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │ SSE/Streaming Fetch
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Remix Server (SSR/API)                      │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                 Intel Controller                            ││
│  │  • Request validation                                       ││
│  │  • Provider selection                                       ││
│  │  • Response streaming                                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │                Query Planner                                ││
│  │  • Analyzes request type                                    ││
│  │  • Selects optimal providers                                ││
│  │  • Orchestrates parallel execution                          ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              Provider Registry                              ││
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐ ││
│  │  │   SEO   │ │ Traffic │ │ Pricing │ │  SERP   │ │Reviews│ ││
│  │  │Provider │ │Provider │ │Provider │ │Provider │ │Prov.. │ ││
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └───────┘ ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │            Cache Layer (KV Store)                           ││
│  │  • In-memory cache (development)                            ││
│  │  • Redis/Cloudflare KV (production)                        ││
│  │  • TTL: 5-30 minutes per key                               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                  │                              │
│                                  ▼                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │           Result Normalizer                                 ││
│  │  • Maps provider responses to unified schema                ││
│  │  • Handles error responses gracefully                       ││
│  │  • Provides metadata about data freshness                   ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│              External Providers (BYOK)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Ahrefs  │ │SimilarWeb│ │ Serpapi │ │ Google  │ │ Yelp    │   │
│  │   API   │ │   API    │ │   API   │ │Search API│ │   API   │   │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Features

### 🔐 BYOK (Bring Your Own Key)
- Merchants provide their own API keys
- Keys stored encrypted in secure per-shop storage
- Support for multiple provider credentials per merchant

### ⚡ Real-Time Streaming
- Server-Sent Events for live result updates
- Chunked responses as provider data arrives
- Progressive UI updates for better UX

### 🔄 Provider Abstraction
- Unified interface for all intelligence providers
- Easy to swap/add new providers
- Health checks and failover support

### ⏱️ Smart Caching
- Short-lived cache (5-30 min TTL)
- No persistent storage of third-party data
- Respects provider ToS regarding data retention

### 📊 Observability
- Per-provider metrics (latency, errors, rate limits)
- Request tracking and debugging
- Performance monitoring

## Usage

```typescript
// Request competitive intelligence
const intelRequest = {
  type: 'competitor_analysis',
  target: 'nike.com',
  keywords: ['running shoes', 'athletic wear'],
  location: 'US',
  providers: ['seo', 'traffic', 'pricing']
};

// Stream results as they arrive
const response = await fetch('/api/intel/stream', {
  method: 'POST',
  body: JSON.stringify(intelRequest)
});

const reader = response.body.getReader();
// Results arrive incrementally as providers respond
```

## Provider Types Supported

- **SEO**: Backlinks, domain authority, keyword rankings
- **Traffic**: Visitor analytics, traffic sources, engagement
- **Pricing**: Product pricing, competitor price monitoring
- **SERP**: Search result positioning, featured snippets
- **Social**: Social media presence, engagement metrics
- **Reviews**: Review aggregation, sentiment analysis

## Security & Compliance

- API keys encrypted at rest
- Rate limiting per provider
- ToS compliance monitoring
- No persistent third-party data storage
- Audit logging for all requests