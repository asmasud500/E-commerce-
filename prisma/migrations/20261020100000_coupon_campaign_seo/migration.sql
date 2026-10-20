-- Business features: coupon campaign controls and product SEO metadata.
ALTER TABLE "Coupon"
  ADD COLUMN IF NOT EXISTS "campaignName" TEXT,
  ADD COLUMN IF NOT EXISTS "campaignDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "startsAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "usageLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "usedCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "perCustomerLimit" INTEGER,
  ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "metaTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "metaDescription" TEXT,
  ADD COLUMN IF NOT EXISTS "metaKeywords" TEXT;

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_usageLimit_nonnegative" CHECK ("usageLimit" IS NULL OR "usageLimit" > 0),
  ADD CONSTRAINT "Coupon_perCustomerLimit_positive" CHECK ("perCustomerLimit" IS NULL OR "perCustomerLimit" > 0),
  ADD CONSTRAINT "Coupon_usedCount_nonnegative" CHECK ("usedCount" >= 0);
