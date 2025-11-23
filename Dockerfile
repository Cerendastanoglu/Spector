FROM node:18-alpine
RUN apk add --no-cache openssl

EXPOSE 8080
ENV PORT=8080

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

# Generate Prisma client before build
RUN npx prisma generate

RUN npm run build

# Cloud Run expects the app to listen on the PORT env var (defaults to 8080)
# Set HOST at runtime to avoid vite.config.ts errors during build
CMD ["sh", "-c", "npx prisma migrate deploy && HOST=0.0.0.0 npm run start"]
