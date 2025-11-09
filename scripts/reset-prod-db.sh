#!/bin/bash
# Script to reset production database on Fly.io
# WARNING: This will delete ALL data in the production database

set -e

echo "🚨 WARNING: This will delete ALL data in the production database!"
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

echo "📡 Connecting to production database..."

# Connect to the database and drop all tables
flyctl postgres connect --app spector-db -d spector << 'EOF'
-- Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Exit
\q
EOF

echo "✅ Production database has been reset!"
echo "🚀 Now you can deploy: npm run deploy -- --force"
