import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import { createBooking } from "../src/services/domain.service";
import { generateInvoiceFromBooking, getInvoice } from "../src/services/invoice.service";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001";
let ctx: any;

describe("P0.7 — Mixed VAT Travel Invoice Verification", () => {
  it("setup context with customer & branch", async () => {
    const user = await prisma.user.findFirst({ where: { agencyId: AGENCY_ID } });
    expect(user).toBeDefined();

    ctx = {
      agencyId: AGENCY_ID,
      callerRole: "admin",
      callerId: user?.id,
      isSuperAdmin: false,
    };
  });

  it("generates a mixed VAT invoice with standard, zero-rated, and exempt services", async () => {
    let customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID } });

    // 1. Create a booking that contains mixed travel services
    // - Service 1: International Flight (Zero-Rated 0%, Agent Pass-through)
    // - Service 2: Agency Booking Service Fee (Standard Rated 5%)
    // - Service 3: Local Hotel / City Tour (Standard Rated 5%, Principal)
    // - Service 4: Financial Protection / Visa Fee (Exempt / Out of Scope)
    const booking = await createBooking(
      ctx,
      {
        customerId: customer!.id,
        branchId: branch!.id,
        title: "Dubai & London Luxury Tour",
        departureDate: new Date(),
        services: [
          {
            serviceCategory: "flight",
            title: "Emirates Int Flight DXB-LHR",
            costPrice: 3000,
            sellingPrice: 3200,
            quantity: 1,
            vatRate: 0,
            taxTreatment: "ZERO_RATED",
            serviceDetails: {
              pnr: "EMR889",
              ticketNumber: "176-2244668800",
              route: "DXB - LHR",
            },
          } as any,
          {
            serviceCategory: "other",
            title: "VIP Concierge & Booking Fee",
            costPrice: 0,
            sellingPrice: 200,
            quantity: 1,
            vatRate: 5,
            taxTreatment: "VAT_ON_SELLING_PRICE",
          } as any,
          {
            serviceCategory: "hotel",
            title: "The Ritz London 3 Nights",
            costPrice: 1500,
            sellingPrice: 1800,
            quantity: 1,
            vatRate: 5,
            taxTreatment: "VAT_ON_SELLING_PRICE",
            serviceDetails: {
              hotelName: "The Ritz London",
            },
          } as any,
        ],
      } as any,
      ctx.callerId,
      branch!.id
    );

    expect(booking).toBeDefined();
    expect(booking.id).toBeDefined();

    // 2. Generate the Tax Invoice
    const invoice = await generateInvoiceFromBooking(ctx, booking.id);
    expect(invoice).toBeDefined();
    expect(invoice.invoiceRef.startsWith("INV-")).toBeTruthy();

    // 3. Fetch full invoice with lines and breakdown
    const fullInvoice: any = await getInvoice(ctx, invoice.id);
    expect(fullInvoice.items.length).toBe(3);

    // Verify Line 1 (Flight)
    const flightLine = fullInvoice.items.find((i: any) => i.serviceCategory === "flight");
    expect(flightLine).toBeDefined();
    expect(flightLine.vatCategory).toBe("ZERO_RATED");
    expect(flightLine.vatRate).toBe(0);
    expect(flightLine.vatAmount).toBe(0);
    expect(flightLine.supplyRole).toBe("agent");
    expect(flightLine.pnr).toBe("EMR889");
    expect(flightLine.ticketNumber).toBe("176-2244668800");

    // Verify Line 2 (Fee)
    const feeLine = fullInvoice.items.find((i: any) => i.description.includes("VIP Concierge"));
    expect(feeLine).toBeDefined();
    expect(feeLine.vatCategory).toBe("STANDARD");
    expect(feeLine.vatRate).toBe(5);
    expect(feeLine.vatAmount).toBe(10); // 5% of 200

    // Verify Line 3 (Hotel)
    const hotelLine = fullInvoice.items.find((i: any) => i.serviceCategory === "hotel");
    expect(hotelLine).toBeDefined();
    expect(hotelLine.vatCategory).toBe("STANDARD");
    expect(hotelLine.vatRate).toBe(5);
    expect(hotelLine.vatAmount).toBe(90); // 5% of 1800

    // Verify Header Totals
    // Subtotal = 3200 + 200 + 1800 = 5200
    // Total VAT = 0 + 10 + 90 = 100
    // Total Invoice = 5300
    expect(fullInvoice.subtotal).toBe(5200);
    expect(fullInvoice.tax).toBe(100);
    expect(fullInvoice.total).toBe(5300);

    // Verify Statutory VAT Breakdown
    const breakdown = fullInvoice.vatBreakdown;
    expect(breakdown).toBeDefined();
    expect(breakdown.standardRated.base).toBe(2000); // 200 + 1800
    expect(breakdown.standardRated.vat).toBe(100);
    expect(breakdown.zeroRated.base).toBe(3200);

    // Clean up created booking & invoice
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } });
    await prisma.journalLine.deleteMany({ where: { journalEntry: { sourceId: invoice.id } } });
    await prisma.journalEntry.deleteMany({ where: { sourceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
    await prisma.bookingService.deleteMany({ where: { bookingId: booking.id } });
    await prisma.booking.delete({ where: { id: booking.id } });
  });
});

async function run() {
  printSuiteSummary();
}
run();
