/**
 * import.controller.ts — Bulk Import Controller
 *
 * Handles POST /api/import/sales and POST /api/import/expenses
 */

import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { importSalesRows, importExpenseRows } from "../services/import.service";
import type { SalesImportRow, ExpenseImportRow } from "../services/import.service";

function buildContext(req: Request) {
  const user = (req as any).user;
  return {
    agencyId: ((req as any).agencyId || user?.agencyId) as string,
    branchId: ((req as any).branchId || user?.branchId) as string,
    callerId: ((req as any).userId || user?.id) as string,
    callerRole: ((req as any).userRole || user?.role) as string,
  };
}

export async function importSales(req: Request, res: Response) {
  const ctx = buildContext(req);
  const { rows, branchId, customerName } = req.body as {
    rows: SalesImportRow[];
    branchId?: string;
    customerName?: string;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "No rows provided" });
  }

  let targetBranchId = branchId || (req.query.branchId as string) || ctx.branchId;

  if (!targetBranchId || targetBranchId === "all" || targetBranchId === "undefined") {
    const firstBranch = await prisma.branch.findFirst({ where: { agencyId: ctx.agencyId, isDeleted: false } });
    if (!firstBranch) {
      return res.status(400).json({ success: false, message: "No active branch found in agency" });
    }
    targetBranchId = firstBranch.id;
  } else {
    const branchRecord = await prisma.branch.findFirst({
      where: { id: targetBranchId, agencyId: ctx.agencyId, isDeleted: false },
    });
    if (!branchRecord) {
      const fallback = await prisma.branch.findFirst({ where: { agencyId: ctx.agencyId, isDeleted: false } });
      if (fallback) targetBranchId = fallback.id;
    }
  }

  const result = await importSalesRows(ctx, targetBranchId, rows, customerName);

  res.status(result.success ? 200 : 207).json({
    success: result.success,
    data: result,
  });
}

export async function importExpenses(req: Request, res: Response) {
  const ctx = buildContext(req);
  const { rows, branchId } = req.body as {
    rows: ExpenseImportRow[];
    branchId?: string;
  };

  if (!rows || !Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ success: false, message: "No rows provided" });
  }

  let targetBranchId = branchId || (req.query.branchId as string) || ctx.branchId;

  if (!targetBranchId || targetBranchId === "all" || targetBranchId === "undefined") {
    const firstBranch = await prisma.branch.findFirst({ where: { agencyId: ctx.agencyId, isDeleted: false } });
    if (!firstBranch) {
      return res.status(400).json({ success: false, message: "No active branch found in agency" });
    }
    targetBranchId = firstBranch.id;
  } else {
    const branchRecord = await prisma.branch.findFirst({
      where: { id: targetBranchId, agencyId: ctx.agencyId, isDeleted: false },
    });
    if (!branchRecord) {
      const fallback = await prisma.branch.findFirst({ where: { agencyId: ctx.agencyId, isDeleted: false } });
      if (fallback) targetBranchId = fallback.id;
    }
  }

  const result = await importExpenseRows(ctx, targetBranchId, rows);

  res.status(result.success ? 200 : 207).json({
    success: result.success,
    data: result,
  });
}

/**
 * Return the expected column headers for a given import type.
 */
export async function getImportTemplate(req: Request, res: Response) {
  const { type } = req.params;

  if (type === "sales") {
    return res.json({
      success: true,
      data: {
        type: "sales",
        columns: [
          { key: "date", label: "Date", required: true, example: "01-Aug-2024" },
          { key: "description", label: "Description", required: true, example: "Dubai Visit Visa - Client Name" },
          { key: "invoiceNo", label: "Invoice No.", required: false, example: "INV-0001" },
          { key: "serviceType", label: "Service Type", required: true, example: "Dubai Visit Visa" },
          { key: "supplier", label: "Supplier", required: false, example: "ABC Trading Suppliers" },
          { key: "supplierRef", label: "Supplier Ref.", required: false, example: "SUP-TVA-0001" },
          { key: "costPrice", label: "Cost Price", required: true, example: "2075" },
          { key: "sellingPrice", label: "Selling Price", required: true, example: "2500" },
          { key: "customerName", label: "Customer Name", required: false, example: "John Smith" },
          { key: "status", label: "Status", required: false, example: "Matched (Stage A - Exact)" },
        ],
      },
    });
  }

  if (type === "expenses") {
    return res.json({
      success: true,
      data: {
        type: "expenses",
        columns: [
          { key: "date", label: "Date", required: true, example: "01-Aug-2024" },
          { key: "description", label: "Description", required: true, example: "Office telephone bill Aug 2024" },
          { key: "invoiceNo", label: "Invoice No.", required: false, example: "EXP-0001" },
          { key: "category", label: "Category", required: true, example: "Telephone/Mobile" },
          { key: "supplier", label: "Supplier", required: false, example: "ABC Trading Suppliers" },
          { key: "supplierRef", label: "Supplier Ref.", required: false, example: "SUP-TEL-0001" },
          { key: "amountPaid", label: "Amount Paid", required: true, example: "55.00" },
          { key: "vatTreatment", label: "VAT Treatment", required: false, example: "Recoverable (assumed)" },
          { key: "paymentMethod", label: "Payment Method", required: false, example: "bank_transfer" },
        ],
      },
    });
  }

  res.status(400).json({ success: false, message: `Unknown template type: ${type}. Use 'sales' or 'expenses'.` });
}
