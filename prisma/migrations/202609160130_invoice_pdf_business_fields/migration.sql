-- Invoice/order PDF: legal business fields on StoreSettings.
-- Additive-only, no drops. Safe to run against existing databases.

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "businessLegalName" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "businessTaxId" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "businessWebsite" TEXT;
