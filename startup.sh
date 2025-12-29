#!/bin/sh
set -e

echo "⏳ Waiting for Cloud SQL socket to be ready..."
sleep 8

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "⏳ Waiting for database connections to stabilize..."
sleep 5

echo "🚀 Starting server..."
npx remix-serve ./build/server/index.js

