export function KpiCardSkeleton({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-[140px] w-full rounded-xl border border-tf-border bg-tf-surface p-5 shadow-sm"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="h-4 w-24 bg-tf-surface-2 rounded animate-pulse"></div>
            <div className="h-10 w-10 bg-tf-surface-2 rounded-full animate-pulse"></div>
          </div>
          <div className="h-8 w-32 bg-tf-surface-2 rounded animate-pulse mb-4"></div>
          <div className="flex justify-between items-center">
            <div className="h-4 w-20 bg-tf-surface-2 rounded animate-pulse"></div>
            <div className="h-4 w-16 bg-tf-surface-2 rounded animate-pulse"></div>
          </div>
        </div>
      ))}
    </>
  );
}

export function DataTableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="w-full rounded-lg border border-tf-border bg-tf-surface overflow-hidden">
      <div className="flex items-center gap-4 border-b border-tf-border p-4 bg-tf-surface-2">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            key={i}
            className="h-4 flex-1 bg-[var(--tf-border-strong)] rounded animate-pulse opacity-20"
          ></div>
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div
          key={r}
          className="flex items-center gap-4 border-b border-tf-border p-4 last:border-0"
        >
          {Array.from({ length: columns }).map((_, c) => (
            <div
              key={c}
              className="h-4 flex-1 bg-tf-surface-2 rounded animate-pulse"
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="w-full rounded-xl border border-tf-border bg-tf-surface p-5 shadow-sm flex flex-col gap-4"
      style={{ height: `${height}px` }}
    >
      <div className="flex justify-between items-center">
        <div className="h-5 w-32 bg-tf-surface-2 rounded animate-pulse"></div>
        <div className="h-8 w-24 bg-tf-surface-2 rounded animate-pulse"></div>
      </div>
      <div className="flex-1 w-full bg-tf-surface-2 rounded animate-pulse"></div>
    </div>
  );
}
