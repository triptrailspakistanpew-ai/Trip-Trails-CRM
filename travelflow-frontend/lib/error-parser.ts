/**
 * error-parser.ts — Centralized Error Parser
 *
 * Converts raw API / network errors into user-friendly messages.
 * No technical details (status codes, stack traces, ECONNREFUSED, etc.)
 * ever reach the UI.
 *
 * Every parsed error includes:
 *   - title:       Short headline (e.g. "Connection lost")
 *   - description: Explanation & next step
 *   - canRetry:    Whether the action can be retried
 *   - severity:    "info" | "warning" | "error"
 *   - code:        Internal classification for logging
 */

import { ApiError } from "@/lib/api-error";

// ─── Public types ─────────────────────────────────────────────────────────────
export type ErrorSeverity = "info" | "warning" | "error";

export type ErrorCode =
  | "OFFLINE"
  | "TIMEOUT"
  | "SERVER_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "SERVER_ERROR"
  | "UNKNOWN";

export interface UserFriendlyError {
  title: string;
  description: string;
  canRetry: boolean;
  severity: ErrorSeverity;
  code: ErrorCode;
  /** The original status code, if available */
  status?: number;
  /** Field-level validation errors from backend, if any */
  fieldErrors?: Record<string, string>;
}

// ─── Mapping tables ───────────────────────────────────────────────────────────
const STATUS_MAP: Record<number, Omit<UserFriendlyError, "status">> = {
  400: {
    title: "Invalid request",
    description: "Please check the highlighted information.",
    canRetry: false,
    severity: "warning",
    code: "VALIDATION",
  },
  401: {
    title: "Authentication failed",
    description: "Please check your credentials and try again.",
    canRetry: false,
    severity: "warning",
    code: "UNAUTHORIZED",
  },
  403: {
    title: "Access Denied",
    description: "You do not have permission to perform this action.",
    canRetry: false,
    severity: "warning",
    code: "FORBIDDEN",
  },
  404: {
    title: "Not found",
    description: "The resource couldn't be found.",
    canRetry: false,
    severity: "info",
    code: "NOT_FOUND",
  },
  408: {
    title: "Request timed out",
    description: "Please try again.",
    canRetry: true,
    severity: "warning",
    code: "TIMEOUT",
  },
  422: {
    title: "Validation error",
    description: "Please check the highlighted information.",
    canRetry: false,
    severity: "warning",
    code: "VALIDATION",
  },
  429: {
    title: "Too many requests",
    description: "Please wait a moment.",
    canRetry: true,
    severity: "warning",
    code: "RATE_LIMITED",
  },
  500: {
    title: "Server error",
    description: "Something went wrong on our end. Please try again in a moment.",
    canRetry: true,
    severity: "error",
    code: "SERVER_ERROR",
  },
  502: {
    title: "Service unavailable",
    description: "The server is temporarily unavailable. Please try again in a moment.",
    canRetry: true,
    severity: "error",
    code: "SERVER_UNAVAILABLE",
  },
  503: {
    title: "Service unavailable",
    description: "The server is temporarily unavailable. Please try again in a moment.",
    canRetry: true,
    severity: "error",
    code: "SERVER_UNAVAILABLE",
  },
  504: {
    title: "Service unavailable",
    description: "The server took too long to respond. Please try again in a moment.",
    canRetry: true,
    severity: "error",
    code: "SERVER_UNAVAILABLE",
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("failed to fetch") ||
      msg.includes("networkerror") ||
      msg.includes("network request failed") ||
      msg.includes("load failed")
    );
  }
  return false;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof DOMException && error.name === "AbortError"
  );
}

function isOffline(): boolean {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * Attempt to extract field-level validation errors from an API response.
 * Backends may return them in several formats:
 *   { errors: { email: "already exists" } }
 *   { errors: [{ field: "email", message: "..." }] }
 */
function extractFieldErrors(
  error: unknown,
): Record<string, string> | undefined {
  try {
    const raw = (error as any)?._rawBody ?? (error as any)?.response?.data;
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && parsed.errors && typeof parsed.errors === "object") {
      if (Array.isArray(parsed.errors)) {
        const map: Record<string, string> = {};
        parsed.errors.forEach(
          (e: { field?: string; path?: string; message?: string; msg?: string }) => {
            const key = e.field || e.path;
            if (key) map[key] = e.message || e.msg || "Invalid value";
          },
        );
        return Object.keys(map).length ? map : undefined;
      }
      return parsed.errors;
    }
  } catch {
    // Not JSON — move on
  }
  return undefined;
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseApiError(error: unknown): UserFriendlyError {
  // 1. Browser is offline
  if (isOffline()) {
    return {
      title: "Can't connect",
      description: "Check your connection and try again.",
      canRetry: true,
      severity: "warning",
      code: "OFFLINE",
    };
  }

  // 2. Request was aborted (timeout via AbortController)
  if (isAbortError(error)) {
    return {
      title: "Request timed out",
      description: "Please try again.",
      canRetry: true,
      severity: "warning",
      code: "TIMEOUT",
    };
  }

  // 3. Network-level failure (DNS, CORS, ECONNREFUSED, etc.)
  if (isNetworkError(error)) {
    return {
      title: "Connection lost",
      description: "Unable to reach the server. Please check your internet connection and try again.",
      canRetry: true,
      severity: "error",
      code: "SERVER_UNAVAILABLE",
    };
  }

  // 4. Raw string error passed directly to showError
  if (typeof error === "string") {
    const isPermission =
      error.toLowerCase().includes("permission") ||
      error.toLowerCase().includes("forbidden") ||
      error.toLowerCase().includes("unauthorized");
    return {
      title: isPermission ? "Access Denied" : "Notice",
      description: error,
      canRetry: !isPermission,
      severity: isPermission ? "warning" : "info",
      code: isPermission ? "FORBIDDEN" : "UNKNOWN",
    };
  }

  // Extract status and message flexibly from any error shape (ApiError, Axios, Fetch, Error)
  const status =
    (error as any)?.status ??
    (error as any)?.statusCode ??
    (error as any)?.response?.status ??
    (error as any)?.response?.data?.statusCode;

  const rawMessage =
    (error as any)?.message ??
    (error as any)?.response?.data?.message;

  const errorCode =
    (error as any)?.code ??
    (error as any)?.response?.data?.code;

  // 5. Explicit 403 / FORBIDDEN permission denial
  if (status === 403 || errorCode === "FORBIDDEN") {
    let description = "You do not have permission to perform this action.";
    if (
      rawMessage &&
      !rawMessage.startsWith("HTTP ") &&
      !rawMessage.startsWith("Server Error")
    ) {
      description = rawMessage;
    }
    return {
      title: "Access Denied",
      description,
      canRetry: false,
      severity: "warning",
      code: "FORBIDDEN",
      status: 403,
    };
  }

  // 6. Known status codes in STATUS_MAP
  if (status && STATUS_MAP[status]) {
    const mapped = STATUS_MAP[status];
    const fieldErrors = extractFieldErrors(error);

    let description = mapped.description;
    if (
      rawMessage &&
      !rawMessage.startsWith("HTTP ") &&
      !rawMessage.startsWith("Server Error")
    ) {
      description = rawMessage;
    }

    return {
      ...mapped,
      description,
      status,
      fieldErrors,
    };
  }

  // 7. 5xx Server Errors
  if (status && status >= 500) {
    return {
      title: "Server error",
      description: "Something went wrong on our end. Please try again in a moment.",
      canRetry: true,
      severity: "error",
      code: "SERVER_ERROR",
      status,
    };
  }

  // 8. Error instance with custom message
  if (error instanceof Error && error.message) {
    const isPermission =
      error.message.toLowerCase().includes("permission") ||
      error.message.toLowerCase().includes("forbidden");
    return {
      title: isPermission ? "Access Denied" : "Request failed",
      description: error.message,
      canRetry: !isPermission,
      severity: "warning",
      code: isPermission ? "FORBIDDEN" : "UNKNOWN",
    };
  }

  // 9. Completely unknown error
  return {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    canRetry: true,
    severity: "error",
    code: "UNKNOWN",
  };
}

// ─── Logging helper (dev only, never shown to users) ──────────────────────────
export function logError(
  context: string,
  error: unknown,
  extra?: Record<string, unknown>,
): void {
  const timestamp = new Date().toISOString();
  const parsed = parseApiError(error);

  console.error(`[TravelFlow Error] ${timestamp}`, {
    context,
    code: parsed.code,
    status: parsed.status,
    severity: parsed.severity,
    // Include the raw error for developer debugging
    rawError: error,
    ...extra,
  });
}
