FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 8080
ENV PORT=8080

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for building
RUN npm ci && npm cache clean --force

COPY . .

# Generate Prisma client before build (with dummy DATABASE_URL for Prisma 7)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

# Build the app
RUN npm run build

# Remove dev dependencies (Prisma is now in prod deps for migrations)
RUN npm prune --omit=dev && npm remove @shopify/cli || true

# Cloud Run expects the app to listen on the PORT env var (defaults to 8080)
# Prisma 7: DATABASE_URL must be in environment for migrations and client generation
CMD ["sh", "-c", "npx prisma migrate deploy && npx prisma generate && node server.mjs"]
