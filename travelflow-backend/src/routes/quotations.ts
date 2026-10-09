import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantMiddleware } from "../middleware/tenant.middleware";
import { requirePermission } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { idParamSchema } from "../validators/schemas";
import * as quotation from "../controllers/quotation.controller";

const router = Router();

router.use(authMiddleware, tenantMiddleware, requirePermission("Quotations: View"));

router.get("/", quotation.listQuotations);
router.get("/:id", validate(idParamSchema, "params"), quotation.getQuotation);
router.get("/:id/print", validate(idParamSchema, "params"), quotation.getQuotationForPrint);

router.post("/", quotation.createQuotation);

router.patch(
  "/:id",
  validate(idParamSchema, "params"),
  quotation.updateQuotation,
);

router.post(
  "/:id/send",
  validate(idParamSchema, "params"),
  quotation.sendQuotation,
);

router.post(
  "/:id/convert-to-booking",
  validate(idParamSchema, "params"),
  quotation.convertQuotationToBooking,
);

router.get(
  "/:id/versions",
  validate(idParamSchema, "params"),
  quotation.getQuotationVersions,
);

export default router;
