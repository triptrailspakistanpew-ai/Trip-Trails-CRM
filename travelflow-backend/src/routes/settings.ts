import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { requirePermission } from "../middleware/role.middleware";
import * as settings from "../controllers/settings.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware);

router.get("/", requirePermission("Settings: View"), asyncHandler(settings.getSettings));
router.patch("/", requirePermission("Settings: Edit"), asyncHandler(settings.updateSettings));

export default router;
