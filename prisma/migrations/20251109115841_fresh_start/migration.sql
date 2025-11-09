-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AnalyticsSnapshot" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnalyticsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductAnalytics" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productTitle" TEXT NOT NULL,
    "variantId" TEXT,
    "variantTitle" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "inventoryQuantity" INTEGER NOT NULL,
    "totalInventory" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DataRetentionPolicy" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "dataType" TEXT NOT NULL,
    "retentionDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataRetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ComplianceAudit" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "customerId" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ComplianceAudit_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."UserPreferences" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "hasSeenWelcomeModal" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT,
    "dashboardLayout" TEXT,
    "notificationSettings" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "shopifyChargeId" TEXT,
    "plan" TEXT NOT NULL DEFAULT 'basic',
    "status" TEXT NOT NULL DEFAULT 'trialing',
    "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "isTrialUsed" BOOLEAN NOT NULL DEFAULT false,
    "billingStartedAt" TIMESTAMP(3),
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "price" DOUBLE PRECISION NOT NULL DEFAULT 9.99,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastCheckedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_shop_dataType_idx" ON "public"."AnalyticsSnapshot"("shop", "dataType");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_expiresAt_idx" ON "public"."AnalyticsSnapshot"("expiresAt");

-- CreateIndex
CREATE INDEX "AnalyticsSnapshot_createdAt_idx" ON "public"."AnalyticsSnapshot"("createdAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_shop_productId_idx" ON "public"."ProductAnalytics"("shop", "productId");

-- CreateIndex
CREATE INDEX "ProductAnalytics_expiresAt_idx" ON "public"."ProductAnalytics"("expiresAt");

-- CreateIndex
CREATE INDEX "ProductAnalytics_lastUpdated_idx" ON "public"."ProductAnalytics"("lastUpdated");

-- CreateIndex
CREATE INDEX "DataRetentionPolicy_shop_idx" ON "public"."DataRetentionPolicy"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "DataRetentionPolicy_shop_dataType_key" ON "public"."DataRetentionPolicy"("shop", "dataType");

-- CreateIndex
CREATE INDEX "ComplianceAudit_shop_idx" ON "public"."ComplianceAudit"("shop");

-- CreateIndex
CREATE INDEX "ComplianceAudit_topic_idx" ON "public"."ComplianceAudit"("topic");

-- CreateIndex
CREATE INDEX "ComplianceAudit_receivedAt_idx" ON "public"."ComplianceAudit"("receivedAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_expiresAt_idx" ON "public"."ComplianceAudit"("expiresAt");

-- CreateIndex
CREATE INDEX "ComplianceAudit_status_idx" ON "public"."ComplianceAudit"("status");

-- CreateIndex
CREATE INDEX "IntelligenceCredentials_shop_idx" ON "public"."IntelligenceCredentials"("shop");

-- CreateIndex
CREATE INDEX "IntelligenceCredentials_providerId_idx" ON "public"."IntelligenceCredentials"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "IntelligenceCredentials_shop_providerId_key" ON "public"."IntelligenceCredentials"("shop", "providerId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_shop_key" ON "public"."UserPreferences"("shop");

-- CreateIndex
CREATE INDEX "UserPreferences_shop_idx" ON "public"."UserPreferences"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shop_key" ON "public"."Subscription"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_shopifyChargeId_key" ON "public"."Subscription"("shopifyChargeId");

-- CreateIndex
CREATE INDEX "Subscription_shop_idx" ON "public"."Subscription"("shop");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_trialEndsAt_idx" ON "public"."Subscription"("trialEndsAt");
