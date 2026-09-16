-- Invoice archive: accountant contact fields on StoreSettings.
-- Additive-only, no drops. Safe to run against existing databases.

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "accountantName" TEXT;
ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "accountantEmail" TEXT;
