# 🎯 Error Handling & Performance Optimization Plan

## Priority: HIGH - Production Readiness Items

This document outlines the remaining work to make Spector production-ready with proper error handling, logging, and performance optimizations.

---

## 5. ERROR HANDLING & LOGGING ⚠️

### 5.1 Replace console.log with Logger ✅ STARTED
**Status**: Logger utility created, needs implementation  
**Impact**: HIGH - Security, Performance, Debugging  
**Effort**: Medium (2-3 hours)

#### What We Have:
- ✅ Created `app/utils/logger.ts`
- ✅ Environment-aware logging (dev vs prod)
- ✅ Performance logging helpers

#### What's Left:
Replace 40+ console.log instances in these files:

**Critical Priority** (do first):
1. `app/components/Dashboard.tsx` (13 instances)
   ```typescript
   // Find all: console.log
   // Replace with: logger.debug (for debug logs) or logger.log (for info)
   // Keep: console.error → logger.error
   // Keep: console.warn → logger.warn
   ```

2. `app/utils/dataRetention.ts` (8 instances)
3. `app/routes/app.market-analysis.tsx` (4 instances)

**Medium Priority**:
4. `app/components/ForecastingTab.tsx` (2 instances)
5. `app/services/bulkEdit.server.ts` (6 instances)
6. `app/routes/app.api.inventory-monitor.tsx` (2 instances)
7. `app/routes/app.api.inventory-webhook.tsx` (3 instances)
8. `app/routes/app.api.webflow-integration.tsx` (3 instances)

#### Implementation Steps:
```typescript
// 1. Import logger at top of file
import { logger } from '~/utils/logger';

// 2. Replace patterns:
console.log(...)     → logger.debug(...) or logger.log(...)
console.error(...)   → logger.error(...)
console.warn(...)    → logger.warn(...)
console.info(...)    → logger.info(...)

// 3. For performance logging:
const startTime = logger.perf.start('operation-name');
// ... do work ...
logger.perf.end('operation-name');
```

---

### 5.2 Add Error Boundaries ❌ TODO
**Status**: Not started  
**Impact**: HIGH - User Experience  
**Effort**: Low (1 hour)

#### Create Error Boundary Component:
File: `app/components/ErrorBoundary.tsx`

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';
import { Banner, BlockStack, Button, Card, Text } from '@shopify/polaris';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // TODO: Send to Sentry/LogRocket
    // Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card>
          <BlockStack gap="400">
            <Banner tone="critical">
              <Text as="h2" variant="headingMd">Something went wrong</Text>
            </Banner>
            <Text as="p">
              We're sorry, but something unexpected happened. 
              Please try refreshing the page or contact support if the problem persists.
            </Text>
            {this.state.error && process.env.NODE_ENV === 'development' && (
              <Card background="bg-surface-critical">
                <Text as="pre" variant="bodyMd">
                  {this.state.error.toString()}
                </Text>
              </Card>
            )}
            <Button onClick={this.handleReset}>Try Again</Button>
          </BlockStack>
        </Card>
      );
    }

    return this.props.children;
  }
}
```

#### Wrap Critical Components:
File: `app/routes/app._index.tsx`

```typescript
import { ErrorBoundary } from '~/components/ErrorBoundary';

// Wrap each tab
<ErrorBoundary>
  <Dashboard 
    isVisible={activeTab === "dashboard"} 
    {...props}
  />
</ErrorBoundary>

<ErrorBoundary>
  <ProductManagement 
    isVisible={activeTab === "products"}
    {...props}
  />
</ErrorBoundary>
```

---

### 5.3 Implement User-Friendly Error Messages ❌ TODO
**Status**: Not started  
**Impact**: MEDIUM - User Experience  
**Effort**: Low (30 minutes)

#### Create Error Helper:
File: `app/utils/errorMessages.ts`

```typescript
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    // Map common errors to user-friendly messages
    const errorMap: Record<string, string> = {
      'NetworkError': 'Unable to connect. Please check your internet connection.',
      'QuotaExceededError': 'Storage limit reached. Please clear some data.',
      'NotFoundError': 'The requested item could not be found.',
      'UnauthorizedError': 'Session expired. Please log in again.',
    };

    for (const [key, message] of Object.entries(errorMap)) {
      if (error.name.includes(key) || error.message.includes(key)) {
        return message;
      }
    }

    // Return original message in development
    if (process.env.NODE_ENV === 'development') {
      return error.message;
    }

    // Generic message in production
    return 'An unexpected error occurred. Please try again.';
  }

  return 'Something went wrong. Please try again.';
};
```

---

### 5.4 Set Up Error Monitoring/Alerting ❌ TODO
**Status**: Not started  
**Impact**: HIGH - Production Support  
**Effort**: Medium (1-2 hours)

#### Recommended Service: Sentry (Free tier available)

**Installation:**
```bash
npm install @sentry/remix
```

**Configuration:**
File: `app/entry.server.tsx`

```typescript
import * as Sentry from "@sentry/remix";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0, // Adjust in production (0.1 = 10%)
  enabled: process.env.NODE_ENV === 'production',
});
```

**Set Fly.io Secret:**
```bash
fly secrets set SENTRY_DSN=your_sentry_dsn_here --app spector
```

**Update logger.ts to send errors to Sentry:**
```typescript
import * as Sentry from "@sentry/remix";

export const logger = {
  error: (...args: any[]) => {
    console.error(...args);
    
    // Send to Sentry in production
    if (process.env.NODE_ENV === 'production' && args[0] instanceof Error) {
      Sentry.captureException(args[0]);
    }
  },
  // ... rest of logger
};
```

---

### 5.5 Add Retry Logic for API Calls ❌ TODO
**Status**: Not started  
**Impact**: MEDIUM - Reliability  
**Effort**: Medium (1 hour)

#### Create Retry Utility:
File: `app/utils/retry.ts`

```typescript
interface RetryOptions {
  maxRetries?: number;
  delayMs?: number;
  exponentialBackoff?: boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

export async function retryFetch<T>(
  fetchFn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    delayMs = 1000,
    exponentialBackoff = true,
    onRetry,
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetchFn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay (exponential backoff or fixed)
      const delay = exponentialBackoff 
        ? delayMs * Math.pow(2, attempt)
        : delayMs;

      // Call retry callback if provided
      if (onRetry) {
        onRetry(attempt + 1, lastError);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

#### Use in Dashboard:
```typescript
import { retryFetch } from '~/utils/retry';

const fetchData = async () => {
  try {
    const data = await retryFetch(
      () => fetch('/app/api/product-analytics').then(r => r.json()),
      {
        maxRetries: 3,
        delayMs: 1000,
        exponentialBackoff: true,
        onRetry: (attempt, error) => {
          logger.warn(`Retry attempt ${attempt} after error:`, error);
        }
      }
    );
    return data;
  } catch (error) {
    logger.error('Failed after retries:', error);
    throw error;
  }
};
```

---

## 6. PERFORMANCE OPTIMIZATION 🚀

### 6.1 Lighthouse Audit ❌ TODO
**Status**: Not started  
**Impact**: HIGH - SEO, User Experience  
**Effort**: Low (30 min audit + fixes)

#### Run Audit:
```bash
# Install Lighthouse
npm install -g lighthouse

# Run audit on production
lighthouse https://spector.fly.dev --view

# Target scores:
# Performance: 90+
# Accessibility: 90+
# Best Practices: 90+
# SEO: 90+
```

#### Common Issues to Fix:
- [ ] Images not optimized
- [ ] Missing alt tags
- [ ] Large JavaScript bundles
- [ ] No caching headers
- [ ] Render-blocking resources

---

### 6.2 Code Splitting ❌ TODO
**Status**: Not started  
**Impact**: MEDIUM - Load Time  
**Effort**: Low (already using Remix)

#### Verify Route-based Splitting:
Remix already does route-based code splitting. Verify:

```typescript
// In routes/app._index.tsx
// Each route file is automatically code-split
// Heavy components can be lazy loaded:

import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('~/components/Dashboard'));
const ProductManagement = lazy(() => import('~/components/ProductManagement'));

// Wrap in Suspense
<Suspense fallback={<Spinner />}>
  <Dashboard {...props} />
</Suspense>
```

---

### 6.3 Image Optimization ❌ TODO
**Status**: Not started  
**Impact**: MEDIUM - Performance  
**Effort**: Low-Medium (depends on # of images)

#### Current Images:
- `public/assets/logo.png`
- `public/assets/Logo.svg`

#### Recommendations:
1. **Use SVG when possible** (already doing for Logo.svg ✅)
2. **Compress PNG images**:
   ```bash
   # Install image optimizer
   npm install -g imageoptim-cli
   
   # Optimize images
   imageoptim public/assets/*.png
   ```

3. **Consider using Shopify CDN** for product images (already handled by Shopify)

4. **Add lazy loading** to images:
   ```jsx
   <img src="/assets/logo.png" loading="lazy" alt="Spector Logo" />
   ```

---

### 6.4 Loading States Audit ✅ MOSTLY DONE
**Status**: Mostly complete  
**Impact**: MEDIUM - User Experience  
**Effort**: Low (verification only)

#### Current Loading States:
- ✅ Dashboard: Has skeleton loader
- ✅ ProductManagement: Has ProductManagementSkeleton
- ✅ ForecastingTab: Has loading state
- ⚠️ Verify all API calls show loading indicators

#### Quick Audit:
```bash
# Search for fetch calls without loading state
grep -r "fetch(" app/components/ app/routes/
# Verify each has a loading indicator
```

---

### 6.5 Test with 1000+ Products ❌ TODO
**Status**: Not started  
**Impact**: HIGH - Scalability  
**Effort**: Medium (2-3 hours)

#### Performance Testing Plan:

**1. Create Test Data:**
- Use Shopify API to create test products
- Or use a development store with bulk import

**2. Test Critical Paths:**
- [ ] Dashboard load time with 1000+ products
- [ ] Product table pagination
- [ ] Search/filter performance
- [ ] Bulk operations (if any)

**3. Performance Targets:**
- Initial load: < 3 seconds
- Product table render: < 2 seconds
- Search/filter: < 500ms
- Pagination: < 1 second

**4. Optimization Strategies:**
```typescript
// If slow, implement:

// 1. Virtual scrolling for large lists
import { FixedSizeList } from 'react-window';

// 2. Debounced search
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value) => setSearchTerm(value),
  500
);

// 3. Pagination (already implemented ✅)

// 4. Memoization for expensive calculations
const expensiveValue = useMemo(() => {
  return heavyCalculation(data);
}, [data]);
```

---

## 📊 Implementation Priority

### Week 1 (Critical):
1. ✅ Logger utility created
2. ❌ Replace console.logs in Dashboard.tsx
3. ❌ Add ErrorBoundary component
4. ❌ Add retry logic to API calls
5. ❌ Set up Sentry error monitoring

### Week 2 (Important):
6. ❌ Run Lighthouse audit and fix issues
7. ❌ Test with 1000+ products
8. ❌ Optimize images
9. ❌ Replace remaining console.logs

### Week 3 (Nice to Have):
10. ❌ Implement lazy loading for routes
11. ❌ Advanced performance optimizations
12. ❌ Load testing

---

## 🎯 Quick Wins (Do These First)

### 1. Replace Dashboard console.logs (30 min)
```bash
# In Dashboard.tsx, replace:
console.log → logger.debug
console.error → logger.error
console.warn → logger.warn
```

### 2. Add ErrorBoundary (30 min)
- Create ErrorBoundary.tsx
- Wrap Dashboard and ProductManagement

### 3. Add Sentry (1 hour)
- Sign up for Sentry (free tier)
- Add DSN to Fly.io secrets
- Install @sentry/remix
- Configure in entry.server.tsx

### 4. Run Lighthouse (30 min)
- Run audit
- Fix obvious issues (alt tags, etc.)

**Total Time**: 2.5 hours for significant improvement!

---

## 📝 Checklist Before Launch

### Error Handling:
- [ ] Logger utility implemented in critical files
- [ ] ErrorBoundary wrapping main components
- [ ] User-friendly error messages
- [ ] Sentry configured and testing
- [ ] Retry logic on API calls

### Performance:
- [ ] Lighthouse score > 90 on all metrics
- [ ] Tested with 1000+ products
- [ ] All images optimized
- [ ] Code splitting verified
- [ ] Loading states on all async operations

### Database:
- [ ] PostgreSQL migration completed
- [ ] Backups configured
- [ ] Connection pooling verified
- [ ] Migration rollback plan documented

---

## 🆘 If Time is Limited

**Minimum for production:**
1. Set up Sentry (1 hour)
2. Add ErrorBoundary to main components (30 min)
3. Test with realistic data (1 hour)
4. Run Lighthouse and fix critical issues (1 hour)

**Total**: 3.5 hours for production-minimum quality

---

## 📚 Resources

- **Sentry Setup**: https://docs.sentry.io/platforms/javascript/guides/remix/
- **Lighthouse**: https://developers.google.com/web/tools/lighthouse
- **React Error Boundaries**: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- **Remix Performance**: https://remix.run/docs/en/main/guides/performance

---

**Next Action**: Choose one task from Quick Wins and let's implement it! 🚀
