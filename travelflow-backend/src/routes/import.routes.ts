/**
 * import.routes.ts — Bulk Import API Routes
 *
 * POST /import/sales     — Import sales/income rows (creates Booking + Invoice + JE)
 * POST /import/expenses  — Import expense rows (creates Expense + JE with VAT split)
 * GET  /import/template/:type — Get expected column headers for 'sales' or 'expenses'
 */

import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { requireRole } from "../middleware/role.middleware";
import * as importController from "../controllers/import.controller";

const router = Router();

// Only admin and manager roles can import data
router.post("/sales", requireRole(["admin", "manager"]), asyncHandler(importController.importSales));
router.post("/expenses", requireRole(["admin", "manager"]), asyncHandler(importController.importExpenses));
router.get("/template/:type", asyncHandler(importController.getImportTemplate));

export default router;
