"use client";

import { useState, useMemo } from "react";
import { Users, TrendingUp, DollarSign, CreditCard, Building2, ChevronDown, CheckCircle2, ArrowUpRight, ArrowDownRight, Percent, Award } from "lucide-react";
import { formatCurrency, formatShort } from "@/lib/utils";
import { useBranchStore } from "@/store/branch.store";

interface BranchData {
  name: string;
  code: string;
  revenue: number;
  profit: number;
  expenses: number;
  staff: number;
  growth: number;
}

export function BranchPerformance({
  isLoading,
  data,
}: {
  isLoading: boolean;
  data?: BranchData[];
}) {
  const activeCurrency = useBranchStore((state) => state.activeCurrency);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);


  const branchList = useMemo(() => {
    return data && data.length > 0 ? data : [];
  }, [data]);

  // Try to match active branch if possible, otherwise default to first branch
  const initialIndex = useMemo(() => {
    if (activeBranchId && activeBranchId !== "all") {
      const idx = branchList.findIndex(
        (b) => b.code?.toLowerCase() === activeBranchId.toLowerCase() ||
          b.name?.toLowerCase().includes(activeBranchId.toLowerCase())
      );
      if (idx !== -1) return idx;
    }
    return 0;
  }, [branchList, activeBranchId]);

  const [selectedIndex, setSelectedIndex] = useState<number>(initialIndex);

  const selectedBranch = branchList[selectedIndex] || branchList[0] || defaultData[0];

  const profitMargin = useMemo(() => {
    if (!selectedBranch.revenue || selectedBranch.revenue === 0) return 0;
    return Math.round((selectedBranch.profit / selectedBranch.revenue) * 100);
  }, [selectedBranch]);

  const netIncome = useMemo(() => {
    return Math.max(0, selectedBranch.profit - selectedBranch.expenses);
  }, [selectedBranch]);

  const revPerAgent = useMemo(() => {
    if (!selectedBranch.staff || selectedBranch.staff === 0) return selectedBranch.revenue;
    return Math.round(selectedBranch.revenue / selectedBranch.staff);
  }, [selectedBranch]);

  // Proportions for visual breakdown bar
  const totalFinancialVolume = (selectedBranch.revenue || 0) + (selectedBranch.expenses || 0);
  const revPercent = totalFinancialVolume > 0 ? Math.min(100, Math.round((selectedBranch.revenue / totalFinancialVolume) * 100)) : 100;
  const expPercent = 100 - revPercent;

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 h-full min-h-[480px] shadow-sm flex flex-col justify-between">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-tf-primary/10 text-tf-primary border border-tf-primary/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="tf-h3 text-tf-text-primary leading-tight">Branch Performance</h3>
              <p className="text-xs text-tf-text-secondary">Single branch analytics & financial health</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {branchList.length > 1 ? (
              <div className="relative inline-block">
                <select
                  aria-label="Select branch"
                  value={selectedIndex}
                  onChange={(e) => setSelectedIndex(Number(e.target.value))}
                  className="appearance-none bg-tf-surface-2 border border-tf-border hover:border-tf-primary/50 text-tf-text-primary text-xs font-semibold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-1 focus:ring-tf-primary cursor-pointer transition-all shadow-xs"
                >
                  {branchList.map((branch, idx) => (
                    <option key={branch.code || idx} value={idx}>
                      {branch.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-tf-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            ) : (
              <span className="text-xs font-semibold px-2.5 py-1 bg-tf-surface-2 border border-tf-border text-tf-text-primary rounded-lg">
                {selectedBranch.name}
              </span>
            )}
            <span className="text-[11px] font-medium px-2.5 py-1 bg-tf-primary-soft text-tf-primary rounded-full">
              This Month
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 w-full bg-tf-surface-2 animate-pulse rounded-lg my-4" />
      ) : (
        <div className="flex flex-col flex-1 gap-5 mt-4">
          {/* Highlight Overview Hero Card */}
          <div className="rounded-xl border border-tf-border bg-gradient-to-br from-tf-surface to-tf-surface-2/60 p-4 shadow-2xs relative overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tf-text-muted">
                  Branch Overview
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <h4 className="text-lg font-bold text-tf-text-primary tracking-tight">
                    {selectedBranch.name}
                  </h4>
                  {selectedBranch.code && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-tf-border/60 text-tf-text-secondary">
                      {selectedBranch.code}
                    </span>
                  )}
                </div>
              </div>

              {/* Growth Pill */}
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${selectedBranch.growth >= 0
                  ? "bg-tf-success/10 text-tf-success border-tf-success/30"
                  : "bg-tf-danger/10 text-tf-danger border-tf-danger/30"
                  }`}
              >
                {selectedBranch.growth >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 stroke-[2.5]" />
                )}
                <span>
                  {selectedBranch.growth >= 0 ? "+" : ""}
                  {selectedBranch.growth}% MoM
                </span>
              </div>
            </div>

            {/* Total Revenue Highlight */}
            <div className="mt-4 pt-3 border-t border-tf-border/60 flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <span className="text-xs text-tf-text-muted">Total Monthly Revenue</span>
                <div className="text-2xl font-extrabold text-tf-text-primary tracking-tight mt-0.5">
                  {formatCurrency(selectedBranch.revenue, activeCurrency, true)}
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-tf-text-muted">Active Staff</span>
                <div className="text-sm font-semibold text-tf-text-primary flex items-center justify-end gap-1.5 mt-0.5">
                  <Users className="w-3.5 h-3.5 text-tf-primary" />
                  <span>{selectedBranch.staff} {selectedBranch.staff === 1 ? "Agent" : "Agents"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Profit Card */}
            <div className="p-3.5 rounded-xl border border-tf-border bg-tf-surface-2/40 hover:bg-tf-surface-2/70 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-tf-text-muted uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-tf-success" /> Gross Profit
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-tf-success/15 text-tf-success">
                  {profitMargin}% margin
                </span>
              </div>
              <div className="text-base font-bold text-tf-success">
                {formatCurrency(selectedBranch.profit, activeCurrency, true)}
              </div>
            </div>

            {/* Expenses Card */}
            <div className="p-3.5 rounded-xl border border-tf-border bg-tf-surface-2/40 hover:bg-tf-surface-2/70 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-tf-text-muted uppercase tracking-wider flex items-center gap-1">
                  <CreditCard className="w-3.5 h-3.5 text-tf-danger" /> Expenses
                </span>
              </div>
              <div className="text-base font-bold text-tf-danger">
                {formatCurrency(selectedBranch.expenses, activeCurrency, true)}
              </div>
            </div>

            {/* Net Operating Income */}
            <div className="p-3.5 rounded-xl border border-tf-border bg-tf-surface-2/40 hover:bg-tf-surface-2/70 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-tf-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-tf-primary" /> Net Return
                </span>
              </div>
              <div className="text-base font-bold text-tf-text-primary">
                {formatCurrency(netIncome, activeCurrency, true)}
              </div>
            </div>

            {/* Revenue per Agent */}
            <div className="p-3.5 rounded-xl border border-tf-border bg-tf-surface-2/40 hover:bg-tf-surface-2/70 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium text-tf-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5 text-amber-500" /> Rev / Agent
                </span>
              </div>
              <div className="text-base font-bold text-tf-text-primary">
                {formatCurrency(revPerAgent, activeCurrency, true)}
              </div>
            </div>
          </div>

          {/* Financial Balance Distribution Progress Bar */}
          <div className="rounded-xl border border-tf-border p-4 bg-tf-surface">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-tf-text-primary flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-tf-primary" /> Financial Distribution
              </span>
              <span className="text-[11px] text-tf-text-muted">Revenue vs Expenses</span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-tf-surface-2 overflow-hidden flex">
              <div
                style={{ width: `${revPercent}%` }}
                className="bg-tf-primary h-full transition-all duration-500 rounded-l-full"
                title={`Revenue: ${revPercent}%`}
              />
              <div
                style={{ width: `${expPercent}%` }}
                className="bg-tf-danger/80 h-full transition-all duration-500 rounded-r-full"
                title={`Expenses: ${expPercent}%`}
              />
            </div>

            <div className="flex items-center justify-between mt-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tf-primary inline-block" />
                <span className="text-tf-text-secondary">
                  Revenue ({formatShort(selectedBranch.revenue)})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-tf-danger/80 inline-block" />
                <span className="text-tf-text-secondary">
                  Expenses ({formatShort(selectedBranch.expenses)})
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

