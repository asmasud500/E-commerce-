ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "phone" TEXT;

CREATE TABLE IF NOT EXISTS "CustomerAddress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL DEFAULT 'Home',
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "division" TEXT NOT NULL DEFAULT '',
  "district" TEXT NOT NULL,
  "upazila" TEXT NOT NULL DEFAULT '',
  "postalCode" TEXT NOT NULL DEFAULT '',
  "locationDescription" TEXT NOT NULL,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerAddress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CustomerAddress_userId_isDefault_idx" ON "CustomerAddress"("userId", "isDefault");