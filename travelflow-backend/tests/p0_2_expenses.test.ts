import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import { createExpense } from "../src/services/domain.service";
import { postExpenseJournal } from "../src/services/accounting.service";
import * as mapping from "../src/services/accounting-mapping.service";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001"; // TripTrails Travel & Tourism

let ctx: any;
let branch: any;

describe("P0.2 — Expense Accounting & Audit Trail", () => {
  it("setup test context", async () => {
    const user = await prisma.user.findFirst({ where: { agencyId: AGENCY_ID } });
    branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } })
      || await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID } });
    const callerId = user?.id || "22222222-2222-2222-2222-222222222201";

    ctx = {
      agencyId: AGENCY_ID,
      callerRole: "admin",
      callerId,
      isSuperAdmin: false,
    };
    expect(user).toBeDefined();
    expect(branch).toBeDefined();
  });
  it("createExpense auto-resolves accountId and paymentAccountId and posts balanced journal", async () => {
    const expense = await createExpense(
      ctx,
      {
        title: "Test Office Rent March",
        category: "rent",
        amount: 5000,
        date: new Date(),
        paidTo: "Al Rostamani Real Estate",
        paymentMethod: "bank_transfer",
        notes: "Monthly office lease",
      },
      ctx.callerId
    );

    expect(expense).toBeDefined();
    expect(expense.accountId).toBeDefined();
    expect(expense.paymentAccountId).toBeDefined();

    // Verify resolved account is 6000 Rent Expense
    const rentAccount = await prisma.chartOfAccount.findUnique({
      where: { id: expense.accountId! },
    });
    expect(rentAccount).toBeDefined();
    expect(rentAccount?.code).toBe("6000");

    // Verify journal entry was created and balanced
    const je = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "EXPENSE", sourceId: expense.id },
      include: { lines: true },
    });

    expect(je).toBeDefined();
    expect(je?.status).toBe("POSTED");
    expect(je?.lines.length).toBe(2);

    const totalDebit = je!.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = je!.lines.reduce((s, l) => s + l.credit, 0);

    expect(totalDebit).toBe(5000);
    expect(totalCredit).toBe(5000);
    expect(totalDebit).toBe(totalCredit);

    // Verify audit trail entry was recorded
    const activity = await prisma.recentActivity.findFirst({
      where: { agencyId: AGENCY_ID, type: "EXPENSE_RECORDED" },
      orderBy: { createdAt: "desc" },
    });
    expect(activity).toBeDefined();
    expect(activity?.title).toBe("Expense Journal Posted");
  });

  it("createExpense with explicit accountId preserves custom account", async () => {
    const itSoftwareAcc = await mapping.getAccountByCode(AGENCY_ID, branch.id, "6220");
    const pettyCashAcc = await mapping.getAccountByCode(AGENCY_ID, branch.id, "1020");

    const expense = await createExpense(
      ctx,
      {
        title: "Figma Subscription",
        category: "software",
        amount: 250,
        date: new Date(),
        paidTo: "Figma Inc",
        paymentMethod: "credit_card",
        accountId: itSoftwareAcc.id,
        paymentAccountId: pettyCashAcc.id,
      },
      ctx.callerId
    );

    expect(expense.accountId).toBe(itSoftwareAcc.id);
    expect(expense.paymentAccountId).toBe(pettyCashAcc.id);

    const je = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "EXPENSE", sourceId: expense.id },
      include: { lines: true },
    });

    expect(je).toBeDefined();
    const debitLine = je?.lines.find((l) => l.debit > 0);
    const creditLine = je?.lines.find((l) => l.credit > 0);

    expect(debitLine?.accountId).toBe(itSoftwareAcc.id);
    expect(creditLine?.accountId).toBe(pettyCashAcc.id);
    expect(debitLine?.debit).toBe(250);
    expect(creditLine?.credit).toBe(250);
  });

  it("postExpenseJournal handles prepaid expense amortization", async () => {
    const expense = await createExpense(
      ctx,
      {
        title: "Annual Office Insurance",
        category: "other",
        amount: 12000,
        date: new Date(),
        paidTo: "Oman Insurance",
        paymentMethod: "bank_transfer",
        isPrepaid: true,
        amortizeOverMonths: 12,
        startDate: new Date("2026-01-01"),
      } as any,
      ctx.callerId
    );

    const je = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "EXPENSE", sourceId: expense.id },
      include: { lines: true },
    });

    expect(je).toBeDefined();
    // Prepaid debits 1220 / 1200 / 1210 Prepaid Asset
    const debitLine = je?.lines.find((l) => l.debit > 0);
    const prepaidAccount = await prisma.chartOfAccount.findUnique({
      where: { id: debitLine!.accountId },
    });
    expect(["1200", "1210", "1220"].includes(prepaidAccount!.code)).toBe(true);

    // Amortization schedule must be created
    const schedule = await prisma.amortizationSchedule.findFirst({
      where: { expenseId: expense.id },
      include: { items: true },
    });
    expect(schedule).toBeDefined();
    expect(Number(schedule?.totalAmount)).toBe(12000);
    expect(schedule?.items.length).toBe(12);
  });
});

async function run() {
  const ok = await printSuiteSummary();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run();
