-- CreateTable
CREATE TABLE "AnalyticsSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductAnalytics" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantId" TEXT,
    "variantTitle" TEXT,
    "price" REAL NOT NULL,
    "inventoryQuantity" INTEGER NOT NULL,
    "totalInventory" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DataRetentionPolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_shop_dataType_idx" ON "AnalyticsSnapshot"("shop", "dataType");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_expiresAt_idx" ON "AnalyticsSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_createdAt_idx" ON "AnalyticsSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_shop_productId_idx" ON "ProductAnalytics"("shop", "productId");

-- CreateIndex
CREATE INDEX "ProductAnalytics_expiresAt_idx" ON "ProductAnalytics"("expiresAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_lastUpdated_idx" ON "ProductAnalytics"("lastUpdated");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_shop_idx" ON "DataRetentionPolicy"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_shop_dataType_key" ON "DataRetentionPolicy"("shop", "dataType");
