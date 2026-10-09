import { prisma } from "../lib/prisma";
import { AgencyContext } from "./domain.service";
import { ApiError } from "../utils/ApiError";

interface CreateScheduleInput {
  bookingId: string;
  title: string;
  totalAmount: number;
  notes?: string;
  items: { label: string; amount: number; dueDate: string }[];
}

interface UpdateItemStatusInput {
  status: string;
  customerPaymentId?: string;
}

export async function listPaymentSchedules(ctx: AgencyContext, bookingId?: string) {
  const where: any = { agencyId: ctx.agencyId, isDeleted: false };
  if (bookingId) where.bookingId = bookingId;

  return prisma.paymentSchedule.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      items: { orderBy: { dueDate: "asc" } },
      booking: { select: { bookingRef: true } },
    },
  });
}

export async function getPaymentSchedule(ctx: AgencyContext, id: string) {
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
    include: {
      items: { orderBy: { dueDate: "asc" } },
      booking: { select: { bookingRef: true } },
    },
  });

  if (!schedule) throw ApiError.notFound("PaymentSchedule");
  return schedule;
}

export async function createPaymentSchedule(ctx: AgencyContext, data: CreateScheduleInput, actor: string) {
  const booking = await prisma.booking.findFirst({
    where: { id: data.bookingId, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!booking) throw ApiError.notFound("Booking");

  if (!data.items || data.items.length === 0) {
    throw ApiError.badRequest("At least one schedule item is required");
  }

  const itemsTotal = data.items.reduce((sum, item) => sum + item.amount, 0);
  if (Math.abs(itemsTotal - data.totalAmount) > 0.01) {
    throw ApiError.badRequest("Sum of item amounts must equal totalAmount");
  }

  const result = await prisma.$transaction(async (tx) => {
    const schedule = await tx.paymentSchedule.create({
      data: {
        agencyId: ctx.agencyId,
        bookingId: data.bookingId,
        title: data.title,
        totalAmount: data.totalAmount,
        status: "active",
        notes: data.notes || null,
      },
    });

    await tx.paymentScheduleItem.createMany({
      data: data.items.map((item) => ({
        agencyId: ctx.agencyId,
        scheduleId: schedule.id,
        label: item.label,
        amount: item.amount,
        dueDate: new Date(item.dueDate),
        status: "pending",
      })),
    });

    return tx.paymentSchedule.findUnique({
      where: { id: schedule.id },
      include: {
        items: { orderBy: { dueDate: "asc" } },
        booking: { select: { bookingRef: true } },
      },
    });
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      type: "payment_schedule",
      title: "Payment schedule created",
      detail: `Schedule "${data.title}" created for Rs ${data.totalAmount.toLocaleString()}`,
      createdBy: actor,
    },
  });

  return result;
}

export async function updateScheduleItemStatus(
  ctx: AgencyContext,
  itemId: string,
  data: UpdateItemStatusInput
) {
  const item = await prisma.paymentScheduleItem.findFirst({
    where: { id: itemId, agencyId: ctx.agencyId },
    include: { schedule: true },
  });
  if (!item) throw ApiError.notFound("PaymentScheduleItem");

  const updateData: any = { status: data.status };
  if (data.status === "paid") {
    updateData.paidAt = new Date();
    if (data.customerPaymentId) {
      updateData.customerPaymentId = data.customerPaymentId;
    }
  }

  await prisma.paymentScheduleItem.update({
    where: { id: itemId },
    data: updateData,
  });

  if (data.status === "paid") {
    const allItems = await prisma.paymentScheduleItem.findMany({
      where: { scheduleId: item.scheduleId },
    });
    const allPaid = allItems.every(
      (i) => i.id === itemId || i.status === "paid"
    );
    if (allPaid) {
      await prisma.paymentSchedule.update({
        where: { id: item.scheduleId },
        data: { status: "completed" },
      });
    }
  }

  return prisma.paymentSchedule.findUnique({
    where: { id: item.scheduleId },
    include: {
      items: { orderBy: { dueDate: "asc" } },
      booking: { select: { bookingRef: true } },
    },
  });
}

export async function deletePaymentSchedule(ctx: AgencyContext, id: string) {
  const schedule = await prisma.paymentSchedule.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!schedule) throw ApiError.notFound("PaymentSchedule");

  return prisma.paymentSchedule.update({
    where: { id },
    data: { isDeleted: true, deletedAt: new Date() },
  });
}
