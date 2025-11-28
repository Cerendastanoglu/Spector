#!/bin/bash
set -e

echo "🗄️ Setting up Cloud SQL Database Connection (Local)"
echo "===================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check if Application Default Credentials are set up
if ! gcloud auth application-default print-access-token &> /dev/null; then
    echo -e "${YELLOW}Setting up Application Default Credentials...${NC}"
    echo "This will open a browser window for authentication"
    gcloud auth application-default login
fi

# Check if Cloud SQL Proxy is installed
if ! command -v cloud-sql-proxy &> /dev/null && ! command -v cloud_sql_proxy &> /dev/null && ! [ -f "./cloud-sql-proxy" ]; then
    echo -e "${YELLOW}Cloud SQL Proxy not found. Installing locally...${NC}"
    curl -o cloud-sql-proxy https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.1/cloud-sql-proxy.darwin.amd64
    chmod +x cloud-sql-proxy
    echo -e "${GREEN}✅ Cloud SQL Proxy installed${NC}"
fi

# Use local proxy if it exists
if [ -f "./cloud-sql-proxy" ]; then
    PROXY_CMD="./cloud-sql-proxy"
else
    PROXY_CMD="cloud-sql-proxy"
fi

# Database connection details
DB_INSTANCE="tough-bearing-478915-t7:us-central1:spector-db"
DB_NAME="spector"
DB_USER="spector-user"

echo -e "${BLUE}Getting database password from Secret Manager...${NC}"
DB_URL=$(gcloud secrets versions access latest --secret="DATABASE_URL")
# Extract password from URL
DB_PASSWORD=$(echo "$DB_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo -e "${BLUE}Starting Cloud SQL Proxy in background...${NC}"
$PROXY_CMD "$DB_INSTANCE" --port 5432 &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"

# Wait for proxy to start
echo "Waiting for proxy to be ready..."
sleep 3

# Create local DATABASE_URL
export DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

echo -e "${BLUE}Running Prisma migrations...${NC}"
npx prisma generate
npx prisma migrate deploy

echo -e "${BLUE}Verifying tables...${NC}"
npx prisma db execute --stdin << 'EOF'
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;
EOF

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo -e "${YELLOW}Stopping Cloud SQL Proxy...${NC}"
kill $PROXY_PID

echo -e "${GREEN}Done!${NC}"

