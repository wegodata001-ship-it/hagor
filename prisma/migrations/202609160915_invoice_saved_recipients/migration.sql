-- Invoice archive: extra saved recipients on StoreSettings.
-- Additive-only, no drops. Safe to run against existing databases.

ALTER TABLE "StoreSettings" ADD COLUMN IF NOT EXISTS "invoiceRecipients" JSONB;
