import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaConnected: boolean | undefined;
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create Prisma client - keep it simple for Cloud SQL socket connections
const createPrismaClient = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" 
      ? ["query", "error", "warn"] as const 
      : ["error", "warn"] as const,
  });
};

// Use singleton pattern to reuse connection across requests
const prisma = global.prismaGlobal ?? createPrismaClient();

// In development, save to global to prevent multiple instances during hot reload
if (process.env.NODE_ENV !== "production") {
  global.prismaGlobal = prisma;
}

// Eagerly connect to ensure connection pool is ready before PrismaSessionStorage initializes
// This is critical for Cloud SQL socket connections which can be slow on cold start
if (!global.prismaConnected) {
  console.log("[Prisma] Initializing database connection...");
  prisma.$connect()
    .then(() => {
      global.prismaConnected = true;
      console.log("[Prisma] Database connection established");
    })
    .catch((err) => {
      console.error("[Prisma] Connection error:", err.message);
    });
}

export default prisma;
