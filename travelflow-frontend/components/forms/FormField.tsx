"use client";

import * as React from "react";
import { Control, FieldPath, FieldValues, Controller } from "react-hook-form";
import {
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import type { Country } from "react-phone-number-input";

interface BaseFieldProps<T extends FieldValues = FieldValues> {
  control: Control<T, any>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean
}

function FieldLabel({
  label,
  required,
}: {
  label: string;
  required?: boolean;
}) {
  if (!label) return null;
  return (
    <FormLabel className="text-sm font-medium text-tf-text-secondary">
      {label}
      {required && <span className="text-tf-danger ml-0.5">*</span>}
    </FormLabel>
  );
}

interface TextFieldProps<
  T extends FieldValues = FieldValues,
> extends BaseFieldProps<T> {
  disabled?: boolean
  type?:
  | "text"
  | "email"
  | "password"
  | "number"
  | "tel"
  | "url"
  | "date"
  | "datetime-local"
  | "color";
}

export function FormField<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  type = "text",
  required,
  disabled,
}: TextFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Input
              type={type}
              placeholder={placeholder}
              className={`rounded-lg bg-tf-surface focus-visible:ring-2 focus-visible:ring-offset-0 text-tf-text-primary shadow-sm ${fieldState.error
                ? "border-[var(--tf-danger)] focus-visible:ring-[var(--tf-danger)] ring-1 ring-[var(--tf-danger)]"
                : "border-tf-border focus-visible:ring-[var(--tf-primary)]"
                }`}
              disabled={disabled}
              {...field}
              value={field.value ?? ""}
              ref={(e) => {
                field.ref(e);
                // Auto-focus on error if it's the first one in the DOM
                if (fieldState.error && e && document.activeElement?.tagName === "BODY") {
                  e.focus();
                }
              }}
            />
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-tf-text-muted">
              {description}
            </FormDescription>
          )}
          {fieldState.error && (
            <FormMessage className="text-sm font-medium text-tf-danger mt-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {fieldState.error.message}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}

export function FormTextArea<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
}: BaseFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Textarea
              placeholder={placeholder}
              className={`min-h-[100px] rounded-lg resize-y bg-tf-surface focus-visible:ring-2 focus-visible:ring-offset-0 text-tf-text-primary shadow-sm ${fieldState.error
                ? "border-[var(--tf-danger)] focus-visible:ring-[var(--tf-danger)] ring-1 ring-[var(--tf-danger)]"
                : "border-tf-border focus-visible:ring-[var(--tf-primary)]"
                }`}
              disabled={disabled}
              {...field}
              value={field.value ?? ""}
              ref={(e) => {
                field.ref(e);
                if (fieldState.error && e && document.activeElement?.tagName === "BODY") {
                  e.focus();
                }
              }}
            />
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-tf-text-muted">
              {description}
            </FormDescription>
          )}
          {fieldState.error && (
            <FormMessage className="text-sm font-medium text-tf-danger mt-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {fieldState.error.message}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}

interface PhoneFieldProps<T extends FieldValues = FieldValues> extends BaseFieldProps<T> {
  defaultCountry?: Country;
}

export function FormPhoneField<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  required,
  disabled,
  defaultCountry = "PK",
}: PhoneFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          <FieldLabel label={label} required={required} />
          <FormControl>
            <div className={cn(
              "rounded-lg",
              fieldState.error
                ? "ring-1 ring-[var(--tf-danger)]"
                : ""
            )}>
              <PhoneInput
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder={placeholder}
                disabled={disabled}
                defaultCountry={defaultCountry}
                international
                className={cn(
                  fieldState.error
                    ? "border-[var(--tf-danger)] focus-within:ring-2 focus-within:ring-[var(--tf-danger)]"
                    : "focus-within:ring-2 focus-within:ring-[var(--tf-primary)]"
                )}
              />
            </div>
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-tf-text-muted">
              {description}
            </FormDescription>
          )}
          {fieldState.error && (
            <FormMessage className="text-sm font-medium text-tf-danger mt-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {fieldState.error.message}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectFieldProps<
  T extends FieldValues = FieldValues,
> extends BaseFieldProps<T> {
  options: SelectOption[];
  disabled?: boolean
}

export function FormSelect<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  options,
  required,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          <FieldLabel label={label} required={required} />
          <FormControl>
            <div className={fieldState.error ? "rounded-lg border-[var(--tf-danger)] ring-1 ring-[var(--tf-danger)]" : ""}>
              <FilterSelect
                fullWidth
                value={field.value ?? ""}
                onValueChange={field.onChange}
                options={options}
                placeholder={`Select ${label.toLowerCase()}`}
                triggerClassName={fieldState.error ? "focus:ring-0" : "focus:ring-2 focus:ring-[var(--tf-primary)]"}
                disabled={disabled}
              />
            </div>
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-tf-text-muted">
              {description}
            </FormDescription>
          )}
          {fieldState.error && (
            <FormMessage className="text-sm font-medium text-tf-danger mt-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {fieldState.error.message}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}

export interface ComboboxProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  triggerClassName?: string;
}

export function Combobox({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search options...",
  emptyText = "No option found.",
  disabled,
  allowCustom = false,
  triggerClassName,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const selectedOption = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal text-tf-text-primary bg-tf-surface hover:bg-tf-surface-hover border-tf-border shadow-sm text-left truncate",
            !value && "text-tf-text-secondary",
            triggerClassName
          )}
        >
          <span className="truncate">
            {selectedOption ? selectedOption.label : value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[200px] max-w-[480px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          {options.some((o) => o.value === "NEW_CUSTOMER") && (
            <div className="p-1 border-b border-tf-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-tf-primary hover:text-tf-primary-hover font-medium h-9 px-2"
                onClick={() => {
                  onValueChange("NEW_CUSTOMER");
                  setOpen(false);
                }}
              >
                + Create New Customer
              </Button>
            </div>
          )}
          <CommandList className="max-h-[300px] overflow-y-auto">
            <CommandEmpty>
              {allowCustom && searchValue.trim() ? (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(searchValue.trim());
                    setOpen(false);
                    setSearchValue("");
                  }}
                  className="w-full text-left px-2 py-1.5 text-sm text-tf-primary hover:bg-tf-surface-hover rounded font-medium cursor-pointer"
                >
                  + Use &quot;{searchValue.trim()}&quot;
                </button>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {allowCustom &&
                searchValue.trim() &&
                !options.some(
                  (o) => o.label.toLowerCase() === searchValue.trim().toLowerCase()
                ) && (
                  <CommandItem
                    value={searchValue.trim()}
                    onSelect={() => {
                      onValueChange(searchValue.trim());
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer text-tf-primary font-medium"
                  >
                    + Use &quot;{searchValue.trim()}&quot;
                  </CommandItem>
                )}
              {options
                .filter((o) => o.value !== "NEW_CUSTOMER")
                .map((option) => (
                  <CommandItem
                    value={option.label || option.value}
                    key={option.value}
                    onSelect={() => {
                      onValueChange(option.value);
                      setOpen(false);
                      setSearchValue("");
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        option.value === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function FormCombobox<T extends FieldValues = FieldValues>({
  control,
  name,
  label,
  description,
  placeholder,
  options,
  required,
  disabled,
}: SelectFieldProps<T>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormItem className="w-full space-y-2">
          <FieldLabel label={label} required={required} />
          <FormControl>
            <Combobox
              value={field.value ?? ""}
              onValueChange={field.onChange}
              options={options}
              placeholder={placeholder || (label ? `Select ${label.toLowerCase()}` : "Select option")}
              searchPlaceholder={`Search ${label ? label.toLowerCase() : "options"}...`}
              emptyText={`No ${label ? label.toLowerCase() : "option"} found.`}
              disabled={disabled}
              triggerClassName={
                fieldState.error ? "border-[var(--tf-danger)] ring-1 ring-[var(--tf-danger)] focus:ring-0" : ""
              }
            />
          </FormControl>
          {description && (
            <FormDescription className="text-xs text-tf-text-muted">
              {description}
            </FormDescription>
          )}
          {fieldState.error && (
            <FormMessage className="text-sm font-medium text-tf-danger mt-1.5 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {fieldState.error.message}
            </FormMessage>
          )}
        </FormItem>
      )}
    />
  );
}
