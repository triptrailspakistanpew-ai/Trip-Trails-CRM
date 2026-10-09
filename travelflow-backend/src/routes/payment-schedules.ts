import { Router } from "express";
import * as paymentScheduleController from "../controllers/payment-schedule.controller";
import { requirePermission } from "../middleware/role.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", requirePermission("Bookings: View"), asyncHandler(paymentScheduleController.listPaymentSchedules));
router.get("/:id", requirePermission("Bookings: View"), asyncHandler(paymentScheduleController.getPaymentSchedule));
router.post("/", requirePermission("Bookings: Edit"), asyncHandler(paymentScheduleController.createPaymentSchedule));
router.patch("/items/:itemId", requirePermission("Bookings: Edit"), asyncHandler(paymentScheduleController.updateScheduleItemStatus));
router.delete("/:id", requirePermission("Bookings: Edit"), asyncHandler(paymentScheduleController.deletePaymentSchedule));

export default router;
