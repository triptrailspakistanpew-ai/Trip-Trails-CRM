"use client";

import { useSidebarStore } from "@/store/sidebar.store";
import { useEffect, useState } from "react";

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const isOpen = useSidebarStore((state) => state.isOpen);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="invisible">{children}</div>;
  }

  return (
    <div className={`flex h-full w-full ${isOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
      {children}
    </div>
  );
}
