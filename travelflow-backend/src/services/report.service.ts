import { PrismaClient } from "@prisma/client";
import { AgencyContext, agencyScope } from "./domain.service";

const prisma = new PrismaClient();

export async function getTrialBalance(ctx: AgencyContext, asOfDate: Date = new Date()) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { ...(agencyScope(ctx) as any), isActive: true },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: { lte: asOfDate },
            status: "POSTED"
          }
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  return accounts.map(acc => {
    const totalDebit = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);
    
    let balance = 0;
    if (acc.normalBalance === "DEBIT") {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      totalDebit,
      totalCredit,
      balance
    };
  });
}

export async function getProfitAndLoss(ctx: AgencyContext, startDate: Date, endDate: Date) {
  // P&L only includes REVENUE and EXPENSE accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { 
      ...(agencyScope(ctx) as any), 
      isActive: true,
      type: { in: ["REVENUE", "EXPENSE"] }
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: { gte: startDate, lte: endDate },
            status: "POSTED"
          }
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  const report = {
    revenue: [] as any[],
    expenses: [] as any[],
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0
  };

  for (const acc of accounts) {
    const totalDebit = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);
    
    if (acc.type === "REVENUE") {
      const balance = totalCredit - totalDebit; // Revenue is Credit normal
      if (balance !== 0) {
        report.revenue.push({ id: acc.id, code: acc.code, name: acc.name, balance });
        report.totalRevenue += balance;
      }
    } else if (acc.type === "EXPENSE") {
      const balance = totalDebit - totalCredit; // Expense is Debit normal
      if (balance !== 0) {
        report.expenses.push({ id: acc.id, code: acc.code, name: acc.name, balance });
        report.totalExpenses += balance;
      }
    }
  }

  report.netIncome = report.totalRevenue - report.totalExpenses;
  return report;
}

export async function getBalanceSheet(ctx: AgencyContext, asOfDate: Date) {
  // Balance Sheet includes ASSET, LIABILITY, and EQUITY accounts
  const accounts = await prisma.chartOfAccount.findMany({
    where: { 
      ...(agencyScope(ctx) as any), 
      isActive: true,
      type: { in: ["ASSET", "LIABILITY", "EQUITY"] }
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: { lte: asOfDate },
            status: "POSTED"
          }
        }
      }
    },
    orderBy: { code: 'asc' }
  });

  const report = {
    assets: [] as any[],
    liabilities: [] as any[],
    equity: [] as any[],
    totalAssets: 0,
    totalLiabilities: 0,
    totalEquity: 0
  };

  for (const acc of accounts) {
    const totalDebit = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);
    
    if (acc.type === "ASSET") {
      const balance = totalDebit - totalCredit;
      if (balance !== 0) {
        report.assets.push({ id: acc.id, code: acc.code, name: acc.name, balance });
        report.totalAssets += balance;
      }
    } else if (acc.type === "LIABILITY") {
      const balance = totalCredit - totalDebit;
      if (balance !== 0) {
        report.liabilities.push({ id: acc.id, code: acc.code, name: acc.name, balance });
        report.totalLiabilities += balance;
      }
    } else if (acc.type === "EQUITY") {
      const balance = totalCredit - totalDebit;
      if (balance !== 0) {
        report.equity.push({ id: acc.id, code: acc.code, name: acc.name, balance });
        report.totalEquity += balance;
      }
    }
  }

  // Calculate Retained Earnings (Net Income from REVENUE and EXPENSE)
  const incomeAccounts = await prisma.chartOfAccount.findMany({
    where: { 
      ...(agencyScope(ctx) as any), 
      isActive: true,
      type: { in: ["REVENUE", "EXPENSE"] }
    },
    include: {
      journalLines: {
        where: {
          journalEntry: {
            date: { lte: asOfDate },
            status: "POSTED"
          }
        }
      }
    }
  });

  let retainedEarnings = 0;
  for (const acc of incomeAccounts) {
    const totalDebit = acc.journalLines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = acc.journalLines.reduce((sum, l) => sum + l.credit, 0);
    if (acc.type === "REVENUE") retainedEarnings += (totalCredit - totalDebit);
    if (acc.type === "EXPENSE") retainedEarnings -= (totalDebit - totalCredit);
  }

  report.equity.push({ id: 'retained-earnings', code: '3999', name: 'Retained Earnings', balance: retainedEarnings });
  report.totalEquity += retainedEarnings;

  return report;
}
