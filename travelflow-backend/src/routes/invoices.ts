import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authMiddleware } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/role.middleware";
import * as invoiceController from "../controllers/invoice.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", requirePermission("Invoices: View"), asyncHandler(invoiceController.listInvoices));
router.get("/:id", requirePermission("Invoices: View"), asyncHandler(invoiceController.getInvoice));
router.post("/from-booking/:bookingId", requirePermission("Invoices: Create"), asyncHandler(invoiceController.generateInvoiceFromBooking));
router.post("/:id/mark-paid", requirePermission("Invoices: Edit"), asyncHandler(invoiceController.markInvoicePaid));
router.patch("/:id", requirePermission("Invoices: Edit"), asyncHandler(invoiceController.updateInvoice));
router.delete("/:id", requirePermission("Invoices: Delete"), asyncHandler(invoiceController.deleteInvoice));

export default router;
