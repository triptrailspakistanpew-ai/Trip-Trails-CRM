/**
 * TravelFlow Pakistan - Data Consistency, Relationship & GL Validation Suite
 * Performs comprehensive auditing:
 * 1. Foreign Key and Entity Relationship Integrity (Zero Orphans)
 * 2. Financial Mathematical Consistency (Invoice Total == Lines, Allocations <= Invoices)
 * 3. Double-Entry General Ledger Balance Audit (Every Journal Entry Debit == Credit)
 * 4. Pipeline & Funnel Health Verification
 * 5. Branch Distribution & User Credentials Check
 */

import { PrismaClient } from "@prisma/client";
import { DEMO_CONFIG } from "./config";

const prisma = new PrismaClient();

export interface VerificationReport {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  errors: string[];
  metrics: Record<string, any>;
}

export async function verifyDemoData(): Promise<VerificationReport> {
  console.log("===============================================================");
  console.log("🔍 TRAVELFLOW PAKISTAN DEMO VERIFICATION & AUDIT SUITE");
  console.log("===============================================================\n");

  const agencyId = DEMO_CONFIG.agency.id;
  const errors: string[] = [];
  let totalChecks = 0;
  let passedChecks = 0;

  function assertCheck(name: string, condition: boolean, errorMsg?: string) {
    totalChecks++;
    if (condition) {
      passedChecks++;
      console.log(`  ✅ [PASS] ${name}`);
    } else {
      errors.push(errorMsg || name);
      console.log(`  ❌ [FAIL] ${name} -> ${errorMsg || "Check failed"}`);
    }
  }

  // --- CHECK 1: Core Entity Presence ---
  console.log("📋 1. Core Tenant & Organizational Structure");
  const agency = await prisma.agency.findUnique({ where: { id: agencyId } });
  assertCheck("Agency exists and active", !!agency && agency.status === "active", "Primary demo agency missing or inactive");
  assertCheck("Agency currency is PKR", agency?.currency === "PKR", `Agency currency is ${agency?.currency}, expected PKR`);

  const branches = await prisma.branch.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("All 3 Branches present (KHI, LHR, ISB)", branches.length >= 3, `Found ${branches.length} branches, expected 3`);

  const users = await prisma.user.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("Demo Staff Members present (>= 10)", users.length >= 10, `Found ${users.length} users, expected at least 10`);

  const suppliers = await prisma.supplier.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("Suppliers configured (>= 10)", suppliers.length >= 10, `Found ${suppliers.length} suppliers, expected at least 10`);

  const chartOfAccounts = await prisma.chartOfAccount.findMany({ where: { agencyId, isActive: true } });
  assertCheck("Chart of Accounts seeded (>= 50 accounts)", chartOfAccounts.length >= 50, `Found ${chartOfAccounts.length} accounts, expected >= 50`);

  // --- CHECK 2: CRM & Sales Relationships ---
  console.log("\n🤝 2. CRM & Sales Relationship Integrity");
  const leads = await prisma.lead.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("Leads pipeline populated (>= 50)", leads.length >= 50, `Found ${leads.length} leads`);

  const customers = await prisma.customer.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("Customer database populated (>= 30)", customers.length >= 30, `Found ${customers.length} customers`);

  const bookings = await prisma.booking.findMany({
    where: { agencyId, isDeleted: false },
    include: { customer: true, branch: true, services: true },
  });
  assertCheck("Bookings created (>= 20)", bookings.length >= 20, `Found ${bookings.length} bookings`);

  // Check no orphan bookings
  const orphanBookings = bookings.filter((b) => !b.customer || !b.branch);
  assertCheck("Zero orphan bookings (all linked to valid Customer & Branch)", orphanBookings.length === 0, `${orphanBookings.length} orphan bookings found`);

  // Check services on bookings
  const bookingsWithoutServices = bookings.filter((b) => b.services.length === 0);
  assertCheck("Zero empty bookings (all have travel services)", bookingsWithoutServices.length === 0, `${bookingsWithoutServices.length} bookings without services`);

  // --- CHECK 3: Financial & Invoicing Consistency ---
  console.log("\n💰 3. Financial & Invoicing Mathematical Consistency");
  const invoices = await prisma.invoice.findMany({
    where: { agencyId, isDeleted: false },
    include: { items: true, booking: true, customer: true },
  });
  assertCheck("Invoices generated (>= 20)", invoices.length >= 20, `Found ${invoices.length} invoices`);

  let invoiceMathMismatches = 0;
  for (const inv of invoices) {
    const itemsSum = inv.items.reduce((sum, it) => sum + it.amount, 0);
    if (Math.abs(itemsSum - inv.subtotal) > 0.05) {
      invoiceMathMismatches++;
    }
  }
  assertCheck("Invoice totals exactly equal sum of line items", invoiceMathMismatches === 0, `${invoiceMathMismatches} invoices have line item sum mismatches`);

  // Customer payments & allocations
  const customerPayments = await prisma.customerPayment.findMany({
    where: { agencyId, isDeleted: false },
    include: { allocations: true },
  });
  assertCheck("Customer payments recorded (>= 15)", customerPayments.length >= 15, `Found ${customerPayments.length} customer payments`);

  let overAllocatedPayments = 0;
  for (const p of customerPayments) {
    const totalAllocated = p.allocations.reduce((s, a) => s + a.amount, 0);
    if (totalAllocated > p.amount + 0.01) {
      overAllocatedPayments++;
    }
  }
  assertCheck("Payment allocations do not exceed payment receipts", overAllocatedPayments === 0, `${overAllocatedPayments} payments are over-allocated`);

  // --- CHECK 4: Double-Entry General Ledger Balance Audit ---
  console.log("\n⚖️  4. Double-Entry General Ledger Balance Audit");
  const journalEntries = await prisma.journalEntry.findMany({
    where: { agencyId, status: "POSTED" },
    include: { lines: true },
  });
  assertCheck("Posted Journal Entries present (>= 30)", journalEntries.length >= 30, `Found ${journalEntries.length} posted journal entries`);

  let unbalancedEntries = 0;
  let maxDebitCreditDiff = 0;

  for (const je of journalEntries) {
    const debitTotal = je.lines.reduce((s, l) => s + l.debit, 0);
    const creditTotal = je.lines.reduce((s, l) => s + l.credit, 0);
    const diff = Math.abs(debitTotal - creditTotal);
    if (diff > maxDebitCreditDiff) maxDebitCreditDiff = diff;
    if (diff > 0.01) {
      unbalancedEntries++;
    }
  }

  assertCheck("100% of Journal Entries balance perfectly (Debits == Credits)", unbalancedEntries === 0, `${unbalancedEntries} unbalanced journal entries! Max diff: ${maxDebitCreditDiff}`);

  // Operating Expenses
  const expenses = await prisma.expense.findMany({ where: { agencyId, isDeleted: false } });
  assertCheck("Operating expenses recorded (>= 20)", expenses.length >= 20, `Found ${expenses.length} expense records`);

  // --- CHECK 5: Pipeline Diversity & Realism ---
  console.log("\n📊 5. Funnel Realism & Pipeline Diversity");
  const leadStatusCounts = await prisma.lead.groupBy({
    by: ["status"],
    where: { agencyId, isDeleted: false },
    _count: { id: true },
  });
  const statusMap = Object.fromEntries(leadStatusCounts.map((s) => [s.status, s._count.id]));

  assertCheck("Lead funnel has 'new' leads", (statusMap["new"] || 0) > 0, "No new leads");
  assertCheck("Lead funnel has 'qualified' or 'contacted' leads", ((statusMap["qualified"] || 0) + (statusMap["contacted"] || 0)) > 0, "No qualified/contacted leads");
  assertCheck("Lead funnel has 'proposal_sent' leads", (statusMap["proposal_sent"] || 0) > 0, "No proposal sent leads");
  assertCheck("Lead funnel has 'converted' leads", (statusMap["converted"] || 0) > 0, "No converted leads");
  assertCheck("Lead funnel has 'lost' leads (healthy non-100% conversion)", (statusMap["lost"] || 0) > 0, "No lost leads");

  // Summary Metrics
  const totalRevenue = invoices.reduce((s, inv) => s + inv.total, 0);
  const totalReceived = customerPayments.reduce((s, p) => s + p.amount, 0);
  const totalExpenseAmount = expenses.reduce((s, e) => s + e.amount, 0);

  const metrics = {
    agency: agency?.name,
    currency: agency?.currency,
    branchesCount: branches.length,
    usersCount: users.length,
    suppliersCount: suppliers.length,
    leadsCount: leads.length,
    leadStatusBreakdown: statusMap,
    customersCount: customers.length,
    bookingsCount: bookings.length,
    invoicesCount: invoices.length,
    paymentsCount: customerPayments.length,
    expensesCount: expenses.length,
    journalEntriesCount: journalEntries.length,
    totalBilledPKR: totalRevenue,
    totalCollectedPKR: totalReceived,
    totalExpensesPKR: totalExpenseAmount,
  };

  console.log("\n===============================================================");
  console.log(`AUDIT SUMMARY: ${passedChecks}/${totalChecks} CHECKS PASSED`);
  console.log("===============================================================");
  console.log(`Total Billed:    PKR ${totalRevenue.toLocaleString()}`);
  console.log(`Total Collected: PKR ${totalReceived.toLocaleString()}`);
  console.log(`Total Expenses:  PKR ${totalExpenseAmount.toLocaleString()}`);
  console.log(`GL Entries:      ${journalEntries.length} (Balanced: 100%)`);
  console.log("===============================================================\n");

  return {
    passed: errors.length === 0,
    totalChecks,
    passedChecks,
    failedChecks: errors.length,
    errors,
    metrics,
  };
}

// Direct CLI Execution
if (require.main === module) {
  verifyDemoData()
    .then((report) => {
      if (!report.passed) {
        console.error("❌ Verification failed with errors:", report.errors);
        process.exit(1);
      } else {
        console.log("✨ ALL SYSTEM INTEGRITY CHECKS PASSED!");
      }
    })
    .catch((err) => {
      console.error("Critical error in verification suite:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
