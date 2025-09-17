# Data Retention and Encryption Setup

This document explains how to set up data retention and encryption for the Spector app.

## Overview

The app now includes:
- **Data Encryption**: All sensitive data is encrypted before storage
- **Data Retention**: Automatic cleanup of old data based on configurable policies
- **Order Data Alternative**: Analytics work without Order data due to Protected Customer Data requirements

## Environment Variables

Add these to your `.env` file:

```bash
# Encryption (REQUIRED for production)
# Generate a secure key using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_32_character_encryption_key_here

# Data Retention (optional, defaults will be used if not set)
ANALYTICS_RETENTION_DAYS=90
LOGS_RETENTION_DAYS=30
PRODUCTS_RETENTION_DAYS=180
NOTIFICATIONS_RETENTION_DAYS=60
```

## Database Migration

Run the database migration to add the new tables:

```bash
npm run migrate
```

## Data Retention Policies

### Default Retention Periods
- **Analytics Data**: 90 days
- **Product Analytics**: 180 days  
- **Notification Logs**: 30 days
- **General Logs**: 30 days

### Customizing Retention Policies

You can set custom retention policies per shop:

```typescript
import { setRetentionPolicy } from './app/utils/dataRetention';

// Set custom retention for a specific shop
await setRetentionPolicy('mystore.myshopify.com', 'analytics', 60); // 60 days
```

## Data Cleanup

### Manual Cleanup

Clean up all expired data:
```bash
npm run cleanup
```

Clean up data for a specific shop:
```bash
npm run cleanup:shop mystore.myshopify.com
```

### Automated Cleanup

Set up a cron job to run cleanup daily:

```bash
# Add to crontab (run daily at 2 AM)
0 2 * * * cd /path/to/spector && npm run cleanup
```

### API Endpoints

- `GET /app/api/cleanup?action=cleanup` - Run cleanup for current shop
- `GET /app/api/cleanup?action=stats` - Get data usage statistics
- `GET /app/api/cleanup?action=cleanup&dataType=analytics` - Clean specific data type

## Encryption

### Key Generation

Generate a secure encryption key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Key Management

- **Development**: Use the default key (not secure)
- **Production**: Use a strong, unique key stored securely
- **Key Rotation**: Implement key rotation strategy for production

## Data Types

### AnalyticsSnapshot
- Stores encrypted analytics data
- Includes expiration date
- Automatically cleaned up

### ProductAnalytics  
- Caches product data without order information
- Includes inventory and pricing data
- Configurable retention period

### DataRetentionPolicy
- Per-shop retention policies
- Override default retention periods
- Track policy changes

## Monitoring

### Data Usage Statistics

Check data usage for a shop:

```typescript
import { getDataUsageStats } from './app/utils/dataRetention';

const stats = await getDataUsageStats('mystore.myshopify.com');
console.log(stats);
// { analytics: 150, products: 200, logs: 50, totalSize: 256000 }
```

### Cleanup Logs

Monitor cleanup operations in your application logs:

```
🧹 Starting data cleanup for shop: mystore.myshopify.com...
✅ Deleted 25 expired analytics snapshots
✅ Deleted 10 expired product analytics records  
✅ Deleted 5 old notification logs
🎉 Cleanup completed! Total records deleted: 40
```

## Security Considerations

1. **Encryption Key**: Store securely, never commit to version control
2. **Data Access**: Limit access to encrypted data based on business needs
3. **Audit Logging**: Consider adding audit logs for data access
4. **Key Rotation**: Implement regular key rotation in production
5. **Backup Encryption**: Ensure backups are also encrypted

## Troubleshooting

### Common Issues

1. **Encryption Errors**: Check that ENCRYPTION_KEY is set and 32+ characters
2. **Migration Failures**: Ensure database is accessible and migrations are up to date
3. **Cleanup Failures**: Check database permissions and connection
4. **Memory Issues**: Large datasets may require batch processing

### Debug Mode

Enable debug logging:

```bash
DEBUG=spector:* npm run cleanup
```

## Migration from Order Data

The app has been updated to work without Order data:

1. **Analytics API**: Now uses product data and inventory patterns
2. **Product Analytics**: Price analysis based on product variants only
3. **Revenue API**: Uses inventory value as proxy for revenue
4. **Caching**: Data is cached and encrypted for performance

This ensures compliance with Shopify's Protected Customer Data requirements while maintaining useful analytics functionality.
