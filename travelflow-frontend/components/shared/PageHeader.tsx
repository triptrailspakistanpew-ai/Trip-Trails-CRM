import React from 'react';
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, className, children }: PageHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0", className)}>
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-tf-text-primary">{title}</h2>
        {description && (
          <p className="text-sm text-tf-text-secondary mt-1">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex items-center space-x-2">
          {children}
        </div>
      )}
    </div>
  );
}
