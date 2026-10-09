import { describe, it, expect, expectToThrow, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import { createBooking } from "../src/services/domain.service";
import { generateInvoiceFromBooking, cancelInvoice } from "../src/services/invoice.service";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001";
let ctx: any;

describe("P0.5 — Duplicate Invoice Prevention & Cancellation Reversal", () => {
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
          customerRef: "CUS-TEST05",
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
  it("prevents duplicate active invoices for the same booking (409 Conflict)", async () => {
    const customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });

    const booking = await createBooking(
      ctx,
      {
        customerId: customer!.id,
        branchId: branch!.id,
        title: "Duplicate Check Booking",
        departureDate: new Date(),
        services: [
          {
            serviceCategory: "visa",
            title: "Turkey Tourist Visa",
            costPrice: 400,
            sellingPrice: 600,
            quantity: 1,
            vatRate: 5,
            taxTreatment: "VAT_ON_MARGIN",
          } as any,
        ],
      } as any,
      ctx.callerId,
      "Admin User"
    );

    // First generation succeeds
    const inv1 = await generateInvoiceFromBooking(ctx, booking.id);
    expect(inv1).toBeDefined();
    expect(inv1.status).toBe("sent");

    // Second generation must throw 409 Conflict
    await expectToThrow(
      () => generateInvoiceFromBooking(ctx, booking.id),
      "already exists for this booking"
    );
  });

  it("cancelInvoice reverses journal entry and allows re-invoicing", async () => {
    const customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });

    const booking = await createBooking(
      ctx,
      {
        customerId: customer!.id,
        branchId: branch!.id,
        title: "Cancellation Test Booking",
        departureDate: new Date(),
        services: [
          {
            serviceCategory: "hotel",
            title: "Rotana Hotel Stay",
            costPrice: 1000,
            sellingPrice: 1400,
            quantity: 1,
            vatRate: 5,
            taxTreatment: "VAT_ON_MARGIN",
          } as any,
        ],
      } as any,
      ctx.callerId,
      "Admin User"
    );

    const inv = await generateInvoiceFromBooking(ctx, booking.id);
    expect(inv).toBeDefined();

    // Verify original journal entry is POSTED
    const originalJE = await prisma.journalEntry.findFirst({
      where: { agencyId: AGENCY_ID, sourceModule: "INVOICE", sourceId: inv.id },
    });
    expect(originalJE).toBeDefined();
    expect(originalJE?.status).toBe("POSTED");

    // Cancel invoice
    const cancelled = await cancelInvoice(ctx, inv.id, "Customer requested route change", ctx.callerId);
    expect(cancelled.status).toBe("cancelled");

    // Verify original JE is now REVERSED
    const updatedJE = await prisma.journalEntry.findUnique({
      where: { id: originalJE!.id },
    });
    expect(updatedJE?.status).toBe("REVERSED");
    expect(updatedJE?.reversingEntryId).toBeDefined();

    // Verify reversing journal entry exists and debits/credits match inverted
    const reversingJE = await prisma.journalEntry.findUnique({
      where: { id: updatedJE!.reversingEntryId! },
      include: { lines: true },
    });
    expect(reversingJE).toBeDefined();
    expect(reversingJE?.status).toBe("POSTED");

    const revDebits = reversingJE!.lines.reduce((s, l) => s + l.debit, 0);
    const revCredits = reversingJE!.lines.reduce((s, l) => s + l.credit, 0);
    expect(revDebits).toBe(revCredits);

    // Verify audit trail entry
    const activity = await prisma.recentActivity.findFirst({
      where: { agencyId: AGENCY_ID, type: "INVOICE_CANCELLED" },
      orderBy: { createdAt: "desc" },
    });
    expect(activity).toBeDefined();
    expect(activity?.detail).toContain(inv.invoiceRef);

    // Now re-invoicing for this booking is allowed!
    const newInv = await generateInvoiceFromBooking(ctx, booking.id);
    expect(newInv).toBeDefined();
    expect(newInv.status).toBe("sent");
    expect(newInv.id !== inv.id).toBe(true);
  });
});

async function run() {
  const ok = await printSuiteSummary();
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

run();
