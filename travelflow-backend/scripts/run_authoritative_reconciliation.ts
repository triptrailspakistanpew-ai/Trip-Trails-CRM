import { prisma } from "../src/lib/prisma";
import * as accountingService from "../src/services/accounting.service";
import * as mapping from "../src/services/accounting-mapping.service";
import { AgencyContext } from "../src/services/domain.service";

async function runReconciliation() {
  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log("  AUTHORITATIVE COA END-TO-END FINANCIAL RECONCILIATION TEST SUITE");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");

  const agency = await prisma.agency.findFirst({ where: { slug: "triptrails-01" } });
  if (!agency) throw new Error("Agency not found");

  const ctx: AgencyContext = {
    agencyId: agency.id,
    callerId: "22222222-2222-2222-2222-222222222201", // Bilal Ahmed
    userRole: "admin",
  };

  const branch = await prisma.branch.findFirst({ where: { agencyId: agency.id, code: "DXB" } });
  const branchId = branch?.id || undefined;

  const customer = await prisma.customer.findFirst({ where: { agencyId: agency.id } });
  if (!customer) throw new Error("Customer not found");

  const user = await prisma.user.findFirst({ where: { agencyId: agency.id } });
  if (!user) throw new Error("User not found");

  const supplier = await prisma.supplier.findFirst({ where: { agencyId: agency.id } });
  if (!supplier) throw new Error("Supplier not found");

  console.log(`Agency: ${agency.name} (${agency.id})`);
  console.log(`Customer: ${customer.firstName} ${customer.lastName} (${customer.id})\n`);

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 1: Agent Booking with Flight, Hotel, and Visa (Estimated vs Confirmed)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 1: Agent Booking with Mixed Services (Estimated vs Confirmed Liabilities)");
  const booking = await prisma.booking.create({
    data: {
      agencyId: agency.id,
      branchId: branchId || (await prisma.branch.findFirstOrThrow({ where: { agencyId: agency.id } })).id,
      bookingRef: `TEST-BK-${Date.now()}`,
      customerId: customer.id,
      agentId: user.id,
      departureDate: new Date(),
      bookingStatus: "confirmed",
      services: {
        create: [
          {
            agencyId: agency.id,
            serviceCategory: "flight",
            title: "Dubai to London Return",
            costPrice: 800,
            supplierInvoiceAmount: null, // UNCONFIRMED -> should post to 2000 Estimated
            sellingPrice: 1000,
            taxAmount: 10,
            customerTotal: 1010,
            expectedMargin: 200,
            taxTreatment: "VAT_ON_MARGIN",
            financialStatus: "draft",
          },
          {
            agencyId: agency.id,
            serviceCategory: "hotel",
            title: "London City Hotel 3 Nights",
            costPrice: 500,
            supplierInvoiceAmount: null, // UNCONFIRMED -> should post to 2000 Estimated
            sellingPrice: 650,
            taxAmount: 7.5,
            customerTotal: 657.5,
            expectedMargin: 150,
            taxTreatment: "VAT_ON_MARGIN",
            financialStatus: "draft",
          },
          {
            agencyId: agency.id,
            serviceCategory: "visa",
            title: "UK Standard Visitor Visa",
            costPrice: 200,
            supplierInvoiceAmount: 200, // CONFIRMED AT BOOKING -> should post directly to 2010 Confirmed
            sellingPrice: 300,
            taxAmount: 5,
            customerTotal: 305,
            expectedMargin: 100,
            taxTreatment: "VAT_ON_MARGIN",
            financialStatus: "confirmed",
          },
        ],
      },
    },
    include: { services: true },
  });

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: agency.id,
      branchId,
      invoiceRef: `TEST-INV-${Date.now()}`,
      bookingId: booking.id,
      customerId: customer.id,
      subtotal: 1950,
      tax: 22.5,
      total: 1972.5,
      status: "sent",
    },
  });

  const invoiceJE = await accountingService.postInvoiceJournal(ctx, invoice.id);
  const invoiceJELines = await prisma.journalLine.findMany({
    where: { journalEntryId: invoiceJE.id },
    include: { account: true },
  });

  console.log(`   Invoice JE Number: ${invoiceJE.entryNumber}`);
  for (const l of invoiceJELines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  // Assertions for Test 1
  const arLine = invoiceJELines.find((l) => l.account.code === "1100");
  const totalEstimated = invoiceJELines.filter((l) => l.account.code === "2000").reduce((sum, l) => sum + l.credit, 0);
  const totalConfirmed = invoiceJELines.filter((l) => l.account.code === "2010").reduce((sum, l) => sum + l.credit, 0);
  const vatLine = invoiceJELines.find((l) => l.account.code === "2200");
  const flightRevLine = invoiceJELines.find((l) => l.account.code === "4020");
  const hotelRevLine = invoiceJELines.find((l) => l.account.code === "4010");
  const visaRevLine = invoiceJELines.find((l) => l.account.code === "4000");

  if (!arLine || arLine.debit !== 1972.5) throw new Error("TEST 1 FAILED: Customer AR line missing or incorrect");
  if (totalEstimated !== 1300) throw new Error(`TEST 1 FAILED: Estimated Supplier 2000 should sum to 1,300, got ${totalEstimated}`);
  if (totalConfirmed !== 200) throw new Error(`TEST 1 FAILED: Confirmed Supplier 2010 should sum to 200, got ${totalConfirmed}`);
  if (!vatLine || vatLine.credit !== 22.5) throw new Error("TEST 1 FAILED: Output VAT 2200 should be 22.5");
  if (!flightRevLine || flightRevLine.credit <= 0) throw new Error("TEST 1 FAILED: Flight revenue 4020 missing");
  if (!hotelRevLine || hotelRevLine.credit <= 0) throw new Error("TEST 1 FAILED: Hotel revenue 4010 missing");
  if (!visaRevLine || visaRevLine.credit <= 0) throw new Error("TEST 1 FAILED: Visa revenue 4000 missing");

  console.log("✔ TEST 1 PASSED: Mixed liabilities and revenue accounts correctly separated!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 2: Supplier Obligation Confirmation & Cost Variance
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 2: Confirming Supplier Obligation (Reclassification & Cost Variance)");
  const hotelSvc = booking.services.find((s) => s.serviceCategory === "hotel")!;

  // Hotel supplier bills 520 (estimated was 500 -> +20 cost variance loss)
  const confirmJE = await accountingService.confirmSupplierInvoice(ctx, {
    bookingServiceId: hotelSvc.id,
    supplierInvoiceAmount: 520,
    reference: "HOTEL-BILL-9988",
  });

  const confirmLines = await prisma.journalLine.findMany({
    where: { journalEntryId: confirmJE.id },
    include: { account: true },
  });

  console.log(`   Confirmation JE Number: ${confirmJE.entryNumber}`);
  for (const l of confirmLines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  const clearEstLine = confirmLines.find((l) => l.account.code === "2000");
  const actualConfLine = confirmLines.find((l) => l.account.code === "2010");
  const varianceLine = confirmLines.find((l) => l.account.code === "5000");

  if (!clearEstLine || clearEstLine.debit !== 500) throw new Error("TEST 2 FAILED: Estimated liability 2000 was not cleared for 500");
  if (!actualConfLine || actualConfLine.credit !== 520) throw new Error("TEST 2 FAILED: Confirmed liability 2010 was not credited for 520");
  if (!varianceLine || varianceLine.debit !== 20) throw new Error("TEST 2 FAILED: Cost variance 5000 was not debited for 20");

  console.log("✔ TEST 2 PASSED: 2000 reclassified to 2010 and 5000 cost variance recognized without double counting!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 3: Customer Payment Against Invoice
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 3: Customer Payment Against Invoice");
  const custPayment = await prisma.customerPayment.create({
    data: {
      agencyId: agency.id,
      branchId,
      paymentRef: `TEST-CPY-${Date.now()}`,
      customerId: customer.id,
      bookingId: booking.id,
      amount: 1972.5,
      paymentMethod: "bank_transfer",
      status: "completed",
    },
  });

  const paymentJE = await accountingService.postCustomerPaymentJournal(ctx, custPayment.id);
  const paymentLines = await prisma.journalLine.findMany({
    where: { journalEntryId: paymentJE.id },
    include: { account: true },
  });

  console.log(`   Payment JE Number: ${paymentJE.entryNumber}`);
  for (const l of paymentLines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  const payBankLine = paymentLines.find((l) => l.account.code === "1010" || l.account.code === "1000");
  const payARLine = paymentLines.find((l) => l.account.code === "1100");
  if (!payBankLine || payBankLine.debit !== 1972.5) throw new Error("TEST 3 FAILED: Bank receipt incorrect");
  if (!payARLine || payARLine.credit !== 1972.5) throw new Error("TEST 3 FAILED: AR clearance incorrect");

  console.log("✔ TEST 3 PASSED: Bank debited, AR credited!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 4: Customer Advance (Prepayment with No Invoice)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 4: Customer Advance Received (Unallocated Deposit)");
  const advancePayment = await prisma.customerPayment.create({
    data: {
      agencyId: agency.id,
      branchId,
      paymentRef: `TEST-ADV-${Date.now()}`,
      customerId: customer.id,
      bookingId: null, // No booking yet!
      amount: 5000,
      paymentMethod: "bank_transfer",
      status: "completed",
    },
  });

  const advanceJE = await accountingService.postCustomerPaymentJournal(ctx, advancePayment.id);
  const advanceLines = await prisma.journalLine.findMany({
    where: { journalEntryId: advanceJE.id },
    include: { account: true },
  });

  console.log(`   Advance JE Number: ${advanceJE.entryNumber}`);
  for (const l of advanceLines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  const advCreditLine = advanceLines.find((l) => l.account.code === "2100");
  if (!advCreditLine || advCreditLine.credit !== 5000) {
    throw new Error("TEST 4 FAILED: Advance should credit 2100 Customer Advances Received");
  }

  console.log("✔ TEST 4 PASSED: Customer Advance correctly credited to 2100!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 5: Supplier Payment (Clearing Confirmed AP 2010)
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 5: Supplier Payment Clearing Confirmed AP 2010");
  const suppPayment = await prisma.supplierPayment.create({
    data: {
      agencyId: agency.id,
      branchId,
      paymentRef: `TEST-SPY-${Date.now()}`,
      supplierId: supplier.id,
      amount: 520,
      paymentMethod: "bank_transfer",
    },
  });

  const suppPayJE = await accountingService.postSupplierPaymentJournal(ctx, suppPayment.id);
  const suppPayLines = await prisma.journalLine.findMany({
    where: { journalEntryId: suppPayJE.id },
    include: { account: true },
  });

  console.log(`   Supplier Payment JE Number: ${suppPayJE.entryNumber}`);
  for (const l of suppPayLines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  const spAPLine = suppPayLines.find((l) => l.account.code === "2010");
  if (!spAPLine || spAPLine.debit !== 520) throw new Error("TEST 5 FAILED: Supplier payment should debit 2010 Confirmed AP");

  console.log("✔ TEST 5 PASSED: 2010 Confirmed AP debited, Bank credited!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 6: Prepaid Rent & Amortization
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 6: Prepaid Rent (1200) and Amortization (6000 Rent Expense)");
  const rentExpenseAccount = await mapping.getAccountByCode(agency.id, "6000");

  const rentExpense = await prisma.expense.create({
    data: {
      agencyId: agency.id,
      branchId: branchId || (await prisma.branch.findFirstOrThrow({ where: { agencyId: agency.id } })).id,
      expenseRef: `TEST-EXP-${Date.now()}`,
      title: "Annual Office Rent AED 60,000",
      category: "rent",
      amount: 60000,
      date: new Date(),
      paymentMethod: "bank_transfer",
      recordedById: user.id,
      status: "approved",
      accountId: rentExpenseAccount.id,
    },
  });

  const initialRentJE = await accountingService.postExpenseJournal(ctx, rentExpense.id, {
    isPrepaid: true,
    amortizeOverMonths: 6,
    startDate: new Date(),
  });

  const initialRentLines = await prisma.journalLine.findMany({
    where: { journalEntryId: initialRentJE.id },
    include: { account: true },
  });

  console.log(`   Prepaid Initial JE: ${initialRentJE.entryNumber}`);
  for (const l of initialRentLines) {
    console.log(
      `   [${l.account.code}] ${l.account.name.padEnd(42)} Dr: ${l.debit.toFixed(2).padStart(8)} | Cr: ${l.credit.toFixed(2).padStart(8)}`
    );
  }

  const prepaidAssetLine = initialRentLines.find((l) => l.account.code === "1200");
  if (!prepaidAssetLine || prepaidAssetLine.debit !== 60000) {
    throw new Error("TEST 6 FAILED: Initial prepaid should debit 1200 Prepaid Rent for 60,000");
  }

  // Run amortization
  const amortResults = await accountingService.processAmortizations(agency.id, new Date());
  console.log(`   Amortization processed: ${amortResults.processed} schedule item(s).`);

  const sched = await prisma.amortizationSchedule.findUnique({ where: { expenseId: rentExpense.id } });
  console.log(`   Recognized: ${sched?.recognizedAmount} / Total: ${sched?.totalAmount}`);
  if (Number(sched?.recognizedAmount) !== 10000) {
    throw new Error("TEST 6 FAILED: Exactly 1 month of rent (10,000) should be recognized");
  }

  console.log("✔ TEST 6 PASSED: 1200 capitalized and 6000 amortized cleanly!\n");

  // ─────────────────────────────────────────────────────────────────────────
  // SCENARIO 7: Custom Account Lifecycle & Historical Protection Rules
  // ─────────────────────────────────────────────────────────────────────────
  console.log("▶ TEST 7: Custom Account Lifecycle & Historical Protection Rules");
  const customCode = "1025";

  // Clean up if left from previous test run
  const oldCustom = await prisma.chartOfAccount.findFirst({ where: { agencyId: agency.id, code: customCode } });
  if (oldCustom) {
    await prisma.journalLine.deleteMany({ where: { accountId: oldCustom.id } });
    await prisma.chartOfAccount.delete({ where: { id: oldCustom.id } });
  }

  // 1. Create custom account
  const customAcc = await accountingService.createAccount(ctx, {
    code: customCode,
    name: "Dubai Islamic Bank Savings",
    type: "ASSET",
    category: "Cash & Bank",
    normalBalance: "DEBIT",
    description: "Special reserve bank account",
  });
  console.log(`   Created custom account: [${customAcc.code}] ${customAcc.name} (isSystem: ${customAcc.isSystem})`);
  if (customAcc.isSystem) throw new Error("TEST 7 FAILED: User created account must have isSystem: false");

  // 2. Post a journal entry using this account
  const testJE = await accountingService.createJournalEntry(
    ctx,
    {
      description: "Transfer to Savings",
      date: new Date().toISOString(),
      lines: [
        { accountId: customAcc.id, debit: 5000, credit: 0, description: "Deposit" },
        { accountId: (await mapping.getAccountByCode(agency.id, "1000")).id, debit: 0, credit: 5000, description: "From Current" },
      ],
    },
    user.id
  );
  console.log(`   Posted journal entry: ${testJE.entryNumber}`);

  // 3. Attempt to delete account with history -> MUST BE BLOCKED!
  let deleteBlocked = false;
  try {
    await accountingService.deleteAccount(ctx, customAcc.id);
  } catch (err: any) {
    deleteBlocked = true;
    console.log(`   ✔ Correctly blocked deletion of account with history: "${err.message}"`);
  }
  if (!deleteBlocked) throw new Error("TEST 7 FAILED: Account with history was not blocked from deletion!");

  // 4. Deactivate account instead
  const deactivated = await accountingService.toggleAccountStatus(ctx, customAcc.id, false);
  console.log(`   ✔ Deactivated account: isActive = ${deactivated.isActive}`);
  if (deactivated.isActive) throw new Error("TEST 7 FAILED: Account failed to deactivate");

  // 5. Attempt to delete a system account -> MUST BE BLOCKED!
  const systemAcc = await mapping.getAccountByCode(agency.id, "1000");
  let systemDeleteBlocked = false;
  try {
    await accountingService.deleteAccount(ctx, systemAcc.id);
  } catch (err: any) {
    systemDeleteBlocked = true;
    console.log(`   ✔ Correctly blocked deletion of system default account: "${err.message}"`);
  }
  if (!systemDeleteBlocked) throw new Error("TEST 7 FAILED: System account deletion was not blocked!");

  console.log("✔ TEST 7 PASSED: Custom account lifecycle and historical protection verified!\n");

  console.log("═══════════════════════════════════════════════════════════════════════════");
  console.log("  ALL 7 RECONCILIATION SCENARIOS PASSED WITH ZERO DISCREPANCIES! ✔");
  console.log("═══════════════════════════════════════════════════════════════════════════\n");
}

runReconciliation()
  .catch((e) => {
    console.error("\n❌ RECONCILIATION TEST FAILED:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
