FROM node:18-alpine
RUN apk add --no-cache openssl

EXPOSE 3000

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev && npm cache clean --force
# Remove CLI packages since we don't need them in production by default.
# Remove this line if you want to run CLI commands in your container.
RUN npm remove @shopify/cli

COPY . .

RUN npm run build

# Cloud Run expects the app to listen on the PORT env var (defaults to 8080)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
