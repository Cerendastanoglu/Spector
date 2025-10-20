# Production Deployment Guide - Spector App

## 🎯 Current Status: Ready for Fly.io Deployment

### ✅ Completed Setup
1. **Branch Strategy** - All branches created
2. **Environment Variables** - `.env` and `.env.example` configured
3. **Fly.io Configuration** - `fly.toml` and `shopify.app.toml` updated
4. **Production URLs** - All pointing to `https://spector.fly.dev`

---

## 📋 Branch Strategy

### Branch Structure
```
main                    (Production - only stable releases)
  ├── develop          (Integration branch - daily development)
      ├── new-feature  (New features and enhancements)
      └── pre-release-testing (Pre-release testing, QA, and bug fixes)
```

### Branch Workflow
1. **new-feature**: Develop new features
   - Create feature branches from `develop`
   - Merge back to `develop` via PR
   
2. **pre-release-testing**: Final QA and bug fixes before production
   - Merge `develop` into `pre-release-testing`
   - Run comprehensive tests
   - Fix any bugs found directly in this branch
   - When stable, merge to `main`
   
3. **develop**: Main integration branch
   - All features merge here first
   - Daily development happens here
   - Should be relatively stable
   
4. **main**: Production branch
   - Only merge from `pre-release-testing`
   - Every commit = production deployment
   - Must be 100% stable

### To Push Branches to Remote:
```bash
git push -u origin main
git push -u origin develop
git push -u origin new-feature
git push -u origin pre-release-testing
```

---

## 🔐 Environment Variables Explained

### How .env Files Work

**The Problem You Asked About:**
> "How can we not commit this though? how can we use different values?"

**The Solution:**
1. **`.env`** - Contains your ACTUAL secrets (never committed to git)
   - Already in `.gitignore` ✅
   - Each developer has their own `.env` with their API keys
   - Production server has its own `.env` with production keys
   
2. **`.env.example`** - Template showing what variables are needed (committed to git)
   - Developers copy this to create their own `.env`
   - Shows structure but has placeholder values
   - Safe to commit because it has no real secrets

**Different Values for Different Environments:**
- **Local Development**: Your `.env` has local values
- **Staging/Testing**: Fly.io secrets on staging app
- **Production**: Fly.io secrets on production app

### Setting Secrets on Fly.io

**IMPORTANT**: Never put secrets in `fly.toml` - use Fly.io secrets!

```bash
# After deploying to Fly.io, set secrets with:
fly secrets set SHOPIFY_API_SECRET=your_actual_secret_here
fly secrets set RESEND_API_KEY=re_your_actual_key_here
fly secrets set DATABASE_URL=postgresql://user:pass@host/db

# View configured secrets (values are hidden):
fly secrets list

# Remove a secret if needed:
fly secrets unset SECRET_NAME
```

### Required Secrets for Production

You need to set these on Fly.io:
```bash
SHOPIFY_API_SECRET=your_actual_secret
RESEND_API_KEY=re_your_actual_key
DATABASE_URL=postgresql://... (from Fly Postgres)
```

Already in `fly.toml` (non-secret env vars):
- ✅ SHOPIFY_API_KEY
- ✅ SHOPIFY_APP_URL
- ✅ SCOPES
- ✅ PORT

---

## 🚀 Fly.io Deployment Steps

### Prerequisites
1. Install Fly.io CLI:
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. Login to Fly.io:
   ```bash
   fly auth login
   ```

### Initial Setup (First Time Only)

1. **Create Fly.io App** (if not already created):
   ```bash
   fly launch
   # When prompted:
   # - App name: spector (or choose another)
   # - Region: Choose closest to your users
   # - Postgres? Yes (for production database)
   # - Redis? No (not needed currently)
   ```

2. **Create PostgreSQL Database**:
   ```bash
   fly postgres create --name spector-db --region fra
   fly postgres attach spector-db
   # This automatically sets DATABASE_URL secret
   ```

3. **Set Required Secrets**:
   ```bash
   fly secrets set SHOPIFY_API_SECRET=your_actual_secret_from_partner_dashboard
   fly secrets set RESEND_API_KEY=re_your_actual_resend_api_key
   ```

4. **Update Shopify Partner Dashboard**:
   - Go to: https://partners.shopify.com/organizations
   - Navigate to Apps > Spector
   - Update "App URL" to: `https://spector.fly.dev`
   - Update "Allowed redirection URL(s)" to:
     - `https://spector.fly.dev/auth/callback`
     - `https://spector.fly.dev/auth/shopify/callback`
     - `https://spector.fly.dev/api/auth/callback`
   - Verify scopes match: `write_products,read_products,read_orders,write_orders`

### Deploying Updates

```bash
# 1. Make sure you're on the right branch
git checkout main  # or develop for staging

# 2. Deploy to Fly.io
fly deploy

# 3. Monitor deployment
fly logs

# 4. Check app status
fly status

# 5. Open app in browser
fly open
```

### Database Migrations on Fly.io

```bash
# SSH into Fly.io machine
fly ssh console

# Run Prisma migrations
npx prisma migrate deploy

# Exit SSH
exit
```

---

## 🔍 Configuration Summary

### Current Configuration Status

#### ✅ FIXED: Application URL
- **Before**: `https://miscellaneous-financing-collected-sheer.trycloudflare.com` (temporary)
- **After**: `https://spector.fly.dev` (production)
- **Files Updated**:
  - `shopify.app.toml` - application_url
  - `shopify.app.toml` - redirect_urls
  - `fly.toml` - SHOPIFY_APP_URL
  - `.env` - SHOPIFY_APP_URL (template)

#### ✅ FIXED: Client ID
- **Value**: `035bb80387ae6ea29247c8d0b706f67a`
- **Status**: Verified in `shopify.app.toml` ✅
- **Note**: This must match your Shopify Partner Dashboard

#### ✅ FIXED: Scopes
- **Before**: `write_products,read_products,read_orders`
- **After**: `write_products,read_products,read_orders,write_orders`
- **Reason**: Added `write_orders` for bulk operations functionality
- **Files Updated**:
  - `shopify.app.toml` - scopes
  - `fly.toml` - SCOPES env var
  - `.env` - SCOPES variable
  - `.env.example` - SCOPES template

#### ✅ CONFIGURED: Webhooks
All webhooks configured in `shopify.app.toml`:
- ✅ `app/uninstalled` - Clean up on app removal
- ✅ `app/scopes_update` - Handle scope changes
- ✅ `shop/update` - Monitor store upgrades
- ✅ GDPR webhooks - Auto-configured by Shopify (customers/data_request, customers/redact, shop/redact)

---

## 📝 Next Steps Before Going Live

### 1. Get SHOPIFY_API_SECRET
```bash
# Go to Shopify Partner Dashboard:
# https://partners.shopify.com/organizations
# Navigate to: Apps > Spector > App Setup
# Find: Client Secret
# Copy it and set as Fly.io secret:
fly secrets set SHOPIFY_API_SECRET=shpss_your_actual_secret_here
```

### 2. Verify Database Setup
```bash
# Check if PostgreSQL is attached
fly postgres list

# If not attached, attach it:
fly postgres attach spector-db

# Verify DATABASE_URL is set:
fly secrets list | grep DATABASE_URL
```

### 3. Test Production Deployment
```bash
# Deploy to production
git checkout main
fly deploy

# Monitor logs
fly logs

# Test the app
fly open
```

### 4. Update Shopify Partner Dashboard URLs
After deployment, verify these URLs in Partner Dashboard:
- App URL: `https://spector.fly.dev`
- Redirect URLs:
  - `https://spector.fly.dev/auth/callback`
  - `https://spector.fly.dev/auth/shopify/callback`
  - `https://spector.fly.dev/api/auth/callback`

### 5. Test Installation
1. Install app on a development store
2. Verify OAuth flow works
3. Check all features function correctly
4. Verify webhooks are received

---

## 🔧 Useful Fly.io Commands

```bash
# View logs
fly logs

# SSH into machine
fly ssh console

# Check app status
fly status

# Scale resources
fly scale vm shared-cpu-1x --memory 1024  # Increase memory to 1GB

# Restart app
fly apps restart spector

# View secrets (names only, not values)
fly secrets list

# Open app dashboard
fly dashboard

# Monitor performance
fly monitor

# Check current configuration
fly config show
```

---

## 🔄 Development vs Production

### For Local Development
Keep using the Cloudflare tunnel temporarily:
```bash
# In .env (local)
SHOPIFY_APP_URL=https://your-tunnel.trycloudflare.com

# Run development server
npm run dev
```

### For Production (Fly.io)
Already configured:
```bash
# In fly.toml
SHOPIFY_APP_URL = 'https://spector.fly.dev'

# Deploy
fly deploy
```

---

## ⚠️ Important Security Notes

1. **NEVER commit `.env` to git** - Already protected by `.gitignore` ✅
2. **Use Fly.io secrets for production** - Not in `fly.toml` ✅
3. **Keep `.env.example` updated** - Template for new developers ✅
4. **Rotate API keys periodically** - Best practice for security
5. **Use different API keys for dev/staging/prod** - Isolation

---

## 🆘 Troubleshooting

### Issue: App won't deploy
```bash
fly logs
# Look for errors in build or runtime
```

### Issue: Database connection fails
```bash
fly secrets list | grep DATABASE_URL
# Verify DATABASE_URL is set
# Check Postgres status: fly postgres list
```

### Issue: OAuth redirect fails
- Verify URLs in Shopify Partner Dashboard match `shopify.app.toml`
- Check that SHOPIFY_APP_URL is correct
- Ensure SHOPIFY_API_SECRET is set on Fly.io

### Issue: Webhooks not received
- Check webhook configuration in Shopify Partner Dashboard
- Verify routes exist in your app for webhook URLs
- Check Fly.io logs for incoming webhook requests

---

## 📊 Monitoring Production

### Set up monitoring:
1. **Fly.io Metrics**: Built-in dashboards
   ```bash
   fly dashboard
   ```

2. **Error Tracking**: Consider adding Sentry
   ```bash
   npm install @sentry/remix
   # Configure in entry.server.tsx
   ```

3. **Uptime Monitoring**: Use UptimeRobot or similar
   - Monitor: `https://spector.fly.dev/healthz`
   - Alert if down for > 2 minutes

---

## 🎉 Summary

### What We Fixed:
✅ Created branch strategy (main, develop, new-feature, bug-fix, pre-release-testing)
✅ Set up `.env` and `.env.example` with proper gitignore
✅ Updated `shopify.app.toml` with production Fly.io URL
✅ Updated `fly.toml` with correct scopes and URLs
✅ Added `write_orders` scope for bulk operations
✅ Verified client_id is correct
✅ Configured all required webhooks

### What You Need To Do:
1. ⚠️ Get SHOPIFY_API_SECRET from Partner Dashboard
2. ⚠️ Set secrets on Fly.io (`fly secrets set`)
3. ⚠️ Update Partner Dashboard URLs to `spector.fly.dev`
4. ⚠️ Deploy to Fly.io (`fly deploy`)
5. ⚠️ Test installation on development store

### You're now ready for production deployment! 🚀
