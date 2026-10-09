/**
 * toast-utils.ts — Standardized Toast Notifications
 *
 * Wraps `sonner` to enforce consistent, human-readable messages.
 * Error toasts are automatically processed through the error parser
 * so technical details never reach the user.
 */

import { toast as sonnerToast } from "sonner";
import { parseApiError, logError, type UserFriendlyError } from "@/lib/error-parser";

// ─── Success ──────────────────────────────────────────────────────────────────

/**
 * Show a success toast with a specific, affirmative message.
 *
 * @example showSuccess("Customer created successfully")
 * @example showSuccess("Booking updated", { description: "Reference: BK-0042" })
 */
export function showSuccess(
  message: string,
  options?: { description?: string; id?: string | number },
): void {
  sonnerToast.success(message, {
    id: options?.id ?? message,
    description: options?.description,
  });
}

// ─── Error ────────────────────────────────────────────────────────────────────

/**
 * Show an error toast. Accepts a raw error and converts it
 * to a user-friendly message using the error parser.
 *
 * @example showError(error)
 * @example showError(error, { context: "creating customer" })
 */
export function showError(
  error: unknown,
  options?: { context?: string; id?: string | number },
): void {
  const parsed = parseApiError(error);

  // Log the full technical details for developers
  logError(options?.context ?? "Unknown action", error);

  sonnerToast.error(parsed.title, {
    id: options?.id ?? parsed.code,
    description: parsed.description,
  });
}

// ─── Mutation helper ──────────────────────────────────────────────────────────

/**
 * Show a user-friendly error toast from a pre-parsed error.
 * Useful when you've already called parseApiError() and need to display it.
 */
export function showParsedError(parsed: UserFriendlyError, options?: { id?: string | number }): void {
  sonnerToast.error(parsed.title, {
    id: options?.id ?? parsed.code,
    description: parsed.description,
  });
}

// ─── Info / Warning ───────────────────────────────────────────────────────────

export function showInfo(
  message: string,
  options?: { description?: string; id?: string | number },
): void {
  sonnerToast.info(message, {
    id: options?.id ?? message,
    description: options?.description,
  });
}

export function showWarning(
  message: string,
  options?: { description?: string; id?: string | number },
): void {
  sonnerToast.warning(message, {
    id: options?.id ?? message,
    description: options?.description,
  });
}


