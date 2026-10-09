"use client";

import * as React from "react";
import PhoneInputOriginal, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { CountrySelect } from "@/components/shared/CountrySelect";

interface PhoneInputProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  international?: boolean;
  defaultCountry?: Country;
}

function PhoneInput({
  value,
  onChange,
  placeholder = "Enter phone number",
  disabled,
  className,
  international = true,
  defaultCountry = "PK",
  ...props
}: PhoneInputProps) {
  return (
    <PhoneInputOriginal
      international={international}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(val: any) => onChange?.(val || "")}
      placeholder={placeholder}
      disabled={disabled}
      countrySelectComponent={CountrySelect}
      className={cn(
        "flex h-10 w-full rounded-lg border border-tf-border bg-transparent shadow-sm transition-all",
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-0 focus-within:ring-[var(--tf-primary)]",
        "text-tf-text-primary text-base md:text-sm",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
      {...props}
    />
  );
}

export { PhoneInput, type Country };
