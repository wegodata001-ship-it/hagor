-- Safe manual DB sync only.
-- Do not use prisma db push, migrate reset, DROP TABLE, or destructive migration for this patch.

BEGIN;

-- 1) ProductImage.createdAt
-- Add column if missing, backfill nulls, then enforce default + NOT NULL.
ALTER TABLE "ProductImage"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

UPDATE "ProductImage"
SET "createdAt" = CURRENT_TIMESTAMP
WHERE "createdAt" IS NULL;

ALTER TABLE "ProductImage"
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "createdAt" SET NOT NULL;

-- 2) StoreSettings product gallery fields
ALTER TABLE "StoreSettings"
ADD COLUMN IF NOT EXISTS "productGalleryMaxHeightPx" INTEGER,
ADD COLUMN IF NOT EXISTS "productGalleryMaxWidthPx" INTEGER,
ADD COLUMN IF NOT EXISTS "productGalleryPreset" TEXT;

UPDATE "StoreSettings"
SET "productGalleryPreset" = 'medium'
WHERE "productGalleryPreset" IS NULL;

ALTER TABLE "StoreSettings"
ALTER COLUMN "productGalleryPreset" SET DEFAULT 'medium',
ALTER COLUMN "productGalleryPreset" SET NOT NULL;

-- 3) ObservabilityEvent table + indexes + FK
CREATE TABLE IF NOT EXISTS "ObservabilityEvent" (
  "id" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "storeId" TEXT NOT NULL,
  "traceId" TEXT,
  "level" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "queryKey" TEXT,
  "path" TEXT,
  "durationMs" INTEGER,
  "errorText" TEXT,
  "meta" JSONB,
  CONSTRAINT "ObservabilityEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_storeId_createdAt_idx"
  ON "ObservabilityEvent" ("storeId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_storeId_level_createdAt_idx"
  ON "ObservabilityEvent" ("storeId", "level", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_storeId_message_createdAt_idx"
  ON "ObservabilityEvent" ("storeId", "message", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_storeId_path_createdAt_idx"
  ON "ObservabilityEvent" ("storeId", "path", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_storeId_queryKey_createdAt_idx"
  ON "ObservabilityEvent" ("storeId", "queryKey", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "ObservabilityEvent_traceId_idx"
  ON "ObservabilityEvent" ("traceId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'ObservabilityEvent_storeId_fkey'
  ) THEN
    ALTER TABLE "ObservabilityEvent"
      ADD CONSTRAINT "ObservabilityEvent_storeId_fkey"
      FOREIGN KEY ("storeId")
      REFERENCES "Store"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE;
  END IF;
END $$;

COMMIT;
