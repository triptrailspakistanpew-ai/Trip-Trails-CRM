import { Router } from "express";
import * as creditnoteController from "../controllers/creditnote.controller";
import { requirePermission } from "../middleware/role.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requirePermission("Invoices: View"), asyncHandler(creditnoteController.listCreditNotes));
router.get("/:id", requirePermission("Invoices: View"), asyncHandler(creditnoteController.getCreditNote));
router.post("/", requirePermission("Invoices: Create"), asyncHandler(creditnoteController.createCreditNote));
router.post("/:id/apply", requirePermission("Invoices: Edit"), asyncHandler(creditnoteController.applyCreditNote));

export default router;
