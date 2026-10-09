import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import * as creditnoteService from "../services/creditnote.service";
import { AgencyContext, PaginationOptions, DateFilterOptions } from "../services/domain.service";

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

function getDateFilter(req: Request): DateFilterOptions | undefined {
  const from = req.query.from as string | undefined;
  const to = req.query.to as string | undefined;
  if (from || to) {
    return { startDate: from, endDate: to };
  }
  return undefined;
}

export async function listCreditNotes(req: Request, res: Response) {
  const result = await creditnoteService.listCreditNotes(buildContext(req), getPagination(req), getDateFilter(req));
  ApiResponse.success(res, result);
}

export async function getCreditNote(req: Request, res: Response) {
  const creditNote = await creditnoteService.getCreditNote(buildContext(req), req.params.id);
  ApiResponse.success(res, creditNote);
}

export async function createCreditNote(req: Request, res: Response) {
  const creditNote = await creditnoteService.createCreditNote(buildContext(req), req.body, req.user?.id ? String(req.user.id) : "System");
  ApiResponse.created(res, creditNote);
}

export async function applyCreditNote(req: Request, res: Response) {
  const creditNote = await creditnoteService.applyCreditNote(buildContext(req), req.params.id);
  ApiResponse.success(res, creditNote);
}
