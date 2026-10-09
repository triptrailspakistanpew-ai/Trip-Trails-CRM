import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import * as notificationService from "../services/notification.service";
import { AgencyContext, PaginationOptions } from "../services/domain.service";

function buildContext(req: Request): AgencyContext {
  return {
    agencyId: req.agencyId!,
    branchId: req.query.branchId as string | undefined,
    userRole: req.user?.role,
    userBranchId: req.user?.branchId ? String(req.user.branchId) : undefined,
    callerId: req.user?.id ? String(req.user.id) : undefined,
    callerRole: req.user?.role,
  };
}

function getPagination(req: Request): PaginationOptions | undefined {
  const page = parseInt(req.query.page as string, 10);
  const limit = parseInt(req.query.limit as string, 10);
  if (!isNaN(page) && !isNaN(limit)) {
    return { page, limit };
  }
  return undefined;
}

export async function listNotifications(req: Request, res: Response) {
  const userId = String(req.user!.id);
  const result = await notificationService.listNotifications(
    buildContext(req),
    userId,
    getPagination(req)
  );
  ApiResponse.success(res, result);
}

export async function markAsRead(req: Request, res: Response) {
  const userId = String(req.user!.id);
  const result = await notificationService.markAsRead(
    buildContext(req),
    userId,
    req.params.id
  );
  ApiResponse.success(res, result);
}

export async function markAllAsRead(req: Request, res: Response) {
  const userId = String(req.user!.id);
  const result = await notificationService.markAllAsRead(buildContext(req), userId);
  ApiResponse.success(res, result);
}

export async function deleteNotification(req: Request, res: Response) {
  const userId = String(req.user!.id);
  const result = await notificationService.deleteNotification(
    buildContext(req),
    userId,
    req.params.id
  );
  ApiResponse.success(res, result);
}
