# ⚡ Quick Start - Update Shopify App URLs

## 🎯 The Easiest Way (RECOMMENDED)

Your `shopify.app.toml` is already configured with the correct URLs!

Just run:
```bash
shopify app deploy
```

**That's it!** ✅ Shopify CLI will automatically sync your URLs to the Partner Dashboard.

---

## 📝 What's Already Configured

Your `shopify.app.toml` already has:
```toml
application_url = "https://spector.fly.dev"

[auth]
redirect_urls = [
  "https://spector.fly.dev/auth/callback",
  "https://spector.fly.dev/auth/shopify/callback",
  "https://spector.fly.dev/api/auth/callback"
]
```

✅ Client ID: `035bb80387ae6ea29247c8d0b706f67a`  
✅ Scopes: `write_products,read_products,read_orders,write_orders`

---

## 🔄 Alternative: Manual Update in Partner Dashboard

If you need to manually update (or verify) in the Partner Dashboard:

### Step 1: Access Partner Dashboard
1. Go to https://partners.shopify.com/
2. Click **"Apps"** (left sidebar)
3. Click **"Spector"**

### Step 2: Find App Setup
Look for one of these:
- **"App setup"** button (top right)
- **"Edit"** option
- **Settings/gear icon**
- Try URL: `https://partners.shopify.com/[YOUR_ORG]/apps/[APP_ID]/edit`

### Step 3: Update URLs
- **App URL**: `https://spector.fly.dev`
- **Redirect URLs** (all 3):
  - `https://spector.fly.dev/auth/callback`
  - `https://spector.fly.dev/auth/shopify/callback`
  - `https://spector.fly.dev/api/auth/callback`

### Step 4: Save
Click "Save" or "Update"

---

## 🧪 Test Your App

After updating URLs (either way):

```bash
# Open your deployed app
fly open --app spector

# Or visit directly
https://spector.fly.dev

# Watch logs
fly logs --app spector -f
```

### Test Installation
1. Go to a Shopify development store admin
2. Uninstall Spector (if previously installed)
3. Reinstall from Partner Dashboard
4. Test that OAuth login works
5. Verify all features work

---

## ❓ Troubleshooting

### "shopify command not found"
```bash
# Install Shopify CLI
npm install -g @shopify/cli @shopify/app
```

### "OAuth redirect URL mismatch"
Your `shopify.app.toml` URLs need to match Partner Dashboard. Run:
```bash
shopify app deploy
```

### "Can't find where to update URLs in Partner Dashboard"
Don't worry! Just use `shopify app deploy` - it handles everything automatically.

---

## ✅ Summary

**Recommended:** Use `shopify app deploy` - it's automatic!  
**Alternative:** Manually update in Partner Dashboard (see SHOPIFY_DASHBOARD_GUIDE.md for details)

Your configuration is already correct in `shopify.app.toml` ✅
