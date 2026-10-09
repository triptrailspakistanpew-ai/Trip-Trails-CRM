-- Phase 5: Row-Level Security for Tenant Isolation
-- Safety net: app-level filtering already handles tenant scoping

BEGIN;

-- Helper function to read session variable
CREATE OR REPLACE FUNCTION current_agency_id() RETURNS uuid AS $$
  SELECT current_setting('app.current_agency_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- All tenant-scoped tables
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'Branch', 'User', 'Role', 'Lead', 'LeadActivity',
    'Customer', 'CustomerNote', 'CustomerDocument',
    'Supplier', 'SupplierPayment',
    'Booking', 'BookingService', 'BookingTraveler', 'BookingDocument', 'BookingActivity',
    'CustomerPayment', 'PaymentAllocation', 'SupplierPaymentAllocation',
    'PaymentSchedule', 'PaymentScheduleItem',
    'Invoice', 'InvoiceLine', 'CreditNote',
    'Expense', 'Quotation', 'QuotationItem', 'QuotationTax', 'QuotationAttachment', 'QuotationVersion',
    'Template', 'Notification', 'RecentActivity',
    'ChartOfAccount', 'FiscalPeriod', 'JournalEntry', 'JournalLine'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
      EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tbl);
      
      -- Drop existing policy if any
      EXECUTE format('DROP POLICY IF EXISTS agency_isolation_policy ON %I', tbl);
      
      -- Create agency-scoped policy
      EXECUTE format(
        'CREATE POLICY agency_isolation_policy ON %I
         USING ("agencyId" = current_agency_id())
         WITH CHECK ("agencyId" = current_agency_id())',
        tbl
      );
    EXCEPTION WHEN undefined_table THEN
      RAISE NOTICE 'Table % does not exist, skipping', tbl;
    END;
  END LOOP;
END $$;

COMMIT;
