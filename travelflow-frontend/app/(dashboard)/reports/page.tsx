"use client";

import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  GitBranch,
  Calendar,
} from "lucide-react";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { FormSelect, FormCombobox } from "@/components/forms/FormField";
import { useForm, useWatch } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { formatCurrency } from "@/lib/utils";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { useAnalytics } from "@/features/finance/hooks/queries";
import { useBranches } from "@/features/shared/hooks/queries";

// Define the expected API response type
interface AnalyticsResponse {
  kpis: {
    totalRevenue: number;
    totalProfit: number;
    totalBookings: number;
    profitMargin: string;
  };
  revenueData: { name: string; revenue: number; profit: number }[];
  leadSourceData: { name: string; value: number; color: string }[];
  branchData: { name: string; bookings: number }[];
}

export default function ReportsPage() {
  const { user } = useAuthStore();
  const activeCurrency = useBranchStore(state => state.activeCurrency);
  const userRole = user?.role?.toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "owner";

  const form = useForm({
    defaultValues: {
      timeRange: "6m",
      branchId: isAdmin ? "all" : String(user?.branchId || "all"),
    },
  });

  const timeRange = useWatch({ control: form.control, name: "timeRange" });
  const branchId = useWatch({ control: form.control, name: "branchId" });

  const { data: branches = [] } = useBranches();
  const {
    data: rawData,
    isLoading,
    isFetching,
  } = useAnalytics({
    timeRange,
    branchId: branchId === "all" ? undefined : branchId,
  });

  const data = rawData as AnalyticsResponse | undefined;
  const kpis = data?.kpis || {
    totalRevenue: 0,
    totalProfit: 0,
    totalBookings: 0,
    profitMargin: "0",
  };
  const revenueData = data?.revenueData || [];
  const leadSourceData = data?.leadSourceData || [];
  const branchData = data?.branchData || [];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-tf-surface p-6 rounded-xl border border-tf-border shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="tf-h2 text-tf-text-primary">Reports & Analytics</h1>
            <p className="tf-body text-tf-text-secondary">
              Business intelligence and performance insights.
            </p>
          </div>
        </div>

        <Form {...form}>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {isAdmin && (
              <div className="w-52">
                <FormCombobox
                  label="Branches"
                  control={form.control}
                  name="branchId"
                  options={[
                    { label: "All Branches", value: "all" },
                    ...branches.map(b => ({ label: b.name, value: b.id }))
                  ]}
                />
              </div>
            )}
            <div className="w-40">
              <FormSelect
                label="Time Range"
                control={form.control}
                name="timeRange"
                options={[
                  { label: "Last 30 Days", value: "30d" },
                  { label: "Last 6 Months", value: "6m" },
                  { label: "This Year", value: "1y" },
                  { label: "All Time", value: "all" },
                ]}
              />
            </div>
          </div>
        </Form>
      </div>

      {isLoading && !data ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-tf-surface-2 h-32 rounded-xl border border-tf-border"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-tf-surface-2 h-96 rounded-xl border border-tf-border" />
            <div className="bg-tf-surface-2 h-96 rounded-xl border border-tf-border" />
            <div className="lg:col-span-3 bg-tf-surface-2 h-96 rounded-xl border border-tf-border" />
          </div>
        </div>
      ) : data ? (
        <div className={`space-y-6 transition-opacity duration-200 ${isFetching ? "opacity-60" : ""}`}>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="tf-h4 text-tf-text-secondary">Total Revenue</h3>
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-tf-text-primary">
            {formatCurrency(kpis.totalRevenue, activeCurrency, true)}
          </p>
        </div>

        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="tf-h4 text-tf-text-secondary">Net Profit</h3>
            <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-violet-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-tf-text-primary">
            {formatCurrency(kpis.totalProfit, activeCurrency, true)}
          </p>
        </div>

        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="tf-h4 text-tf-text-secondary">Total Bookings</h3>
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-tf-text-primary">
            {kpis.totalBookings}
          </p>
        </div>

        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="tf-h4 text-tf-text-secondary">Profit Margin</h3>
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-tf-text-primary">
            {kpis.profitMargin}%
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Chart */}
        <div className="lg:col-span-2 bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
          <h3 className="tf-h3 text-tf-text-primary mb-6">Revenue vs Profit</h3>
          {revenueData.length > 0 ? (
            <AreaChart
              data={revenueData}
              xKey="name"
              height={350}
              series={[
                {
                  key: "revenue",
                  label: "Revenue",
                  color: "var(--tf-primary)",
                },
                { key: "profit", label: "Profit", color: "#8b5cf6" },
              ]}
            />
          ) : (
            <div className="flex items-center justify-center h-[350px] text-tf-text-muted">
              No data for selected period
            </div>
          )}
        </div>

        {/* Lead Sources Donut */}
        <div className="bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm flex flex-col">
          <h3 className="tf-h3 text-tf-text-primary mb-2">Leads by Source</h3>
          {leadSourceData.length > 0 ? (
            <>
              <div className="flex-1 min-h-[300px]">
                <DonutChart
                  data={leadSourceData}
                  height={300}
                  centerValue={leadSourceData
                    .reduce((s: number, d) => s + d.value, 0)
                    .toString()}
                  centerLabel="Total Leads"
                />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                {leadSourceData.map((s: { name: string; value: number; color: string }) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-sm text-tf-text-secondary">
                      {s.name} ({s.value})
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center flex-1 text-tf-text-muted">
              No data available
            </div>
          )}
        </div>

        {/* Branch Performance Bar Chart */}
        {isAdmin && (
          <div className="lg:col-span-3 bg-tf-surface rounded-xl border border-tf-border p-6 shadow-sm">
            <h3 className="tf-h3 text-tf-text-primary mb-6">
              Bookings by Branch
            </h3>
            {branchData.length > 0 ? (
              <BarChart
                data={branchData}
                xKey="name"
                height={300}
                showValueOnBars={true}
                series={[
                  {
                    key: "bookings",
                    label: "Total Bookings",
                    color: "var(--tf-primary)",
                  },
                ]}
              />
            ) : (
              <div className="flex items-center justify-center h-[300px] text-tf-text-muted">
                No data available
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null}
    </div>
  );
}
