# 🔧 How to Update Shopify Partner Dashboard URLs

## Where to Find the Settings

### Step 1: Go to Shopify Partner Dashboard
**URL**: https://partners.shopify.com/

### Step 2: Navigate to Your App
1. Click on **"Apps"** in the left sidebar
2. Find and click on **"Spector"** in your apps list

### Step 3: Click "App setup" Button
Once you're in the Spector app page, you'll see several tabs:
- Overview
- API access requests
- Admin performance
- Distribution
- App history

**Look for the "App setup" button** (usually in the top right corner or as a prominent button)
Click it to access the configuration settings.

---

## Alternative Path: Direct Configuration Access

If you don't see "App setup" button, try this path:

### Option A: Through Partner Dashboard
1. Go to https://partners.shopify.com/
2. Click **"Apps"** in left sidebar
3. Click on **"Spector"**
4. Look for **"App setup"** or **"Edit app"** button

### Option B: Direct Settings Link
Try going directly to your app's settings:
```
https://partners.shopify.com/[YOUR_ORG_ID]/apps/[APP_ID]/edit
```

You can find your app ID in the URL when viewing your app in the Partner Dashboard.

---

## What You'll See in App Setup

Once you're in the App Setup/Configuration page, you should see sections like:

### URLs Section
- **App URL** - Main application URL
- **Allowed redirection URL(s)** - OAuth callback URLs

### App credentials
- **Client ID** 
- **Client secret**

### API access
- Scopes configuration

---

---

## ✅ EASIEST METHOD: Deploy with Shopify CLI

Since the Partner Dashboard interface varies and can be confusing, the **recommended approach** is to let Shopify CLI handle it:

### Your shopify.app.toml is Already Configured!

We've already updated your `shopify.app.toml` file with the correct URLs:

```toml
client_id = "035bb80387ae6ea29247c8d0b706f67a"
application_url = "https://spector.fly.dev"

[auth]
redirect_urls = [
  "https://spector.fly.dev/auth/callback",
  "https://spector.fly.dev/auth/shopify/callback",
  "https://spector.fly.dev/api/auth/callback"
]

[access_scopes]
scopes = "write_products,read_products,read_orders,write_orders"
```

### Deploy and Sync Automatically

```bash
# This will sync your shopify.app.toml config to Partner Dashboard automatically
shopify app deploy
```

**That's it!** The Shopify CLI will:
1. Read your `shopify.app.toml` file
2. Update the Partner Dashboard with your URLs
3. Sync all your app configuration
4. No manual clicking needed!

---

## What to Update in Configuration Tab

### Section 1: App URL
**Field Name**: "App URL"
**Current Value**: `https://miscellaneous-financing-collected-sheer.trycloudflare.com`
**New Value**: `https://spector.fly.dev`

This is your main application URL where your app is hosted.

---

### Section 2: Allowed Redirection URL(s)
**Field Name**: "Allowed redirection URL(s)"

**Current Values** (probably):
```
https://miscellaneous-financing-collected-sheer.trycloudflare.com/auth/callback
https://miscellaneous-financing-collected-sheer.trycloudflare.com/auth/shopify/callback
https://miscellaneous-financing-collected-sheer.trycloudflare.com/api/auth/callback
```

**New Values** (update to):
```
https://spector.fly.dev/auth/callback
https://spector.fly.dev/auth/shopify/callback
https://spector.fly.dev/api/auth/callback
```

**How to update:**
1. Click "Add URL" or edit existing ones
2. Replace the old Cloudflare tunnel URLs with the Fly.io URLs
3. Make sure you have all 3 URLs listed above

---

## Section 3: Verify Client Credentials

### Client ID
**Should be**: `035bb80387ae6ea29247c8d0b706f67a`

This is your public client ID (same as SHOPIFY_API_KEY). Just verify it matches.

### Client Secret
You should see a hidden value like: `shpss_••••••••••••••••`

**Do NOT change this!** Just verify it exists. This is the secret you set in Fly.io as `SHOPIFY_API_SECRET`.

---

## Section 4: App Scopes

Verify these scopes are checked:
- ✅ `read_products`
- ✅ `write_products`
- ✅ `read_orders`
- ✅ `write_orders`

If you need to add or change scopes:
1. Check the boxes for the scopes you need
2. Click "Save" - this will trigger a scope change webhook
3. Existing installations will need to re-authorize

---

## Visual Guide

### Where Everything Is Located:

```
Shopify Partner Dashboard (https://partners.shopify.com/)
├── Apps (left sidebar)
    └── Spector (your app)
        ├── Overview (default tab)
        ├── API access requests
        ├── Admin performance
        ├── Distribution
        ├── App history
        └── [App setup] button ← Click this!
            ├── App URL ← Update this
            ├── Allowed redirection URL(s) ← Update these (3 URLs)
            ├── Client ID ← Verify matches
            ├── Client secret ← Just verify it exists
            └── App scopes ← Verify scopes
```

---

## Quick Copy-Paste Values

### App URL:
```
https://spector.fly.dev
```

### Redirect URLs (add all 3):
```
https://spector.fly.dev/auth/callback
https://spector.fly.dev/auth/shopify/callback
https://spector.fly.dev/api/auth/callback
```

### Client ID (verify):
```
035bb80387ae6ea29247c8d0b706f67a
```

### Scopes (verify):
```
write_products,read_products,read_orders,write_orders
```

---

## After Updating URLs

### 1. Save Changes
Click the "Save" button at the bottom of the Configuration page.

### 2. Test the App
You may need to reinstall the app on your development store:
1. Go to your development store admin
2. Uninstall Spector (if previously installed)
3. Reinstall from Partner Dashboard
4. Test OAuth flow

### 3. Verify Everything Works
- ✅ App loads at https://spector.fly.dev
- ✅ OAuth login works
- ✅ No redirect errors
- ✅ All features function correctly

---

## 🚨 Important Notes

### Development vs Production URLs

If you're still developing and using the Cloudflare tunnel, you have two options:

**Option 1: Keep Production URLs (Recommended)**
- Set Partner Dashboard to use `https://spector.fly.dev`
- For local development, temporarily update `shopify.app.toml` when running `npm run dev`
- The dev command will automatically update URLs

**Option 2: Switch Back and Forth (Not Recommended)**
- Keep changing URLs in Partner Dashboard
- This gets confusing and error-prone

**Best Practice:**
- Use `https://spector.fly.dev` as your main URL
- Test on the live Fly.io deployment
- Only use local dev when actively coding

---

## Troubleshooting

### "Can't find App setup button or Configuration"
The interface may vary based on your account type. Try these:

**Method 1: Look for "App setup" button**
- Should be visible on the app Overview page
- Usually in top right or as a prominent action button

**Method 2: Look in app settings menu**
- Look for a settings/gear icon
- Look for "Edit" option
- Look for "Configure" option

**Method 3: Use the direct URL pattern**
1. While viewing your app, look at the browser URL
2. It should look like: `https://partners.shopify.com/[ORG_ID]/apps/[APP_ID]`
3. Try adding `/edit` to the end: `https://partners.shopify.com/[ORG_ID]/apps/[APP_ID]/edit`

**Method 4: Through Shopify CLI**
You can also update app configuration through the Shopify CLI and the `shopify.app.toml` file, then deploy:
```bash
# Edit shopify.app.toml locally
# Then deploy changes
shopify app deploy
```

### "Can't find Configuration tab"
- The interface has changed - there's no "Configuration" tab anymore
- Look for **"App setup"** button instead
- It's usually on the Overview page of your app

### "Redirect URL mismatch error"
- Make sure ALL 3 redirect URLs are added
- Verify there are no typos
- Ensure URLs start with `https://` (not `http://`)
- Wait a few minutes for changes to propagate

### "App won't install after URL change"
- Clear browser cache
- Try in incognito mode
- Uninstall the old version first
- Check Fly.io logs: `fly logs --app spector -f`

---

## Screenshot Reference

When you're in the Configuration tab, you should see fields that look like:

```
App URL
[https://spector.fly.dev                              ]

Allowed redirection URL(s)
[https://spector.fly.dev/auth/callback                ]
[https://spector.fly.dev/auth/shopify/callback        ]
[https://spector.fly.dev/api/auth/callback            ]
[+ Add URL]

Client ID
035bb80387ae6ea29247c8d0b706f67a

Client secret
shpss_•••••••••••••••• [Show]
```

---

## ✅ Checklist

Before you finish:
- [ ] Updated App URL to `https://spector.fly.dev`
- [ ] Updated all 3 redirect URLs to use `spector.fly.dev`
- [ ] Verified Client ID matches `035bb80387ae6ea29247c8d0b706f67a`
- [ ] Verified Client Secret exists (hidden value)
- [ ] Verified scopes include: write_products, read_products, read_orders, write_orders
- [ ] Clicked "Save" button
- [ ] Tested app installation on development store
- [ ] Verified OAuth flow works
- [ ] Checked that app loads correctly

---

## Need More Help?

### If you still can't find the URL settings:

**Option 1: Update via shopify.app.toml (Recommended)**
The URLs in your `shopify.app.toml` file are what Shopify uses. We've already updated this file!

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

**To sync this with Shopify Partner Dashboard:**
```bash
# Deploy your app configuration
shopify app deploy
```

This will automatically update the Partner Dashboard with the URLs from your config file!

**Option 2: Contact Shopify Partner Support**
If the interface looks different:
1. Go to https://partners.shopify.com/
2. Look for "Help" or "Support" in the bottom left
3. Ask: "Where do I update my app's URLs and redirect URLs?"

**Option 3: Check App Submission Settings**
If you're preparing for app submission:
1. Look for "Distribution" tab (you mentioned seeing this)
2. There might be URL configuration options there

---

## Important: Your URLs Are Already Configured! ✅

The good news is that your `shopify.app.toml` file already has the correct URLs:
- ✅ App URL: `https://spector.fly.dev`
- ✅ All 3 redirect URLs configured
- ✅ Client ID configured
- ✅ Scopes configured

When you deploy your app with `shopify app deploy`, Shopify will sync these settings automatically.

You may not need to manually update the Partner Dashboard at all!
