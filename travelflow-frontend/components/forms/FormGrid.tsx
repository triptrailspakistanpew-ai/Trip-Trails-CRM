"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

interface FormGridProps {
  children: React.ReactNode;
  className?: string;
}

export function FormGrid({ children, className }: FormGridProps) {
  const items = React.Children.toArray(children).filter(Boolean);

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {items.map((child, i) => (
        <div
          key={i}
          className={cn(
            "min-w-0 w-full",
            items.length % 2 === 1 && i === items.length - 1 && "md:col-span-2"
          )}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
