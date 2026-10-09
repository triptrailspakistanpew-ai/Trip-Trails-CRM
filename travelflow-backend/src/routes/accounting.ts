import { Router } from "express";
import * as accountingController from "../controllers/accounting.controller";
import { requirePermission } from "../middleware/role.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post("/journal-entries", requirePermission("Accounting: Journal"), asyncHandler(accountingController.createJournalEntry));
router.get("/journal-entries", requirePermission("Accounting: Journal"), asyncHandler(accountingController.listJournalEntries));
router.get("/journal-entries/:id", requirePermission("Accounting: Journal"), asyncHandler(accountingController.getJournalEntry));
router.post("/journal-entries/:id/reverse", requirePermission("Accounting: Journal"), asyncHandler(accountingController.reverseJournalEntry));
router.post("/journal-entries/:id/post", requirePermission("Accounting: Journal"), asyncHandler(accountingController.postJournalEntryById));
router.get("/accounts", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.listChartOfAccounts));
router.post("/accounts", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.createAccount));
router.put("/accounts/:id", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.updateAccount));
router.patch("/accounts/:id/status", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.toggleAccountStatus));
router.delete("/accounts/:id", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.deleteAccount));
router.get("/accounts/:id/balance", requirePermission("Accounting: Chart of Accounts"), asyncHandler(accountingController.getAccountBalance));
router.post("/supplier-invoices/confirm", requirePermission("Accounting: Journal"), asyncHandler(accountingController.confirmSupplierInvoice));
router.get("/trial-balance", requirePermission("Accounting: Ledger"), asyncHandler(accountingController.getTrialBalance));

export default router;

