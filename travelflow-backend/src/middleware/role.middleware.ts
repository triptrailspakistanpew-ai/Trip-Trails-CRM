import { Request, Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";
import { prisma } from "../lib/prisma";

export function requireRole(allowedRoles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }
    const userRole = req.user.role?.toLowerCase();
    // Super-roles (owner and admin) always have full access to role-restricted routes
    if (userRole === "owner" || userRole === "admin") {
      return next();
    }
    const isAllowed = allowedRoles.some((r) => r.toLowerCase() === userRole);
    if (!isAllowed) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }
    next();
  };
}

interface CachedRolePermissions {
  permissions: string[];
  expiresAt: number;
}

const rolePermissionsCache = new Map<string, CachedRolePermissions>();

export function invalidateRolePermissionsCache(agencyId?: string) {
  if (agencyId) {
    for (const key of rolePermissionsCache.keys()) {
      if (key.startsWith(`${agencyId}:`)) {
        rolePermissionsCache.delete(key);
      }
    }
  } else {
    rolePermissionsCache.clear();
  }
}

export function requirePermission(requiredPermission: string | string[]) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.agencyId) {
        return next(ApiError.unauthorized());
      }
      const userRole = req.user.role?.toLowerCase();
      if (userRole === "admin" || userRole === "owner") {
        return next();
      }

      const cacheKey = `${req.agencyId}:${req.user.role?.toLowerCase()}`;
      const cached = rolePermissionsCache.get(cacheKey);
      const now = Date.now();

      let permissions: string[];
      if (cached && cached.expiresAt > now) {
        permissions = cached.permissions;
      } else {
        const role = await prisma.role.findFirst({
          where: {
            agencyId: req.agencyId,
            name: { equals: req.user.role, mode: "insensitive" },
            isDeleted: false,
          },
        });
        if (!role) {
          return next(ApiError.forbidden("Role not found"));
        }
        permissions = (role.permissions as string[]) || [];
        rolePermissionsCache.set(cacheKey, {
          permissions,
          expiresAt: now + 300_000,
        });
      }

      const requiredList = Array.isArray(requiredPermission)
        ? requiredPermission
        : [requiredPermission];

      const hasAccess =
        permissions.includes("all") ||
        requiredList.some((p) => permissions.includes(p));

      if (!hasAccess) {
        const permLabel = Array.isArray(requiredPermission)
          ? requiredPermission.join(" or ")
          : requiredPermission;
        return next(
          ApiError.forbidden(
            `You do not have permission to perform this action. Required: ${permLabel}`
          )
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
