# Google Cloud Run Deployment Guide

## Prerequisites

1. **Install Google Cloud CLI**:
   ```bash
   # macOS
   curl https://sdk.cloud.google.com | bash
   exec -l $SHELL
   gcloud init
   ```

2. **Create a Google Cloud Project**:
   - Go to https://console.cloud.google.com/
   - Create a new project (e.g., "spector-app")
   - Note your PROJECT_ID

3. **Enable Required APIs**:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable sqladmin.googleapis.com
   gcloud services enable secretmanager.googleapis.com
   ```

## Step 1: Set Up Cloud SQL (PostgreSQL)

```bash
# Create PostgreSQL instance (db-f1-micro = ~$7/month)
gcloud sql instances create spector-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=us-central1

# Create database
gcloud sql databases create spector --instance=spector-db

# Create user
gcloud sql users create spector-user \
  --instance=spector-db \
  --password=YOUR_SECURE_PASSWORD
```

## Step 2: Set Up Secrets

```bash
# Store secrets in Secret Manager
echo -n "YOUR_SHOPIFY_API_SECRET" | gcloud secrets create SHOPIFY_API_SECRET --data-file=-
echo -n "YOUR_RESEND_API_KEY" | gcloud secrets create RESEND_API_KEY --data-file=-
echo -n "YOUR_ENCRYPTION_KEY" | gcloud secrets create ENCRYPTION_KEY --data-file=-

# Database URL format:
# postgresql://spector-user:PASSWORD@/spector?host=/cloudsql/PROJECT_ID:us-central1:spector-db
echo -n "postgresql://spector-user:YOUR_PASSWORD@/spector?host=/cloudsql/PROJECT_ID:us-central1:spector-db" | \
  gcloud secrets create DATABASE_URL --data-file=-
```

## Step 3: Set Up Redis (Memorystore)

```bash
# Create Redis instance (M1 = ~$50/month, or use free tier alternatives)
gcloud redis instances create spector-redis \
  --size=1 \
  --region=us-central1 \
  --redis-version=redis_7_0

# Get Redis connection info
gcloud redis instances describe spector-redis --region=us-central1

# Store Redis URL (format: redis://HOST:PORT)
echo -n "redis://REDIS_HOST:6379" | gcloud secrets create REDIS_URL --data-file=-
```

**Alternative (Free)**: Use Upstash Redis instead:
```bash
# Get REDIS_URL from https://console.upstash.com/
echo -n "YOUR_UPSTASH_REDIS_URL" | gcloud secrets create REDIS_URL --data-file=-
```

## Step 4: Deploy to Cloud Run

```bash
# Set your project
gcloud config set project PROJECT_ID

# Build and deploy (this builds from Dockerfile)
gcloud run deploy spector \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --add-cloudsql-instances PROJECT_ID:us-central1:spector-db \
  --set-env-vars "SHOPIFY_API_KEY=YOUR_API_KEY" \
  --set-env-vars "SHOPIFY_APP_URL=https://spector-RANDOM.run.app" \
  --set-env-vars "SCOPES=write_products,read_products,read_orders,write_orders,read_inventory,write_inventory,read_locations" \
  --set-secrets "SHOPIFY_API_SECRET=SHOPIFY_API_SECRET:latest" \
  --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
  --set-secrets "REDIS_URL=REDIS_URL:latest" \
  --set-secrets "RESEND_API_KEY=RESEND_API_KEY:latest" \
  --set-secrets "ENCRYPTION_KEY=ENCRYPTION_KEY:latest" \
  --min-instances 0 \
  --max-instances 10 \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300
```

**Note**: After first deploy, you'll get a URL like `https://spector-abc123-uc.a.run.app`. Update the `SHOPIFY_APP_URL` env var with this URL:

```bash
gcloud run services update spector \
  --region us-central1 \
  --set-env-vars "SHOPIFY_APP_URL=https://spector-abc123-uc.a.run.app"
```

## Step 5: Update Shopify Configuration

Update `shopify.app.toml`:

```toml
application_url = "https://spector-abc123-uc.a.run.app"

[auth]
redirect_urls = [
  "https://spector-abc123-uc.a.run.app/auth/callback",
  "https://spector-abc123-uc.a.run.app/auth/shopify/callback",
  "https://spector-abc123-uc.a.run.app/api/auth/callback"
]
```

Deploy configuration:
```bash
shopify app deploy
```

## Step 6: Verify Deployment

```bash
# Check logs
gcloud run services logs read spector --region us-central1

# Get service URL
gcloud run services describe spector --region us-central1 --format='value(status.url)'

# Test the service
curl https://spector-abc123-uc.a.run.app/
```

## Pricing Estimate

**Cloud Run** (Free tier generous):
- First 2M requests/month: FREE
- 360,000 GB-seconds compute time/month: FREE
- Beyond free tier: ~$0.001/request

**Cloud SQL** (db-f1-micro):
- ~$7/month for shared CPU instance
- 10GB storage included

**Redis Options**:
1. **Upstash** (recommended): FREE tier (10,000 commands/day)
2. **Memorystore M1**: ~$50/month

**Total estimated cost**: $7-57/month depending on Redis choice

## Advantages Over Fly.io

1. ✅ **Simpler deployment** - One command, no TOML files
2. ✅ **Better free tier** - 2M requests vs limited compute hours
3. ✅ **Automatic HTTPS** - No configuration needed
4. ✅ **Better logging** - Cloud Logging integration
5. ✅ **Better Node.js support** - First-class container support
6. ✅ **Scales to zero** - Pay only when used
7. ✅ **No port binding issues** - Just works™
8. ✅ **Global CDN** - Included by default

## Development Workflow

1. Make changes locally
2. Test with `npm run dev`
3. Deploy:
   ```bash
   gcloud run deploy spector --source . --region us-central1
   ```

## Environment Variables Reference

| Variable | Required | Example |
|----------|----------|---------|
| `SHOPIFY_APP_URL` | Yes | `https://spector-abc123-uc.a.run.app` |
| `SHOPIFY_API_KEY` | Yes | From `shopify app env show` |
| `SHOPIFY_API_SECRET` | Yes (Secret) | From `shopify app env show` |
| `DATABASE_URL` | Yes (Secret) | `postgresql://user:pass@/db?host=/cloudsql/...` |
| `REDIS_URL` | Yes (Secret) | `redis://host:6379` or Upstash URL |
| `SCOPES` | Yes | `write_products,read_products,...` |
| `RESEND_API_KEY` | Yes (Secret) | From Resend dashboard |
| `ENCRYPTION_KEY` | Yes (Secret) | 32-byte random string |

## Troubleshooting

**Container fails to start**:
```bash
gcloud run services logs read spector --region us-central1 --limit 50
```

**Database connection issues**:
- Verify Cloud SQL instance is running
- Check `--add-cloudsql-instances` flag is correct
- Verify DATABASE_URL format includes `/cloudsql/` socket path

**App not receiving requests**:
- Check `--allow-unauthenticated` flag is set
- Verify app listens on `process.env.PORT` (Cloud Run sets this automatically)

## Quick Commands

```bash
# View service details
gcloud run services describe spector --region us-central1

# Update environment variable
gcloud run services update spector --region us-central1 --set-env-vars KEY=VALUE

# Update secret
gcloud run services update spector --region us-central1 --set-secrets KEY=SECRET_NAME:latest

# View logs (live)
gcloud run services logs tail spector --region us-central1

# Delete service
gcloud run services delete spector --region us-central1
```
