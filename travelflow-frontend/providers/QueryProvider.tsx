"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useState, useEffect } from "react";
import { getQueryClient } from "@/lib/query-client";
import { get, set, del } from "idb-keyval";

/**
 * Custom storage persister using IndexedDB via idb-keyval
 */
const idbStorage = {
  getItem: async (key: string) => {
    const value = await get(key);
    return value || null;
  },
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};

/**
 * QueryProvider — Configures @tanstack/react-query with sensible defaults
 * and offline/persistent caching for TravelFlow.
 */
export function QueryProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient();

  const [persister, setPersister] = useState<any>(null);

  useEffect(() => {
    // Only configure persister on the client
    const asyncPersister = createAsyncStoragePersister({
      storage: typeof window !== "undefined" ? (idbStorage as any) : undefined,
      key: "travelflow-query-cache",
      throttleTime: 1000,
    });
    setPersister(asyncPersister);
  }, []);

  if (!persister) {
    // Provide standard client during SSR / hydration before persister is ready
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => {
            const allowed = [
              "shared",
              "dashboard",
              "accounting",
              "reports",
              "leads",
              "customers",
              "quotations",
              "bookings",
              "finance",
              "suppliers",
            ];
            return (
              allowed.includes(String(query.queryKey[0])) &&
              query.state.status === "success"
            );
          },
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
