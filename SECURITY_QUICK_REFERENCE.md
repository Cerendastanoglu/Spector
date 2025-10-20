# Security Quick Reference

## 🚨 Common Security Patterns

### Rate Limiting API Routes

```typescript
import { applyRateLimit, getRateLimitHeaders } from "~/utils/rateLimit";
import { RATE_LIMITS } from "~/utils/security";

export async function loader({ request }: LoaderFunctionArgs) {
  // Check rate limit
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_ANALYTICS);
  if (rateLimitResponse) return rateLimitResponse;
  
  // Your code...
  const data = await fetchData();
  
  // Add rate limit headers to response
  const headers = getRateLimitHeaders(request, RATE_LIMITS.API_ANALYTICS);
  return json(data, { headers });
}
```

### Sanitizing User Input

```typescript
import { sanitizeString, sanitizeObject } from "~/utils/security";

// Single string
const safeInput = sanitizeString(userInput);

// Entire object
const safeData = sanitizeObject(formData);
```

### Validating Input

```typescript
import { isValidEmail, isValidUrl, isValidNumber, isValidLength } from "~/utils/security";

// Email validation
if (!isValidEmail(email)) {
  return json({ error: "Invalid email" }, { status: 400 });
}

// URL validation
if (!isValidUrl(website)) {
  return json({ error: "Invalid URL" }, { status: 400 });
}

// Number validation with range
if (!isValidNumber(price, 0, 10000)) {
  return json({ error: "Price must be between 0 and 10000" }, { status: 400 });
}

// String length validation
if (!isValidLength(description, 10, 500)) {
  return json({ error: "Description must be 10-500 characters" }, { status: 400 });
}
```

### Safe Logging (No Secret Exposure)

```typescript
import { redactSecrets, safeLog } from "~/utils/security";

// Instead of console.log
const userData = { email: "user@example.com", password: "secret123" };
safeLog('log', 'User data:', userData);
// Output: User data: { email: "user@example.com", password: "[REDACTED]" }

// Or manually redact
const safeData = redactSecrets(userData);
console.log(safeData);
```

### Using Logger Instead of Console

```typescript
import logger from "~/utils/logger";

// Development only
logger.debug("Debugging info");  // Only shows in dev
logger.log("General info");      // Only shows in dev

// All environments
logger.warn("Warning message");  // Shows in dev and prod
logger.error("Error message");   // Shows in dev and prod
```

## 🔐 Available Rate Limits

```typescript
RATE_LIMITS.API_DEFAULT     // 60 req/min  - General endpoints
RATE_LIMITS.API_STRICT      // 10 req/min  - Sensitive operations
RATE_LIMITS.API_ANALYTICS   // 30 req/min  - Analytics/dashboard
RATE_LIMITS.API_PRODUCTS    // 100 req/min - Product operations
RATE_LIMITS.AUTH            // 5 req/15min - Authentication
```

## ✅ Security Checklist for New Features

- [ ] Rate limiting added to API routes
- [ ] User inputs sanitized with `sanitizeString()` or `sanitizeObject()`
- [ ] Inputs validated (email, URL, number ranges, string lengths)
- [ ] No `console.log()` with sensitive data (use `logger` or `safeLog`)
- [ ] No hardcoded secrets (use environment variables)
- [ ] HTTPS only (already configured globally)
- [ ] Using Remix `<Form>` component (not HTML `<form>`)
- [ ] Database queries use Prisma (already safe from SQL injection)
- [ ] No `dangerouslySetInnerHTML` with user input

## 🚫 What NOT to Do

❌ **DON'T** log sensitive data:
```typescript
console.log("User password:", password);  // BAD!
console.log("API token:", token);         // BAD!
```

✅ **DO** use safe logging:
```typescript
logger.error("Authentication failed");           // GOOD
safeLog('log', 'User data:', userData);          // GOOD (auto-redacts)
```

---

❌ **DON'T** trust user input:
```typescript
const userInput = formData.get("name");
await db.user.create({ name: userInput });  // BAD! No validation
```

✅ **DO** sanitize and validate:
```typescript
const userInput = sanitizeString(formData.get("name") as string);
if (!isValidLength(userInput, 1, 100)) {
  return json({ error: "Invalid name" }, { status: 400 });
}
await db.user.create({ name: userInput });  // GOOD!
```

---

❌ **DON'T** hardcode secrets:
```typescript
const API_KEY = "sk_live_12345";  // BAD!
```

✅ **DO** use environment variables:
```typescript
const API_KEY = process.env.API_KEY;  // GOOD
if (!API_KEY) throw new Error("API_KEY not set");
```

---

❌ **DON'T** forget rate limiting on public APIs:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  // Anyone can call this unlimited times! BAD!
  return json(await expensiveOperation());
}
```

✅ **DO** add rate limiting:
```typescript
export async function loader({ request }: LoaderFunctionArgs) {
  const rateLimitResponse = await applyRateLimit(request, RATE_LIMITS.API_DEFAULT);
  if (rateLimitResponse) return rateLimitResponse;
  
  return json(await expensiveOperation());  // GOOD!
}
```

## 🔧 Quick Setup for New Environment

```bash
# 1. Set encryption key (required!)
fly secrets set ENCRYPTION_KEY=$(openssl rand -base64 32) --app spector

# 2. Set Shopify credentials
fly secrets set SHOPIFY_API_KEY=your_key --app spector
fly secrets set SHOPIFY_API_SECRET=your_secret --app spector

# 3. Verify secrets are set
fly secrets list --app spector

# 4. Deploy
fly deploy --app spector
```

## 📊 Testing Security

```bash
# Test HTTPS redirect
curl -I http://spector.fly.dev/
# Should return 301/302 to https://

# Test security headers
curl -I https://spector.fly.dev/
# Should include: CSP, HSTS, X-Frame-Options, etc.

# Test rate limiting
for i in {1..70}; do curl -s https://spector.fly.dev/app/api/analytics; done
# Should eventually return 429 Too Many Requests

# Check for secrets in logs
fly logs | grep -i "password\|secret\|token"
# Should only show [REDACTED] or safe messages
```

## 🆘 Emergency Response

### If API Keys Leaked:
1. Immediately rotate in Shopify Partner Dashboard
2. Update Fly.io secrets: `fly secrets set SHOPIFY_API_SECRET=new_secret`
3. Restart app: `fly apps restart spector`
4. Review logs for suspicious activity

### If Under Attack:
1. Check rate limiting: `fly logs | grep "429"`
2. Temporarily reduce rate limits in `app/utils/security.ts`
3. Deploy updated limits: `fly deploy`
4. Monitor: `fly logs --app spector`

### If Data Breach Suspected:
1. Check database access logs
2. Verify encryption is working: check `encryptedData` field in DB
3. Rotate `ENCRYPTION_KEY` if compromised (requires data migration)
4. Review recent code changes for vulnerabilities
