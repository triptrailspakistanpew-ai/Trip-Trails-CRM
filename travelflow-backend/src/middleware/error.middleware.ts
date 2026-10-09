import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

export function errorMiddleware(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  // Zod validation errors → 400 with field-level details
  if (err instanceof ZodError) {
    const errors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const key = issue.path.join(".") || "root";
      if (!errors[key]) errors[key] = [];
      errors[key].push(issue.message);
    }
    res.status(400).json({
      success: false,
      message: "Validation failed",
      code: "BAD_REQUEST",
      errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  if (err instanceof ApiError) {
    if (err.statusCode === 401) {
      try {
        const { COOKIE_OPTIONS } = require("../controllers/auth.controller");
        res.clearCookie("tf_access_token", COOKIE_OPTIONS);
        res.clearCookie("tf_refresh_token", COOKIE_OPTIONS);
      } catch (e) {
        res.clearCookie("tf_access_token", { path: "/" });
        res.clearCookie("tf_refresh_token", { path: "/" });
      }
    }
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code,
      errors: err.errors,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    code: "INTERNAL_ERROR",
    timestamp: new Date().toISOString(),
  });
}

export function notFoundMiddleware(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    message: "Route not found",
    code: "NOT_FOUND",
    timestamp: new Date().toISOString(),
  });
}
