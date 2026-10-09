import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import {
  createSupplier,
  getSupplier,
  getSupplierStatement,
  createBooking,
  createExpense,
  recordSupplierPayment,
} from "../src/services/domain.service";
import { importSalesRows, importExpenseRows } from "../src/services/import.service";
import * as mapping from "../src/services/accounting-mapping.service";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001"; // TripTrails Travel & Tourism

let ctx: any;
let branch: any;

describe("P0.6 — Financial Calculations, Supplier Ledger, Import & General Ledger Integrity", () => {
  it("setup test context", async () => {
    const user = await prisma.user.findFirst({ where: { agencyId: AGENCY_ID } });
    branch =
      (await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } })) ||
      (await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID } }));

    expect(user).toBeDefined();
    expect(branch).toBeDefined();

    ctx = {
      agencyId: AGENCY_ID,
      branchId: branch.id,
      callerRole: "admin",
      callerId: user?.id || "22222222-2222-2222-2222-222222222201",
      isSuperAdmin: false,
    };
  });

  it("supplier balance and ledger statement calculate correct partial payment (e.g. 1500 AED cost, 1000 AED payment -> 500 AED balance)", async () => {
    // 1. Create a unique test supplier
    const supplier = await createSupplier(ctx, {
      name: `Grand Hotel Test ${Date.now()}`,
      category: "hotel",
      contactPerson: "Manager John",
      email: `hotel_${Date.now()}@test.com`,
      phone: "+971501234567",
      city: "Dubai",
      country: "UAE",
    });
    expect(supplier).toBeDefined();

    // 2. Create customer and booking with service obligation of 1500 AED via createBooking service
    const customer = await prisma.customer.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch.id,
        firstName: "Test",
        lastName: `Client-${Date.now().toString().slice(-4)}`,
        phone: "+971500000000",
        type: "INDIVIDUAL",
        customerRef: `CST-TST-${Date.now().toString().slice(-4)}`,
      },
    });

    const booking = await createBooking(
      ctx,
      {
        customerId: customer.id,
        title: "Test Supplier Obligation Booking",
        departureDate: new Date() as any,
        services: [
          {
            supplierId: supplier.id,
            serviceCategory: "hotel",
            title: "5 Nights Luxury Suite",
            costPrice: 1500,
            sellingPrice: 2000,
          } as any,
        ],
      } as any,
      ctx.callerId,
      "admin"
    );

    // Verify initial supplier balance before payment
    const supplierInitial = await getSupplier(ctx, supplier.id);
    expect(supplierInitial?.balance).toBe(1500);

    // 3. Record partial payment of 1000 AED to supplier
    const payment = await recordSupplierPayment(ctx, supplier.id, {
      amount: 1000,
      method: "bank_transfer",
      reference: `TRN-SPY-${Date.now().toString().slice(-4)}`,
    });
    expect(payment).toBeDefined();

    // 4. Verify calculated supplier balance
    const supplierUpdated = await getSupplier(ctx, supplier.id);
    expect(supplierUpdated?.balance).toBe(500);

    // 5. Verify supplier statement calculation & entries
    const statement = await getSupplierStatement(ctx, supplier.id);
    expect(statement).toBeDefined();
    expect(statement.finalBalance).toBe(500);
    expect(statement.entries.length).toBe(2);

    // Find obligation and payment entries
    const obligationEntry = statement.entries.find(
      (e) => e.type === "SUPPLIER_OBLIGATION" || e.credit > 0
    );
    const paymentEntry = statement.entries.find(
      (e) => e.type === "SUPPLIER_PAYMENT" || e.debit > 0
    );

    expect(obligationEntry).toBeDefined();
    expect(obligationEntry?.credit).toBe(1500);
    expect(paymentEntry).toBeDefined();
    expect(paymentEntry?.debit).toBe(1000);
  });

  it("expense creation generates balanced double-entry journals (Debits === Credits)", async () => {
    const expenseAmount = 3500;
    const expense = await createExpense(
      ctx,
      {
        title: `Marketing Campaign ${Date.now()}`,
        category: "marketing",
        amount: expenseAmount,
        date: new Date(),
        paidTo: "Google Ads UAE",
        paymentMethod: "bank_transfer",
        notes: "Digital marketing campaign",
      },
      ctx.callerId
    );

    expect(expense).toBeDefined();
    expect(expense.amount).toBe(expenseAmount);

    const je = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "EXPENSE", sourceId: expense.id },
      include: { lines: true },
    });

    expect(je).toBeDefined();
    expect(je?.status).toBe("POSTED");

    const totalDebit = je!.lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = je!.lines.reduce((sum, l) => sum + l.credit, 0);

    expect(totalDebit).toBe(expenseAmount);
    expect(totalCredit).toBe(expenseAmount);
    expect(totalDebit).toBe(totalCredit);
  });

  it("bulk sales import parses rows, updates supplier balances, and records data correctly", async () => {
    const supplierName = `Imported Airline ${Date.now()}`;
    const result = await importSalesRows(
      ctx,
      branch.id,
      [
        {
          date: "2026-09-10",
          customerName: `Acme Corp ${Date.now()}`,
          serviceType: "flight",
          supplier: supplierName,
          costPrice: 2400,
          sellingPrice: 3000,
          passengerName: "Alice Smith",
          ticketNumber: "TK-998877",
          taxAmount: 150,
          currency: "AED",
        },
      ],
      "Default Import Customer"
    );

    expect(result.success).toBe(true);
    expect(result.importedRows).toBe(1);

    // Verify supplier was created/resolved and balance includes the imported service cost
    const importedSupplier = await prisma.supplier.findFirst({
      where: { agencyId: AGENCY_ID, name: supplierName },
    });
    expect(importedSupplier).toBeDefined();

    const supplierWithBalance = await getSupplier(ctx, importedSupplier!.id);
    expect(supplierWithBalance?.balance).toBe(2400);
  });

  it("bulk expense import records expense rows and creates balanced journal entries", async () => {
    const title = `Printer Cartridges ${Date.now()}`;
    const result = await importExpenseRows(ctx, branch.id, [
      {
        date: "2026-09-11",
        category: "office_supplies",
        description: title,
        amountPaid: 850,
        paidTo: "Stationery Mart",
        paymentMethod: "cash",
      },
    ]);

    expect(result.success).toBe(true);
    expect(result.importedRows).toBe(1);

    const expense = await prisma.expense.findFirst({
      where: { agencyId: AGENCY_ID, title },
    });
    expect(expense).toBeDefined();
    expect(expense?.amount).toBe(850);

    const je = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "EXPENSE", sourceId: expense!.id },
      include: { lines: true },
    });
    expect(je).toBeDefined();

    const totalDebit = je!.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = je!.lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBe(850);
    expect(totalCredit).toBe(850);
  });

  it("general ledger integrity check — sum of all posted debits equals sum of all posted credits across agency", async () => {
    const totals = await prisma.journalLine.aggregate({
      where: {
        agencyId: AGENCY_ID,
        journalEntry: { status: "POSTED" },
      },
      _sum: {
        debit: true,
        credit: true,
      },
    });

    const totalDebits = Number(totals._sum.debit || 0);
    const totalCredits = Number(totals._sum.credit || 0);
    const imbalance = Math.abs(totalDebits - totalCredits);

    expect(imbalance).toBeCloseTo(0, 0.05);
  });
});

async function run() {
  const ok = await printSuiteSummary();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run();
