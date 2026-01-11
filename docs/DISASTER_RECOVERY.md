# Spector - Disaster Recovery Plan

## Overview
This document outlines disaster recovery procedures and simulation tests for the Spector Shopify app running on Google Cloud Run.

**Last Updated:** January 2026  
**Review Schedule:** Quarterly

---

## Architecture Components

| Component | Service | Region | Backup |
|-----------|---------|--------|--------|
| App Server | Cloud Run (spector) | us-central1 | Auto-scaling |
| Database | Cloud SQL (PostgreSQL) | us-central1 | Automated backups |
| Cache | Upstash Redis | Global | Managed |
| Secrets | Secret Manager | Global | Versioned |
| DNS/SSL | Shopify + Cloud Run | Global | Managed |

---

## DR Scenarios & Simulations

### Scenario 1: Database Connection Failure

**Symptoms:**
- App returns 500 errors
- Logs show "Connection refused" or "ECONNREFUSED"
- Prisma errors in logs

**Simulation Steps:**
```bash
# 1. Temporarily change DATABASE_URL to invalid value
gcloud secrets versions add DATABASE_URL --data-file=- <<< "postgresql://invalid:invalid@localhost:5432/invalid"

# 2. Deploy new revision to pick up change
gcloud run services update spector --region=us-central1

# 3. Observe behavior (should see errors in logs)
gcloud logging read "resource.type=cloud_run_revision" --limit=20

# 4. Restore correct DATABASE_URL
gcloud secrets versions add DATABASE_URL --data-file=/path/to/correct-database-url.txt

# 5. Redeploy
gcloud run services update spector --region=us-central1
```

**Expected Recovery Time:** < 5 minutes  
**Acceptance Criteria:** App recovers within 5 minutes of DATABASE_URL restoration

---

### Scenario 2: Cloud Run Service Deletion

**Symptoms:**
- 404 errors on app URL
- Shopify shows "App unavailable"

**Simulation Steps:**
```bash
# DON'T ACTUALLY DELETE - Instead, deploy a broken image
# 1. Deploy intentionally broken revision
gcloud run deploy spector \
  --image=gcr.io/tough-bearing-478915-t7/spector:broken \
  --region=us-central1 \
  --no-traffic

# 2. Route small traffic to test
gcloud run services update-traffic spector \
  --region=us-central1 \
  --to-revisions=BROKEN_REVISION=10

# 3. Verify errors occur

# 4. Roll back
gcloud run services update-traffic spector \
  --region=us-central1 \
  --to-latest
```

**Recovery Procedure:**
```bash
# Redeploy from last known good image
gcloud run deploy spector \
  --image=gcr.io/tough-bearing-478915-t7/spector:latest \
  --region=us-central1
```

**Expected Recovery Time:** < 10 minutes

---

### Scenario 3: Redis/Cache Failure

**Symptoms:**
- Slower response times
- Webhook processing delays
- Rate limiting may not work correctly

**Simulation Steps:**
```bash
# 1. Temporarily disable Redis by setting invalid URL
gcloud secrets versions add UPSTASH_REDIS_REST_URL --data-file=- <<< "https://invalid.upstash.io"

# 2. Redeploy
gcloud run services update spector --region=us-central1

# 3. Observe app behavior (should fallback gracefully)
# App should still function but with degraded performance

# 4. Restore correct Redis URL
gcloud secrets versions add UPSTASH_REDIS_REST_URL --data-file=/path/to/correct-redis-url.txt
```

**Expected Behavior:** App continues to function (graceful degradation)  
**Acceptance Criteria:** No 500 errors, webhooks processed (with delay)

---

### Scenario 4: Secret/Credential Rotation

**Test Procedure:**
```bash
# 1. Generate new encryption key
NEW_KEY=$(openssl rand -base64 32)

# 2. Add as new version (don't delete old one yet)
echo -n "$NEW_KEY" | gcloud secrets versions add ENCRYPTION_KEY --data-file=-

# 3. Redeploy to pick up new secret
gcloud run services update spector --region=us-central1

# 4. Verify app works with new key

# 5. (Optional) Disable old version after validation
gcloud secrets versions disable ENCRYPTION_KEY --version=PREVIOUS_VERSION
```

**Shopify API Key Rotation:**
1. Generate new API key in Shopify Partner Dashboard
2. Update SHOPIFY_API_SECRET in Secret Manager
3. Redeploy Cloud Run
4. Verify OAuth flow works
5. Disable old key in Shopify

---

### Scenario 5: Traffic Spike / DDoS Simulation

**Simulation using Locust:**
```bash
# Run from scripts/loadtest.py
locust -f scripts/loadtest.py \
  --host=https://spector-260800553724.us-central1.run.app \
  --users 200 \
  --spawn-rate 20 \
  --run-time 10m \
  --headless
```

**Monitor during test:**
```bash
# Watch Cloud Run metrics
open "https://console.cloud.google.com/run/detail/us-central1/spector/metrics?project=tough-bearing-478915-t7"
```

**Expected Behavior:**
- Cloud Run scales up instances (check max-instances limit)
- Response times may increase but no crashes
- No 502/503 errors

---

## Recovery Runbooks

### Quick Recovery Commands

```bash
# Check service status
gcloud run services describe spector --region=us-central1

# View recent logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=spector" --limit=50

# Rollback to previous revision
gcloud run services update-traffic spector --region=us-central1 --to-latest

# Force redeploy from latest image
gcloud run deploy spector \
  --image=gcr.io/tough-bearing-478915-t7/spector:latest \
  --region=us-central1

# Check database connectivity
gcloud sql connect spector-db --user=postgres

# View secret versions
gcloud secrets versions list DATABASE_URL
gcloud secrets versions list SHOPIFY_API_SECRET
```

---

## Backup & Restore

### Database Backups

**Automated Backups:**
- Cloud SQL automated backups: Daily
- Retention: 7 days

**Manual Backup:**
```bash
gcloud sql backups create --instance=spector-db
```

**Restore from Backup:**
```bash
# List available backups
gcloud sql backups list --instance=spector-db

# Restore (creates new instance)
gcloud sql backups restore BACKUP_ID \
  --restore-instance=spector-db-restored \
  --backup-instance=spector-db
```

---

## Monitoring & Alerts

### Recommended Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| High Error Rate | >5% 5xx errors for 5 min | Critical |
| High Latency | p95 > 5s for 5 min | Warning |
| Instance Count High | >8 instances for 10 min | Warning |
| Database CPU | >80% for 10 min | Warning |
| Memory Usage | >90% for 5 min | Critical |

### Set up alerts:
```bash
# Open Cloud Monitoring Alerting
open "https://console.cloud.google.com/monitoring/alerting?project=tough-bearing-478915-t7"
```

---

## Contact & Escalation

| Role | Contact | Escalation Time |
|------|---------|-----------------|
| Primary On-Call | [Your Email] | Immediate |
| Google Cloud Support | console.cloud.google.com/support | 15 min |
| Shopify Partner Support | partners.shopify.com | 30 min |

---

## DR Simulation Schedule

| Quarter | Scenario | Date | Status |
|---------|----------|------|--------|
| Q1 2026 | Database Failure | TBD | Pending |
| Q1 2026 | Traffic Spike | TBD | Pending |
| Q2 2026 | Secret Rotation | TBD | Pending |
| Q2 2026 | Full DR Drill | TBD | Pending |

---

## Post-Incident Template

```markdown
## Incident Report

**Date:** 
**Duration:** 
**Severity:** P1/P2/P3
**Services Affected:** 

### Timeline
- HH:MM - Issue detected
- HH:MM - Investigation started
- HH:MM - Root cause identified
- HH:MM - Fix deployed
- HH:MM - Service restored

### Root Cause


### Resolution


### Action Items
- [ ] 
- [ ] 

### Lessons Learned

```
