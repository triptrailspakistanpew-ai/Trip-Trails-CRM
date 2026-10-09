import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import { postInvoiceJournal } from "../src/services/accounting.service";
import * as mapping from "../src/services/accounting-mapping.service";
import { generateRef } from "../src/utils/refGenerator";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001";
let ctx: any;

describe("P0.3 — Zero / Negative Margin Invoice Balancing", () => {
  it("setup test context", async () => {
    const user = await prisma.user.findFirst({ where: { agencyId: AGENCY_ID } });
    const callerId = user?.id || "22222222-2222-2222-2222-222222222201";
    ctx = {
      agencyId: AGENCY_ID,
      callerRole: "admin",
      callerId,
      isSuperAdmin: false,
    };
    let customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    if (!customer) {
      const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID } });
      customer = await prisma.customer.create({
        data: {
          agencyId: AGENCY_ID,
          branchId: branch?.id || user!.branchId!,
          customerRef: "CUS-TEST01",
          type: "individual",
          firstName: "Test",
          lastName: "Customer",
          phone: "+971501234567",
        },
      });
    }
    expect(user).toBeDefined();
    expect(customer).toBeDefined();
  });
  it("Positive Margin: correctly credits revenue and VAT with Debits == Credits", async () => {
    // Setup test booking and invoice
    const customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });
    const bookingRef = await generateRef("BK", AGENCY_ID);
    const invoiceRef = await generateRef("INV", AGENCY_ID);

    const booking = await prisma.booking.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        agentId: ctx.callerId,
        bookingRef,
        customerId: customer!.id,
        departureDate: new Date(),
        bookingStatus: "confirmed",
        paymentStatus: "unpaid",
        services: {
          create: {
            agencyId: AGENCY_ID,
            title: "Positive Margin Service (Dubai City Tour)",
            serviceCategory: "tour",
            costPrice: 1000,
            sellingPrice: 1200,
            taxAmount: 10,
            expectedMargin: 200,
            customerTotal: 1210,
          },
        },
      },
      include: { services: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        bookingId: booking.id,
        customerId: customer!.id,
        invoiceRef,
        status: "sent",
        subtotal: 1200,
        tax: 10,
        total: 1210,
        dueDate: new Date(),
      },
    });

    const je = await postInvoiceJournal(ctx, invoice.id);

    expect(je).toBeDefined();
    expect(je.status).toBe("POSTED");

    const fullJE = await prisma.journalEntry.findUnique({
      where: { id: je.id },
      include: { lines: { include: { account: true } } },
    });

    const debits = fullJE!.lines.reduce((s, l) => s + l.debit, 0);
    const credits = fullJE!.lines.reduce((s, l) => s + l.credit, 0);

    expect(debits).toBe(1210);
    expect(credits).toBe(1210);
    expect(debits).toBe(credits);

    const revLine = fullJE!.lines.find((l) => l.account.code === "4030");
    const vatLine = fullJE!.lines.find((l) => l.account.code === "2200");
    const suppLine = fullJE!.lines.find((l) => l.account.code === "2000");
    const arLine = fullJE!.lines.find((l) => l.account.code === "1100");

    expect(revLine?.credit).toBe(200);
    expect(vatLine?.credit).toBe(10);
    expect(suppLine?.credit).toBe(1000);
    expect(arLine?.debit).toBe(1210);
  });

  it("Zero Margin: creates pass-through journal with Debits == Credits without revenue or VAT", async () => {
    const customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });
    const bookingRef = await generateRef("BK", AGENCY_ID);
    const invoiceRef = await generateRef("INV", AGENCY_ID);

    const booking = await prisma.booking.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        agentId: ctx.callerId,
        bookingRef,
        customerId: customer!.id,
        departureDate: new Date(),
        bookingStatus: "confirmed",
        paymentStatus: "unpaid",
        services: {
          create: {
            agencyId: AGENCY_ID,
            title: "Pass-Through Airline Ticket (At Cost)",
            serviceCategory: "flight",
            costPrice: 3500,
            sellingPrice: 3500,
            taxAmount: 0,
            expectedMargin: 0,
            customerTotal: 3500,
          },
        },
      },
      include: { services: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        bookingId: booking.id,
        customerId: customer!.id,
        invoiceRef,
        status: "sent",
        subtotal: 3500,
        tax: 0,
        total: 3500,
        dueDate: new Date(),
      },
    });

    const je = await postInvoiceJournal(ctx, invoice.id);
    expect(je).toBeDefined();

    const fullJE = await prisma.journalEntry.findUnique({
      where: { id: je.id },
      include: { lines: { include: { account: true } } },
    });

    const debits = fullJE!.lines.reduce((s, l) => s + l.debit, 0);
    const credits = fullJE!.lines.reduce((s, l) => s + l.credit, 0);

    expect(debits).toBe(3500);
    expect(credits).toBe(3500);
    expect(debits).toBe(credits);

    const arLine = fullJE!.lines.find((l) => l.account.code === "1100");
    const suppLine = fullJE!.lines.find((l) => l.account.code === "2000");
    const revLines = fullJE!.lines.filter((l) => l.account.code.startsWith("4"));

    expect(arLine?.debit).toBe(3500);
    expect(suppLine?.credit).toBe(3500);
    expect(revLines.length).toBe(0); // No revenue on pass-through
  });

  it("Negative Margin: debits Account 5000 Cost Variance and maintains Debits == Credits", async () => {
    const customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });
    const bookingRef = await generateRef("BK", AGENCY_ID);
    const invoiceRef = await generateRef("INV", AGENCY_ID);

    // Cost is 1000, but discounted to 850 (Margin = -150)
    const booking = await prisma.booking.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        agentId: ctx.callerId,
        bookingRef,
        customerId: customer!.id,
        departureDate: new Date(),
        bookingStatus: "confirmed",
        paymentStatus: "unpaid",
        services: {
          create: {
            agencyId: AGENCY_ID,
            title: "Discounted Loss Leader Hotel",
            serviceCategory: "hotel",
            costPrice: 1000,
            sellingPrice: 850,
            taxAmount: 0,
            expectedMargin: -150,
            customerTotal: 850,
          },
        },
      },
      include: { services: true },
    });

    const invoice = await prisma.invoice.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        bookingId: booking.id,
        customerId: customer!.id,
        invoiceRef,
        status: "sent",
        subtotal: 850,
        tax: 0,
        total: 850,
        dueDate: new Date(),
      },
    });

    const je = await postInvoiceJournal(ctx, invoice.id);
    expect(je).toBeDefined();

    const fullJE = await prisma.journalEntry.findUnique({
      where: { id: je.id },
      include: { lines: { include: { account: true } } },
    });

    const debits = fullJE!.lines.reduce((s, l) => s + l.debit, 0);
    const credits = fullJE!.lines.reduce((s, l) => s + l.credit, 0);

    expect(debits).toBe(1000);
    expect(credits).toBe(1000);
    expect(debits).toBe(credits);

    const arLine = fullJE!.lines.find((l) => l.account.code === "1100");
    const lossLine = fullJE!.lines.find((l) => l.account.code === "5000");
    const suppLine = fullJE!.lines.find((l) => l.account.code === "2000");

    expect(arLine?.debit).toBe(850);
    expect(lossLine?.debit).toBe(150);
    expect(suppLine?.credit).toBe(1000);

    // Audit trail verification
    const activity = await prisma.recentActivity.findFirst({
      where: { agencyId: AGENCY_ID, type: "INVOICE_POSTED" },
      orderBy: { createdAt: "desc" },
    });
    expect(activity).toBeDefined();
  });
});

async function run() {
  const ok = await printSuiteSummary();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run();
