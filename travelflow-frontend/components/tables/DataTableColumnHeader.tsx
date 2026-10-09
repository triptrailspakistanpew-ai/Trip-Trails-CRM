"use client";

import { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableColumnHeaderProps<
  TData,
  TValue,
> extends React.HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <div
        className={cn(
          "text-xs font-semibold uppercase tracking-wider text-tf-text-muted",
          className,
        )}
      >
        {title}
      </div>
    );
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-tf-surface-2 hover:bg-tf-surface-2 text-xs font-semibold uppercase tracking-wider text-tf-text-muted"
          >
            <span>{title}</span>
            {column.getIsSorted() === "desc" ? (
              <ArrowDown className="ml-2 h-3 w-3" />
            ) : column.getIsSorted() === "asc" ? (
              <ArrowUp className="ml-2 h-3 w-3" />
            ) : (
              <ChevronsUpDown className="ml-2 h-3 w-3 opacity-50" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          className="bg-tf-surface border-tf-border"
        >
          <DropdownMenuItem
            onClick={() => column.toggleSorting(false)}
            className="text-tf-text-secondary focus:bg-tf-surface-2"
          >
            <ArrowUp className="mr-2 h-3.5 w-3.5 text-tf-text-muted" />
            Asc
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => column.toggleSorting(true)}
            className="text-tf-text-secondary focus:bg-tf-surface-2"
          >
            <ArrowDown className="mr-2 h-3.5 w-3.5 text-tf-text-muted" />
            Desc
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-tf-border" />
          <DropdownMenuItem
            onClick={() => column.toggleVisibility(false)}
            className="text-tf-text-secondary focus:bg-tf-surface-2"
          >
            <EyeOff className="mr-2 h-3.5 w-3.5 text-tf-text-muted" />
            Hide
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
