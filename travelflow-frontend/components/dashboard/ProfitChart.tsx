"use client";
import { useBranchStore } from "@/store/branch.store";

import { DonutChart } from "@/components/charts/DonutChart";
import { DashboardStats } from "@/types";
import { formatShort } from "@/lib/utils";

export function ProfitChart({
  data,
  isLoading,
}: {
  data: DashboardStats | null;
  isLoading: boolean;
}) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);

  const colors = [
    "var(--tf-primary)",
    "var(--tf-success)",
    "var(--tf-warning)",
    "var(--tf-info)",
    "var(--tf-danger)",
    "var(--tf-accent)",
  ];

  const chartData = (data?.profitByCategory || []).map((item, index) => ({
    name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
    value: item.value,
    color: colors[index % colors.length],
  }));

  if (chartData.length === 0) {
    chartData.push({ name: "No Data", value: 1, color: "var(--tf-surface-2)" });
  }

  const total = data?.profitByCategory?.reduce((sum, item) => sum + item.value, 0) || 0;

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 h-full shadow-sm flex flex-col">
      <h3 className="tf-h3 text-tf-text-primary mb-2">Profit Breakdown</h3>
      <p className="text-sm text-tf-text-secondary mb-6">By service category</p>

      {isLoading ? (
        <div className="flex-1 bg-tf-surface-2 animate-pulse rounded-full aspect-square max-h-[250px] mx-auto mt-4" />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <DonutChart
            data={chartData}
            height={240}
            centerLabel="Total Profit"
            centerValue={`${activeCurrency} ${formatShort(total)}`}
          />

          <div className="grid grid-cols-2 gap-4 w-full mt-6">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <p className="text-xs text-tf-text-secondary truncate">
                    {item.name}
                  </p>
                  <p className="text-sm font-semibold text-tf-text-primary">
                    {activeCurrency} {formatShort(item.value)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
