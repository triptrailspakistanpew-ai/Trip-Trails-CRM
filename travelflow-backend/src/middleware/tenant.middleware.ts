import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

type AuthenticatedRequest = Request & {
  agencyId?: string;
};

export function tenantMiddleware(req: AuthenticatedRequest, _res: Response, next: NextFunction) {
  if (!req.agencyId) {
    next(ApiError.unauthorized("Tenant context missing"));
    return;
  }
  next();
}

export function agencyFilter(req: AuthenticatedRequest) {
  return { agencyId: req.agencyId, isDeleted: false };
}
