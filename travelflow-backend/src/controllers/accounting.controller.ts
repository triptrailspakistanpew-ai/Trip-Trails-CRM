import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import * as accountingService from "../services/accounting.service";
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
  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;
  if (startDate || endDate) {
    return { startDate, endDate };
  }
  return undefined;
}

export async function listJournalEntries(req: Request, res: Response) {
  const result = await accountingService.listJournalEntries(buildContext(req), getPagination(req), getDateFilter(req));
  ApiResponse.success(res, result);
}

export async function getJournalEntry(req: Request, res: Response) {
  const entry = await accountingService.getJournalEntry(buildContext(req), req.params.id);
  ApiResponse.success(res, entry);
}

export async function listChartOfAccounts(req: Request, res: Response) {
  const accounts = await accountingService.listChartOfAccounts(buildContext(req));
  ApiResponse.success(res, accounts);
}

export async function createAccount(req: Request, res: Response) {
  const account = await accountingService.createAccount(buildContext(req), req.body);
  ApiResponse.created(res, account);
}

export async function updateAccount(req: Request, res: Response) {
  const account = await accountingService.updateAccount(buildContext(req), req.params.id, req.body);
  ApiResponse.success(res, account);
}

export async function toggleAccountStatus(req: Request, res: Response) {
  const account = await accountingService.toggleAccountStatus(buildContext(req), req.params.id, req.body.isActive);
  ApiResponse.success(res, account);
}

export async function deleteAccount(req: Request, res: Response) {
  await accountingService.deleteAccount(buildContext(req), req.params.id);
  ApiResponse.success(res, { message: "Account deleted successfully" });
}

export async function confirmSupplierInvoice(req: Request, res: Response) {
  const entry = await accountingService.confirmSupplierInvoice(buildContext(req), req.body);
  ApiResponse.success(res, entry);
}

export async function getAccountBalance(req: Request, res: Response) {
  const balance = await accountingService.getAccountBalance(buildContext(req), req.params.id);
  ApiResponse.success(res, balance);
}

export async function getTrialBalance(req: Request, res: Response) {
  const result = await accountingService.getTrialBalance(buildContext(req));
  ApiResponse.success(res, result);
}

export async function createJournalEntry(req: Request, res: Response) {
  const ctx = buildContext(req);
  const entry = await accountingService.createJournalEntry(ctx, req.body, ctx.callerId || "unknown");
  ApiResponse.created(res, entry);
}

export async function reverseJournalEntry(req: Request, res: Response) {
  const ctx = buildContext(req);
  const entry = await accountingService.reverseJournalEntry(
    ctx,
    req.params.id,
    req.body.reason || "Reversal",
    ctx.callerId || "unknown"
  );
  ApiResponse.success(res, entry);
}

export async function postJournalEntryById(req: Request, res: Response) {
  const ctx = buildContext(req);
  const entry = await accountingService.postJournalEntryById(
    ctx,
    req.params.id,
    ctx.callerId || "unknown"
  );
  ApiResponse.success(res, entry);
}

