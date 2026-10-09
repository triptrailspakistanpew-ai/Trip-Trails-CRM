import { STATUS_STYLES, StatusType } from "@/constants/status";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  // Defensively extract status string if an object is passed (e.g. { id: '...' })
  const statusStr = typeof status === 'object' && status !== null 
    ? ((status as any).id || (status as any).value || (status as any).name || String(status))
    : status;

  const formattedLabel = String(statusStr)
    .split(/[_ -]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

  const style = STATUS_STYLES[statusStr as StatusType] || { bg: 'var(--tf-surface-2)', text: 'var(--tf-text-secondary)', label: formattedLabel };

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-medium rounded-[var(--radius-full)] whitespace-nowrap",
        size === 'sm' ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 tf-caption",
        className
      )}
      style={{
        backgroundColor: style.bg,
        color: style.text,
      }}
    >
      {style.label}
    </span>
  );
}
