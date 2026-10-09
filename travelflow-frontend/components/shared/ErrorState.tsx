"use client";

import { AlertCircle, RefreshCw, WifiOff, ShieldAlert, Clock, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ErrorCode, UserFriendlyError } from "@/lib/error-parser";
import type { LucideIcon } from "lucide-react";

interface ErrorStateProps {
  /** Pre-parsed error from `parseApiError()` */
  error?: UserFriendlyError;
  /** Shortcut: pass title + description directly instead of a parsed error */
  title?: string;
  description?: string;
  /** Called when the user clicks "Try again" */
  onRetry?: () => void;
  /** Visual variant */
  variant?: "card" | "section" | "inline";
  className?: string;
}

const iconMap: Record<ErrorCode, LucideIcon> = {
  OFFLINE: WifiOff,
  TIMEOUT: Clock,
  SERVER_UNAVAILABLE: ServerCrash,
  UNAUTHORIZED: ShieldAlert,
  FORBIDDEN: ShieldAlert,
  NOT_FOUND: AlertCircle,
  VALIDATION: AlertCircle,
  RATE_LIMITED: Clock,
  SERVER_ERROR: ServerCrash,
  UNKNOWN: AlertCircle,
};

export function ErrorState({
  error,
  title,
  description,
  onRetry,
  variant = "card",
  className,
}: ErrorStateProps) {
  const displayTitle = title ?? error?.title ?? "Something went wrong";
  const displayDesc =
    description ?? error?.description ?? "An unexpected error occurred. Please try again.";
  const canRetry = onRetry && (error?.canRetry !== false);
  const IconComponent = error ? iconMap[error.code] ?? AlertCircle : AlertCircle;

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-2 text-sm text-destructive ${className ?? ""}`}>
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>{displayTitle}{displayDesc ? ` — ${displayDesc}` : ""}</span>
        {canRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="h-auto px-2 py-0.5 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        )}
      </div>
    );
  }

  const isSection = variant === "section";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${
        isSection ? "py-8 px-4" : "p-12 rounded-xl border border-tf-border bg-tf-surface shadow-sm"
      } ${className ?? ""}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-4">
        <IconComponent className="h-7 w-7" />
      </div>
      <h3 className="tf-h3 text-tf-text-primary mb-1.5">{displayTitle}</h3>
      <p className="tf-body text-tf-text-secondary max-w-md mb-5">
        {displayDesc}
      </p>
      {canRetry && (
        <Button
          variant="outline"
          onClick={onRetry}
          className="gap-2 border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 hover:text-tf-text-primary"
        >
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      )}
    </div>
  );
}
