"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface FilterSelectOption {
  label: string;
  value: string;
}

const ALL_VALUE = "__all__";

interface FilterSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: FilterSelectOption[];
  placeholder?: string;
  allowAll?: boolean;
  allLabel?: string;
  className?: string;
  triggerClassName?: string;
  fullWidth?: boolean;
  disabled?: boolean;
}

export function FilterSelect({
  value,
  onValueChange,
  options,
  placeholder = "Select...",
  allowAll = false,
  allLabel = "All",
  className,
  triggerClassName,
  fullWidth = false,
  disabled,
}: FilterSelectProps) {
  const selectValue = value || (allowAll ? ALL_VALUE : "");

  return (
    <Select
      value={selectValue}
      onValueChange={(v) => onValueChange(v === ALL_VALUE ? "" : v)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          fullWidth
            ? "h-10 w-full rounded-lg border border-tf-border bg-tf-surface px-3 text-sm text-tf-text-primary shadow-sm"
            : "h-9 w-fit min-w-[120px] rounded-md border border-tf-border bg-tf-surface px-3 text-sm text-tf-text-secondary",
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={className}>
        {allowAll && <SelectItem value={ALL_VALUE}>{allLabel}</SelectItem>}
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
