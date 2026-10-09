"use client";

import * as React from "react";
// @ts-ignore
import { format, subDays, startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const PRESETS = [
  {
    label: "Today",
    getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Yesterday",
    getValue: () => ({ from: startOfDay(subDays(new Date(), 1)), to: endOfDay(subDays(new Date(), 1)) }),
  },
  {
    label: "Last 7 days",
    getValue: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }),
  },
  {
    label: "Last 30 days",
    getValue: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }),
  },
  {
    label: "This Month",
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfDay(new Date()) }),
  },
  {
    label: "Last Month",
    getValue: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { from: startOfMonth(lastMonth), to: endOfMonth(lastMonth) };
    },
  },
];

interface DateRangePickerProps {
  className?: string;
  date?: DateRange;
  onDateChange: (date: DateRange | undefined) => void;
}

export function DateRangePicker({
  className,
  date,
  onDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[260px] justify-start text-left font-normal bg-tf-surface border-tf-border text-tf-text-primary",
              !date && "text-tf-text-muted"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Filter by date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 bg-tf-surface border-tf-border flex flex-col md:flex-row" align="start">
          <div className="flex flex-col border-r border-tf-border p-2 gap-1 w-[140px] shrink-0">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="ghost"
                className="justify-start text-sm h-8 px-2 font-normal hover:bg-tf-primary-soft hover:text-tf-primary"
                onClick={() => {
                  onDateChange(preset.getValue());
                  setIsOpen(false);
                }}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={onDateChange}
              numberOfMonths={2}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Clear Button */}
      {date?.from && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDateChange(undefined)}
          className="h-10 w-10 text-tf-text-muted hover:text-tf-text-primary"
          title="Clear date filter"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
