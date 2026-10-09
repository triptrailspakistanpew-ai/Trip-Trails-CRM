import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export interface CreateNotificationInput {
  recipientId: string;
  type?: "info" | "success" | "warning" | "error";
  title: string;
  body: string;
  entityType?: "lead" | "booking" | "customer_payment" | "customer" | "user" | "expense";
  entityId?: string;
  branchId?: string;
}

export interface AgencyContext {
  agencyId: string;
  branchId?: string;
}

export interface PaginationOptions {
  page: number;
  limit: number;
}

export async function createNotification(ctx: AgencyContext, input: CreateNotificationInput) {
  return prisma.notification.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: input.branchId || ctx.branchId || null,
      recipientId: input.recipientId,
      type: input.type || "info",
      title: input.title,
      body: input.body,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
    },
  });
}

export async function listNotifications(
  ctx: AgencyContext,
  userId: string,
  pagination?: PaginationOptions
) {
  const where = { agencyId: ctx.agencyId, recipientId: userId };

  if (!pagination) {
    const data = await prisma.notification.findMany({
      where,
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    });
    return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
    prisma.notification.count({ where }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function markAsRead(ctx: AgencyContext, userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, agencyId: ctx.agencyId, recipientId: userId },
  });
  if (!notification) throw ApiError.notFound("Notification");
  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(ctx: AgencyContext, userId: string) {
  await prisma.notification.updateMany({
    where: { agencyId: ctx.agencyId, recipientId: userId, isRead: false },
    data: { isRead: true },
  });
  return { success: true };
}

export async function deleteNotification(ctx: AgencyContext, userId: string, notificationId: string) {
  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, agencyId: ctx.agencyId, recipientId: userId },
  });
  if (!notification) throw ApiError.notFound("Notification");
  await prisma.notification.delete({ where: { id: notificationId } });
  return { deleted: true };
}
