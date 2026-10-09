import { describe, it, expect, printSuiteSummary } from "./test_harness";
import { prisma } from "../src/lib/prisma";
import { calculateServiceFinancials } from "../src/lib/financial-calculator";
import { createBooking, updateBooking } from "../src/services/domain.service";
import { generateInvoiceFromBooking } from "../src/services/invoice.service";
import { convertQuotationToBooking } from "../src/services/quotation.service";
import { generateRef } from "../src/utils/refGenerator";

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001";
const ctx = {
  agencyId: AGENCY_ID,
  callerRole: "admin",
  callerId: "22222222-2222-2222-2222-222222222201",
  isSuperAdmin: false,
};

describe("P0.4 — Quantity / Price Model Single Source of Truth", () => {
  it("calculateServiceFinancials: single source of truth for Qty 1, Qty 2, Qty 5", async () => {
    // Qty 1
    const fin1 = calculateServiceFinancials({
      unitCost: 1000,
      unitSellingPrice: 1500,
      quantity: 1,
      taxTreatment: "VAT_ON_MARGIN",
      vatRate: 5,
    });
    expect(fin1.quantity).toBe(1);
    expect(fin1.lineCost).toBe(1000);
    expect(fin1.lineSelling).toBe(1500);
    expect(fin1.expectedMargin).toBe(500);
    expect(fin1.taxBase).toBe(500);
    expect(fin1.taxAmount).toBe(25);
    expect(fin1.customerTotal).toBe(1525);

    // Qty 2 (The 50% underbilling fix)
    const fin2 = calculateServiceFinancials({
      costPrice: 1000,
      sellingPrice: 1500,
      quantity: 2,
      taxTreatment: "VAT_ON_MARGIN",
      vatRate: 5,
    });
    expect(fin2.quantity).toBe(2);
    expect(fin2.lineCost).toBe(2000);
    expect(fin2.lineSelling).toBe(3000);
    expect(fin2.expectedMargin).toBe(1000);
    expect(fin2.taxBase).toBe(1000);
    expect(fin2.taxAmount).toBe(50);
    expect(fin2.customerTotal).toBe(3050);

    // Qty 5
    const fin5 = calculateServiceFinancials({
      unitCost: 200,
      unitSellingPrice: 350,
      quantity: 5,
      taxTreatment: "VAT_ON_MARGIN",
      vatRate: 5,
    });
    expect(fin5.quantity).toBe(5);
    expect(fin5.lineCost).toBe(1000);
    expect(fin5.lineSelling).toBe(1750);
    expect(fin5.expectedMargin).toBe(750);
    expect(fin5.taxAmount).toBe(37.5);
    expect(fin5.customerTotal).toBe(1787.5);
  });

async function getOrCreateCustomer() {
  let customer = await prisma.customer.findFirst({ where: { agencyId: AGENCY_ID } });
  if (!customer) {
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID } });
    customer = await prisma.customer.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch?.id || "11111111-1111-1111-1111-111111111101",
        customerRef: "CUS-TEST04",
        type: "individual",
        firstName: "Test",
        lastName: "Customer",
        phone: "+971501234567",
      },
    });
  }
  return customer;
}

  it("createBooking with 2 pax saves full line totals and generates accurate invoice", async () => {
    const customer = await getOrCreateCustomer();
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });

    const booking = await createBooking(
      ctx,
      {
        customerId: customer.id,
        branchId: branch!.id,
        title: "2 Pax Umrah Package",
        departureDate: new Date(),
        bookingStatus: "confirmed",
        services: [
          {
            serviceCategory: "package",
            title: "Executive Umrah Visa & Hotel",
            costPrice: 1000, // Unit cost
            sellingPrice: 1500, // Unit selling
            quantity: 2,
            vatRate: 5,
            taxTreatment: "VAT_ON_MARGIN",
          } as any,
        ],
      } as any,
      ctx.callerId,
      "Admin User"
    );

    const createdService = booking.services[0];
    expect(createdService.quantity).toBe(2);
    expect(createdService.costPrice).toBe(2000); // 1000 * 2
    expect(createdService.sellingPrice).toBe(3000); // 1500 * 2
    expect(createdService.expectedMargin).toBe(1000);
    expect(createdService.taxAmount).toBe(50);
    expect(createdService.customerTotal).toBe(3050);

    // Generate invoice from booking: must be billed for 3,050 (NOT 1,525!)
    const invoice = await generateInvoiceFromBooking(ctx, booking.id);
    expect(invoice.subtotal).toBe(3000);
    expect(invoice.tax).toBe(50);
    expect(invoice.total).toBe(3050);

    // Verify invoice items
    const invoiceItems = await prisma.invoiceLine.findMany({
      where: { invoiceId: invoice.id },
    });
    expect(invoiceItems.length).toBe(1);
    expect(invoiceItems[0].quantity).toBe(2);
    expect(invoiceItems[0].unitPrice).toBe(1500);
    expect(invoiceItems[0].amount).toBe(3000);
  });

  it("updateBooking correctly recalculates financials when quantity changes", async () => {
    const customer = await getOrCreateCustomer();
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });

    // Initial booking with qty 1
    const booking = await createBooking(
      ctx,
      {
        customerId: customer.id,
        branchId: branch!.id,
        title: "Flight Booking",
        departureDate: new Date(),
        services: [
          {
            serviceCategory: "flight",
            title: "DXB to LHE Return",
            costPrice: 800,
            sellingPrice: 1200,
            quantity: 1,
            vatRate: 5,
            taxTreatment: "VAT_ON_MARGIN",
          } as any,
        ],
      } as any,
      ctx.callerId,
      "Admin User"
    );

    expect(booking.services[0].costPrice).toBe(800);
    expect(booking.services[0].sellingPrice).toBe(1200);

    // Update quantity to 3
    const updated = await updateBooking(
      ctx,
      booking.id,
      {
        services: [
          {
            id: booking.services[0].id,
            serviceCategory: "flight",
            title: "DXB to LHE Return",
            costPrice: 800,
            sellingPrice: 1200,
            quantity: 3,
            vatRate: 5,
            taxTreatment: "VAT_ON_MARGIN",
          } as any,
        ],
      } as any,
      "Admin User"
    );

    const updatedService = updated!.services[0];
    expect(updatedService.quantity).toBe(3);
    expect(updatedService.costPrice).toBe(2400); // 800 * 3
    expect(updatedService.sellingPrice).toBe(3600); // 1200 * 3
    expect(updatedService.expectedMargin).toBe(1200); // 3600 - 2400
    expect(updatedService.taxAmount).toBe(60); // 1200 * 5%
    expect(updatedService.customerTotal).toBe(3660);
  });

  it("convertQuotationToBooking produces identical financial output for multi-quantity items", async () => {
    const customer = await getOrCreateCustomer();
    const branch = await prisma.branch.findFirst({ where: { agencyId: AGENCY_ID, isHeadOffice: true } });
    const quotationRef = await generateRef("QT", AGENCY_ID);

    // Create test quotation with multi-quantity items
    const quotation = await prisma.quotation.create({
      data: {
        agencyId: AGENCY_ID,
        branchId: branch!.id,
        quotationNumber: quotationRef,
        customerId: customer.id,
        consultantId: ctx.callerId,
        title: "Family Vacation Quote",
        travelType: "leisure",
        destination: "Maldives",
        status: "accepted",
        subtotal: 1800,
        agencyFee: 0,
        discount: 0,
        taxTotal: 30,
        total: 1830,
        estimatedProfit: 600,
        items: {
          create: [
            {
              agencyId: AGENCY_ID,
              title: "Deluxe Resort Stay",
              serviceCategory: "hotel",
              quantity: 4,
              costPrice: 300, // Unit cost
              sellingPrice: 450, // Unit selling
              total: 1800,
            },
          ],
        },
        taxes: {
          create: [
            {
              agencyId: AGENCY_ID,
              taxName: "VAT",
              taxType: "percentage",
              taxValue: 5,
              taxAmount: 30,
            },
          ],
        },
      },
      include: { items: true, taxes: true },
    });

    const booking = await convertQuotationToBooking(ctx, quotation.id);
    expect(booking).toBeDefined();

    const bookingServices = await prisma.bookingService.findMany({
      where: { bookingId: booking.id },
    });

    expect(bookingServices.length).toBe(1);
    const svc = bookingServices[0];
    expect(svc.quantity).toBe(4);
    expect(svc.costPrice).toBe(1200); // 300 * 4
    expect(svc.sellingPrice).toBe(1800); // 450 * 4
    expect(svc.expectedMargin).toBe(600); // 1800 - 1200
    expect(svc.taxAmount).toBe(30); // 600 * 5%
    expect(svc.customerTotal).toBe(1830);
  });
});

async function run() {
  await printSuiteSummary();
  await prisma.$disconnect();
}

run();
