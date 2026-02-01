-- Add missing columns to users table
ALTER TABLE "users" ADD COLUMN "birthDate" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "hasDonated" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN "firstDonationAt" TIMESTAMP(3);

-- CreateEnum for Donations
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DonationProvider" AS ENUM ('STRIPE', 'PAYPAL', 'LIGHTNING');

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "name" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "provider" "DonationProvider" NOT NULL,
    "providerOrderId" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "donations_userId_idx" ON "donations"("userId");

-- CreateIndex
CREATE INDEX "donations_status_idx" ON "donations"("status");

-- CreateIndex
CREATE INDEX "donations_provider_idx" ON "donations"("provider");

-- CreateIndex
CREATE INDEX "donations_createdAt_idx" ON "donations"("createdAt");

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
