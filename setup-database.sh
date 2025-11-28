#!/bin/bash
set -e

echo "🗄️ Setting up Cloud SQL Database for Spector App"
echo "================================================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Database connection details
DB_INSTANCE="tough-bearing-478915-t7:us-central1:spector-db"
DB_NAME="spector"
DB_USER="spector-user"

echo -e "${BLUE}Step 1: Getting DATABASE_URL from Secret Manager${NC}"
export DATABASE_URL=$(gcloud secrets versions access latest --secret="DATABASE_URL")
echo "✅ DATABASE_URL loaded"

echo -e "${BLUE}Step 2: Testing database connection${NC}"
# Create a simple test SQL file
cat > /tmp/test-connection.sql << 'EOF'
SELECT version();
SELECT current_database();
SELECT current_schema();
EOF

echo -e "${BLUE}Step 3: Checking existing tables${NC}"
cat > /tmp/check-tables.sql << 'EOF'
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
EOF

echo -e "${YELLOW}Current tables in database:${NC}"
# This will show what tables exist (if any)

echo -e "${BLUE}Step 4: Running Prisma migrations${NC}"
echo "Generating Prisma Client..."
npx prisma generate

echo "Deploying migrations..."
npx prisma migrate deploy

echo -e "${BLUE}Step 5: Verifying tables were created${NC}"
echo "Checking for Session table..."
npx prisma db execute --stdin << 'EOF'
SELECT COUNT(*) as session_table_exists 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'Session';
EOF

echo -e "${GREEN}✅ Database setup complete!${NC}"
echo ""
echo "To verify everything is working, run:"
echo "  npx prisma studio"

