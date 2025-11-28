#!/bin/bash

# Reset database script for Cloud SQL
# This will drop and recreate all tables

echo "🗄️ Resetting database..."

# Run migrations with --skip-seed to ensure fresh setup
npx prisma migrate reset --force --skip-seed

echo "✅ Database reset complete!"

