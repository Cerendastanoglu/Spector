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

# Generate Prisma client before build
RUN npx prisma generate

# Build the app
RUN npm run build

# Remove dev dependencies and CLI after build
RUN npm prune --omit=dev && npm remove @shopify/cli || true

# Cloud Run expects the app to listen on the PORT env var (defaults to 8080)
# Set HOST at runtime to avoid vite.config.ts errors during build
CMD ["sh", "-c", "npx prisma migrate deploy && HOST=0.0.0.0 npm run start"]
