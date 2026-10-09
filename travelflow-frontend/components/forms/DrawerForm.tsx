"use client";

import * as React from "react";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DrawerFormProps {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit?: (e: React.FormEvent) => void;
  isSubmitting?: boolean;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  submitLabel?: string;
}

const sizeClasses = {
  sm: "sm:!max-w-[400px]",
  md: "sm:!max-w-[560px]",
  lg: "sm:!max-w-[720px]",
  xl: "sm:!max-w-[900px]",
};

export function DrawerForm({
  title,
  description,
  isOpen,
  onClose,
  onSubmit,
  isSubmitting = false,
  children,
  size = "md",
  submitLabel = "Save Changes",
}: DrawerFormProps) {
  const formId = React.useId().replace(/:/g, "");
  const isSelectOpenRef = React.useRef(false);

  React.useEffect(() => {
    const handlePointerDown = () => {
      // Check if any Select or Popover is currently mounted
      // We do this in the capture phase before Radix has a chance to unmount them
      const isSelectOpen = !!(
        document.querySelector('[data-slot="select-content"]') ||
        document.querySelector('[data-slot="popover-content"]') ||
        document.querySelector('[data-radix-select-content]') ||
        document.querySelector('[data-radix-popper-content-wrapper]')
      );
      isSelectOpenRef.current = isSelectOpen;
    };

    document.addEventListener("pointerdown", handlePointerDown, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
    };
  }, []);

  const preventCloseOnSelect = (e: any) => {
    // If a Select or Popover was open when the pointer went down,
    // we prevent the Drawer from closing so that ONLY the Select/Popover closes.
    if (isSelectOpenRef.current) {
      e.preventDefault();
    }
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent
        onPointerDownOutside={preventCloseOnSelect}
        onInteractOutside={preventCloseOnSelect}
        className={cn(
          "flex flex-col gap-0 p-0 sm:max-w-none bg-tf-surface border-l-[var(--tf-border)]",
          sizeClasses[size],
        )}
      >
        <SheetHeader className="px-6 py-4 border-b border-tf-border space-y-1 bg-tf-surface text-left">
          <SheetTitle className="text-xl font-semibold text-tf-text-primary">
            {title}
          </SheetTitle>
          {description && (
            <SheetDescription className="text-sm text-tf-text-secondary">
              {description}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {onSubmit ? (
            <form id={formId} onSubmit={onSubmit} className="space-y-6">
              {children}
            </form>
          ) : (
            <div className="space-y-6">{children}</div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-tf-border bg-tf-surface">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2 hover:text-tf-text-primary"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={onSubmit ? formId : undefined}
            disabled={isSubmitting}
            className="bg-tf-primary text-white hover:bg-tf-primary-hover"
          >
            {isSubmitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                Saving...
              </>
            ) : (
              submitLabel
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
