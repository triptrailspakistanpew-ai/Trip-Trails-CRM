import { prisma } from "../lib/prisma";
import { AgencyContext, PaginationOptions, agencyScope } from "./domain.service";
import { generateRef } from "../utils/refGenerator";
import { ApiError } from "../utils/ApiError";
import { postInvoiceJournal, reverseJournalEntry } from "./accounting.service";

export async function listInvoices(ctx: AgencyContext, pagination?: PaginationOptions) {
  const filter: any = agencyScope(ctx);

  if (!pagination) {
    const data = await prisma.invoice.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: { customer: { select: { firstName: true, lastName: true, email: true, phone: true, companyName: true } }, booking: { select: { bookingRef: true } } },
    });
    return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.invoice.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: { customer: { select: { firstName: true, lastName: true, email: true, phone: true, companyName: true } }, booking: { select: { bookingRef: true } } },
    }),
    prisma.invoice.count({ where: filter }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getInvoice(ctx: AgencyContext, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { agencyId: ctx.agencyId, id },
    include: {
      customer: { select: { firstName: true, lastName: true, email: true, phone: true, companyName: true, address: true, city: true, country: true, taxNumber: true } },
      booking: { 
        select: { 
          bookingRef: true, 
          departureDate: true, 
          returnDate: true, 
          title: true, 
          travelers: {
            where: { isDeleted: false },
            select: { firstName: true, lastName: true, type: true, passportNumber: true }
          }
        } 
      },
      items: {
        orderBy: { createdAt: "asc" }
      },
    },
  });

  if (!invoice) throw ApiError.notFound("Invoice");

  let branchManager = invoice.branchId
    ? await prisma.user.findFirst({
        where: { agencyId: ctx.agencyId, branchId: invoice.branchId, role: { in: ["manager", "branch_manager", "admin"] } },
      })
    : null;

  if (!branchManager) {
    branchManager = await prisma.user.findFirst({ where: { agencyId: ctx.agencyId, role: "admin" } });
  }

  const managerContact = branchManager
    ? { name: `${branchManager.firstName} ${branchManager.lastName}`, phone: branchManager.phone, email: branchManager.email }
    : null;

  return { ...invoice, managerContact };
}

export async function generateInvoiceFromBooking(ctx: AgencyContext, bookingId: string) {
  const booking = await prisma.booking.findFirst({ 
    where: { id: bookingId, agencyId: ctx.agencyId, isDeleted: false },
    include: {
      travelers: { where: { isDeleted: false } },
      customer: true
    }
  });
  if (!booking) throw ApiError.notFound("Booking");

  // Prevent duplicate active invoice for the same booking
  const existingInvoice = await prisma.invoice.findFirst({
    where: {
      bookingId: booking.id,
      agencyId: ctx.agencyId,
      isDeleted: false,
      status: { not: "cancelled" },
    },
  });
  if (existingInvoice) {
    throw ApiError.conflict(`An active invoice (${existingInvoice.invoiceRef}) already exists for this booking.`);
  }

  const services = await prisma.bookingService.findMany({
    where: { bookingId: booking.id, agencyId: ctx.agencyId, isDeleted: false },
    include: { supplier: true }
  });

  // Calculate Mixed VAT and items
  const passengerNames = (booking.travelers || []).map(t => `${t.firstName} ${t.lastName}`.trim()).filter(Boolean);

  let subtotal = 0;
  let totalDiscount = 0;
  let totalTaxable = 0;
  let totalTax = 0;

  const vatBreakdown = {
    standardRated: { base: 0, vat: 0, rate: 5 },
    zeroRated: { base: 0, vat: 0 },
    exempt: { base: 0, vat: 0 },
    outOfScope: { base: 0, vat: 0 },
  };

  const invoiceLinesData = services.map((s) => {
    const qty = s.quantity > 0 ? s.quantity : 1;
    const grossAmount = Number(s.sellingPrice || 0);
    const unitPrice = qty > 0 ? grossAmount / qty : grossAmount;
    const lineDiscount = 0;
    const netAmount = grossAmount - lineDiscount;

    // Map service tax treatment to standard 4 VAT categories
    let vatCategory = "STANDARD";
    let vatRate = 5;

    const treatment = (s.taxTreatment || "").toUpperCase();
    if (treatment === "ZERO_RATED" || s.serviceCategory === "flight") {
      vatCategory = "ZERO_RATED";
      vatRate = 0;
    } else if (treatment === "EXEMPT") {
      vatCategory = "EXEMPT";
      vatRate = 0;
    } else if (treatment === "NO_VAT" || treatment === "OUT_OF_SCOPE") {
      vatCategory = "OUT_OF_SCOPE";
      vatRate = 0;
    } else {
      vatCategory = "STANDARD";
      vatRate = s.vatRate !== undefined && s.vatRate !== null ? Number(s.vatRate) : 5;
    }

    const vatAmount = Number(s.taxAmount || (netAmount * (vatRate / 100)));
    const totalAmount = netAmount + vatAmount;

    subtotal += grossAmount;
    totalDiscount += lineDiscount;
    totalTaxable += netAmount;
    totalTax += vatAmount;

    if (vatCategory === "STANDARD") {
      vatBreakdown.standardRated.base += netAmount;
      vatBreakdown.standardRated.vat += vatAmount;
    } else if (vatCategory === "ZERO_RATED") {
      vatBreakdown.zeroRated.base += netAmount;
    } else if (vatCategory === "EXEMPT") {
      vatBreakdown.exempt.base += netAmount;
    } else {
      vatBreakdown.outOfScope.base += netAmount;
    }

    const svcDetails: any = s.serviceDetails || {};
    const supplyRole = (s.serviceCategory === "flight" || s.serviceCategory === "visa") ? "agent" : "principal";

    return {
      agencyId: ctx.agencyId,
      serviceCategory: s.serviceCategory || "other",
      description: `${s.title} (${s.serviceCategory})`,
      supplyRole,
      quantity: qty,
      unitPrice,
      amount: grossAmount,
      discountAmount: lineDiscount,
      netAmount,
      vatCategory,
      vatRate,
      vatAmount,
      totalAmount,
      passengerNames,
      pnr: svcDetails.pnr || null,
      ticketNumber: svcDetails.ticketNumber || null,
      route: svcDetails.route || (svcDetails.departure && svcDetails.arrival ? `${svcDetails.departure} - ${svcDetails.arrival}` : null),
      travelStartDate: svcDetails.travelDate || booking.departureDate || null,
      travelEndDate: svcDetails.returnDate || booking.returnDate || null,
      hotelName: (svcDetails.hotelName && svcDetails.hotelName !== s.title) ? svcDetails.hotelName : null,
      supplierRef: s.supplierRef || (s.supplier ? s.supplier.name : null),
      supplierCost: s.costPrice || null, // hidden internally
      isServiceFee: false,
    };
  });

  const invoiceRef = await generateRef("INV", ctx.agencyId);

  const [defaultInvoiceNotes, defaultInvoiceTerms] = await Promise.all([
    (prisma.template as any).findFirst({
      where: { agencyId: ctx.agencyId, type: "invoice_notes", isDefault: true, isDeleted: false },
    }),
    (prisma.template as any).findFirst({
      where: { agencyId: ctx.agencyId, type: "invoice_terms", isDefault: true, isDeleted: false },
    }),
  ]);

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: booking.branchId,
      invoiceRef,
      invoiceType: "TAX_INVOICE",
      bookingId: booking.id,
      customerId: booking.customerId,
      supplyDate: booking.departureDate || new Date(),
      customerTrn: (booking.customer as any)?.taxNumber || (booking.customer as any)?.taxId || null,
      subtotal,
      discount: totalDiscount,
      taxableAmount: totalTaxable,
      tax: totalTax,
      total: totalTaxable + totalTax,
      vatBreakdown: vatBreakdown as any,
      notes: booking.notes || defaultInvoiceNotes?.content || null,
      terms: booking.terms || defaultInvoiceTerms?.content || null,
      status: booking.paymentStatus === "paid" ? "paid" : "sent",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: invoiceLinesData,
      },
    },
  });

  // Post invoice journal atomically — do not swallow errors
  try {
    await postInvoiceJournal(ctx, invoice.id);
  } catch (err: any) {
    await prisma.invoiceLine.deleteMany({ where: { invoiceId: invoice.id } }).catch(() => {});
    await prisma.invoice.delete({ where: { id: invoice.id } }).catch(() => {});
    throw ApiError.internal(`Failed to post invoice journal: ${err?.message || err}`);
  }

  return invoice;
}

export async function cancelInvoice(
  ctx: AgencyContext,
  id: string,
  reason = "Invoice cancelled",
  userId?: string
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!invoice) throw ApiError.notFound("Invoice");
  if (invoice.status === "cancelled") {
    throw ApiError.badRequest("Invoice is already cancelled");
  }

  // Find posted journal entry if any and reverse it
  const je = await prisma.journalEntry.findFirst({
    where: {
      agencyId: ctx.agencyId,
      sourceModule: "INVOICE",
      sourceId: invoice.id,
      status: "POSTED",
    },
  });

  if (je) {
    await reverseJournalEntry(
      ctx,
      je.id,
      `Invoice Cancellation: ${reason}`,
      userId || ctx.callerId || "system"
    );
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { status: "cancelled" },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: invoice.branchId || undefined,
      type: "INVOICE_CANCELLED",
      title: "Invoice Cancelled",
      detail: `Invoice ${invoice.invoiceRef} cancelled. Reason: ${reason}. Reversing JE: ${je ? "Posted" : "None"}`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: userId || ctx.callerId || undefined,
    },
  }).catch(() => {});

  return updated;
}

export async function updateInvoiceStatus(ctx: AgencyContext, id: string, status: string) {
  const validStatuses = ["draft", "sent", "paid", "overdue", "cancelled"];
  if (!validStatuses.includes(status)) {
    throw ApiError.badRequest(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  if (status === "cancelled") {
    return cancelInvoice(ctx, id);
  }

  const invoice = await prisma.invoice.findFirst({ where: { id, agencyId: ctx.agencyId, isDeleted: false } });
  if (!invoice) throw ApiError.notFound("Invoice");

  const updateData: any = { status };
  if (status === "paid") {
    updateData.paidAt = new Date();
  }

  return prisma.invoice.update({ where: { id }, data: updateData });
}

export async function markInvoicePaid(ctx: AgencyContext, id: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id, agencyId: ctx.agencyId } });
  if (!invoice) throw ApiError.notFound("Invoice");
  return prisma.invoice.update({ where: { id }, data: { status: "paid", paidAt: new Date() } });
}

export async function updateInvoice(ctx: AgencyContext, id: string, data: { notes?: string; terms?: string; dueDate?: string; tax?: number }) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!invoice) throw ApiError.notFound("Invoice");

  const updated = await prisma.invoice.update({
    where: { id },
    data: {
      ...(data.notes !== undefined && { notes: data.notes }),
      ...(data.terms !== undefined && { terms: data.terms }),
      ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
      ...(data.tax !== undefined && { tax: data.tax, total: invoice.subtotal + data.tax }),
    },
  });
  return updated;
}

export async function deleteInvoice(ctx: AgencyContext, id: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!invoice) throw ApiError.notFound("Invoice");

  const creditNotes = await prisma.creditNote.count({
    where: { invoiceId: id, agencyId: ctx.agencyId, isDeleted: false, status: { in: ["issued", "applied"] } },
  });
  if (creditNotes > 0) throw ApiError.badRequest("Cannot delete invoice with active credit notes");

  await prisma.invoice.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  return { success: true };
}
