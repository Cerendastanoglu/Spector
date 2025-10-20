# Fly.io Troubleshooting Guide

## 🔧 Common Issues and Solutions

### Issue: "fly secrets set" Command Not Working

**Symptoms:**
- Running `fly secrets set SHOPIFY_API_SECRET=xxx` fails
- Error about missing image or app suspended

**Root Causes:**
1. **App is suspended** - Fly.io automatically suspends apps after inactivity
2. **No deployment image** - The app has never been deployed or image was deleted
3. **App doesn't exist** - You're using wrong app name

**Solutions:**

#### Step 1: Check if you're logged in
```bash
fly auth whoami
# Should show your email
```

#### Step 2: List your apps
```bash
fly apps list
# Look for your app name and its STATUS
```

#### Step 3: Check app status
```bash
fly status --app spector
# Check if machines are "stopped" or "suspended"
```

#### Step 4: Deploy the app first (if no image exists)
```bash
fly deploy --app spector
# This will build and deploy a new image
```

#### Step 5: Set secrets AFTER deployment
```bash
fly secrets set SHOPIFY_API_SECRET=your_secret_here --app spector
```

---

## 🚀 Correct Deployment Order

### First Time Setup (or After Long Suspension)

1. **Deploy the app** (builds the image):
   ```bash
   fly deploy --app spector
   ```

2. **Set secrets** (after deployment succeeds):
   ```bash
   fly secrets set SHOPIFY_API_SECRET=8349678cc521791c3a4f8a4a12d638dd --app spector
   fly secrets set RESEND_API_KEY=re_your_key_here --app spector
   ```

3. **Verify secrets are set**:
   ```bash
   fly secrets list --app spector
   ```

4. **Check app is running**:
   ```bash
   fly status --app spector
   fly logs --app spector
   ```

---

## 🔐 Managing Secrets

### Set a secret
```bash
fly secrets set SECRET_NAME=secret_value --app spector
```

### Set multiple secrets at once
```bash
fly secrets set \
  SHOPIFY_API_SECRET=xxx \
  RESEND_API_KEY=yyy \
  --app spector
```

### List all secrets (names only, values hidden)
```bash
fly secrets list --app spector
```

### Remove a secret
```bash
fly secrets unset SECRET_NAME --app spector
```

### Import secrets from .env file
```bash
# Create a production.env file with your secrets:
# SHOPIFY_API_SECRET=xxx
# RESEND_API_KEY=yyy

fly secrets import --app spector < production.env
```

---

## ⚠️ Important Notes

### Moving Secrets from fly.toml to Fly Secrets

Currently in `fly.toml`:
```toml
[env]
  SHOPIFY_API_KEY = '035bb80387ae6ea29247c8d0b706f67a'
```

**Warning from Fly.io:**
> "SHOPIFY_API_KEY may be a potentially sensitive environment variable"

**Should you move it?**
- **For public apps**: Keep it in `fly.toml` (it's the public client ID)
- **For private apps**: Move to secrets

**The API KEY vs API SECRET:**
- `SHOPIFY_API_KEY` = Client ID (public, can be in fly.toml)
- `SHOPIFY_API_SECRET` = Client Secret (private, MUST be in secrets)

---

## 📊 Monitoring and Logs

### View real-time logs
```bash
fly logs --app spector
```

### View logs and follow
```bash
fly logs --app spector -f
```

### Check app health
```bash
fly checks list --app spector
```

### Open app dashboard
```bash
fly dashboard spector
```

### SSH into the machine
```bash
fly ssh console --app spector
```

---

## 🔄 App Lifecycle

### Start stopped machines
```bash
fly machine start <machine-id> --app spector
# Get machine ID from: fly status --app spector
```

### Scale to 0 (suspend)
```bash
fly scale count 0 --app spector
```

### Scale to 1 (resume)
```bash
fly scale count 1 --app spector
```

### Restart app
```bash
fly apps restart spector
```

---

## 🐛 Common Errors

### Error: "Could not find image"
**Solution:** Deploy the app first
```bash
fly deploy --app spector
```

### Error: "App not found"
**Solution:** Check app name
```bash
fly apps list
# Use the correct app name from the list
```

### Error: "No organization selected"
**Solution:** Specify app explicitly
```bash
fly secrets set KEY=value --app spector
```

### Error: "Unauthorized"
**Solution:** Login again
```bash
fly auth login
```

---

## 📝 Production Checklist

Before going live, ensure:

- [ ] App is deployed: `fly deploy --app spector`
- [ ] All secrets are set:
  ```bash
  fly secrets list --app spector
  # Should show:
  # - SHOPIFY_API_SECRET
  # - RESEND_API_KEY
  # - DATABASE_URL (if using Fly Postgres)
  ```
- [ ] Database is attached: `fly postgres list`
- [ ] App is running: `fly status --app spector`
- [ ] URLs match in Shopify Partner Dashboard
- [ ] Test the app: `fly open`

---

## 🎯 Quick Commands Reference

```bash
# Status
fly status --app spector
fly apps list
fly logs --app spector

# Deploy
fly deploy --app spector

# Secrets
fly secrets set KEY=value --app spector
fly secrets list --app spector

# Database
fly postgres list
fly postgres attach spector-db

# Scaling
fly scale count 1 --app spector
fly scale vm shared-cpu-1x --memory 512 --app spector

# SSH
fly ssh console --app spector

# Open
fly open --app spector
fly dashboard spector
```

---

## 💡 Pro Tips

1. **Always specify `--app spector`** to avoid ambiguity
2. **Deploy before setting secrets** if app has no image
3. **Use `fly secrets import`** for bulk secret updates
4. **Check logs immediately** after deployment: `fly logs -f`
5. **Set DATABASE_URL automatically** by attaching Postgres: `fly postgres attach`
6. **Keep SHOPIFY_API_KEY in fly.toml** (it's a public client ID)
7. **Never commit secrets** to git (use .env locally, Fly secrets in production)

---

## 🔗 Useful Links

- [Fly.io Secrets Documentation](https://fly.io/docs/apps/secrets/)
- [Fly.io Deployment Guide](https://fly.io/docs/apps/deploy/)
- [Fly.io PostgreSQL](https://fly.io/docs/postgres/)
- [Fly.io Status](https://status.fly.io/)
