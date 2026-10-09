import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import * as paymentScheduleService from "../services/payment-schedule.service";
import { AgencyContext } from "../services/domain.service";

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

export async function listPaymentSchedules(req: Request, res: Response) {
  const bookingId = req.query.bookingId as string | undefined;
  const result = await paymentScheduleService.listPaymentSchedules(buildContext(req), bookingId);
  ApiResponse.success(res, result);
}

export async function getPaymentSchedule(req: Request, res: Response) {
  const schedule = await paymentScheduleService.getPaymentSchedule(buildContext(req), req.params.id);
  ApiResponse.success(res, schedule);
}

export async function createPaymentSchedule(req: Request, res: Response) {
  const schedule = await paymentScheduleService.createPaymentSchedule(
    buildContext(req),
    req.body,
    req.user?.id ? String(req.user.id) : "System"
  );
  ApiResponse.created(res, schedule);
}

export async function updateScheduleItemStatus(req: Request, res: Response) {
  const schedule = await paymentScheduleService.updateScheduleItemStatus(
    buildContext(req),
    req.params.itemId,
    req.body
  );
  ApiResponse.success(res, schedule);
}

export async function deletePaymentSchedule(req: Request, res: Response) {
  await paymentScheduleService.deletePaymentSchedule(buildContext(req), req.params.id);
  ApiResponse.success(res, { deleted: true });
}
