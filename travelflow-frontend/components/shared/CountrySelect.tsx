"use client";

import * as React from "react";
import getUnicodeFlagIcon from "country-flag-icons/unicode";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";

interface CountryOption {
  value: string;
  label: string;
  divider?: boolean;
}

interface CountrySelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: CountryOption[];
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
}

export function CountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  className,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);

  const filteredOptions = options.filter((opt) => !opt.divider && opt.value);

  const selectedOption = filteredOptions.find((opt) => opt.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || readOnly}
          className={cn(
            "flex items-center gap-1.5 h-10 px-2 border-r border-tf-border bg-transparent",
            "hover:bg-tf-surface-hover transition-colors",
            "focus:outline-none",
            (disabled || readOnly) && "cursor-not-allowed opacity-50",
            className
          )}
        >
          {value ? (
            <span className="text-lg leading-none" title={selectedOption?.label}>
              {getUnicodeFlagIcon(value)}
            </span>
          ) : (
            <span className="text-sm text-tf-text-muted">🌐</span>
          )}
          <ChevronsUpDown className="h-3 w-3 text-tf-text-muted shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[280px] p-0 bg-tf-surface border-tf-border"
        align="start"
        sideOffset={4}
      >
        <Command className="bg-transparent">
          <CommandInput
            placeholder="Search country..."
            className="h-9"
          />
          <CommandList className="max-h-[300px]">
            <CommandEmpty className="text-tf-text-muted py-4 text-sm">
              No country found.
            </CommandEmpty>
            <CommandGroup className="max-h-[260px] overflow-y-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={`${option.label} ${option.value}`}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer flex items-center gap-2 px-3 py-2 text-sm"
                >
                  <span className="text-lg leading-none">
                    {getUnicodeFlagIcon(option.value)}
                  </span>
                  <span className="text-tf-text-primary flex-1">
                    {option.label}
                  </span>
                  <span className="text-tf-text-muted text-xs">
                    +{option.value}
                  </span>
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === option.value
                        ? "opacity-100 text-tf-primary"
                        : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export type { CountryOption, CountrySelectProps };
