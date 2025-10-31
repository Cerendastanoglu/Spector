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

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferences_shop_key" ON "public"."UserPreferences"("shop");

-- CreateIndex
CREATE INDEX "UserPreferences_shop_idx" ON "public"."UserPreferences"("shop");
