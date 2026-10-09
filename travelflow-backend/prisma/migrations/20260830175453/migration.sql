-- Phase 8: Apply performance indexes
-- Run this migration to add composite indexes identified from EXPLAIN ANALYZE

-- =====================================================
-- 1. BOOKING: Composite indexes for list/leader queries
-- =====================================================
CREATE INDEX IF NOT EXISTS "Booking_agencyId_isDeleted_createdAt_idx"
  ON "Booking" ("agencyId", "isDeleted", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Booking_agencyId_isDeleted_customerId_createdAt_idx"
  ON "Booking" ("agencyId", "isDeleted", "customerId", "createdAt");

CREATE INDEX IF NOT EXISTS "Booking_agencyId_isDeleted_supplierId_createdAt_idx"
  ON "Booking" ("agencyId", "isDeleted", "supplierId", "createdAt");

CREATE INDEX IF NOT EXISTS "Booking_agencyId_isDeleted_branchId_createdAt_idx"
  ON "Booking" ("agencyId", "isDeleted", "branchId", "createdAt");

-- =====================================================
-- 2. LEAD: Composite indexes for list queries
-- =====================================================
CREATE INDEX IF NOT EXISTS "Lead_agencyId_isDeleted_createdAt_idx"
  ON "Lead" ("agencyId", "isDeleted", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "LeadActivity_leadId_createdAt_idx"
  ON "LeadActivity" ("leadId", "createdAt" DESC);

-- =====================================================
-- 3. INVOICE: Fix missing isDeleted + date index
-- =====================================================
CREATE INDEX IF NOT EXISTS "Invoice_agencyId_isDeleted_createdAt_idx"
  ON "Invoice" ("agencyId", "isDeleted", "createdAt" DESC);

-- =====================================================
-- 4. RECEIPT: Composite indexes for list + ledger
-- =====================================================
CREATE INDEX IF NOT EXISTS "Receipt_agencyId_isDeleted_createdAt_idx"
  ON "Receipt" ("agencyId", "isDeleted", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "Receipt_agencyId_isDeleted_customerId_date_idx"
  ON "Receipt" ("agencyId", "isDeleted", "customerId", "date");

-- =====================================================
-- 5. EXPENSE: Composite index for date-filtered list
-- =====================================================
CREATE INDEX IF NOT EXISTS "Expense_agencyId_isDeleted_date_idx"
  ON "Expense" ("agencyId", "isDeleted", "date" DESC);

-- =====================================================
-- 6. QUOTATION: Composite index for date-sorted list
-- =====================================================
CREATE INDEX IF NOT EXISTS "Quotation_agencyId_isDeleted_createdAt_idx"
  ON "Quotation" ("agencyId", "isDeleted", "createdAt" DESC);

-- =====================================================
-- 7. NOTIFICATION: Composite index for recipient queries
-- =====================================================
CREATE INDEX IF NOT EXISTS "Notification_agencyId_recipientId_isRead_idx"
  ON "Notification" ("agencyId", "recipientId", "isRead");

-- =====================================================
-- 8. USER: Composite index for role-based lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS "User_agencyId_isDeleted_role_idx"
  ON "User" ("agencyId", "isDeleted", "role");
