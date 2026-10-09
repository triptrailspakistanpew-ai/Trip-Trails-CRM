"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { CREATE_DRAWER_SEARCH_PARAM } from "@/constants/create-drawer";
import { useCreateDrawerStore } from "@/store/create-drawer.store";

export function useCreateDrawer() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const shouldOpen = useCreateDrawerStore((state) => state.shouldOpen);
  const consumeRequest = useCreateDrawerStore((state) => state.consumeRequest);

  useEffect(() => {
    if (shouldOpen) {
      setIsDrawerOpen(true);
      consumeRequest();
    }
  }, [shouldOpen, consumeRequest]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get(CREATE_DRAWER_SEARCH_PARAM) !== "true") return;

    setIsDrawerOpen(true);
    params.delete(CREATE_DRAWER_SEARCH_PARAM);
    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [pathname]);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  return { isDrawerOpen, openDrawer, closeDrawer };
}
