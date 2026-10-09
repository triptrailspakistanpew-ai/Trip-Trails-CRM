"use client";

import { useCallback, useState } from "react";
import { useCreateDrawer } from "@/hooks/use-create-drawer";

export function useEntityDrawer() {
  const { isDrawerOpen, openDrawer, closeDrawer } = useCreateDrawer();
  const [editingId, setEditingId] = useState<string | null>(null);

  const openCreate = useCallback(() => {
    setEditingId(null);
    openDrawer();
  }, [openDrawer]);

  const openEdit = useCallback(
    (id: string) => {
      setEditingId(id);
      openDrawer();
    },
    [openDrawer]
  );

  const close = useCallback(() => {
    setEditingId(null);
    closeDrawer();
  }, [closeDrawer]);

  return {
    isDrawerOpen,
    editingId,
    isEditing: editingId !== null,
    openCreate,
    openEdit,
    close,
  };
}
