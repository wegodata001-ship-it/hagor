-- Additive sync only: no drops. Safe to run when db push was cancelled.

ALTER TABLE "Category" ADD COLUMN IF NOT EXISTS "optionProfile" TEXT;

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "storePhone" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "storeAddress" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "supportEmail" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "paymentProvider" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "paymentPublicKey" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "paymentSecretKey" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "paymentWebhookSecretOverride" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "freeShippingMinAmount" DECIMAL(12,2);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "pickupEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "registrationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "requireEmailVerificationForCheckout" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "terms_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "terms_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "terms_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "privacy_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "privacy_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "privacy_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "refund_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "refund_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "refund_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "shipping_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "shipping_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "shipping_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "policyDrafts" JSONB;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "termsPublishedAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "privacyPublishedAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "refundPublishedAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "shippingPublishedAt" TIMESTAMP(3);
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroTitle_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroTitle_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroTitle_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroSubtitle_he" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroSubtitle_ar" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroSubtitle_en" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "productGalleryPreset" TEXT NOT NULL DEFAULT 'medium';
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "productGalleryMaxHeightPx" INTEGER;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "productGalleryMaxWidthPx" INTEGER;

CREATE TABLE IF NOT EXISTS "StorePage" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "contentHe" TEXT,
  "contentEn" TEXT,
  "contentAr" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StorePage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StorePage_storeId_slug_key" ON "StorePage"("storeId", "slug");
CREATE INDEX IF NOT EXISTS "StorePage_storeId_idx" ON "StorePage"("storeId");

CREATE TABLE IF NOT EXISTS "Review" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "comment" TEXT NOT NULL,
  "isApproved" BOOLEAN NOT NULL DEFAULT false,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Review_storeId_idx" ON "Review"("storeId");
CREATE INDEX IF NOT EXISTS "Review_storeId_isApproved_idx" ON "Review"("storeId", "isApproved");

ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- HAGOUR belt/holster options snapshot on order lines
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "selectedOptions" JSONB;

ALTER TYPE "OrderPaymentStatus" ADD VALUE IF NOT EXISTS 'TEST_PAID';
ALTER TYPE "OrderPaymentStatus" ADD VALUE IF NOT EXISTS 'DEMO_PAID';

ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "trackingNumber" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "courierName" TEXT;

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_storeId_idx" ON "PasswordResetToken"("storeId");
CREATE INDEX IF NOT EXISTS "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");
