-- CreateTable
CREATE TABLE "BulkEditBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "operationType" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "description" TEXT,
    "totalProducts" INTEGER NOT NULL,
    "totalVariants" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "canRevert" BOOLEAN NOT NULL DEFAULT true,
    "isReverted" BOOLEAN NOT NULL DEFAULT false,
    "revertedAt" DATETIME
);

-- CreateTable
CREATE TABLE "BulkEditItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "batchId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "productTitle" TEXT NOT NULL,
    "variantTitle" TEXT,
    "fieldChanged" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changeType" TEXT NOT NULL,
    CONSTRAINT "BulkEditItem_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "BulkEditBatch" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "BulkEditBatch_shop_idx" ON "BulkEditBatch"("shop");

-- CreateIndex
CREATE INDEX "BulkEditBatch_shop_createdAt_idx" ON "BulkEditBatch"("shop", "createdAt");

-- CreateIndex
CREATE INDEX "BulkEditBatch_operationType_idx" ON "BulkEditBatch"("operationType");

-- CreateIndex
CREATE INDEX "BulkEditItem_batchId_idx" ON "BulkEditItem"("batchId");

-- CreateIndex
CREATE INDEX "BulkEditItem_productId_idx" ON "BulkEditItem"("productId");
