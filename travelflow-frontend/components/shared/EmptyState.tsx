import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed border-[var(--tf-border-strong)] bg-tf-surface-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-tf-surface text-tf-text-muted mb-4 shadow-sm">
        <Icon className="h-8 w-8" />
      </div>
      <h3 className="tf-h3 text-tf-text-primary mb-2">{title}</h3>
      <p className="tf-body text-tf-text-secondary max-w-md mb-6">
        {description}
      </p>
      {action && (
        <Button
          onClick={action.onClick}
          className="bg-tf-primary text-white hover:bg-tf-primary-hover normal-case tracking-normal"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
}
