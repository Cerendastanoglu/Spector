#!/bin/bash

# Migrate console logs to secure logger
# This script adds logger imports and replaces console.* calls

FILES=(
  "app/routes/app._index.tsx"
  "app/components/Dashboard.tsx"
  "app/components/ForecastingTab.tsx"
  "app/routes/app.api.competitor-research.tsx"
  "app/routes/app.api.intelligence.tsx"
  "app/routes/webhooks.app.subscription_update.tsx"
  "app/routes/app.settings.tsx"
  "app/components/IntelligenceDashboard.tsx"
  "app/components/WebVitals.tsx"
  "app/components/ProductManagementSkeleton.tsx"
  "app/components/PerformanceDashboard.tsx"
  "app/routes/webhooks.app.scopes_update.tsx"
  "app/routes/app.api.market-analysis.tsx"
  "app/utils/dataRetention.ts"
  "app/utils/resend.server.ts"
  "app/utils/scopedConstants.ts"
  "app/utils/productStateManager.server.ts"
  "app/utils/performance.ts"
  "app/utils/revertRecipes.server.ts"
  "app/utils/appBridgePerformance.ts"
  "app/utils/encryption.ts"
  "app/utils/namespaceUtils.ts"
  "app/intel/RateLimiter.ts"
  "app/intel/ProviderRegistry.ts"
  "app/intel/QueryPlanner.ts"
  "app/intel/Cache.ts"
  "app/intel-v2/ProviderRegistry.ts"
  "app/intel-v2/RequestCoordinator.ts"
  "app/intel-v2/ResultNormalizer.ts"
  "app/intel-v2/ComplianceMiddleware.ts"
  "app/entry.server.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Migrating $file..."
    # Replace console methods with logger
    sed -i '' -e 's/console\.error(/logger.error(/g' \
              -e 's/console\.log(/logger.info(/g' \
              -e 's/console\.warn(/logger.warn(/g' \
              -e 's/console\.debug(/logger.debug(/g' \
              -e 's/console\.info(/logger.info(/g' \
              "$file"
  fi
done

echo "✅ Migration complete!"
