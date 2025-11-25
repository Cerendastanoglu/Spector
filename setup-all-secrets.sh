#!/bin/bash

# Spector App - Complete Google Cloud Setup Script
# This script sets up all required secrets and environment variables for Cloud Run deployment

set -e  # Exit on any error

echo "🚀 Setting up Spector App on Google Cloud..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ Google Cloud CLI not found. Please install it first:${NC}"
    echo "curl https://sdk.cloud.google.com | bash"
    exit 1
fi

# Check if user is logged in
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${RED}❌ Not logged into Google Cloud. Please run: gcloud auth login${NC}"
    exit 1
fi

# Get current project
PROJECT_ID=$(gcloud config get-value project 2>/dev/null)
if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ No Google Cloud project set. Please run: gcloud config set project YOUR_PROJECT_ID${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Using project: ${PROJECT_ID}${NC}"

# Enable required APIs
echo -e "${YELLOW}🔧 Enabling required Google Cloud APIs...${NC}"
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable secretmanager.googleapis.com
echo -e "${GREEN}✅ APIs enabled${NC}"

# Check if secrets already exist and prompt for values
echo -e "${YELLOW}🔐 Setting up secrets...${NC}"

# Function to create or update secret
create_or_update_secret() {
    local secret_name=$1
    local secret_value=$2
    local description=$3
    
    if gcloud secrets describe "$secret_name" &>/dev/null; then
        echo -e "${YELLOW}📝 Updating existing secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets versions add "$secret_name" --data-file=-
    else
        echo -e "${BLUE}🆕 Creating new secret: $secret_name${NC}"
        echo -n "$secret_value" | gcloud secrets create "$secret_name" --data-file=-
    fi
}

# Get Shopify credentials
echo -e "${BLUE}🛍️ Shopify Configuration${NC}"
echo "Please provide your Shopify app credentials (from Partner Dashboard or 'shopify app env show'):"

read -p "Shopify API Key: " SHOPIFY_API_KEY
read -s -p "Shopify API Secret: " SHOPIFY_API_SECRET
echo

if [ -z "$SHOPIFY_API_KEY" ] || [ -z "$SHOPIFY_API_SECRET" ]; then
    echo -e "${RED}❌ Shopify credentials are required${NC}"
    exit 1
fi

create_or_update_secret "SHOPIFY_API_SECRET" "$SHOPIFY_API_SECRET" "Shopify API Secret"

# Database setup
echo -e "${BLUE}🗄️ Database Configuration${NC}"
DB_INSTANCE_NAME="spector-db"
DB_NAME="spector"
DB_USER="spector-user"

# Check if Cloud SQL instance exists
if ! gcloud sql instances describe "$DB_INSTANCE_NAME" &>/dev/null; then
    echo -e "${YELLOW}🏗️ Creating Cloud SQL PostgreSQL instance (this may take a few minutes)...${NC}"
    
    # Generate a secure password
    DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
    
    gcloud sql instances create "$DB_INSTANCE_NAME" \
        --database-version=POSTGRES_15 \
        --tier=db-f1-micro \
        --region=us-central1 \
        --storage-type=SSD \
        --storage-size=10GB \
        --backup \
        --maintenance-window-day=SUN \
        --maintenance-window-hour=03
    
    echo -e "${YELLOW}📊 Creating database and user...${NC}"
    gcloud sql databases create "$DB_NAME" --instance="$DB_INSTANCE_NAME"
    gcloud sql users create "$DB_USER" --instance="$DB_INSTANCE_NAME" --password="$DB_PASSWORD"
    
    echo -e "${GREEN}✅ Database created with password: $DB_PASSWORD${NC}"
else
    echo -e "${YELLOW}📊 Cloud SQL instance already exists${NC}"
    read -s -p "Enter database password for user '$DB_USER': " DB_PASSWORD
    echo
fi

# Create DATABASE_URL
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@/$DB_NAME?host=/cloudsql/$PROJECT_ID:us-central1:$DB_INSTANCE_NAME"
create_or_update_secret "DATABASE_URL" "$DATABASE_URL" "PostgreSQL connection string"

# Redis setup (using Upstash for free tier)
echo -e "${BLUE}🔴 Redis Configuration${NC}"
echo "For Redis, we recommend using Upstash (free tier available):"
echo "1. Go to https://console.upstash.com/"
echo "2. Create a new Redis database"
echo "3. Copy the Redis URL"
echo ""
read -p "Redis URL (or press Enter to skip): " REDIS_URL

if [ -n "$REDIS_URL" ]; then
    create_or_update_secret "REDIS_URL" "$REDIS_URL" "Redis connection URL"
else
    echo -e "${YELLOW}⚠️ Skipping Redis setup - some features may not work${NC}"
fi

# Email service (Resend)
echo -e "${BLUE}📧 Email Service Configuration${NC}"
echo "For email notifications, get your API key from https://resend.com/api-keys"
read -p "Resend API Key (or press Enter to skip): " RESEND_API_KEY

if [ -n "$RESEND_API_KEY" ]; then
    create_or_update_secret "RESEND_API_KEY" "$RESEND_API_KEY" "Resend email service API key"
else
    echo -e "${YELLOW}⚠️ Skipping email setup - notifications will be disabled${NC}"
fi

# Encryption key
echo -e "${BLUE}🔐 Generating encryption key...${NC}"
ENCRYPTION_KEY=$(openssl rand -base64 32)
create_or_update_secret "ENCRYPTION_KEY" "$ENCRYPTION_KEY" "Data encryption key"

# Store SCOPES as a secret to avoid gcloud parsing issues
SCOPES_VALUE="write_products,read_products,read_orders,write_orders,read_inventory,write_inventory,read_locations"
create_or_update_secret "SCOPES" "$SCOPES_VALUE" "Shopify API scopes"

echo -e "${GREEN}✅ All secrets configured!${NC}"

# Deploy to Cloud Run
echo -e "${YELLOW}🚀 Deploying to Cloud Run...${NC}"

# Build and deploy

# Build the secrets list
SECRETS_LIST="SHOPIFY_API_SECRET=SHOPIFY_API_SECRET:latest,DATABASE_URL=DATABASE_URL:latest,ENCRYPTION_KEY=ENCRYPTION_KEY:latest,SCOPES=SCOPES:latest"
if [ -n "$REDIS_URL" ]; then
    SECRETS_LIST="$SECRETS_LIST,REDIS_URL=REDIS_URL:latest"
fi
if [ -n "$RESEND_API_KEY" ]; then
    SECRETS_LIST="$SECRETS_LIST,RESEND_API_KEY=RESEND_API_KEY:latest"
fi

gcloud run deploy spector \
    --source . \
    --region us-central1 \
    --platform managed \
    --allow-unauthenticated \
    --add-cloudsql-instances "$PROJECT_ID:us-central1:$DB_INSTANCE_NAME" \
    --set-env-vars "SHOPIFY_API_KEY=$SHOPIFY_API_KEY" \
    --set-env-vars "SHOPIFY_APP_URL=https://spector-260800553724.us-central1.run.app" \
    --set-secrets "$SECRETS_LIST" \
    --min-instances 0 \
    --max-instances 10 \
    --memory 512Mi \
    --cpu 1 \
    --timeout 300

# Get the deployed URL
DEPLOYED_URL=$(gcloud run services describe spector --region us-central1 --format='value(status.url)')

echo -e "${GREEN}🎉 Deployment complete!${NC}"
echo -e "${BLUE}📍 Your app is running at: $DEPLOYED_URL${NC}"

# Update Shopify configuration if URL changed
if [ "$DEPLOYED_URL" != "https://spector-260800553724.us-central1.run.app" ]; then
    echo -e "${YELLOW}🔄 Updating Shopify app URL...${NC}"
    gcloud run services update spector \
        --region us-central1 \
        --set-env-vars "SHOPIFY_APP_URL=$DEPLOYED_URL"
    
    echo -e "${YELLOW}📝 Please update your shopify.app.toml file:${NC}"
    echo "application_url = \"$DEPLOYED_URL\""
    echo ""
    echo "[auth]"
    echo "redirect_urls = ["
    echo "  \"$DEPLOYED_URL/auth/callback\","
    echo "  \"$DEPLOYED_URL/auth/shopify/callback\","
    echo "  \"$DEPLOYED_URL/api/auth/callback\""
    echo "]"
    echo ""
    echo -e "${BLUE}Then run: shopify app deploy${NC}"
fi

# Test the deployment
echo -e "${YELLOW}🧪 Testing deployment...${NC}"
if curl -s --fail "$DEPLOYED_URL" > /dev/null; then
    echo -e "${GREEN}✅ App is responding successfully!${NC}"
    
    # Test HMAC verification
    echo -e "${YELLOW}🔐 Testing HMAC verification...${NC}"
    node test-hmac-verification.js
else
    echo -e "${RED}❌ App is not responding. Check logs:${NC}"
    echo "gcloud run services logs read spector --region us-central1 --limit 20"
fi

echo -e "${GREEN}🎊 Setup complete! Your Shopify app should now be ready for App Store submission.${NC}"
echo -e "${BLUE}📋 Next steps:${NC}"
echo "1. Update shopify.app.toml with the new URL (if needed)"
echo "2. Run 'shopify app deploy' to update Shopify configuration"
echo "3. Test your app thoroughly"
echo "4. Submit for App Store review"
