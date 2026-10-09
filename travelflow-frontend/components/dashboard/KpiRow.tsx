"use client";

import { UserPlus, Users, TrendingUp, DollarSign, CreditCard, Plane } from "lucide-react";
import { KpiCard } from "./KpiCard";
import { DashboardStats } from "@/types";

interface KpiRowProps {
  data: DashboardStats | null;
  isLoading: boolean;
}

export function KpiRow({ data, isLoading }: KpiRowProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-[7.5rem] rounded-xl bg-tf-surface-2 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <KpiCard
        label="Total Leads"
        value={data.totalLeads}
        trend={data.trends.leads}
        trendLabel="vs last month"
        icon={UserPlus}
        cardColor="blue"
        sparklineData={data.sparklines.leads}
      />
      <KpiCard
        label="Total Customers"
        value={data.totalCustomers}
        trend={data.trends.customers}
        trendLabel="vs last month"
        icon={Users}
        cardColor="teal"
        sparklineData={data.sparklines.customers}
      />
      <KpiCard
        label="Monthly Revenue"
        value={data.monthlyRevenue}
        isCurrency={true}
        trend={data.trends.revenue}
        trendLabel="vs last month"
        icon={TrendingUp}
        cardColor="amber"
        sparklineData={data.sparklines.revenue}
      />
      <KpiCard
        label="Monthly Profit"
        value={data.monthlyProfit}
        isCurrency={true}
        trend={data.trends.profit}
        trendLabel="vs last month"
        icon={DollarSign}
        cardColor="violet"
        sparklineData={data.sparklines.profit}
      />
      <KpiCard
        label="Total Expenses"
        value={data.totalExpenses}
        isCurrency={true}
        trend={data.trends.expenses}
        trendLabel="vs last month"
        icon={CreditCard}
        cardColor="slate"
        sparklineData={data.sparklines.expenses}
      />
      <KpiCard
        label="Active Bookings"
        value={data.activeBookings}
        trend={data.trends.bookings}
        trendLabel="vs last month"
        icon={Plane}
        cardColor="coral"
        sparklineData={data.sparklines.bookings}
      />
    </div>
  );
}
