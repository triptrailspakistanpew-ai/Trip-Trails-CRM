import { Request, Response } from "express";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import * as authService from "../services/auth.service";
import { env } from "../config/env";


export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "lax" as const,
  path: "/",
};

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000;       // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 30 * 24 * 60 * 60 * 1000; // 30 days

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie("tf_access_token", accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  res.cookie("tf_refresh_token", refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie("tf_access_token", COOKIE_OPTIONS);
  res.clearCookie("tf_refresh_token", COOKIE_OPTIONS);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const { accessToken, refreshToken, user } = await authService.login(email, password);
  setAuthCookies(res, accessToken, refreshToken);
  ApiResponse.success(res, { user }, "Login successful");
}

export async function refreshToken(req: Request, res: Response) {
  const incomingRefresh = req.cookies?.tf_refresh_token as string | undefined;
  if (!incomingRefresh) {
    clearAuthCookies(res);
    throw ApiError.unauthorized("No refresh token");
  }

  try {
    const { accessToken, refreshToken: newRefresh } = await authService.refreshAccessToken(incomingRefresh);
    setAuthCookies(res, accessToken, newRefresh);
    ApiResponse.success(res, null, "Token refreshed");
  } catch (error) {
    clearAuthCookies(res);
    throw error;
  }
}

import { invalidateUserSession } from "../middleware/auth.middleware";

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.tf_access_token as string | undefined;
  invalidateUserSession(token);
  await authService.logout(token);
  clearAuthCookies(res);
  ApiResponse.success(res, null, "Logged out successfully");
}

export async function me(req: Request, res: Response) {
  if (!req.user) throw ApiError.unauthorized();
  const user = await authService.getMe(String(req.user.id));
  ApiResponse.success(res, user);
}
