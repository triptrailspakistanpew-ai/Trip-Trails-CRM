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
      customer: { select: { firstName: true, lastName: true, email: true, phone: true, companyName: true, address: true, city: true, country: true } },
      booking: { select: { bookingRef: true, departureDate: true, returnDate: true, title: true } },
      items: true,
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
  const booking = await prisma.booking.findFirst({ where: { id: bookingId, agencyId: ctx.agencyId, isDeleted: false } });
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
  });

  const subtotal = services.reduce((sum, s) => sum + s.sellingPrice, 0);
  const totalTax = services.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
  const invoiceRef = await generateRef("INV", ctx.agencyId);

  const invoice = await prisma.invoice.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: booking.branchId,
      invoiceRef,
      bookingId: booking.id,
      customerId: booking.customerId,
      subtotal,
      tax: totalTax,
      total: subtotal + totalTax,
      status: booking.paymentStatus === "paid" ? "paid" : "sent",
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: {
        create: services.map((s) => ({
          agencyId: ctx.agencyId,
          description: `${s.title} (${s.serviceCategory})`,
          quantity: s.quantity,
          unitPrice: s.quantity > 0 ? s.sellingPrice / s.quantity : s.sellingPrice,
          amount: s.sellingPrice,
        })),
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
