FROM node:20-alpine
RUN apk add --no-cache openssl

EXPOSE 8080
ENV PORT=8080

WORKDIR /app

COPY package.json package-lock.json* ./

# Install ALL dependencies (including dev) for building
# Don't set NODE_ENV=production yet as it causes npm ci to skip devDependencies
RUN npm ci && npm cache clean --force

COPY . .

# Generate Prisma client before build
RUN npx prisma generate

# Build the app
RUN npm run build

# NOW set NODE_ENV to production for runtime
ENV NODE_ENV=production

# Cloud Run expects the app to listen on the PORT env var (defaults to 8080)
# Copy and use startup script
COPY startup.sh ./
RUN chmod +x startup.sh
CMD ["./startup.sh"]
