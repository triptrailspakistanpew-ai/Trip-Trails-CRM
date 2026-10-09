import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authMiddleware } from "../middleware/auth.middleware";
import * as notificationController from "../controllers/notification.controller";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(notificationController.listNotifications));
router.patch("/read-all", asyncHandler(notificationController.markAllAsRead));
router.patch("/:id/read", asyncHandler(notificationController.markAsRead));
router.delete("/:id", asyncHandler(notificationController.deleteNotification));

export default router;
