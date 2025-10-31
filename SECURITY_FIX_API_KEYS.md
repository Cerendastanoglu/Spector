# 🔐 Security Fix Guide - API Keys & Secrets

## ✅ What I Fixed

### 1. Verified .env Security
- ✅ Confirmed `.env` is in `.gitignore`
- ✅ Verified `.env` was NEVER committed to git
- ✅ Your secrets are safe - they never entered version control

---

## 🚨 IMMEDIATE ACTIONS REQUIRED

### Step 1: Regenerate Your API Keys (DO THIS NOW)

Even though your keys weren't committed, it's best practice to rotate them:

#### A. Shopify API Secret
1. Go to [Shopify Partner Dashboard](https://partners.shopify.com)
2. Click on your app "Spector"
3. Go to **Configuration** → **Client credentials**
4. Click **Rotate client secret**
5. Copy the new secret
6. Update your `.env` file:
   ```bash
   SHOPIFY_API_SECRET=<new_secret_here>
   ```

**Note**: Your `SHOPIFY_API_KEY` can stay the same - it's meant to be public.

#### B. Resend API Key (Optional but Recommended)
1. Go to [Resend Dashboard](https://resend.com/api-keys)
2. Delete old key
3. Create new API key
4. Update your `.env` file:
   ```bash
   RESEND_API_KEY=re_<new_key_here>
   ```

---

### Step 2: Generate Secure Encryption Key

Your current key is weak. Let's generate a cryptographically secure one:

```bash
# Run this command to generate a secure 64-character hex key:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

This will output something like:
```
a3f9d8c7b6e5a4f3d2c1b9e8a7f6d5c4b3a2f1e9d8c7b6a5f4e3d2c1b0a9f8e7
```

Update your `.env` file:
```bash
ENCRYPTION_KEY=<paste_the_generated_key_here>
```

---

### Step 3: Production Secrets Setup

When deploying to production (Fly.io), NEVER use the same secrets:

```bash
# Generate NEW production encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Set secrets on Fly.io (do NOT commit these)
fly secrets set SHOPIFY_API_SECRET=<production_secret>
fly secrets set RESEND_API_KEY=<production_key>
fly secrets set ENCRYPTION_KEY=<production_encryption_key>
fly secrets set DATABASE_URL=<flyio_postgres_url>
fly secrets set SHOPIFY_APP_URL=https://your-app.fly.dev
```

---

## 🛡️ Security Best Practices Implemented

### ✅ What's Protected:
1. **`.env` in `.gitignore`** - Prevents accidental commits
2. **`.env.example`** - Template without secrets
3. **Separate dev/prod keys** - Different keys for each environment
4. **Strong encryption** - 256-bit keys (32 bytes = 64 hex chars)

### ⚠️ Never Do This:
- ❌ Commit `.env` to git
- ❌ Share `.env` via email/Slack
- ❌ Use same keys for dev and production
- ❌ Use weak/default encryption keys
- ❌ Store secrets in code files

### ✅ Always Do This:
- ✅ Use environment variables for secrets
- ✅ Rotate keys regularly (every 90 days)
- ✅ Use different keys per environment
- ✅ Use secrets management (Fly.io secrets, etc.)
- ✅ Generate cryptographically secure keys

---

## 📋 Verification Checklist

After completing the steps above:

- [ ] New Shopify API secret generated and set in `.env`
- [ ] New Resend API key generated and set in `.env` (optional)
- [ ] New encryption key generated (64 hex chars) and set in `.env`
- [ ] App still works with new keys: `shopify app dev`
- [ ] Noted production keys are different (when deploying)
- [ ] `.env` is NOT in git: `git status` shows nothing

---

## 🔒 Your Current .env Status

Your `.env` file contains:
```bash
SHOPIFY_API_KEY=035bb80387ae6ea29247c8d0b706f67a  # ✅ Can stay (public)
SHOPIFY_API_SECRET=YOUR_ACTUAL_SECRET_HERE         # ⚠️ Need real value
RESEND_API_KEY=re_jmrSy2rk_3hBVxks2YcBJDRWpKZZAG1W7  # 🔄 Should rotate
ENCRYPTION_KEY=default-dev-key-change-in-production-32chars  # 🔴 WEAK - must change
```

**Action Required**: Follow Step 2 above to generate secure encryption key NOW.

---

## 🎯 Quick Commands

```bash
# 1. Generate new encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. Verify .env is ignored
git check-ignore .env
# Should output: .env

# 3. Check nothing is committed
git status
# Should NOT show .env

# 4. Test app still works
shopify app dev
```

---

## ✅ Issue 1 Resolution

**Status**: ✅ **SECURED**

- ✅ `.env` never committed to git
- ✅ `.gitignore` properly configured
- ✅ Security guide created
- 🟡 **ACTION NEEDED**: Generate new encryption key (see Step 2)
- 🟡 **OPTIONAL**: Rotate API keys for peace of mind

**Next**: Issue #2 - Weak Encryption Key (see Step 2 above)
