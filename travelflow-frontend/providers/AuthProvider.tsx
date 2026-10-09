"use client";

/**
 * AuthProvider
 *
 * Runs once on app mount. If the backend is active (NEXT_PUBLIC_USE_API=true),
 * calls GET /auth/me to hydrate the Zustand auth store with the current user.
 * Silently ignores errors — middleware handles redirects for unauthenticated pages.
 */

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth.store";
import "@/lib/data-source"; // Force initialization of API client so injectAuthActions runs

const useApi = process.env.NEXT_PUBLIC_USE_API === "true";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { fetchMe } = useAuthStore();

  useEffect(() => {
    // Clean up any zombie service workers registered on localhost:3000
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      }).catch(() => {});
    }

    if (useApi) {
      // Hydrate user from /auth/me if a cookie session exists.
      // This is a no-op if the cookie is missing or expired.
      fetchMe().catch(() => {});
    }
  }, []);

  return <>{children}</>;
}
