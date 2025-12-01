import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient;
}

// Prisma 7 configuration - pass empty object to use DATABASE_URL from environment
const prismaOptions = {};

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient(prismaOptions);
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient(prismaOptions);

export default prisma;
