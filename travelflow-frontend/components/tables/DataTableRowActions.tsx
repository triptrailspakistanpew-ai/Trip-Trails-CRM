"use client";

import { useState } from "react";
import { Row } from "@tanstack/react-table";
import { MoreHorizontal, Edit, Trash, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DataTableRowActionsProps<TData> {
  row: Row<TData>;
  onView?: (row: Row<TData>) => void;
  onEdit?: (row: Row<TData>) => void;
  onDelete?: (row: Row<TData>) => void;
  deleteLabel?: string;
  customActions?: (row: Row<TData>) => React.ReactNode;
}

export function DataTableRowActions<TData>({
  row,
  onView,
  onEdit,
  onDelete,
  deleteLabel = "this item",
  customActions,
}: DataTableRowActionsProps<TData>) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex h-8 w-8 p-0 data-[state=open]:bg-tf-surface-2 text-tf-text-secondary hover:text-tf-text-primary hover:bg-tf-surface-2"
          >
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Open menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-[160px] bg-tf-surface border-tf-border shadow-md"
        >
          {onView && (
            <DropdownMenuItem
              onClick={() => onView(row)}
              className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem
              onClick={() => onEdit(row)}
              className="text-tf-text-secondary focus:bg-tf-surface-2 cursor-pointer"
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {customActions && customActions(row)}
          {onDelete && (
            <>
              <DropdownMenuSeparator className="bg-tf-border" />
              <DropdownMenuItem
                onClick={() => setShowDeleteAlert(true)}
                className="text-tf-danger focus:bg-[var(--tf-danger-soft)] focus:text-tf-danger cursor-pointer font-medium"
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {onDelete && (
        <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
          <AlertDialogContent className="bg-tf-surface border-tf-border">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-tf-text-primary">
                Are you sure?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-tf-text-secondary">
                This will permanently delete {deleteLabel}. This action cannot
                be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-tf-border text-tf-text-secondary hover:bg-tf-surface-2">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowDeleteAlert(false);
                  onDelete(row);
                }}
                className="bg-[var(--tf-danger)] text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
