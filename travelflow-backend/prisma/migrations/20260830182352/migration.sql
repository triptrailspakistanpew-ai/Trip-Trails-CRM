-- Domain Architecture v2 Phase 1: BookingService + BookingTraveler
-- This migration:
--   1. Creates BookingService and BookingTraveler tables
--   2. Migrates existing Booking data (single-supplier) to BookingService records
--   3. Removes deprecated columns from Booking
--   4. Removes Booking -> Supplier FK relationship

-- =====================================================
-- Step 1: Create BookingService table
-- =====================================================
CREATE TABLE "BookingService" (
    "id"                    UUID NOT NULL DEFAULT gen_random_uuid(),
    "agencyId"              UUID NOT NULL,
    "bookingId"             UUID NOT NULL,
    "serviceCategory"       TEXT NOT NULL,
    "title"                 TEXT NOT NULL,
    "description"           TEXT,
    "supplierId"            UUID,
    "costPrice"             DOUBLE PRECISION NOT NULL DEFAULT 0,
    "supplierInvoiceAmount" DOUBLE PRECISION,
    "sellingPrice"          DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantity"              INTEGER NOT NULL DEFAULT 1,
    "unit"                  TEXT NOT NULL DEFAULT 'Person',
    "status"                TEXT NOT NULL DEFAULT 'pending',
    "serviceDetails"        JSONB,
    "sortOrder"             INTEGER NOT NULL DEFAULT 0,
    "isDeleted"             BOOLEAN NOT NULL DEFAULT false,
    "deletedAt"             TIMESTAMPTZ,
    "createdAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"             TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingService_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingService_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingService_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL
);

CREATE INDEX "BookingService_agencyId_bookingId_idx" ON "BookingService"("agencyId", "bookingId");
CREATE INDEX "BookingService_agencyId_serviceCategory_idx" ON "BookingService"("agencyId", "serviceCategory");
CREATE INDEX "BookingService_agencyId_isDeleted_idx" ON "BookingService"("agencyId", "isDeleted");

-- =====================================================
-- Step 2: Create BookingTraveler table
-- =====================================================
CREATE TABLE "BookingTraveler" (
    "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
    "agencyId"       UUID NOT NULL,
    "bookingId"      UUID NOT NULL,
    "firstName"      TEXT NOT NULL,
    "lastName"       TEXT NOT NULL,
    "type"           TEXT NOT NULL DEFAULT 'adult',
    "passportNumber" TEXT,
    "nationality"    TEXT,
    "dateOfBirth"    TIMESTAMPTZ,
    "gender"         TEXT,
    "isDeleted"      BOOLEAN NOT NULL DEFAULT false,
    "deletedAt"      TIMESTAMPTZ,
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt"      TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT "BookingTraveler_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BookingTraveler_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE,
    CONSTRAINT "BookingTraveler_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE
);

CREATE INDEX "BookingTraveler_agencyId_bookingId_idx" ON "BookingTraveler"("agencyId", "bookingId");
CREATE INDEX "BookingTraveler_agencyId_isDeleted_idx" ON "BookingTraveler"("agencyId", "isDeleted");

-- =====================================================
-- Step 3: Migrate existing Booking data to BookingService
-- Each existing booking gets one "flight" service preserving its financial data
-- =====================================================
INSERT INTO "BookingService" (
    "agencyId", "bookingId", "serviceCategory", "title", "description",
    "supplierId", "costPrice", "sellingPrice",
    "quantity", "unit", "status", "serviceDetails",
    "sortOrder", "isDeleted", "createdAt", "updatedAt"
)
SELECT
    b."agencyId",
    b."id" AS "bookingId",
    'flight' AS "serviceCategory",
    COALESCE(b."airline", 'Flight Service') AS "title",
    CONCAT(b."departureCity", ' → ', b."arrivalCity") AS "description",
    b."supplierId",
    b."costPrice",
    b."salePrice",
    1 AS "quantity",
    'Person' AS "unit",
    CASE
        WHEN b."bookingStatus" = 'cancelled' THEN 'cancelled'
        WHEN b."bookingStatus" = 'completed' THEN 'completed'
        WHEN b."bookingStatus" = 'confirmed' THEN 'confirmed'
        ELSE 'pending'
    END AS "status",
    jsonb_build_object(
        'airline', b."airline",
        'departureCity', b."departureCity",
        'arrivalCity', b."arrivalCity",
        'pnr', b."pnr",
        'ticketNumber', b."ticketNumber"
    ) AS "serviceDetails",
    0 AS "sortOrder",
    b."isDeleted",
    b."createdAt",
    b."updatedAt"
FROM "Booking" b
WHERE b."supplierId" IS NOT NULL;

-- =====================================================
-- Step 4: Add new columns to Booking
-- =====================================================
ALTER TABLE "Booking" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD COLUMN "expectedAdults" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Booking" ADD COLUMN "expectedChildren" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN "expectedInfants" INTEGER NOT NULL DEFAULT 0;

-- =====================================================
-- Step 5: Populate title from migrated data
-- =====================================================
UPDATE "Booking" SET "title" = CONCAT("airline", ' ', "departureCity", ' → ', "arrivalCity") WHERE "airline" IS NOT NULL AND "airline" != '';

-- =====================================================
-- Step 6: Remove old columns from Booking
-- (costPrice, salePrice, profit, profitMargin, amountReceived, balance are now computed from BookingService)
-- (airline, departureCity, arrivalCity, pnr, ticketNumber are now on BookingService.serviceDetails)
-- (supplierId FK is removed - suppliers are per-service now)
-- =====================================================
ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_supplierId_fkey";
ALTER TABLE "Booking" DROP COLUMN "supplierId";
ALTER TABLE "Booking" DROP COLUMN "pnr";
ALTER TABLE "Booking" DROP COLUMN "ticketNumber";
ALTER TABLE "Booking" DROP COLUMN "airline";
ALTER TABLE "Booking" DROP COLUMN "departureCity";
ALTER TABLE "Booking" DROP COLUMN "arrivalCity";
ALTER TABLE "Booking" DROP COLUMN "costPrice";
ALTER TABLE "Booking" DROP COLUMN "salePrice";
ALTER TABLE "Booking" DROP COLUMN "profit";
ALTER TABLE "Booking" DROP COLUMN "profitMargin";
ALTER TABLE "Booking" DROP COLUMN "amountReceived";
ALTER TABLE "Booking" DROP COLUMN "balance";

-- =====================================================
-- Step 7: Drop old indexes that referenced removed columns
-- =====================================================
DROP INDEX IF EXISTS "Booking_agencyId_supplierId_idx";
