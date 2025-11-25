#!/bin/bash

# Quick fix for database connection and deployment

set -e

echo "🔧 Fixing database connection and deploying..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
DB_INSTANCE_NAME="spector-db"
DB_NAME="spector"
DB_USER="spector-user"

echo -e "${BLUE}📋 Using project: ${PROJECT_ID}${NC}"

# Reset database password
echo -e "${YELLOW}🔐 Setting database password...${NC}"
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${BLUE}Setting password for database user...${NC}"
gcloud sql users set-password "$DB_USER" --instance="$DB_INSTANCE_NAME" --password="$DB_PASSWORD"

# Create correct DATABASE_URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$PROJECT_ID:us-central1:$DB_INSTANCE_NAME"

echo -e "${YELLOW}📝 Updating DATABASE_URL secret...${NC}"
echo -n "$DATABASE_URL" | gcloud secrets versions add DATABASE_URL --data-file=-

echo -e "${GREEN}✅ Database connection fixed!${NC}"

# Deploy with correct configuration
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"

gcloud run deploy spector \
    --source . \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances "$PROJECT_ID:us-central1:$DB_INSTANCE_NAME" \
    --set-env-vars "SHOPIFY_API_KEY=035bb80387ae6ea29247c8d0b706f67a" \
    --set-env-vars "SHOPIFY_APP_URL=https://spector-260800553724.us-central1.run.app" \
    --set-secrets "SHOPIFY_API_SECRET=SHOPIFY_API_SECRET:latest" \
    --set-secrets "DATABASE_URL=DATABASE_URL:latest" \
    --set-secrets "SCOPES=SCOPES:latest" \
    --set-secrets "ENCRYPTION_KEY=ENCRYPTION_KEY:latest" \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300

# Get the deployed URL
DEPLOYED_URL=$(gcloud run services describe spector --region us-central1 --format='value(status.url)')

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}📍 Your app is running at: $DEPLOYED_URL${NC}"

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
if curl -s --fail "$DEPLOYED_URL" > /dev/null; then
    echo -e "${GREEN}✅ App is responding successfully!${NC}"
    
    # Test HMAC verification
    echo -e "${YELLOW}🔐 Testing HMAC verification...${NC}"
    
    # Update the test file with the new URL if needed
    if [ "$DEPLOYED_URL" != "https://spector-260800553724.us-central1.run.app" ]; then
        echo -e "${YELLOW}📝 Updating test file with new URL...${NC}"
        sed -i.bak "s|https://spector-260800553724.us-central1.run.app|$DEPLOYED_URL|g" test-hmac-verification.js
        
        # Also update the app URL in Cloud Run
        gcloud run services update spector \
            --region us-central1 \
            --set-env-vars "SHOPIFY_APP_URL=$DEPLOYED_URL"
    fi
    
    node test-hmac-verification.js
else
    echo -e "${RED}❌ App is not responding. Check logs:${NC}"
    echo "gcloud run services logs read spector --region us-central1 --limit 20"
fi

echo -e "${GREEN}🎊 Setup complete!${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. If URL changed, update shopify.app.toml with: $DEPLOYED_URL"
echo "2. Run 'shopify app deploy' to update Shopify configuration"
echo "3. Test your app thoroughly"
echo "4. Submit for App Store review"
