"use client";

import { Table } from "@tanstack/react-table";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

function getColumnLabel<TData>(
  column: ReturnType<Table<TData>["getAllColumns"]>[number],
): string {
  const header = column.columnDef.header;
  if (typeof header === "string") return header;
  return column.id
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const columns = table.getAllColumns().filter((column) => column.getCanHide());

  const handleReset = () => {
    table.toggleAllColumnsVisible(true);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto hidden h-9 border-tf-border text-tf-text-secondary lg:flex"
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          View
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 rounded-lg border-tf-border bg-tf-surface p-0"
      >
        <PopoverHeader className="border-b border-tf-border px-4 py-3">
          <div className="flex items-center justify-between">
            <PopoverTitle className="text-xs font-semibold uppercase tracking-wider text-tf-text-primary">
              Toggle columns
            </PopoverTitle>
            <Button
              variant="link"
              size="sm"
              onClick={handleReset}
              className="h-auto p-0 text-xs normal-case tracking-normal text-tf-primary"
            >
              Reset
            </Button>
          </div>
        </PopoverHeader>
        <div className="max-h-64 overflow-y-auto p-2">
          {columns.map((column) => (
            <label
              key={column.id}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-tf-surface-2"
            >
              <Checkbox
                checked={column.getIsVisible()}
                onCheckedChange={(value) => column.toggleVisibility(!!value)}
              />
              <span className="text-sm text-tf-text-secondary">
                {getColumnLabel(column)}
              </span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
