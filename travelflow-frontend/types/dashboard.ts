export interface DashboardStats {
  totalLeads: number;
  totalCustomers: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  totalExpenses: number;
  activeBookings: number;
  
  trends: {
    leads: number;
    customers: number;
    revenue: number;
    profit: number;
    expenses: number;
    bookings: number;
  };
  
  sparklines: {
    leads: number[];
    customers: number[];
    revenue: number[];
    profit: number[];
    expenses: number[];
    bookings: number[];
  };
  
  recentActivities?: {
    id: string;
    type: string;
    title: string;
    detail: string;
    time: string | Date;
  }[];

  profitByCategory?: {
    name: string;
    value: number;
  }[];

  branchPerformance?: {
    name: string;
    code: string;
    revenue: number;
    profit: number;
    expenses: number;
    staff: number;
    growth: number;
  }[];
}
