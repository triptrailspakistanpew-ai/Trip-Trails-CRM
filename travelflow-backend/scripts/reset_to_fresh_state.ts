import { prisma } from "../src/lib/prisma";

async function resetToFreshState() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("DANGER: reset_to_fresh_state cannot be run in a production environment!");
  }
  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log("  RESETTING APPLICATION TO FRESH INITIAL SETUP STATE");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");

  console.log("Starting deletion of transactional and operational history...\n");

  // Step 1: Amortization & Journal
  console.log("1. Cleaning up Amortization items and Journal entries...");
  const deletedAmortItems = await prisma.amortizationScheduleItem.deleteMany({});
  console.log(`   Deleted ${deletedAmortItems.count} AmortizationScheduleItem(s)`);

  const deletedJournalLines = await prisma.journalLine.deleteMany({});
  console.log(`   Deleted ${deletedJournalLines.count} JournalLine(s)`);

  // Clear any self-referencing reversing entries first
  await prisma.journalEntry.updateMany({
    where: { reversingEntryId: { not: null } },
    data: { reversingEntryId: null },
  });
  const deletedJournalEntries = await prisma.journalEntry.deleteMany({});
  console.log(`   Deleted ${deletedJournalEntries.count} JournalEntry(s)`);

  const deletedAmortSchedules = await prisma.amortizationSchedule.deleteMany({});
  console.log(`   Deleted ${deletedAmortSchedules.count} AmortizationSchedule(s)`);

  // Step 2: Financial transactions (Payments, Allocations, Invoices, Expenses)
  console.log("\n2. Cleaning up Payments, Invoices, and Expenses...");
  const deletedPayAlloc = await prisma.paymentAllocation.deleteMany({});
  console.log(`   Deleted ${deletedPayAlloc.count} PaymentAllocation(s)`);

  const deletedSuppPayAlloc = await prisma.supplierPaymentAllocation.deleteMany({});
  console.log(`   Deleted ${deletedSuppPayAlloc.count} SupplierPaymentAllocation(s)`);

  const deletedSuppPayments = await prisma.supplierPayment.deleteMany({});
  console.log(`   Deleted ${deletedSuppPayments.count} SupplierPayment(s)`);

  const deletedCustPayments = await prisma.customerPayment.deleteMany({});
  console.log(`   Deleted ${deletedCustPayments.count} CustomerPayment(s)`);

  const deletedCreditNotes = await prisma.creditNote.deleteMany({});
  console.log(`   Deleted ${deletedCreditNotes.count} CreditNote(s)`);

  const deletedInvoiceLines = await prisma.invoiceLine.deleteMany({});
  console.log(`   Deleted ${deletedInvoiceLines.count} InvoiceLine(s)`);

  const deletedInvoices = await prisma.invoice.deleteMany({});
  console.log(`   Deleted ${deletedInvoices.count} Invoice(s)`);

  const deletedExpenses = await prisma.expense.deleteMany({});
  console.log(`   Deleted ${deletedExpenses.count} Expense(s)`);

  // Step 3: Bookings
  console.log("\n3. Cleaning up Bookings and Schedules...");
  const deletedSchedItems = await prisma.paymentScheduleItem.deleteMany({});
  console.log(`   Deleted ${deletedSchedItems.count} PaymentScheduleItem(s)`);

  const deletedScheds = await prisma.paymentSchedule.deleteMany({});
  console.log(`   Deleted ${deletedScheds.count} PaymentSchedule(s)`);

  const deletedBookingActivities = await prisma.bookingActivity.deleteMany({});
  console.log(`   Deleted ${deletedBookingActivities.count} BookingActivity(s)`);

  const deletedBookingDocuments = await prisma.bookingDocument.deleteMany({});
  console.log(`   Deleted ${deletedBookingDocuments.count} BookingDocument(s)`);

  const deletedBookingTravelers = await prisma.bookingTraveler.deleteMany({});
  console.log(`   Deleted ${deletedBookingTravelers.count} BookingTraveler(s)`);

  const deletedBookingServices = await prisma.bookingService.deleteMany({});
  console.log(`   Deleted ${deletedBookingServices.count} BookingService(s)`);

  const deletedBookings = await prisma.booking.deleteMany({});
  console.log(`   Deleted ${deletedBookings.count} Booking(s)`);

  // Step 4: Quotations
  console.log("\n4. Cleaning up Quotations...");
  const deletedQuoteTaxes = await prisma.quotationTax.deleteMany({});
  console.log(`   Deleted ${deletedQuoteTaxes.count} QuotationTax(es)`);

  const deletedQuoteItems = await prisma.quotationItem.deleteMany({});
  console.log(`   Deleted ${deletedQuoteItems.count} QuotationItem(s)`);

  const deletedQuoteAttachments = await prisma.quotationAttachment.deleteMany({});
  console.log(`   Deleted ${deletedQuoteAttachments.count} QuotationAttachment(s)`);

  const deletedQuoteVersions = await prisma.quotationVersion.deleteMany({});
  console.log(`   Deleted ${deletedQuoteVersions.count} QuotationVersion(s)`);

  const deletedQuotations = await prisma.quotation.deleteMany({});
  console.log(`   Deleted ${deletedQuotations.count} Quotation(s)`);

  // Step 5: Leads
  console.log("\n5. Cleaning up Leads...");
  const deletedLeadActivities = await prisma.leadActivity.deleteMany({});
  console.log(`   Deleted ${deletedLeadActivities.count} LeadActivity(s)`);

  const deletedLeads = await prisma.lead.deleteMany({});
  console.log(`   Deleted ${deletedLeads.count} Lead(s)`);

  // Step 6: Customers
  console.log("\n6. Cleaning up Customers...");
  const deletedCustNotes = await prisma.customerNote.deleteMany({});
  console.log(`   Deleted ${deletedCustNotes.count} CustomerNote(s)`);

  const deletedCustDocs = await prisma.customerDocument.deleteMany({});
  console.log(`   Deleted ${deletedCustDocs.count} CustomerDocument(s)`);

  const deletedCustomers = await prisma.customer.deleteMany({});
  console.log(`   Deleted ${deletedCustomers.count} Customer(s)`);

  // Step 7: Operational Logs & Notifications
  console.log("\n7. Cleaning up Notifications, Recent Activities, and Counters...");
  const deletedNotifications = await prisma.notification.deleteMany({});
  console.log(`   Deleted ${deletedNotifications.count} Notification(s)`);

  const deletedRecentActivities = await prisma.recentActivity.deleteMany({});
  console.log(`   Deleted ${deletedRecentActivities.count} RecentActivity(s)`);

  const deletedCounters = await prisma.counter.deleteMany({});
  console.log(`   Reset/deleted ${deletedCounters.count} Counter(s) (will restart from 1)`);

  // Step 8: Clean up custom test accounts from Chart of Accounts (leave all system accounts)
  console.log("\n8. Cleaning up non-system test accounts in Chart of Accounts...");
  const deletedCustomAccounts = await prisma.chartOfAccount.deleteMany({
    where: { isSystem: false },
  });
  console.log(`   Deleted ${deletedCustomAccounts.count} non-system custom test account(s)`);

  // Step 9: Reset Supplier balances to 0
  console.log("\n9. Resetting Supplier balances to 0...");
  const updatedSuppliers = await prisma.supplier.updateMany({
    data: { balance: 0 },
  });
  console.log(`   Reset balance to 0 for ${updatedSuppliers.count} Supplier(s)`);

  console.log("\n═══════════════════════════════════════════════════════════════════════════");
  console.log("  APPLICATION SUCCESSFULLY RESET TO FRESH INITIAL SETUP STATE! ✔");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");
}

resetToFreshState()
  .catch((e) => {
    console.error("\n❌ RESET SCRIPT FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
