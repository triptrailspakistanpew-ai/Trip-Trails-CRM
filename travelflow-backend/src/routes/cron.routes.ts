import { Router, Request, Response } from "express";
import { runDailyDemoCron } from "../demo/cron-runner";
import { DEMO_CONFIG } from "../demo/config";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";

const router = Router();

/**
 * Validates incoming request against DEMO_CONFIG.cronSecret.
 * Supports:
 * - Header: x-cron-secret
 * - Header: x-api-key
 * - Header: Authorization: Bearer <secret> or Authorization: <secret>
 * - Query params: ?secret=..., ?key=..., ?token=..., ?apiKey=..., ?cron_secret=...
 * - Body: { secret: ... } or { key: ... }
 */
function isAuthorized(req: Request): boolean {
  const rawSecret =
    req.headers["x-cron-secret"] ||
    req.headers["x-api-key"] ||
    (typeof req.headers.authorization === "string"
      ? req.headers.authorization.replace(/^Bearer\s+/i, "").trim()
      : undefined) ||
    (req.query.secret as string | undefined) ||
    (req.query.key as string | undefined) ||
    (req.query.apiKey as string | undefined) ||
    (req.query.token as string | undefined) ||
    (req.query.cron_secret as string | undefined) ||
    req.body?.secret ||
    req.body?.key ||
    req.body?.token;

  if (!rawSecret || typeof rawSecret !== "string") {
    return false;
  }

  const expected = DEMO_CONFIG.cronSecret.trim();
  const incoming = rawSecret.trim();

  // 1. Direct match (e.g. from header or non-encoded query)
  if (incoming === expected) {
    return true;
  }

  // 2. URL-decoded match (e.g. if encoded as %2B)
  try {
    if (decodeURIComponent(incoming) === expected) {
      return true;
    }
  } catch {}

  // 3. Handle query string '+' decoded into spaces ' ' (standard RFC 1866 URL query parsing for base64)
  if (incoming.replace(/ /g, "+") === expected) {
    return true;
  }

  if (incoming === expected.replace(/\+/g, " ")) {
    return true;
  }

  return false;
}

function requireCronAuth(req: Request) {
  if (!isAuthorized(req)) {
    throw ApiError.unauthorized(
      "Invalid or missing cron authorization secret. " +
      "Provide 'x-cron-secret' or 'Authorization: Bearer <secret>' header, " +
      "or append '?secret=<secret>' to the URL."
    );
  }
}

/**
 * Daily Demo Activity Cron Endpoint
 * Compatible with cron-job.org, EasyCron, Render Cron, Vercel Cron, GitHub Actions, cURL.
 * Supports both GET and POST methods.
 * Aliases: /demo-activity, /daily, /daily-seed, /daily-activity
 */
const dailyEndpoints = ["/demo-activity", "/daily", "/daily-seed", "/daily-activity"];

router.all(dailyEndpoints, async (req: Request, res: Response) => {
  requireCronAuth(req);

  const isForce =
    req.query.force === "true" ||
    req.query.force === "1" ||
    req.body?.force === true;

  const targetDateStr =
    (req.query.date as string | undefined) ||
    (req.body?.date as string | undefined);

  const targetDate = targetDateStr ? new Date(targetDateStr) : new Date();

  const result = await runDailyDemoCron({ targetDate, force: isForce });

  if (!result.success) {
    throw ApiError.internal(`Daily demo cron failed: ${result.error}`);
  }

  ApiResponse.success(
    res,
    result,
    result.skipped
      ? `Demo activity skipped: ${result.reason}`
      : `Demo activity generated for ${result.date}`
  );
});

/**
 * Initial Full Demo Ecosystem Seed Endpoint
 * Aliases: /initial-seed, /seed-initial
 * Supports both GET and POST methods.
 */
router.all(["/initial-seed", "/seed-initial"], async (req: Request, res: Response) => {
  requireCronAuth(req);

  const isReset =
    req.query.reset === "true" ||
    req.query.force === "true" ||
    req.body?.reset === true ||
    req.body?.force === true;

  const { seedDemoEnvironment } = await import("../demo/initial-seed");
  const result = await seedDemoEnvironment({ reset: isReset });

  ApiResponse.success(
    res,
    result,
    "Full Pakistani demo ecosystem seeded successfully"
  );
});

/**
 * Public/Protected Status Check
 */
router.get("/status", (req: Request, res: Response) => {
  const authorized = isAuthorized(req);
  ApiResponse.success(
    res,
    {
      demoEnabled: DEMO_CONFIG.enabled,
      timezone: DEMO_CONFIG.timezone,
      authorized,
      supportedEndpoints: [
        "/api/v1/cron/demo-activity",
        "/api/v1/cron/daily-seed",
        "/api/v1/cron/initial-seed",
      ],
      authMethods: [
        "Query param: ?secret=<CRON_SECRET>",
        "Header: Authorization: Bearer <CRON_SECRET>",
        "Header: x-cron-secret: <CRON_SECRET>",
      ],
    },
    "Cron service is active"
  );
});

export default router;

