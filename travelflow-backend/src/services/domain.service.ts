import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { generateRef } from "../utils/refGenerator";
import { buildIdOrRefFilter } from "../utils/serialize";
import { invalidateRolePermissionsCache } from "../middleware/role.middleware";
import {
  countryForCity,
  normalizePhone,
  userDisplayName,
} from "../utils/helpers";
import * as notificationService from "./notification.service";
import {
  postCustomerPaymentJournal,
  postSupplierPaymentJournal,
  postExpenseJournal,
} from "./accounting.service";
import * as mapping from "./accounting-mapping.service";
import {
  calculateServiceFinancials,
  aggregateServiceFinancials,
  type TaxTreatment,
} from "../lib/financial-calculator";
import type { z } from "zod";
import type {
  leadSchema,
  leadActivitySchema,
  customerSchema,
  bookingSchema,
  supplierSchema,
  expenseSchema,
  userSchema,
  convertLeadSchema,
} from "../validators/schemas";

type LeadInput = z.infer<typeof leadSchema>;
type LeadActivityInput = z.infer<typeof leadActivitySchema>;
type CustomerInput = z.infer<typeof customerSchema>;
type BookingInput = z.infer<typeof bookingSchema>;
type ConvertLeadInput = z.infer<typeof convertLeadSchema>;
type SupplierInput = z.infer<typeof supplierSchema>;
type ExpenseInput = z.infer<typeof expenseSchema>;
type UserInput = z.infer<typeof userSchema>;

import type { branchSchema } from "../validators/schemas";
type BranchInput = z.infer<typeof branchSchema>;

export interface PaginationOptions {
  page: number;
  limit: number;
}

export interface DateFilterOptions {
  startDate?: string;
  endDate?: string;
}

export interface AgencyContext {
  agencyId: string;
  branchId?: string;
  userRole?: string;
  userBranchId?: string;
  callerId?: string;
  callerRole?: string;
}

export function agencyScope(ctx: string | AgencyContext) {
  if (typeof ctx === "string") {
    return { agencyId: ctx, isDeleted: false } as const;
  }
  const filter: { agencyId: string; isDeleted: boolean; branchId?: string } = {
    agencyId: ctx.agencyId,
    isDeleted: false,
  };

  if (ctx.userRole === "admin") {
    if (ctx.branchId && ctx.branchId !== "all") {
      filter.branchId = ctx.branchId;
    }
  } else {
    if (ctx.userBranchId) {
      filter.branchId = ctx.userBranchId;
    }
  }

  return filter;
}

// Like agencyScope() but without branchId — for models that don't have it (Customer, Supplier, Role, etc.)
export function agencyScoped(ctx: string | AgencyContext) {
  const { branchId, ...rest } = agencyScope(ctx) as any;
  return rest;
}

async function getDefaultBranchId(agencyId: string): Promise<string> {
  const branch = await prisma.branch.findFirst({
    where: { agencyId, isDeleted: false, isHeadOffice: true },
  });
  if (branch) return branch.id;
  const anyBranch = await prisma.branch.findFirst({
    where: { agencyId, isDeleted: false },
  });
  if (!anyBranch)
    throw ApiError.badRequest("No branch configured for this agency");
  return anyBranch.id;
}

async function enrichLead(doc: any) {
  const leadId = doc.id;
  const agencyId = doc.agencyId;
  const activities = await prisma.leadActivity.findMany({
    where: { leadId, agencyId },
    orderBy: { createdAt: "desc" },
  });
  return { ...doc, activities };
}

async function enrichLeadsBatch(docs: any[]) {
  const leadIds = docs.map((j) => j.id);
  const agencyId = docs[0]?.agencyId;

  const activities = await prisma.leadActivity.findMany({
    where: { leadId: { in: leadIds }, agencyId },
    orderBy: { createdAt: "desc" },
  });

  const activitiesMap = new Map<string, any[]>();
  for (const act of activities) {
    if (!activitiesMap.has(act.leadId)) {
      activitiesMap.set(act.leadId, []);
    }
    activitiesMap.get(act.leadId)!.push(act);
  }

  return docs.map((doc) => ({
    ...doc,
    activities: activitiesMap.get(doc.id) || [],
  }));
}

async function enrichCustomer(doc: any, ctx: string | AgencyContext) {
  const customerId = doc.id;
  const base =
    typeof ctx === "string"
      ? { agencyId: ctx, isDeleted: false }
      : { agencyId: ctx.agencyId, isDeleted: false };

  const bookings = await prisma.booking.findMany({
    where: { ...base, customerId },
  });

  const bookingIds = bookings.map((b) => b.id);
  const services = await prisma.bookingService.findMany({
    where: { ...base, bookingId: { in: bookingIds } },
  });
  const totalSpent = services.reduce(
    (sum, s) => sum + (s.customerTotal > 0 ? s.customerTotal : s.sellingPrice + (s.taxAmount || 0)),
    0
  );

  return {
    ...doc,
    totalBookings: bookings.length,
    totalSpent,
    country: (doc.country as string) ?? "Pakistan",
  };
}

async function enrichCustomersBatch(docs: any[], ctx: string | AgencyContext) {
  const customerIds = docs.map((j) => j.id);
  const base =
    typeof ctx === "string"
      ? { agencyId: ctx, isDeleted: false }
      : { agencyId: ctx.agencyId, isDeleted: false };

  const bookings = await prisma.booking.findMany({
    where: { ...base, customerId: { in: customerIds } },
    select: { id: true, customerId: true },
  });

  const bookingIds = bookings.map((b) => b.id);
  const services = await prisma.bookingService.findMany({
    where: { ...base, bookingId: { in: bookingIds } },
    select: { bookingId: true, sellingPrice: true, taxAmount: true, customerTotal: true },
  });

  const bookingToCustomer = new Map(bookings.map((b) => [b.id, b.customerId]));
  const statsMap = new Map<
    string,
    { totalBookings: number; totalSpent: number }
  >();

  for (const cid of customerIds) {
    statsMap.set(cid, { totalBookings: 0, totalSpent: 0 });
  }
  for (const b of bookings) {
    const stat = statsMap.get(b.customerId);
    if (stat) stat.totalBookings++;
  }
  for (const s of services) {
    const cid = bookingToCustomer.get(s.bookingId);
    if (cid) {
      const stat = statsMap.get(cid);
      if (stat) {
        const amt = s.customerTotal > 0 ? s.customerTotal : s.sellingPrice + (s.taxAmount || 0);
        stat.totalSpent += amt;
      }
    }
  }

  return docs.map((doc) => {
    const stat = statsMap.get(doc.id) || { totalBookings: 0, totalSpent: 0 };
    return {
      ...doc,
      totalBookings: stat.totalBookings,
      totalSpent: stat.totalSpent,
      country: (doc.country as string) ?? "Pakistan",
    };
  });
}

const defaultBookingInclude = {
  customer: true,
  agent: true,
  branch: true,
  services: {
    orderBy: { sortOrder: "asc" as const },
    include: { supplier: true },
  },
  travelers: {
    orderBy: { createdAt: "asc" as const },
  },
};

async function enrichBooking(doc: any, ctx: string | AgencyContext) {
  const base =
    typeof ctx === "string"
      ? { agencyId: ctx, isDeleted: false }
      : { agencyId: ctx.agencyId, isDeleted: false };

  // Reuse relations if already eagerly loaded (prevents N+1 database queries)
  const customer =
    doc.customer !== undefined
      ? doc.customer
      : doc.customerId
        ? await prisma.customer.findFirst({ where: { id: doc.customerId, ...base } })
        : null;

  const agent =
    doc.agent !== undefined
      ? doc.agent
      : doc.agentId
        ? await prisma.user.findFirst({ where: { id: doc.agentId, ...base } })
        : null;

  const branch =
    doc.branch !== undefined
      ? doc.branch
      : doc.branchId
        ? await prisma.branch.findFirst({ where: { id: doc.branchId, ...base } })
        : null;

  const services =
    doc.services !== undefined
      ? doc.services
      : await prisma.bookingService.findMany({
          where: { bookingId: doc.id, ...base },
          orderBy: { sortOrder: "asc" },
          include: { supplier: true },
        });

  const travelers =
    doc.travelers !== undefined
      ? doc.travelers
      : await prisma.bookingTraveler.findMany({
          where: { bookingId: doc.id, ...base },
          orderBy: { createdAt: "asc" },
        });

  const financials = aggregateServiceFinancials(services);

  return {
    ...doc,
    customer: customer || undefined,
    agent: agent ? { id: agent.id, name: userDisplayName(agent) } : undefined,
    branch: branch ? { id: branch.id, name: branch.name } : undefined,
    services,
    travelers,
    totalCost: financials.totalCost,
    totalSell: financials.totalSell,
    totalProfit: financials.totalProfit,
    profitMargin: financials.profitMargin,
    totalTax: financials.totalTax,
    totalCustomerPayable: financials.totalCustomerPayable,
    totalExpectedMargin: financials.totalExpectedMargin,
  };
}

export function applyDateFilter(
  filter: any,
  dates?: DateFilterOptions,
  field: string = "createdAt",
) {
  if (dates?.startDate || dates?.endDate) {
    filter[field] = {};
    if (dates.startDate) filter[field].gte = new Date(dates.startDate);
    if (dates.endDate) filter[field].lte = new Date(dates.endDate);
  }
}

export async function getDashboardStats(
  ctx: AgencyContext,
  dates?: DateFilterOptions,
) {
  const base = agencyScope(ctx);

  let curStart: Date;
  let curEnd: Date;
  let prevStart: Date;
  let prevEnd: Date;

  if (dates?.startDate && dates?.endDate) {
    curStart = new Date(dates.startDate);
    curEnd = new Date(dates.endDate);
    const duration = curEnd.getTime() - curStart.getTime();
    prevStart = new Date(curStart.getTime() - duration - 1);
    prevEnd = new Date(curStart.getTime() - 1);
  } else {
    curEnd = new Date();
    curStart = new Date();
    curStart.setDate(curStart.getDate() - 30);
    
    prevEnd = new Date(curStart);
    prevEnd.setMilliseconds(prevEnd.getMilliseconds() - 1);
    
    prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - 30);
  }

  const baseWhere = {
    agencyId: base.agencyId,
    isDeleted: false,
    ...("branchId" in base && base.branchId ? { branchId: base.branchId } : {}),
  };

  const customerWhere = {
    agencyId: base.agencyId,
    isDeleted: false,
  };

  const [
    leads,
    customers,
    currentBookings,
    _curIdsPlaceholder,
    _curServicesPlaceholder,
    currentExpenses,
    activities,
    prevMonthBookings,
    _prevIdsPlaceholder,
    _prevServicesPlaceholder,
    prevMonthExpenses,
    prevMonthLeads,
    prevMonthCustomers,
    branches,
    branchUserCounts,
  ] = await Promise.all([
    prisma.lead.count({
      where: { ...baseWhere, createdAt: { gte: curStart, lte: curEnd } },
    }),
    prisma.customer.count({
      where: { ...customerWhere, createdAt: { gte: curStart, lte: curEnd } },
    }),
    prisma.booking.findMany({
      where: { ...baseWhere, createdAt: { gte: curStart, lte: curEnd } },
    }),
    prisma.booking.findMany({
      where: { ...baseWhere, createdAt: { gte: curStart, lte: curEnd } },
      select: { id: true },
    }),
    prisma.bookingService.findMany({
      where: {
        agencyId: base.agencyId,
        isDeleted: false,
        bookingId: { in: [] as string[] },
      },
    }),
    prisma.expense.findMany({
      where: { ...baseWhere, date: { gte: curStart, lte: curEnd } },
    }),
    prisma.recentActivity.findMany({
      where: {
        agencyId: base.agencyId,
        createdAt: { gte: curStart, lte: curEnd },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.booking.findMany({
      where: { ...baseWhere, createdAt: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.booking.findMany({
      where: { ...baseWhere, createdAt: { gte: prevStart, lte: prevEnd } },
      select: { id: true },
    }),
    prisma.bookingService.findMany({
      where: {
        agencyId: base.agencyId,
        isDeleted: false,
        bookingId: { in: [] as string[] },
      },
    }),
    prisma.expense.findMany({
      where: { ...baseWhere, date: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.lead.count({
      where: { ...baseWhere, createdAt: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.customer.count({
      where: { ...customerWhere, createdAt: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.branch.findMany({
      where: { agencyId: base.agencyId, isDeleted: false },
    }),
    prisma.user.groupBy({
      by: ["branchId"],
      where: { agencyId: base.agencyId, isDeleted: false },
      _count: { id: true },
    }),
  ]);

  
  const sparklineStart = new Date(curEnd.getFullYear(), curEnd.getMonth() - 6, 1);
  const [sparkBookings, sparkExpenses, sparkLeads, sparkCustomers] = await Promise.all([
    prisma.booking.findMany({ where: { ...baseWhere, createdAt: { gte: sparklineStart, lte: curEnd } }, select: { id: true, createdAt: true } }),
    prisma.expense.findMany({ where: { ...baseWhere, date: { gte: sparklineStart, lte: curEnd } }, select: { amount: true, date: true } }),
    prisma.lead.findMany({ where: { ...baseWhere, createdAt: { gte: sparklineStart, lte: curEnd } }, select: { createdAt: true } }),
    prisma.customer.findMany({ where: { ...customerWhere, createdAt: { gte: sparklineStart, lte: curEnd } }, select: { createdAt: true } })
  ]);
  
  const sparkBookingIds = sparkBookings.map(b => b.id);
  const sparkServices = sparkBookingIds.length > 0 ? await prisma.bookingService.findMany({
    where: { agencyId: base.agencyId, isDeleted: false, bookingId: { in: sparkBookingIds } }
  }) : [];

  const curBookingIdList = currentBookings.map((b) => b.id);

  const prevBookingIdList = prevMonthBookings.map((b) => b.id);

  const [curServices, prevServices] = await Promise.all([
    curBookingIdList.length > 0
      ? prisma.bookingService.findMany({
        where: {
          agencyId: base.agencyId,
          isDeleted: false,
          bookingId: { in: curBookingIdList },
        },
      })
      : Promise.resolve([]),
    prevBookingIdList.length > 0
      ? prisma.bookingService.findMany({
        where: {
          agencyId: base.agencyId,
          isDeleted: false,
          bookingId: { in: prevBookingIdList },
        },
      })
      : Promise.resolve([]),
  ]);

  const curRevenue = curServices.reduce((s, svc) => s + svc.sellingPrice, 0);
  const curCost = curServices.reduce(
    (s, svc) => s + (svc.supplierInvoiceAmount ?? svc.costPrice),
    0,
  );
  const curProfit = curRevenue - curCost;
  const curExpenses = currentExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const curBookingCount = currentBookings.length;

  const prevRevenue = prevServices.reduce((s, svc) => s + svc.sellingPrice, 0);
  const prevCost = prevServices.reduce(
    (s, svc) => s + (svc.supplierInvoiceAmount ?? svc.costPrice),
    0,
  );
  const prevProfit = prevRevenue - prevCost;
  const prevExpensesTotal = prevMonthExpenses.reduce(
    (s, e) => s + Number(e.amount),
    0,
  );
  const prevBookingCount = prevMonthBookings.length;

  function trendPct(cur: number, prev: number): number {
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Number((((cur - prev) / prev) * 100).toFixed(1));
  }

  const staffMap = new Map(
    branchUserCounts.map((u) => [
      u.branchId,
      typeof u._count === "object" ? (u._count.id ?? 0) : 0,
    ]),
  );

  const visibleBranches = (ctx.userRole === "owner" || ctx.userRole === "admin")
    ? branches
    : branches.filter((b) => b.id === ctx.userBranchId);

  const branchPerformance = visibleBranches
    .map((branch) => {
      const bId = branch.id;
      const branchBookings = currentBookings.filter((b) => b.branchId === bId);
      const branchPrevBookings = prevMonthBookings.filter(
        (b) => b.branchId === bId,
      );
      const branchExpenses = currentExpenses.filter((e) => e.branchId === bId);

      const branchBookingIds = branchBookings.map((b) => b.id);
      const branchPrevBookingIds = branchPrevBookings.map((b) => b.id);

      const branchRevenue = curServices
        .filter((s) => branchBookingIds.includes(s.bookingId))
        .reduce((sum, s) => sum + s.sellingPrice, 0);
      const branchCost = curServices
        .filter((s) => branchBookingIds.includes(s.bookingId))
        .reduce((sum, s) => sum + (s.supplierInvoiceAmount ?? s.costPrice), 0);
      const branchProfit = branchRevenue - branchCost;
      const prevBranchRevenue = prevServices
        .filter((s) => branchPrevBookingIds.includes(s.bookingId))
        .reduce((sum, s) => sum + s.sellingPrice, 0);
      const expensesTotal = branchExpenses.reduce(
        (s, e) => s + Number(e.amount),
        0,
      );

      return {
        name: branch.name,
        code: branch.code,
        revenue: branchRevenue,
        profit: branchProfit,
        expenses: expensesTotal,
        staff: staffMap.get(bId) || 0,
        growth: trendPct(branchRevenue, prevBranchRevenue),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  
  // Calculate Sparklines (7 months)
  const sparklines = {
    leads: [0, 0, 0, 0, 0, 0, 0],
    customers: [0, 0, 0, 0, 0, 0, 0],
    revenue: [0, 0, 0, 0, 0, 0, 0],
    profit: [0, 0, 0, 0, 0, 0, 0],
    expenses: [0, 0, 0, 0, 0, 0, 0],
    bookings: [0, 0, 0, 0, 0, 0, 0],
  };

  const getMonthIdx = (d: string | Date) => {
    const date = new Date(d);
    let diff = (curEnd.getFullYear() - date.getFullYear()) * 12 + (curEnd.getMonth() - date.getMonth());
    if (diff < 0 || diff > 6) return -1;
    return 6 - diff;
  };

  sparkLeads.forEach(x => { const idx = getMonthIdx(x.createdAt); if (idx >= 0) sparklines.leads[idx]++; });
  sparkCustomers.forEach(x => { const idx = getMonthIdx(x.createdAt); if (idx >= 0) sparklines.customers[idx]++; });
  sparkBookings.forEach(x => { const idx = getMonthIdx(x.createdAt); if (idx >= 0) sparklines.bookings[idx]++; });
  sparkExpenses.forEach(x => { const idx = getMonthIdx(x.date); if (idx >= 0) sparklines.expenses[idx] += Number(x.amount); });

  const serviceByBookingSpark = new Map();
  for (const s of sparkServices) {
    const arr = serviceByBookingSpark.get(s.bookingId) || [];
    arr.push(s);
    serviceByBookingSpark.set(s.bookingId, arr);
  }

  for (const b of sparkBookings) {
    const idx = getMonthIdx(b.createdAt);
    if (idx >= 0) {
      const svcs = serviceByBookingSpark.get(b.id) || [];
      const rev = svcs.reduce((sum: number, s: any) => sum + s.sellingPrice, 0);
      const cost = svcs.reduce((sum: number, s: any) => sum + (s.supplierInvoiceAmount ?? s.costPrice), 0);
      sparklines.revenue[idx] += rev;
      sparklines.profit[idx] += (rev - cost);
    }
  }

  // Calculate profit by category (using all data from last 6 months to ensure chart isn't empty)
  const categoryProfit = new Map();
  for (const s of sparkServices) {
    const p = s.sellingPrice - (s.supplierInvoiceAmount ?? s.costPrice);
    categoryProfit.set(s.serviceCategory, (categoryProfit.get(s.serviceCategory) || 0) + p);
  }
  const profitByCategory = Array.from(categoryProfit.entries()).map(([name, value]) => ({ name, value }));

  return {
    profitByCategory,
    totalLeads: leads,
    totalCustomers: customers,
    monthlyRevenue: curRevenue,
    monthlyProfit: curProfit,
    totalExpenses: curExpenses,
    activeBookings: currentBookings.filter(
      (b) => b.bookingStatus === "confirmed",
    ).length,
    trends: {
      leads: trendPct(leads, prevMonthLeads),
      customers: trendPct(customers, prevMonthCustomers),
      revenue: trendPct(curRevenue, prevRevenue),
      profit: trendPct(curProfit, prevProfit),
      expenses: trendPct(curExpenses, prevExpensesTotal),
      bookings: trendPct(curBookingCount, prevBookingCount),
    },
    sparklines,
    branchPerformance,
    recentActivities: activities.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      detail: a.detail,
      time: a.createdAt,
    })),
  };
}

export async function getAnalyticsStats(ctx: AgencyContext, timeRange: string) {
  const baseFilter = agencyScope(ctx);

  const now = new Date();
  const startDate = new Date();
  if (timeRange === "30d") startDate.setDate(now.getDate() - 30);
  else if (timeRange === "6m") startDate.setMonth(now.getMonth() - 6);
  else if (timeRange === "1y") startDate.setFullYear(now.getFullYear() - 1);
  else startDate.setFullYear(2000);

  const bookings = await prisma.booking.findMany({
    where: { ...baseFilter, createdAt: { gte: startDate, lte: now } } as any,
  });
  const bookingIds = bookings.map((b) => b.id);
  const services =
    bookingIds.length > 0
      ? await prisma.bookingService.findMany({
        where: {
          agencyId: ctx.agencyId,
          isDeleted: false,
          bookingId: { in: bookingIds },
        },
      })
      : [];
  const serviceByBooking = new Map<string, typeof services>();
  for (const s of services) {
    const arr = serviceByBooking.get(s.bookingId) || [];
    arr.push(s);
    serviceByBooking.set(s.bookingId, arr);
  }

  let totalRevenue = 0;
  let totalProfit = 0;
  const totalBookings = bookings.length;

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const revenueMap = new Map<string, { revenue: number; profit: number }>();
  for (const b of bookings) {
    const bkServices = serviceByBooking.get(b.id) || [];
    const rev = bkServices.reduce((sum, s) => sum + s.sellingPrice, 0);
    const cost = bkServices.reduce(
      (sum, s) => sum + (s.supplierInvoiceAmount ?? s.costPrice),
      0,
    );
    totalRevenue += rev;
    totalProfit += rev - cost;
    const d = new Date(b.createdAt);
    const key = `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
    const existing = revenueMap.get(key) || { revenue: 0, profit: 0 };
    existing.revenue += rev;
    existing.profit += rev - cost;
    revenueMap.set(key, existing);
  }
  const profitMargin =
    totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";

  const revenueData = Array.from(revenueMap.entries()).map(([name, data]) => ({
    name,
    ...data,
  }));

  const leadSourceAgg = await prisma.lead.groupBy({
    by: ["source"],
    where: { ...baseFilter, createdAt: { gte: startDate, lte: now } } as any,
    _count: { id: true },
  });
  const colors = [
    "#2563eb",
    "#16a34a",
    "#dc2626",
    "#9333ea",
    "#ea580c",
    "#0f172a",
  ];
  const leadSourceData = leadSourceAgg.map((d, i) => ({
    name: d.source || "Unknown",
    value: d._count.id,
    color: colors[i % colors.length],
  }));

  const branchDataAgg = await prisma.booking.groupBy({
    by: ["branchId"],
    where: { ...baseFilter, createdAt: { gte: startDate, lte: now } } as any,
    _count: { id: true },
  });
  const branchNameMap = new Map(
    (
      await prisma.branch.findMany({
        where: { agencyId: baseFilter.agencyId as string },
      })
    ).map((b) => [b.id, b.name]),
  );
  const branchData = branchDataAgg.map((d) => ({
    name: branchNameMap.get(d.branchId ?? "") || "Unknown Branch",
    bookings: d._count.id,
  }));

  return {
    kpis: { totalRevenue, totalProfit, totalBookings, profitMargin },
    revenueData,
    leadSourceData,
    branchData,
  };
}

// --- Leads ---

export async function listLeads(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates);

  if (!pagination) {
    const leads = await prisma.lead.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
    const data = await enrichLeadsBatch(leads);
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        assignedAgent: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    }),
    prisma.lead.count({ where: filter }),
  ]);

  const data = await enrichLeadsBatch(leads);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getLead(ctx: AgencyContext, idOrRef: string) {
  const lead = await prisma.lead.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "leadRef"),
    } as any,
  });
  if (!lead) return null;
  return enrichLead(lead);
}

export async function createLead(
  ctx: AgencyContext,
  values: LeadInput,
  actor: string,
) {
  const agencyId = ctx.agencyId;
  const branchId = values.branchId ?? ctx.userBranchId ?? ctx.branchId ?? (await getDefaultBranchId(agencyId));
  const leadRef = await generateRef("LD", agencyId);
  const lead = await prisma.lead.create({
    data: {
      agencyId,
      leadRef,
      name: values.name,
      phone: values.phone,
      whatsapp: values.whatsapp || null,
      email: values.email || null,
      destination: values.destination,
      travelDate: values.travelDate ? new Date(values.travelDate) : null,
      budget: values.budget,
      adults: values.adults ?? 1,
      children: values.children ?? 0,
      specialRequirements: values.specialRequirements || null,
      source: values.source,
      status: values.status,
      assignedAgentId: values.assignedAgentId || null,
      branchId,
      notes: values.notes || null,
    },
  });

  await prisma.leadActivity.create({
    data: {
      agencyId,
      leadId: lead.id,
      type: "note",
      description: values.notes || "Lead captured",
      createdBy: actor,
    },
  });

  if (values.assignedAgentId) {
    try {
      await notificationService.createNotification(ctx, {
        recipientId: values.assignedAgentId,
        title: "New Lead Assigned",
        body: `You have been assigned a new lead: ${values.name}`,
        entityType: "lead",
        entityId: lead.id,
        type: "info",
      });
    } catch (e) {
      console.error("Failed to send notification", e);
    }
  }

  return enrichLead(lead);
}

export async function updateLead(
  ctx: AgencyContext,
  idOrRef: string,
  values: Partial<LeadInput>,
  actor?: string,
) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "leadRef"),
  } as any;
  const existing = await prisma.lead.findFirst({ where: filter });
  if (!existing) return null;

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: {
      ...(values.name !== undefined && { name: values.name }),
      ...(values.phone !== undefined && { phone: values.phone }),
      ...(values.whatsapp !== undefined && {
        whatsapp: values.whatsapp || null,
      }),
      ...(values.email !== undefined && { email: values.email || null }),
      ...(values.destination !== undefined && {
        destination: values.destination,
      }),
      ...(values.travelDate !== undefined && {
        travelDate: values.travelDate ? new Date(values.travelDate) : null,
      }),
      ...(values.budget !== undefined && { budget: values.budget }),
      ...(values.adults !== undefined && { adults: values.adults }),
      ...(values.children !== undefined && { children: values.children }),
      ...(values.specialRequirements !== undefined && {
        specialRequirements: values.specialRequirements || null,
      }),
      ...(values.source !== undefined && { source: values.source }),
      ...(values.status !== undefined && { status: values.status }),
      ...(values.assignedAgentId !== undefined && {
        assignedAgentId: values.assignedAgentId || null,
      }),
      ...(values.branchId !== undefined && { branchId: values.branchId }),
      ...(values.notes !== undefined && { notes: values.notes || null }),
    },
  });

  if (values.notes) {
    await prisma.leadActivity.create({
      data: {
        agencyId: lead.agencyId,
        leadId: lead.id,
        type: "note",
        description: values.notes,
        createdBy: actor || "System",
      },
    });
  }

  return enrichLead(lead);
}

export async function addLeadActivity(
  ctx: AgencyContext,
  idOrRef: string,
  values: LeadActivityInput,
  actor: string,
) {
  const lead = await prisma.lead.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "leadRef"),
    } as any,
  });
  if (!lead) throw ApiError.notFound("Lead");
  const activity = await prisma.leadActivity.create({
    data: {
      agencyId: ctx.agencyId,
      leadId: lead.id,
      type: values.type,
      description: values.description,
      outcome: values.outcome || null,
      createdBy: actor,
    },
  });
  await prisma.lead.update({
    where: { id: lead.id },
    data: { lastContactedAt: new Date() },
  });
  return activity;
}

export async function convertLead(
  ctx: AgencyContext,
  idOrRef: string,
  values: ConvertLeadInput,
  userId: string,
  actor: string,
) {
  const agencyId = ctx.agencyId;

  const lead = await prisma.lead.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "leadRef"),
    } as any,
  });
  if (!lead) throw ApiError.notFound("Lead");

  const customer = await findOrCreateCustomerFromLeadDoc(agencyId, lead);
  const branchId = values.branchId ?? lead.branchId;
  const agentId = values.agentId ?? userId;
  const bookingRef = await generateRef("BK", agencyId);

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        agencyId,
        bookingRef,
        customerId: customer.id,
        branchId,
        agentId,
        leadId: lead.id,
        sourceType: "lead",
        sourceQuotationId: null,
        title: values.title || `${lead.destination}`,
        departureDate: new Date(values.departureDate),
        returnDate: values.returnDate ? new Date(values.returnDate) : null,
        expectedAdults: values.expectedAdults ?? lead.adults ?? 1,
        expectedChildren: values.expectedChildren ?? lead.children ?? 0,
        expectedInfants: values.expectedInfants ?? 0,
        bookingStatus: "confirmed",
        paymentStatus: values.paymentStatus || "unpaid",
        notes: values.notes || null,
        terms: values.terms || null,
        termsTemplateId: values.termsTemplateId || null,
      } as any,
    });

    if (values.services && values.services.length > 0) {
      for (let i = 0; i < values.services.length; i++) {
        const svc = values.services[i];
        const costPrice = Number(svc.costPrice) || 0;
        const sellingPrice = Number(svc.sellingPrice) || 0;
        const vatRate = Number(svc.vatRate) || 0;
        const taxTreatment = (svc as any).taxTreatment || "VAT_ON_MARGIN";
        const supplierInvoiceAmount = (svc as any).supplierInvoiceAmount != null ? Number((svc as any).supplierInvoiceAmount) : undefined;
        const quantity = Number(svc.quantity) || 1;

        const financials = calculateServiceFinancials({
          costPrice,
          sellingPrice,
          quantity,
          supplierInvoiceAmount,
          taxTreatment: taxTreatment as TaxTreatment,
          vatRate,
        });

        const serviceDetails = {
          ...(svc.serviceDetails && typeof svc.serviceDetails === "object"
            ? svc.serviceDetails
            : {}),
          ...(svc.supplierName ? { supplierName: svc.supplierName } : {}),
        };

        const cleanSupplierId = svc.supplierId
          ? String(svc.supplierId).trim()
          : null;
        await tx.bookingService.create({
          data: {
            agencyId,
            bookingId: b.id,
            serviceCategory: svc.serviceCategory,
            title: svc.title,
            description: svc.description || null,
            supplierId: cleanSupplierId || null,
            costPrice: financials.lineCost,
            sellingPrice: financials.lineSelling,
            supplierInvoiceAmount,
            taxTreatment,
            vatRate,
            taxBase: financials.taxBase,
            taxAmount: financials.taxAmount,
            expectedMargin: financials.expectedMargin,
            actualMargin: financials.actualMargin,
            costVariance: financials.costVariance,
            customerTotal: financials.customerTotal,
            financialStatus: (svc as any).financialStatus || "draft",
            quantity: financials.quantity,
            unit: svc.unit || "Person",
            status: svc.status || "pending",
            serviceDetails: Object.keys(serviceDetails).length
              ? serviceDetails
              : null,
            sortOrder: i,
          },
        });
      }
    }

    await tx.lead.update({
      where: { id: lead.id },
      data: { status: "converted", customerId: customer.id } as any,
    });

    await tx.leadActivity.create({
      data: {
        agencyId,
        leadId: lead.id,
        type: "booking_created",
        description: `Converted to Booking ${bookingRef}`,
        createdBy: actor,
      },
    });

    return b;
  });

  return enrichBooking(booking, ctx);
}

// --- Customers ---

async function findOrCreateCustomerFromLeadDoc(agencyId: string, lead: any) {
  const phoneNorm = normalizePhone(lead.phone);
  let core = phoneNorm;
  if (phoneNorm.startsWith("92")) core = phoneNorm.slice(2);
  else if (phoneNorm.startsWith("0")) core = phoneNorm.slice(1);
  const variants = [lead.phone, phoneNorm];
  if (core.length === 10) {
    const part1 = core.slice(0, 3);
    const part2 = core.slice(3);
    variants.push(
      `+92${part1}${part2}`,
      `+92${part1}-${part2}`,
      `+92${part1} ${part2}`,
      `0${part1}${part2}`,
      `0${part1}-${part2}`,
      `0${part1} ${part2}`,
    );
  }

  const existing = await prisma.customer.findFirst({
    where: {
      agencyId,
      isDeleted: false,
      phone: { in: Array.from(new Set(variants)) },
    },
  });

  if (existing) {
    if (lead.id && existing.id && lead.customerId !== existing.id) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { customerId: existing.id } as any,
      });
    }
    return existing;
  }

  const parts = lead.name.trim().split(/\s+/);
  const firstName = parts[0] ?? lead.name;
  const lastName = parts.slice(1).join(" ") || firstName;
  const customerRef = await generateRef("CUS", agencyId);
  const customer = await prisma.customer.create({
    data: {
      agencyId,
      branchId: lead.branchId,
      customerRef,
      type: "individual",
      firstName,
      lastName,
      email: lead.email,
      phone: lead.phone,
      whatsapp: lead.whatsapp,
      city: "N/A",
      country: "Pakistan",
    },
  });

  if (lead.id) {
    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerId: customer.id } as any,
    });
  }

  return customer;
}

export async function findOrCreateCustomerFromLead(
  ctx: AgencyContext,
  idOrRef: string,
) {
  const lead = await prisma.lead.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "leadRef"),
    } as any,
  });
  if (!lead) throw ApiError.notFound("Lead");
  const customer = await findOrCreateCustomerFromLeadDoc(ctx.agencyId, lead);
  return enrichCustomer(customer, ctx);
}

export async function listCustomers(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter = agencyScope(ctx) as any;
  applyDateFilter(filter, dates);

  if (!pagination) {
    const customers = await prisma.customer.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
    const data = await enrichCustomersBatch(customers, ctx);
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.customer.count({ where: filter }),
  ]);

  const data = await enrichCustomersBatch(customers, ctx);
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCustomer(ctx: AgencyContext, idOrRef: string) {
  const customer = await prisma.customer.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "customerRef"),
    } as any,
  });
  if (!customer) return null;
  return enrichCustomer(customer, ctx);
}

export async function createCustomer(
  ctx: AgencyContext,
  values: CustomerInput,
) {
  const agencyId = ctx.agencyId;
  const branchId = values.branchId ?? ctx.userBranchId ?? (ctx.branchId && ctx.branchId !== "all" ? ctx.branchId : await getDefaultBranchId(agencyId));
  const customerRef = await generateRef("CUS", agencyId);
  const customer = await prisma.customer.create({
    data: {
      agencyId,
      branchId,
      customerRef,
      type: values.type,
      firstName: values.firstName,
      lastName: values.lastName,
      companyName: values.companyName || null,
      businessType: values.businessType || null,
      taxNumber: values.taxNumber || null,
      email: values.email || null,
      phone: values.phone,
      whatsapp: values.whatsapp || null,
      dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : null,
      gender: values.gender || null,
      cnic: values.cnic || null,
      passportNumber: values.passportNumber || null,
      city: values.city,
      country: values.country ?? countryForCity(values.city),
      address: values.address,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      internalNotes: values.internalNotes || null,
    },
  });
  return enrichCustomer(customer, ctx);
}

export async function updateCustomer(
  ctx: AgencyContext,
  idOrRef: string,
  values: CustomerInput,
) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "customerRef"),
  } as any;
  const existing = await prisma.customer.findFirst({ where: filter });
  if (!existing) return null;
  const customer = await prisma.customer.update({
    where: { id: existing.id },
    data: {
      type: values.type,
      firstName: values.firstName,
      lastName: values.lastName,
      companyName: values.companyName || null,
      businessType: values.businessType || null,
      taxNumber: values.taxNumber || null,
      email: values.email || null,
      phone: values.phone,
      whatsapp: values.whatsapp || null,
      dateOfBirth: values.dateOfBirth ? new Date(values.dateOfBirth) : null,
      gender: values.gender || null,
      cnic: values.cnic || null,
      passportNumber: values.passportNumber || null,
      city: values.city,
      country: values.country ?? countryForCity(values.city),
      address: values.address,
      emergencyContactName: values.emergencyContactName || null,
      emergencyContactPhone: values.emergencyContactPhone || null,
      internalNotes: values.internalNotes || null,
    },
  });
  return enrichCustomer(customer, ctx);
}

export async function listCustomerNotes(
  ctx: AgencyContext,
  customerId: string,
) {
  return prisma.customerNote.findMany({
    where: { agencyId: ctx.agencyId, customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomerNote(
  ctx: AgencyContext,
  customerId: string,
  note: string,
  actor: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...(agencyScope(ctx) as any) },
  });
  if (!customer) throw ApiError.notFound("Customer");
  return prisma.customerNote.create({
    data: { agencyId: ctx.agencyId, customerId, note, addedBy: actor },
  });
}

export async function deleteCustomerNote(ctx: AgencyContext, noteId: string) {
  const result = await prisma.customerNote.deleteMany({
    where: { id: noteId, agencyId: ctx.agencyId },
  });
  return result.count > 0;
}

export async function listCustomerDocuments(
  ctx: AgencyContext,
  customerId: string,
) {
  return prisma.customerDocument.findMany({
    where: { agencyId: ctx.agencyId, customerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createCustomerDocument(
  ctx: AgencyContext,
  customerId: string,
  doc: {
    documentType: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    fileUrl: string;
    notes?: string;
  },
  actor: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, ...(agencyScope(ctx) as any) },
  });
  if (!customer) throw ApiError.notFound("Customer");
  return prisma.customerDocument.create({
    data: {
      agencyId: ctx.agencyId,
      customerId,
      documentType: doc.documentType,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      mimeType: doc.mimeType,
      fileUrl: doc.fileUrl,
      notes: doc.notes || null,
      uploadedBy: actor,
    },
  });
}

export async function deleteCustomerDocument(
  ctx: AgencyContext,
  docId: string,
) {
  const result = await prisma.customerDocument.deleteMany({
    where: { id: docId, agencyId: ctx.agencyId },
  });
  return result.count > 0;
}

// --- Bookings ---

export async function listBookings(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
  extraFilters?: { supplierId?: string; customerId?: string; branchId?: string },
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates);

  if (extraFilters?.customerId) {
    filter.customerId = extraFilters.customerId;
  }

  if (extraFilters?.branchId) {
    filter.branchId = extraFilters.branchId;
  }

  if (extraFilters?.supplierId) {
    filter.services = { some: { supplierId: extraFilters.supplierId, isDeleted: false } };
  }

  if (!pagination) {
    const bookings = await prisma.booking.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: defaultBookingInclude,
    });
    const data = await Promise.all(bookings.map((b) => enrichBooking(b, ctx)));
    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: defaultBookingInclude,
    }),
    prisma.booking.count({ where: filter }),
  ]);

  const data = await Promise.all(bookings.map((b) => enrichBooking(b, ctx)));
  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getBooking(ctx: AgencyContext, idOrRef: string) {
  const booking = await prisma.booking.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "bookingRef"),
    } as any,
    include: defaultBookingInclude,
  });
  if (!booking) return null;
  return enrichBooking(booking, ctx);
}

export async function createBooking(
  ctx: AgencyContext,
  values: BookingInput,
  userId: string,
  actor: string,
) {
  const agencyId = ctx.agencyId;
  const branchId = values.branchId ?? ctx.userBranchId ?? ctx.branchId ?? (await getDefaultBranchId(agencyId));
  const agentId = values.agentId ?? userId;
  const bookingRef = await generateRef("BK", agencyId);

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.create({
      data: {
        agencyId,
        bookingRef,
        customerId: values.customerId,
        branchId,
        agentId,
        leadId: values.leadId || undefined,
        sourceQuotationId: values.sourceQuotationId || null,
        sourceType: values.sourceType ?? (values.leadId ? "lead" : "manual"),
        title: values.title || "",
        departureDate: new Date(values.departureDate),
        returnDate: values.returnDate ? new Date(values.returnDate) : null,
        expectedAdults: values.expectedAdults ?? 1,
        expectedChildren: values.expectedChildren ?? 0,
        expectedInfants: values.expectedInfants ?? 0,
        bookingStatus: values.bookingStatus || "confirmed",
        paymentStatus: values.paymentStatus || "unpaid",
        notes: values.notes || null,
        terms: values.terms || null,
        termsTemplateId: values.termsTemplateId || null,
      } as any,
    });

    if (values.services && values.services.length > 0) {
      for (let i = 0; i < values.services.length; i++) {
        const svc = values.services[i];
        const costPrice = Number(svc.costPrice) || 0;
        const sellingPrice = Number(svc.sellingPrice) || 0;
        const vatRate = Number(svc.vatRate) || 0;
        const taxTreatment = (svc as any).taxTreatment || "VAT_ON_MARGIN";
        const supplierInvoiceAmount = (svc as any).supplierInvoiceAmount != null
          ? Number((svc as any).supplierInvoiceAmount)
          : null;

        const quantity = Number(svc.quantity) || 1;

        const financials = calculateServiceFinancials({
          costPrice,
          sellingPrice,
          quantity,
          supplierInvoiceAmount,
          taxTreatment: taxTreatment as TaxTreatment,
          vatRate,
        });

        const serviceDetails = {
          ...(svc.serviceDetails && typeof svc.serviceDetails === "object"
            ? svc.serviceDetails
            : {}),
          ...(svc.supplierName ? { supplierName: svc.supplierName } : {}),
        };

        await tx.bookingService.create({
          data: {
            agencyId,
            bookingId: b.id,
            serviceCategory: svc.serviceCategory,
            title: svc.title,
            description: svc.description || null,
            supplierId: svc.supplierId ? String(svc.supplierId).trim() : null,
            costPrice: financials.lineCost,
            sellingPrice: financials.lineSelling,
            supplierInvoiceAmount,
            taxTreatment,
            vatRate,
            taxBase: financials.taxBase,
            taxAmount: financials.taxAmount,
            expectedMargin: financials.expectedMargin,
            actualMargin: financials.actualMargin,
            costVariance: financials.costVariance,
            customerTotal: financials.customerTotal,
            financialStatus: (svc as any).financialStatus || "draft",
            quantity: financials.quantity,
            unit: svc.unit || "Person",
            status: svc.status || "pending",
            serviceDetails: Object.keys(serviceDetails).length
              ? serviceDetails
              : null,
            sortOrder: i,
          },
        });
      }
    }

    if (values.leadId) {
      await tx.lead.update({
        where: { id: values.leadId },
        data: { status: "converted", customerId: values.customerId } as any,
      });
      await tx.leadActivity.create({
        data: {
          agencyId,
          leadId: values.leadId,
          type: "booking_created",
          description: `Converted to Booking ${bookingRef}`,
          createdBy: actor,
        },
      });
    }

    await tx.bookingActivity.create({
      data: {
        agencyId,
        bookingId: b.id,
        type: "created",
        title: "Booking Created",
        description: "Initial reservation made",
        createdBy: actor,
      },
    });

    return b;
  });

  // Notification is fire-and-forget, outside transaction
  try {
    const manager = await prisma.user.findFirst({
      where: { agencyId, branchId, role: "manager", isDeleted: false },
    });
    const admin = await prisma.user.findFirst({
      where: { agencyId, role: "admin", isDeleted: false },
    });
    const recipientId = manager ? manager.id : admin ? admin.id : null;
    if (recipientId) {
      await notificationService.createNotification(ctx, {
        recipientId,
        title: "New Booking Created",
        body: `A new booking (${bookingRef}) has been created by ${actor}`,
        entityType: "booking",
        entityId: booking.id,
        type: "success",
      });
    }
  } catch (e) {
    console.error("Failed to send notification for booking", e);
  }

  return enrichBooking(booking, ctx);
}

export async function updateBooking(
  ctx: AgencyContext,
  idOrRef: string,
  values: BookingInput,
  actor: string,
) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "bookingRef"),
  } as any;
  const existing = await prisma.booking.findFirst({ where: filter });
  if (!existing) return null;

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.booking.update({
      where: { id: existing.id },
      data: {
        customerId: values.customerId,
        title: values.title,
        departureDate: values.departureDate ? new Date(values.departureDate) : undefined,
        returnDate: values.returnDate ? new Date(values.returnDate) : undefined,
        expectedAdults: values.expectedAdults,
        expectedChildren: values.expectedChildren,
        expectedInfants: values.expectedInfants,
        bookingStatus: values.bookingStatus,
        paymentStatus: values.paymentStatus,
        notes: values.notes || null,
        terms: values.terms !== undefined ? (values.terms || null) : undefined,
        termsTemplateId: values.termsTemplateId !== undefined ? (values.termsTemplateId || null) : undefined,
      },
    });

    if (values.services) {
      const existingServices = await tx.bookingService.findMany({
        where: { bookingId: b.id },
      });
      const existingIds = new Set(existingServices.map((s) => s.id));
      const retainedIds = new Set<string>();

      for (let i = 0; i < values.services.length; i++) {
        const svc = values.services[i];
        const costPrice = Number(svc.costPrice) || 0;
        const sellingPrice = Number(svc.sellingPrice) || 0;
        const vatRate = Number(svc.vatRate) || 0;
        const taxTreatment = (svc as any).taxTreatment || "VAT_ON_MARGIN";
        
        const existingSvc = (svc as any).id ? existingServices.find((s) => s.id === (svc as any).id) : null;
        const supplierInvoiceAmount = (svc as any).supplierInvoiceAmount != null
          ? Number((svc as any).supplierInvoiceAmount)
          : existingSvc?.supplierInvoiceAmount != null
          ? existingSvc.supplierInvoiceAmount
          : null;
        const financialStatus = (svc as any).financialStatus || existingSvc?.financialStatus || "draft";
        const quantity = Number(svc.quantity) || existingSvc?.quantity || 1;

        const financials = calculateServiceFinancials({
          costPrice,
          sellingPrice,
          quantity,
          supplierInvoiceAmount,
          taxTreatment: taxTreatment as TaxTreatment,
          vatRate,
        });

        const serviceDetails = {
          ...(svc.serviceDetails && typeof svc.serviceDetails === "object"
            ? svc.serviceDetails
            : {}),
          ...(svc.supplierName ? { supplierName: svc.supplierName } : {}),
        };

        const cleanSupplierId = svc.supplierId
          ? String(svc.supplierId).trim()
          : null;

        const svcData = {
          agencyId: ctx.agencyId,
          bookingId: b.id,
          serviceCategory: svc.serviceCategory,
          title: svc.title,
          description: svc.description || null,
          supplierId: cleanSupplierId || null,
          costPrice: financials.lineCost,
          sellingPrice: financials.lineSelling,
          supplierInvoiceAmount,
          taxTreatment,
          vatRate,
          taxBase: financials.taxBase,
          taxAmount: financials.taxAmount,
          expectedMargin: financials.expectedMargin,
          actualMargin: financials.actualMargin,
          costVariance: financials.costVariance,
          customerTotal: financials.customerTotal,
          financialStatus,
          quantity: financials.quantity,
          unit: svc.unit || "Person",
          status: svc.status || "pending",
          serviceDetails: Object.keys(serviceDetails).length ? serviceDetails : null,
          sortOrder: i,
        };

        if ((svc as any).id && existingIds.has((svc as any).id)) {
          await tx.bookingService.update({
            where: { id: (svc as any).id },
            data: svcData,
          });
          retainedIds.add((svc as any).id);
        } else {
          const created = await tx.bookingService.create({
            data: svcData,
          });
          retainedIds.add(created.id);
        }
      }

      // Delete only removed services
      const toDeleteIds = [...existingIds].filter((id) => !retainedIds.has(id));
      if (toDeleteIds.length > 0) {
        await tx.bookingService.deleteMany({
          where: { id: { in: toDeleteIds } },
        });
      }
    }

    await tx.bookingActivity.create({
      data: {
        agencyId: ctx.agencyId,
        bookingId: b.id,
        type: "updated",
        title: "Booking Updated",
        description: "Booking details were updated",
        createdBy: actor,
      },
    });

    return b;
  });

  return enrichBooking(booking, ctx);
}

// --- Suppliers ---

export async function listSuppliers(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates);

  if (!pagination) {
    const suppliers = await prisma.supplier.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
    });
    await populateSupplierBalances(ctx, suppliers);
    return {
      data: suppliers,
      total: suppliers.length,
      page: 1,
      limit: suppliers.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.supplier.count({ where: filter }),
  ]);
  await populateSupplierBalances(ctx, suppliers);
  
  return {
    data: suppliers,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getSupplier(ctx: AgencyContext, id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, ...(agencyScope(ctx) as any) },
  });
  if (supplier) {
    await populateSupplierBalances(ctx, [supplier]);
  }
  return supplier;
}

async function populateSupplierBalances(ctx: AgencyContext, suppliers: any[]) {
  if (!suppliers.length) return;
  const supplierIds = suppliers.map((s) => s.id);

  const [services, paymentsGroups] = await Promise.all([
    prisma.bookingService.findMany({
      where: { agencyId: ctx.agencyId, supplierId: { in: supplierIds }, isDeleted: false },
      select: { supplierId: true, costPrice: true, supplierInvoiceAmount: true },
    }),
    prisma.supplierPayment.groupBy({
      by: ["supplierId"],
      where: { agencyId: ctx.agencyId, supplierId: { in: supplierIds }, isDeleted: false },
      _sum: { amount: true },
    }),
  ]);

  const creditMap: Record<string, number> = {};
  for (const s of services) {
    if (!s.supplierId) continue;
    creditMap[s.supplierId] = (creditMap[s.supplierId] || 0) + (s.supplierInvoiceAmount ?? s.costPrice);
  }

  const paymentMap = Object.fromEntries(
    paymentsGroups.map((g) => [g.supplierId, g._sum.amount || 0])
  );

  for (const s of suppliers) {
    const totalCredit = creditMap[s.id] || 0;
    const totalDebit = paymentMap[s.id] || 0;
    s.balance = totalCredit - totalDebit;
  }
}

export async function createSupplier(
  ctx: AgencyContext,
  values: SupplierInput,
) {
  const branchId = (values as any).branchId ?? ctx.userBranchId ?? (ctx.branchId && ctx.branchId !== "all" ? ctx.branchId : await getDefaultBranchId(ctx.agencyId));

  return prisma.supplier.create({
    data: {
      agencyId: ctx.agencyId,
      branchId,
      name: values.name,
      category: values.category,
      contactPerson: values.contactPerson,
      email: values.email || null,
      phone: values.phone,
      city: values.city,
      country: values.country,
      balance: 0,
    },
  });
}

export async function updateSupplier(
  ctx: AgencyContext,
  id: string,
  values: SupplierInput,
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, ...(agencyScope(ctx) as any) },
  });
  if (!supplier) return null;
  return prisma.supplier.update({
    where: { id },
    data: {
      name: values.name,
      category: values.category,
      contactPerson: values.contactPerson,
      email: values.email || null,
      phone: values.phone,
      city: values.city,
      country: values.country,
    },
  });
}

// --- Branches ---

export async function listBranches(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
) {
  const filter = { agencyId: ctx.agencyId, isDeleted: false };

  if (!pagination) {
    const branches = await prisma.branch.findMany({
      where: filter,
      orderBy: { name: "asc" },
    });
    return {
      data: branches,
      total: branches.length,
      page: 1,
      limit: branches.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const [branches, total] = await Promise.all([
    prisma.branch.findMany({
      where: filter,
      orderBy: { name: "asc" },
      skip,
      take: limit,
    }),
    prisma.branch.count({ where: filter }),
  ]);
  return {
    data: branches,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getBranch(ctx: AgencyContext, id: string) {
  const scope = agencyScope(ctx) as any;
  if (ctx.userRole !== "admin" && scope.branchId && scope.branchId !== id) return null;
  return prisma.branch.findFirst({ where: { id, agencyId: ctx.agencyId, isDeleted: false } });
}

export async function createBranch(ctx: AgencyContext, values: BranchInput) {
  const code =
    values.code?.trim().toUpperCase() || values.name.slice(0, 4).toUpperCase();
  const existing = await prisma.branch.findFirst({
    where: { agencyId: ctx.agencyId, code, isDeleted: false },
  });
  if (existing) throw ApiError.conflict("Branch code already in use");
  return prisma.branch.create({
    data: {
      agencyId: ctx.agencyId,
      name: values.name,
      code,
      city: values.city,
      address: values.address || null,
      phone: values.phone || null,
      currency: values.currency || undefined,
      isHeadOffice: values.isHeadOffice ?? false,
      status: values.status ?? "active",
    },
  });
}

export async function updateBranch(
  ctx: AgencyContext,
  id: string,
  values: BranchInput,
) {
  const branch = await prisma.branch.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!branch) return null;
  return prisma.branch.update({
    where: { id },
    data: {
      name: values.name,
      code: values.code,
      city: values.city,
      address: values.address || null,
      phone: values.phone || null,
      currency: values.currency || undefined,
      isHeadOffice: values.isHeadOffice ?? false,
      status: values.status ?? "active",
    },
  });
}

// --- Users ---

export async function listUsers(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
) {
  const filter: any = { agencyId: ctx.agencyId, isDeleted: false };
  if (ctx.userRole !== "admin") {
    if (ctx.userBranchId) {
      filter.branchId = ctx.userBranchId;
    }
  }

  if (!pagination) {
    const users = await prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        agencyId: true,
        branchId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    return {
      data: users,
      total: users.length,
      page: 1,
      limit: users.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        agencyId: true,
        branchId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        avatarUrl: true,
        lastLoginAt: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where: filter }),
  ]);
  return {
    data: users,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getUser(ctx: AgencyContext, id: string) {
  return prisma.user.findFirst({
    where: { id, ...(agencyScoped(ctx) as any) },
    select: {
      id: true,
      agencyId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
}

export async function listAgents(ctx: AgencyContext) {
  return prisma.user.findMany({
    where: { ...(agencyScope(ctx) as any), role: { in: ["agent", "manager"] } },
    orderBy: { firstName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
    },
  });
}

export async function createUser(ctx: AgencyContext, values: UserInput) {
  if (ctx.userRole !== "admin" && ctx.userBranchId) {
    if (values.branchId && values.branchId !== ctx.userBranchId) {
      throw ApiError.forbidden("You can only create and assign users to your own branch");
    }
    values.branchId = ctx.userBranchId;
  }

  const existing = await prisma.user.findFirst({
    where: {
      agencyId: ctx.agencyId,
      email: values.email.toLowerCase(),
      isDeleted: false,
    },
  });
  if (existing) throw ApiError.conflict("Email already in use");

  const tempPassword = values.password || "Password123!";
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(tempPassword, 12);

  const user = await prisma.user.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: values.branchId!,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
      role: values.role,
      status: values.status,
      password: hashedPassword,
    },
  });

  const { password: _, ...userData } = user as any;
  return {
    ...userData,
    tempPassword: values.password ? undefined : tempPassword,
  };
}



export async function resetUserPassword(
  ctx: AgencyContext,
  id: string,
  newPassword?: string,
) {
  const user = await prisma.user.findFirst({
    where: { id, ...(agencyScoped(ctx) as any) },
  });
  if (!user) throw ApiError.notFound("User");

  const passwordToSet = newPassword || "Password123!";
  const bcrypt = await import("bcryptjs");
  const hashedPassword = await bcrypt.hash(passwordToSet, 12);

  await prisma.user.update({
    where: { id },
    data: { password: hashedPassword },
  });

  return { message: "Password reset successfully" };
}

export async function updateUser(
  ctx: AgencyContext,
  id: string,
  values: UserInput,
) {
  if (values.role === "admin" && ctx.callerRole !== "admin") {
    throw ApiError.forbidden("Only an admin can assign the admin role");
  }
  if (ctx.callerId === id && values.role && ctx.callerRole !== values.role) {
    throw ApiError.forbidden("You cannot change your own role");
  }
  if (ctx.userRole !== "admin" && ctx.userBranchId) {
    if (values.branchId && values.branchId !== ctx.userBranchId) {
      throw ApiError.forbidden("You cannot assign a user to another branch");
    }
    values.branchId = ctx.userBranchId;
  }

  const user = await prisma.user.findFirst({
    where: { id, ...(agencyScope(ctx) as any) },
  });
  if (!user) return null;

  const updated = await prisma.user.update({
    where: { id },
    data: {
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone || undefined,
      role: values.role,
      branchId: values.branchId!,
      status: values.status,
    },
    select: {
      id: true,
      agencyId: true,
      branchId: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      avatarUrl: true,
      lastLoginAt: true,
      createdAt: true,
    },
  });
  return updated;
}

// --- Expenses ---

export async function listExpenses(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates, "date");

  if (!pagination) {
    const expenses = await prisma.expense.findMany({
      where: filter,
      orderBy: { date: "desc" },
    });
    return {
      data: expenses,
      total: expenses.length,
      page: 1,
      limit: expenses.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({
      where: filter,
      orderBy: { date: "desc" },
      skip,
      take: limit,
    }),
    prisma.expense.count({ where: filter }),
  ]);
  return {
    data: expenses,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function getExpense(ctx: AgencyContext, idOrRef: string) {
  return prisma.expense.findFirst({
    where: {
      ...(agencyScope(ctx) as any),
      ...buildIdOrRefFilter(idOrRef, "expenseRef"),
    } as any,
  });
}

export async function createExpense(
  ctx: AgencyContext,
  values: ExpenseInput,
  userId: string,
) {
  const agencyId = ctx.agencyId;
  const branchId = values.branchId ?? ctx.userBranchId ?? ctx.branchId ?? (await getDefaultBranchId(agencyId));

  // Resolve accountId
  let accountId = values.accountId;
  if (!accountId) {
    const defaultAcc = await mapping.getExpenseAccountForCategory(agencyId, branchId, values.category);
    accountId = defaultAcc.id;
  }

  // Resolve paymentAccountId (honoring actual selected cash/bank account if provided)
  let paymentAccountId = values.paymentAccountId;
  if (!paymentAccountId) {
    const defaultBank = await mapping.getBankOrCashAccount(agencyId, branchId, {
      paymentMethod: values.paymentMethod,
    });
    paymentAccountId = defaultBank.id;
  }

  const expenseRef = await generateRef("EXP", agencyId);
  const expense = await prisma.expense.create({
    data: {
      agencyId,
      branchId,
      expenseRef,
      title: values.title,
      category: values.category,
      amount: values.amount,
      date: values.date,
      paidTo: values.paidTo,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      recordedById: userId,
      accountId,
      paymentAccountId,
      // Bulk Import VAT & Supplier fields
      supplierId: (values as any).supplierId || null,
      supplierRef: (values as any).supplierRef || null,
      vatTreatment: (values as any).vatTreatment || null,
      vatRate: (values as any).vatRate ?? null,
      inputVat: (values as any).inputVat ?? null,
      netAmount: (values as any).netAmount ?? null,
      refundReceived: (values as any).refundReceived ?? null,
    },
  });

  // Post journal entry and do NOT swallow errors (guaranteeing atomicity)
  try {
    await postExpenseJournal(ctx, expense.id, {
      isPrepaid: (values as any).isPrepaid || false,
      amortizeOverMonths: (values as any).amortizeOverMonths || 12,
      startDate: (values as any).startDate ? new Date((values as any).startDate) : expense.date,
    });
  } catch (e: any) {
    await prisma.expense.delete({ where: { id: expense.id } }).catch(() => {});
    throw ApiError.internal(`Failed to post expense journal entry: ${e?.message || e}`);
  }

  return expense;
}

export async function updateExpense(
  ctx: AgencyContext,
  idOrRef: string,
  values: ExpenseInput,
) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "expenseRef"),
  } as any;
  const existing = await prisma.expense.findFirst({ where: filter });
  if (!existing) return null;
  return prisma.expense.update({
    where: { id: existing.id },
    data: {
      title: values.title,
      category: values.category,
      amount: values.amount,
      date: values.date,
      paidTo: values.paidTo,
      paymentMethod: values.paymentMethod,
      notes: values.notes,
      ...(values.branchId && { branchId: values.branchId }),
    },
  });
}

// --- Roles ---

export async function listRoles(ctx: AgencyContext) {
  return prisma.role.findMany({
    where: agencyScoped(ctx) as any,
    orderBy: { name: "asc" },
  });
}

export async function updateRolePermissions(
  ctx: AgencyContext,
  roleId: string,
  permissions: string[],
) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, ...(agencyScoped(ctx) as any) },
  });
  if (!role) return null;
  const isSuperRole = role.name.toLowerCase() === "admin" || role.name.toLowerCase() === "owner";
  const cleanPermissions = isSuperRole ? permissions : permissions.filter((p) => p !== "all" && p !== "admin");
  const updated = await prisma.role.update({ where: { id: roleId }, data: { permissions: cleanPermissions } });
  invalidateRolePermissionsCache(ctx.agencyId);
  return updated;
}

export async function createRole(
  ctx: AgencyContext,
  data: {
    name: string;
    description: string;
    permissions: string[];
    color: string;
    textColor: string;
  },
) {
  const created = await prisma.role.create({
    data: { agencyId: ctx.agencyId, ...data },
  });
  invalidateRolePermissionsCache(ctx.agencyId);
  return created;
}

export async function deleteRole(ctx: AgencyContext, roleId: string) {
  const role = await prisma.role.findFirst({
    where: { id: roleId, ...(agencyScoped(ctx) as any) },
  });
  if (!role) return false;
  await prisma.role.update({
    where: { id: roleId },
    data: { isDeleted: true, deletedAt: new Date() },
  });
  invalidateRolePermissionsCache(ctx.agencyId);
  return true;
}

// --- Soft Deletes ---

const deletedAt = () => new Date();

export async function deleteLead(ctx: AgencyContext, idOrRef: string) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "leadRef"),
  } as any;
  const existing = await prisma.lead.findFirst({ where: filter });
  if (!existing) return false;
  await prisma.lead.update({
    where: { id: existing.id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

export async function deleteCustomer(ctx: AgencyContext, idOrRef: string) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "customerRef"),
  } as any;
  const existing = await prisma.customer.findFirst({ where: filter });
  if (!existing) return false;
  await prisma.customer.update({
    where: { id: existing.id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

export async function deleteBooking(ctx: AgencyContext, idOrRef: string) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "bookingRef"),
  } as any;
  const existing = await prisma.booking.findFirst({ where: filter });
  if (!existing) return false;
  await prisma.booking.update({
    where: { id: existing.id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

export async function deleteSupplier(ctx: AgencyContext, id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, ...(agencyScope(ctx) as any) },
  });
  if (!supplier) return false;
  await prisma.supplier.update({
    where: { id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

export async function deleteExpense(ctx: AgencyContext, idOrRef: string) {
  const filter = {
    ...(agencyScope(ctx) as any),
    ...buildIdOrRefFilter(idOrRef, "expenseRef"),
  } as any;
  const existing = await prisma.expense.findFirst({ where: filter });
  if (!existing) return false;
  await prisma.expense.update({
    where: { id: existing.id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

export async function deleteUser(ctx: AgencyContext, id: string) {
  if (ctx.callerId === id) {
    throw ApiError.forbidden("You cannot delete your own account");
  }
  const user = await prisma.user.findFirst({
    where: { id, ...(agencyScope(ctx) as any) },
  });
  if (!user) return false;
  await prisma.user.update({
    where: { id },
    data: { isDeleted: true, deletedAt: deletedAt() },
  });
  return true;
}

// --- Supplier Payments ---

export async function recordSupplierPayment(
  ctx: AgencyContext,
  supplierId: string,
  data: { amount: number; method: string; reference?: string },
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, agencyId: ctx.agencyId, isDeleted: false },
  });
  if (!supplier) throw ApiError.notFound("Supplier");
  if (data.amount <= 0) throw new ApiError(400, "Amount must be positive");

  const paymentRef = await generateRef("SPY", ctx.agencyId);

  const payment = await prisma.supplierPayment.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: ctx.branchId || null,
      supplierId,
      paymentRef,
      amount: data.amount,
      paymentMethod: data.method,
      notes: data.reference || null,
      recordedById: ctx.callerId || null,
    },
  });

  await prisma.supplier.update({
    where: { id: supplierId },
    data: { balance: Math.max(0, supplier.balance - data.amount) },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      type: "payment",
      title: `Payment to ${supplier.name}`,
      detail: `${paymentRef} - PKR ${data.amount.toLocaleString()} via ${data.method}${data.reference ? ` (Ref: ${data.reference})` : ""}`,
      createdBy: "System",
    },
  });

  try {
    await postSupplierPaymentJournal(ctx, payment.id);
  } catch (err) {
    console.error("Failed to post supplier payment journal:", err);
  }

  return payment;
}

// --- Customer Payments ---

export async function listCustomerPayments(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions,
) {
  const filter: any = agencyScope(ctx);
  applyDateFilter(filter, dates, "date");

  if (!pagination) {
    const payments = await prisma.customerPayment.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      include: {
        customer: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        booking: { select: { bookingRef: true } },
        allocations: true,
      },
    });

    const branchIds = [
      ...new Set(payments.map((p) => p.branchId).filter(Boolean)),
    ] as string[];
    const managers = await prisma.user.findMany({
      where: {
        agencyId: ctx.agencyId,
        OR: [
          {
            branchId: { in: branchIds },
            role: { in: ["manager", "branch_manager", "admin"] },
          },
          { role: "admin" },
        ],
      },
    });

    const getManagerForBranch = (bId: string | null) => {
      if (!bId) return null;
      let mgr = managers.find(
        (m) =>
          m.branchId === bId &&
          ["manager", "branch_manager", "admin"].includes(m.role),
      );
      if (!mgr) mgr = managers.find((m) => m.role === "admin");
      return mgr
        ? {
          name: `${mgr.firstName} ${mgr.lastName}`,
          phone: mgr.phone,
          email: mgr.email,
        }
        : null;
    };

    const data = payments.map((p) => ({
      ...p,
      managerContact: getManagerForBranch(p.branchId),
    }));

    return {
      data,
      total: data.length,
      page: 1,
      limit: data.length,
      totalPages: 1,
    };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.customerPayment.findMany({
      where: filter,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        customer: {
          select: { firstName: true, lastName: true, companyName: true },
        },
        booking: { select: { bookingRef: true } },
        allocations: true,
      },
    }),
    prisma.customerPayment.count({ where: filter }),
  ]);

  const branchIds = [
    ...new Set(payments.map((p) => p.branchId).filter(Boolean)),
  ] as string[];
  const managers = await prisma.user.findMany({
    where: {
      agencyId: ctx.agencyId,
      OR: [
        {
          branchId: { in: branchIds },
          role: { in: ["manager", "branch_manager", "admin"] },
        },
        { role: "admin" },
      ],
    },
  });

  const getManagerForBranch = (bId: string | null) => {
    if (!bId) return null;
    let mgr = managers.find(
      (m) =>
        m.branchId === bId &&
        ["manager", "branch_manager", "admin"].includes(m.role),
    );
    if (!mgr) mgr = managers.find((m) => m.role === "admin");
    return mgr
      ? {
        name: `${mgr.firstName} ${mgr.lastName}`,
        phone: mgr.phone,
        email: mgr.email,
      }
      : null;
  };

  const data = payments.map((p) => ({
    ...p,
    managerContact: getManagerForBranch(p.branchId),
  }));

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getCustomerPayment(
  ctx: AgencyContext,
  paymentId: string,
) {
  const payment = await prisma.customerPayment.findFirst({
    where: { id: paymentId, ...(agencyScope(ctx) as any) },
    include: {
      customer: {
        select: { firstName: true, lastName: true, companyName: true },
      },
      booking: { select: { bookingRef: true } },
      allocations: true,
    },
  });
  if (!payment) throw ApiError.notFound("Payment");

  let bookingTotal = 0;
  let totalPaid = 0;

  if (payment.bookingId) {
    const services = await prisma.bookingService.findMany({
      where: { bookingId: payment.bookingId, isDeleted: false }
    });
    bookingTotal = services.reduce((sum, s) => sum + (s.customerTotal > 0 ? s.customerTotal : s.sellingPrice + (s.taxAmount || 0)), 0);

    const allPayments = await prisma.customerPayment.findMany({
      where: { bookingId: payment.bookingId }
    });
    totalPaid = allPayments.reduce((sum, p) => sum + p.amount, 0);
  }

  return { 
    ...payment, 
    bookingTotal, 
    totalPaid, 
    balanceDue: bookingTotal - totalPaid 
  };
}

export async function createCustomerPayment(
  ctx: AgencyContext,
  data: {
    bookingId?: string;
    customerId: string;
    amount: number;
    paymentMethod: string;
    accountId?: string;
    notes?: string;
  },
  actor: string,
) {
  const agencyId = ctx.agencyId;
  const booking = data.bookingId
    ? await prisma.booking.findFirst({
        where: { id: data.bookingId, agencyId },
      })
    : null;
  if (data.bookingId && !booking) throw ApiError.notFound("Booking");

  const customer = await prisma.customer.findFirst({
    where: { id: data.customerId, agencyId },
  });
  if (!customer) throw ApiError.notFound("Customer");

  const paymentRef = await generateRef("REC", agencyId);

  const payment = await prisma.$transaction(async (tx) => {
    const p = await tx.customerPayment.create({
      data: {
        agencyId,
        paymentRef,
        bookingId: data.bookingId || null,
        customerId: data.customerId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        notes: data.notes || null,
        date: new Date(),
        branchId: booking?.branchId || null,
        recordedById: null,
      },
    });

    if (data.bookingId) {
      await tx.paymentAllocation.create({
        data: {
          agencyId,
          customerPaymentId: p.id,
          bookingId: data.bookingId,
          amount: data.amount,
        },
      });

      const bookingServices = await tx.bookingService.findMany({
        where: { bookingId: data.bookingId, agencyId },
      });
      const totalSale = bookingServices.reduce(
        (sum, s) => sum + (s.customerTotal || s.sellingPrice),
        0,
      );
      const allocations = await tx.paymentAllocation.findMany({
        where: { bookingId: data.bookingId, agencyId },
      });
      const totalAllocated = allocations.reduce((sum, a) => sum + a.amount, 0);
      const newBalance = Math.max(0, totalSale - totalAllocated);
      const newPaymentStatus =
        newBalance === 0
          ? "paid"
          : totalAllocated > 0
            ? "partial"
            : (booking?.paymentStatus || "unpaid");

      await tx.booking.update({
        where: { id: data.bookingId },
        data: { paymentStatus: newPaymentStatus },
      });
    }

    return p;
  });

  if (booking?.agentId) {
    try {
      await notificationService.createNotification(ctx, {
        recipientId: booking.agentId,
        title: "Payment Received",
        body: `Payment ${paymentRef} recorded for Booking ${booking.bookingRef} (Amount: ${data.amount})`,
        entityType: "customer_payment",
        entityId: payment.id,
        type: "success",
      });
    } catch (e) {
      console.error("Failed to send notification for payment", e);
    }
  }

  await prisma.recentActivity.create({
    data: {
      agencyId,
      branchId: booking?.branchId || undefined,
      type: "customer_payment",
      title: "Payment received",
      detail: `PKR ${data.amount.toLocaleString()} from ${customer ? `${customer.firstName} ${customer.lastName}` : "Customer"} (${paymentRef})`,
      createdBy: actor,
    },
  });

  if (booking) {
    await prisma.bookingActivity.create({
      data: {
        agencyId,
        bookingId: booking.id,
        type: "payment",
        title: "Payment Received",
        description: `Received payment of Rs ${data.amount.toLocaleString()} via ${data.paymentMethod} (${paymentRef})`,
        createdBy: actor,
      },
    });
  }

  // Post customer payment journal entry immediately — do NOT swallow errors
  await postCustomerPaymentJournal(ctx, payment.id, { accountId: data.accountId });

  return payment;
}

// --- Booking Documents ---

export async function listBookingDocuments(
  ctx: AgencyContext,
  bookingId: string,
) {
  return prisma.bookingDocument.findMany({
    where: { agencyId: ctx.agencyId, bookingId },
    orderBy: { createdAt: "desc" },
  });
}

export async function createBookingDocument(
  ctx: AgencyContext,
  bookingId: string,
  doc: { name: string; url: string; type: string },
  actor: string,
) {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, agencyId: ctx.agencyId },
  });
  if (!booking) throw ApiError.notFound("Booking");

  const record = await prisma.bookingDocument.create({
    data: {
      agencyId: ctx.agencyId,
      bookingId,
      name: doc.name,
      url: doc.url,
      type: doc.type,
      uploadedBy: actor,
    },
  });

  await prisma.bookingActivity.create({
    data: {
      agencyId: ctx.agencyId,
      bookingId: booking.id,
      type: "document",
      title: "Document Uploaded",
      description: `Uploaded ${doc.name}`,
      createdBy: actor,
    },
  });

  return record;
}

export async function deleteBookingDocument(ctx: AgencyContext, docId: string) {
  const result = await prisma.bookingDocument.deleteMany({
    where: { id: docId, agencyId: ctx.agencyId },
  });
  return result.count > 0;
}

export async function getBookingActivities(
  ctx: AgencyContext,
  bookingId: string,
) {
  return prisma.bookingActivity.findMany({
    where: { agencyId: ctx.agencyId, bookingId },
    orderBy: { createdAt: "desc" },
  });
}

// --- Ledger and Statements ---

export async function getCustomerLedger(
  ctx: AgencyContext,
  customerId: string,
) {
  const customer = await prisma.customer.findFirst({
    where: { agencyId: ctx.agencyId, id: customerId },
  });
  if (!customer) throw ApiError.notFound("Customer");

  const arAccount = await mapping.getARAccount(ctx.agencyId, customer.branchId);
  const advanceAccount = await mapping.getCustomerAdvanceAccount(ctx.agencyId, customer.branchId);

  const invoices = await prisma.invoice.findMany({ where: { customerId, agencyId: ctx.agencyId }, select: { id: true } });
  const payments = await prisma.customerPayment.findMany({ where: { customerId, agencyId: ctx.agencyId }, select: { id: true } });
  const creditNotes = await prisma.creditNote.findMany({ where: { customerId, agencyId: ctx.agencyId }, select: { id: true } });

  const invoiceIds = invoices.map(i => i.id);
  const paymentIds = payments.map(p => p.id);
  const creditNoteIds = creditNotes.map(c => c.id);

  const allSourceIds = [...invoiceIds, ...paymentIds, ...creditNoteIds];

  const lines = await prisma.journalLine.findMany({
    where: {
      agencyId: ctx.agencyId,
      accountId: { in: [arAccount.id, advanceAccount.id] },
      journalEntry: {
        status: "POSTED",
        sourceId: { in: allSourceIds },
        sourceModule: { in: ["INVOICE", "CUSTOMER_PAYMENT", "CREDIT_NOTE"] },
      }
    },
    include: { journalEntry: true },
    orderBy: { journalEntry: { date: "asc" } }
  });

  let runningBalance = 0;
  const ledger = lines.map(line => {
    runningBalance += line.baseDebit - line.baseCredit;
    return {
      date: line.journalEntry.date,
      type: line.journalEntry.sourceModule,
      reference: line.journalEntry.reference,
      description: line.description || line.journalEntry.description,
      debit: line.baseDebit,
      credit: line.baseCredit,
      balance: runningBalance,
    };
  });

  return { customer, entries: ledger, finalBalance: runningBalance };
}

export async function getSupplierStatement(
  ctx: AgencyContext,
  supplierId: string,
) {
  const supplier = await prisma.supplier.findFirst({
    where: { id: supplierId, agencyId: ctx.agencyId },
  });
  if (!supplier) throw ApiError.notFound("Supplier");

  const services = await prisma.bookingService.findMany({
    where: { supplierId, agencyId: ctx.agencyId, isDeleted: false },
    include: { booking: { select: { bookingRef: true } } },
    orderBy: { createdAt: "asc" },
  });

  const payments = await prisma.supplierPayment.findMany({
    where: { supplierId, agencyId: ctx.agencyId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });

  const rawEntries: {
    date: Date;
    type: string;
    reference: string;
    description: string;
    debit: number;
    credit: number;
  }[] = [];

  for (const s of services) {
    const cost = Number(s.supplierInvoiceAmount ?? s.costPrice);
    if (cost > 0) {
      rawEntries.push({
        date: s.createdAt,
        type: s.financialStatus === "confirmed" ? "SUPPLIER_BILL_CONFIRMED" : "SUPPLIER_OBLIGATION",
        reference: s.supplierRef || s.booking?.bookingRef || `SVC-${s.id.slice(0, 8)}`,
        description: s.title
          ? `${s.title}${s.booking?.bookingRef ? ` (Ref: ${s.booking.bookingRef})` : ""}`
          : `Supplier Obligation${s.booking?.bookingRef ? ` (Ref: ${s.booking.bookingRef})` : ""}`,
        debit: 0,
        credit: cost,
      });
    }
  }

  for (const p of payments) {
    if (p.amount > 0) {
      rawEntries.push({
        date: p.createdAt,
        type: "SUPPLIER_PAYMENT",
        reference: p.paymentRef,
        description: `Payment to Supplier${p.notes ? ` (${p.notes})` : ""}`,
        debit: Number(p.amount),
        credit: 0,
      });
    }
  }

  rawEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let runningBalance = 0;
  const statementEntries = rawEntries.map((entry) => {
    runningBalance += entry.credit - entry.debit;
    return {
      ...entry,
      balance: runningBalance,
    };
  });

  const statement = [...statementEntries].reverse();

  return { supplier, entries: statement, finalBalance: runningBalance };
}

export async function getSupplierUnconfirmedServices(
  ctx: AgencyContext,
  supplierId: string,
) {
  const services = await prisma.bookingService.findMany({
    where: {
      agencyId: ctx.agencyId,
      supplierId,
      supplierInvoiceAmount: null,
      isDeleted: false,
    },
    include: {
      booking: {
        select: {
          id: true,
          bookingRef: true,
          title: true,
        },
      },
      supplier: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return services.map((s) => ({
    id: s.id,
    bookingId: s.bookingId,
    bookingRef: s.booking?.bookingRef,
    title: s.title,
    costPrice: s.costPrice,
    serviceCategory: s.serviceCategory,
    supplierId: s.supplierId,
    supplier: s.supplier,
  }));
}

export async function allocateCustomerPayment(
  ctx: AgencyContext,
  paymentId: string,
  allocations: { bookingId: string; amount: number }[],
) {
  const payment = await prisma.customerPayment.findFirst({
    where: { id: paymentId, agencyId: ctx.agencyId },
    include: { allocations: true },
  });
  if (!payment) throw ApiError.notFound("Payment");

  const existingTotal = payment.allocations.reduce((sum, a) => sum + a.amount, 0);
  const newTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (existingTotal + newTotal > payment.amount) {
    throw ApiError.badRequest("Total allocations cannot exceed payment amount");
  }

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const alloc of allocations) {
      const a = await tx.paymentAllocation.create({
        data: {
          agencyId: ctx.agencyId,
          customerPaymentId: paymentId,
          bookingId: alloc.bookingId,
          amount: alloc.amount,
        },
      });
      results.push(a);

      const bookingServices = await tx.bookingService.findMany({
        where: { bookingId: alloc.bookingId, agencyId: ctx.agencyId },
      });
      const totalSale = bookingServices.reduce((sum, s) => sum + (s.customerTotal || s.sellingPrice), 0);
      const allAllocations = await tx.paymentAllocation.findMany({
        where: { bookingId: alloc.bookingId, agencyId: ctx.agencyId },
      });
      const totalAllocated = allAllocations.reduce((sum, a) => sum + a.amount, 0);
      
      let newPaymentStatus = "unpaid";
      if (totalAllocated >= totalSale && totalSale > 0) newPaymentStatus = "paid";
      else if (totalAllocated > 0) newPaymentStatus = "partial";
      
      await tx.booking.update({
        where: { id: alloc.bookingId },
        data: { paymentStatus: newPaymentStatus },
      });
    }
    return results;
  });
}

export async function allocateSupplierPayment(
  ctx: AgencyContext,
  paymentId: string,
  allocations: { bookingId: string; bookingServiceId?: string; amount: number }[],
) {
  const payment = await prisma.supplierPayment.findFirst({
    where: { id: paymentId, agencyId: ctx.agencyId },
    include: { allocations: true },
  });
  if (!payment) throw ApiError.notFound("Payment");

  const existingTotal = payment.allocations.reduce((sum, a) => sum + a.amount, 0);
  const newTotal = allocations.reduce((sum, a) => sum + a.amount, 0);
  if (existingTotal + newTotal > payment.amount) {
    throw ApiError.badRequest("Total allocations cannot exceed payment amount");
  }

  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const alloc of allocations) {
      const a = await tx.supplierPaymentAllocation.create({
        data: {
          agencyId: ctx.agencyId,
          supplierPaymentId: paymentId,
          bookingId: alloc.bookingId,
          bookingServiceId: alloc.bookingServiceId || null,
          amount: alloc.amount,
        },
      });
      results.push(a);
      
      // Optionally update financial status on bookingService
      if (alloc.bookingServiceId) {
         const svc = await tx.bookingService.findFirst({ where: { id: alloc.bookingServiceId } });
         if (svc) {
            const allAllocs = await tx.supplierPaymentAllocation.findMany({
               where: { bookingServiceId: svc.id }
            });
            const totalAllocated = allAllocs.reduce((sum, a) => sum + a.amount, 0);
            const cost = svc.supplierInvoiceAmount ?? svc.costPrice;
            const newStatus = totalAllocated >= cost ? "invoiced" : "draft";
            await tx.bookingService.update({
               where: { id: svc.id },
               data: { financialStatus: newStatus }
            });
         }
      }
    }
    return results;
  });
}

export async function getARLedger(ctx: AgencyContext) {
  const customers = await prisma.customer.findMany({ where: { agencyId: ctx.agencyId } });
  
  const bookings = await prisma.booking.findMany({ 
    where: { agencyId: ctx.agencyId, /* customerId required */ },
    include: { services: { where: { isDeleted: false } } }
  });
  
  const payments = await prisma.customerPayment.findMany({
    where: { agencyId: ctx.agencyId, isDeleted: false }
  });

  const ledger = customers.map(c => {
    const custBookings = bookings.filter(b => b.customerId === c.id);
    const totalBilled = custBookings.reduce((sum, b) => {
      return sum + b.services.reduce((sSum: any, s: any) => sSum + (s.customerTotal || s.sellingPrice), 0);
    }, 0);
    
    const custPayments = payments.filter(p => p.customerId === c.id);
    const totalPaid = custPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      id: c.id,
      name: `${c.firstName} ${c.lastName}`.trim() || c.companyName || "Unknown",
      totalBilled,
      totalPaid,
      outstandingBalance: totalBilled - totalPaid
    };
  });

  return ledger;
}

export async function getAPLedger(ctx: AgencyContext) {
  const suppliers = await prisma.supplier.findMany({ where: { agencyId: ctx.agencyId } });
  
  const services = await prisma.bookingService.findMany({
    where: { agencyId: ctx.agencyId, isDeleted: false, supplierId: { not: null } }
  });

  const payments = await prisma.supplierPayment.findMany({
    where: { agencyId: ctx.agencyId, isDeleted: false }
  });

  const ledger = suppliers.map(s => {
    const suppServices = services.filter(svc => svc.supplierId === s.id);
    const totalIncurred = suppServices.reduce((sum, svc) => sum + (svc.supplierInvoiceAmount ?? svc.costPrice), 0);
    
    const suppPayments = payments.filter(p => p.supplierId === s.id);
    const totalPaid = suppPayments.reduce((sum, p) => sum + p.amount, 0);
    
    return {
      id: s.id,
      name: s.name,
      totalIncurred,
      totalPaid,
      outstandingBalance: totalIncurred - totalPaid
    };
  });

  return ledger;
}

export { userDisplayName };
