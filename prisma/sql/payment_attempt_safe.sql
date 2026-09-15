-- PaymentAttempt (apply ONLY on non-production / approved test DB)
-- Never stores KEY / PassP / card / CVV.

CREATE TABLE IF NOT EXISTS "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'INITIATED',
  "successUrl" TEXT,
  "errorUrl" TEXT,
  "cancelUrl" TEXT,
  "transactionId" TEXT,
  "providerReference" TEXT,
  "confirmationNumber" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "lastError" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PaymentAttempt_storeId_idx" ON "PaymentAttempt"("storeId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_orderId_idx" ON "PaymentAttempt"("orderId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_storeId_transactionId_idx" ON "PaymentAttempt"("storeId", "transactionId");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_storeId_status_createdAt_idx" ON "PaymentAttempt"("storeId", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "PaymentAttempt_createdAt_idx" ON "PaymentAttempt"("createdAt");

DO $$ BEGIN
  ALTER TABLE "PaymentAttempt"
    ADD CONSTRAINT "PaymentAttempt_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
