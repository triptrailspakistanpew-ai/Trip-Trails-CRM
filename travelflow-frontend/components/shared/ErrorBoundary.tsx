"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary — Catches unhandled React render errors.
 *
 * Displays a user-friendly fallback UI. Technical error details
 * are logged to the console but never exposed in the UI.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log full details for developer debugging — never shown to users
    console.error("[TravelFlow ErrorBoundary]", {
      error,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex h-[50vh] w-full flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-tf-text-primary">Something went wrong</h2>
            <p className="text-sm text-tf-text-secondary max-w-md">
              This section encountered an unexpected error. You can try reloading it, or go back and try again.
            </p>
          </div>
          <Button
            onClick={() => this.setState({ hasError: false, error: null })}
            variant="outline"
            className="mt-4 gap-2 border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 hover:text-tf-text-primary"
          >
            <RefreshCw className="h-4 w-4" />
            Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
