"use client";

import { AreaChart } from "@/components/charts/AreaChart";
import { FilterSelect } from "@/components/shared/FilterSelect";
import { useState } from "react";

export function RevenueChart({
  data,
  isLoading,
}: {
  data: any;
  isLoading: boolean;
}) {
  const [period, setPeriod] = useState("6m");
  // Generate monthly data from sparklines
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const currentMonth = new Date().getMonth();
  const chartData = [];

  if (data && data.revenue && data.profit) {
    for (let i = 0; i < 7; i++) {
      // data.revenue is an array of last 7 months, where index 0 is 6 months ago, and index 6 is current month
      const monthIndex = (currentMonth - 6 + i + 12) % 12;
      chartData.push({
        name: monthNames[monthIndex],
        revenue: data.revenue[i] || 0,
        profit: data.profit[i] || 0,
      });
    }
  }

  return (
    <div className="bg-tf-surface border border-tf-border rounded-xl p-6 h-full shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="tf-h3 text-tf-text-primary">Revenue vs Profit</h3>
          <p className="text-sm text-tf-text-secondary">
            Last 6 months performance
          </p>
        </div>
        <FilterSelect
          value={period}
          onValueChange={setPeriod}
          options={[
            { value: "6m", label: "Last 6 Months" },
            { value: "year", label: "This Year" },
          ]}
          triggerClassName="bg-tf-surface-2 rounded-md"
        />
      </div>

      {isLoading ? (
        <div className="w-full h-[300px] bg-tf-surface-2 animate-pulse rounded-md" />
      ) : (
        <AreaChart
          data={chartData}
          series={[
            { key: "revenue", color: "var(--tf-primary)", label: "Revenue" },
            { key: "profit", color: "var(--tf-success)", label: "Profit" },
          ]}
        />
      )}
    </div>
  );
}
