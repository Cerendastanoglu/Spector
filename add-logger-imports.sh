#!/bin/bash

# Add logger imports to files that need it

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
    # Check if file uses logger
    if grep -q "logger\." "$file" 2>/dev/null; then
      # Check if import already exists
      if ! grep -q "import.*logger.*from.*['\"].*utils/logger" "$file" 2>/dev/null; then
        echo "Adding import to $file..."
        
        # Find the last import line
        last_import_line=$(grep -n "^import" "$file" | tail -1 | cut -d: -f1)
        
        if [ -n "$last_import_line" ]; then
          # Add import after last import
          sed -i '' "${last_import_line}a\\
import { logger } from \"~/utils/logger\";
" "$file"
        else
          # No imports found, add at top
          sed -i '' "1i\\
import { logger } from \"~/utils/logger\";\\

" "$file"
        fi
      fi
    fi
  fi
done

echo "✅ Import addition complete!"
