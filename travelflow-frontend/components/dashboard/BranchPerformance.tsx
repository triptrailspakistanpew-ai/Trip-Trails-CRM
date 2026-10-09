"use client";

import { BarChart } from "@/components/charts/BarChart";
import { Users, TrendingUp, DollarSign, CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useBranchStore } from "@/store/branch.store";

export function BranchPerformance({ isLoading, data }: { isLoading: boolean; data?: any[] }) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const defaultData = [
    { name: "KHI Main", code: "KHI-HQ", revenue: 4820000, profit: 820000, expenses: 320000, staff: 15, growth: 12.5 },
  ];
  const branchData = data && data.length > 0 ? data : defaultData;

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 h-full min-h-[480px] max-h-[750px] shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <h3 className="tf-h3 text-tf-text-primary">Branch Performance</h3>
        <span className="text-xs font-medium px-2 py-1 bg-tf-primary-soft text-tf-primary rounded-full">
          This Month
        </span>
      </div>
      <p className="text-sm text-tf-text-secondary mb-6">
        Revenue and metrics by location
      </p>

      {isLoading ? (
        <div className="flex-1 w-full bg-tf-surface-2 animate-pulse rounded-md" />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 gap-6">
          <div className="h-[180px] shrink-0">
            <BarChart
              data={branchData}
              layout="vertical"
              height={180}
              showValueOnBars={true}
              series={[
                {
                  key: "revenue",
                  color: "var(--tf-primary)",
                  label: `Revenue (${activeCurrency === "PKR" ? "Rs:" : activeCurrency})`,
                },
              ]}
            />
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-tf-text-muted mb-2">
              Detailed Metrics
            </h4>
            {branchData.map((branch, idx) => (
              <div
                key={branch.code}
                className="p-3 rounded-lg border border-tf-border bg-tf-surface-2/50 hover:bg-tf-surface-2 transition-colors"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-tf-border text-xs font-bold text-tf-text-secondary">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm text-tf-text-primary">
                      {branch.name}
                    </span>
                  </div>
                  <div
                    className={`text-xs font-medium ${branch.growth >= 0 ? "text-tf-success" : "text-tf-danger"}`}
                  >
                    {branch.growth >= 0 ? "+" : ""}
                    {branch.growth}%
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-tf-text-muted">
                      <TrendingUp className="w-3 h-3" /> Revenue
                    </span>
                    <span className="text-xs font-semibold text-tf-text-primary">
                      {formatCurrency(branch.revenue, activeCurrency, true)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-tf-text-muted">
                      <DollarSign className="w-3 h-3" /> Profit
                    </span>
                    <span className="text-xs font-semibold text-tf-success">
                      {formatCurrency(branch.profit, activeCurrency, true)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-tf-text-muted">
                      <CreditCard className="w-3 h-3" /> Expenses
                    </span>
                    <span className="text-xs font-semibold text-tf-danger">
                      {formatCurrency(branch.expenses, activeCurrency, true)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-tf-text-muted">
                      <Users className="w-3 h-3" /> Staff
                    </span>
                    <span className="text-xs font-semibold text-tf-text-primary">
                      {branch.staff} agents
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
