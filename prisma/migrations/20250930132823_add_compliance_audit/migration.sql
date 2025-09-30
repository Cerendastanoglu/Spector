-- CreateTable
CREATE TABLE "ComplianceAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "customerId" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" TEXT,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "notes" TEXT
);

-- CreateIndex
CREATE INDEX "ComplianceAudit_shop_idx" ON "ComplianceAudit"("shop");

-- CreateIndex
CREATE INDEX "ComplianceAudit_topic_idx" ON "ComplianceAudit"("topic");

-- CreateIndex
CREATE INDEX "ComplianceAudit_receivedAt_idx" ON "ComplianceAudit"("receivedAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_expiresAt_idx" ON "ComplianceAudit"("expiresAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_status_idx" ON "ComplianceAudit"("status");
