import { Request } from "express";
import { AgencyContext } from "../services/domain.service";

export function buildContext(req: Request): AgencyContext {
  return {
    agencyId: req.agencyId || req.user?.agencyId || (req as any).agencyCtx?.agencyId || "",
    branchId: (req.query.branchId as string) || (req.user?.branchId ? String(req.user.branchId) : undefined),
    userRole: req.user?.role,
    userBranchId: req.user?.branchId ? String(req.user.branchId) : undefined,
    callerId: req.user?.id ? String(req.user.id) : undefined,
    callerRole: req.user?.role,
  };
}
