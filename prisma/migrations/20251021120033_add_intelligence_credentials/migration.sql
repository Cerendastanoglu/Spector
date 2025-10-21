-- CreateTable
CREATE TABLE "public"."IntelligenceCredentials" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceCredentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntelligenceCredentials_shop_idx" ON "public"."IntelligenceCredentials"("shop");

-- CreateIndex
CREATE INDEX "IntelligenceCredentials_providerId_idx" ON "public"."IntelligenceCredentials"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceCredentials_shop_providerId_key" ON "public"."IntelligenceCredentials"("shop", "providerId");
