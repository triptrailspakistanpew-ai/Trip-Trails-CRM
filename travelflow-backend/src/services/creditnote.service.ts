import { prisma } from "../lib/prisma";
import {
  AgencyContext,
  PaginationOptions,
  DateFilterOptions,
  applyDateFilter,
  agencyScope,
} from "./domain.service";
import { ApiError } from "../utils/ApiError";
import { generateRef } from "../utils/refGenerator";
import { postCreditNoteJournal } from "./accounting.service";

interface CreateCreditNoteInput {
  invoiceId: string;
  amount: number;
  reason: string;
  notes?: string;
  bookingId?: string;
}

export async function listCreditNotes(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates);

  if (!pagination) {
    const data = await prisma.creditNote.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { firstName: true, lastName: true } },
        invoice: { select: { invoiceRef: true } },
        booking: { select: { bookingRef: true } },
      },
    });
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.creditNote.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: { select: { firstName: true, lastName: true } },
        invoice: { select: { invoiceRef: true } },
        booking: { select: { bookingRef: true } },
      },
    }),
    prisma.creditNote.count({ where: filter }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCreditNote(ctx: AgencyContext, id: string) {
  const creditNote = await prisma.creditNote.findFirst({
    where: { agencyId: ctx.agencyId, id, isDeleted: false },
    include: {
      customer: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          companyName: true,
        },
      },
      invoice: { select: { invoiceRef: true, total: true } },
      booking: { select: { bookingRef: true } },
    },
  });

  if (!creditNote) throw ApiError.notFound("CreditNote");
  return creditNote;
}

export async function createCreditNote(
  ctx: AgencyContext,
  data: CreateCreditNoteInput,
  actor: string,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!invoice) throw ApiError.notFound("Invoice");

  if (data.amount <= 0) {
    throw ApiError.badRequest("Credit note amount must be greater than zero");
  }

  const existingCredits = await prisma.creditNote.aggregate({
    where: {
      invoiceId: data.invoiceId,
      agencyId: ctx.agencyId,
      status: { in: ["issued", "applied"] },
      isDeleted: false,
    },
    _sum: { amount: true },
  });

  const totalCredited = existingCredits._sum.amount || 0;
  if (totalCredited + data.amount > invoice.total) {
    throw ApiError.badRequest(
      "Credit note amount exceeds remaining invoice balance",
    );
  }

  const creditNoteRef = await generateRef("CN", ctx.agencyId);

  const creditNote = await prisma.creditNote.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: invoice.branchId,
      creditNoteRef,
      invoiceId: data.invoiceId,
      customerId: invoice.customerId,
      bookingId: data.bookingId || invoice.bookingId,
      amount: data.amount,
      reason: data.reason,
      status: "issued",
      notes: data.notes || null,
    },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      invoice: { select: { invoiceRef: true } },
      booking: { select: { bookingRef: true } },
    },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      type: "credit_note",
      title: "Credit note issued",
      detail: `Credit note ${creditNoteRef} created for ${data.amount.toLocaleString()}`,
      createdBy: actor,
    },
  });

  try {
    await postCreditNoteJournal(ctx, creditNote.id);
  } catch (e) {
    console.error("Failed to post credit note journal", e);
  }

  return creditNote;
}

export async function applyCreditNote(ctx: AgencyContext, id: string) {
  const creditNote = await prisma.creditNote.findFirst({
    where: { agencyId: ctx.agencyId, id, isDeleted: false },
  });
  if (!creditNote) throw ApiError.notFound("CreditNote");

  if (creditNote.status !== "issued") {
    throw ApiError.badRequest(
      `Credit note cannot be applied (current status: ${creditNote.status})`,
    );
  }

  const updated = await prisma.creditNote.update({
    where: { id },
    data: { status: "applied", appliedAt: new Date() },
    include: {
      customer: { select: { firstName: true, lastName: true } },
      invoice: { select: { invoiceRef: true } },
      booking: { select: { bookingRef: true } },
    },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      type: "credit_note",
      title: "Credit note applied",
      detail: `Credit note ${creditNote.creditNoteRef} applied`,
      createdBy: "System",
    },
  });

  return updated;
}
