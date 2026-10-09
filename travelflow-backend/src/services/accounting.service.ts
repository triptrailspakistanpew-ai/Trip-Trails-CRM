import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";
import { generateRef } from "../utils/refGenerator";
import { AgencyContext, PaginationOptions, DateFilterOptions, applyDateFilter } from "./domain.service";
import * as mapping from "./accounting-mapping.service";

// ─── Internal Journal Posting Helper ──────────────────────────────────────────

export async function postJournalEntry(
  ctx: AgencyContext,
  params: {
    description: string;
    date: Date;
    sourceModule: string;
    sourceId?: string;
    reference?: string;
    branchId?: string;
    lines: {
      accountId: string;
      debit: number;
      credit: number;
      currency?: string;
      exchangeRate?: number;
      baseDebit?: number;
      baseCredit?: number;
      description?: string;
    }[];
    createdBy?: string;
  }
) {
  // Aggregate lines by accountId, currency, and description to keep entries clean
  const aggregatedMap = new Map<
    string,
    {
      accountId: string;
      debit: number;
      credit: number;
      currency?: string;
      exchangeRate?: number;
      baseDebit?: number;
      baseCredit?: number;
      description?: string;
    }
  >();
  for (const line of params.lines) {
    if (line.debit === 0 && line.credit === 0) continue;
    const curr = line.currency || "PKR";
    const key = `${line.accountId}_${curr}_${line.description || ""}`;
    const existing = aggregatedMap.get(key);
    if (existing) {
      existing.debit += line.debit;
      existing.credit += line.credit;
      if (line.baseDebit != null) existing.baseDebit = (existing.baseDebit || 0) + line.baseDebit;
      if (line.baseCredit != null) existing.baseCredit = (existing.baseCredit || 0) + line.baseCredit;
    } else {
      aggregatedMap.set(key, { ...line, currency: curr });
    }
  }

  const lines = Array.from(aggregatedMap.values());
  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw ApiError.badRequest(
      `Journal entry lines do not balance: Debits = ${totalDebit.toFixed(2)}, Credits = ${totalCredit.toFixed(2)}`
    );
  }

  let finalEntryNumber = await generateRef("JE", ctx.agencyId);
  while (true) {
    const exists = await prisma.journalEntry.findFirst({
      where: { agencyId: ctx.agencyId, entryNumber: finalEntryNumber },
      select: { id: true },
    });
    if (!exists) break;
    finalEntryNumber = await generateRef("JE", ctx.agencyId);
  }

  const entry = await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        agencyId: ctx.agencyId,
        branchId: params.branchId || null,
        entryNumber: finalEntryNumber,
        date: params.date,
        description: params.description,
        reference: params.reference || null,
        sourceModule: params.sourceModule,
        sourceId: params.sourceId || null,
        status: "POSTED",
        createdBy: params.createdBy && /^[0-9a-fA-F-]{36}$/.test(params.createdBy) ? params.createdBy : undefined,
        postedAt: new Date(),
      },
    });

    for (const line of lines) {
      const rate = line.exchangeRate != null ? Number(line.exchangeRate) : 1;
      const currency = line.currency || "PKR";
      const baseDebit =
        line.baseDebit != null
          ? Number(line.baseDebit)
          : Math.round(Number(line.debit) * rate * 100) / 100;
      const baseCredit =
        line.baseCredit != null
          ? Number(line.baseCredit)
          : Math.round(Number(line.credit) * rate * 100) / 100;

      await tx.journalLine.create({
        data: {
          agencyId: ctx.agencyId,
          journalEntryId: je.id,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          currency,
          exchangeRate: rate,
          baseDebit,
          baseCredit,
          description: line.description || null,
        },
      });
    }

    return je;
  });

  return entry;
}

// ─── Manual Journal Entry Creation ──────────────────────────────────────────

export async function createJournalEntry(
  ctx: AgencyContext,
  data: {
    description: string;
    date: string;
    reference?: string;
    lines: { accountId: string; debit: number; credit: number; description?: string }[];
  },
  createdBy: string
) {
  const totalDebit = data.lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + l.credit, 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw ApiError.badRequest("Journal entry lines do not balance");
  }

  // Validate that all accounts are active
  for (const line of data.lines) {
    const acc = await prisma.chartOfAccount.findFirst({
      where: { id: line.accountId, agencyId: ctx.agencyId },
    });
    if (!acc) throw ApiError.badRequest(`Account ${line.accountId} not found.`);
    if (!acc.isActive) throw ApiError.badRequest(`Account ${acc.code} - ${acc.name} is inactive.`);
  }

  const year = new Date().getFullYear();
  const count = await prisma.journalEntry.count({
    where: { agencyId: ctx.agencyId },
  });
  const entryNumber = `JE-${year}-${String(count + 1).padStart(3, "0")}`;

  let finalEntryNumber = entryNumber;
  let attempts = 0;
  while (attempts < 5) {
    const existing = await prisma.journalEntry.findFirst({
      where: { agencyId: ctx.agencyId, entryNumber: finalEntryNumber },
    });
    if (!existing) break;
    attempts++;
    finalEntryNumber = `${entryNumber}-${attempts}`;
  }

  const entry = await prisma.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        agencyId: ctx.agencyId,
        entryNumber: finalEntryNumber,
        date: new Date(data.date),
        description: data.description,
        reference: data.reference || null,
        sourceModule: "MANUAL",
        sourceId: null,
        status: "DRAFT",
        createdBy: createdBy || undefined,
      },
    });

    for (const line of data.lines) {
      await tx.journalLine.create({
        data: {
          agencyId: ctx.agencyId,
          journalEntryId: je.id,
          accountId: line.accountId,
          debit: line.debit,
          credit: line.credit,
          exchangeRate: 1,
          baseDebit: line.debit,
          baseCredit: line.credit,
          description: line.description || null,
        },
      });
    }

    return je;
  });

  return entry;
}

// ─── Chart of Accounts Management ───────────────────────────────────────────

export async function listChartOfAccounts(ctx: AgencyContext) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { agencyId: ctx.agencyId },
    orderBy: { code: "asc" },
  });

  // Calculate live balances
  const balances = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: { agencyId: ctx.agencyId },
    _sum: { debit: true, credit: true },
  });

  const balanceMap = new Map<string, number>();
  for (const b of balances) {
    const debit = b._sum.debit || 0;
    const credit = b._sum.credit || 0;
    balanceMap.set(b.accountId, debit - credit);
  }

  return accounts.map((acc) => {
    const rawBalance = balanceMap.get(acc.id) || 0;
    // For credit-normal accounts (Liabilities, Equity, Revenue), balance is credit - debit
    const balance = acc.normalBalance === "CREDIT" ? -rawBalance : rawBalance;
    return {
      ...acc,
      balance,
    };
  });
}

export function validateNormalBalance(type: string, normalBalance: string) {
  const t = type.toUpperCase();
  const nb = normalBalance.toUpperCase();

  if (t === "ASSET" && nb !== "DEBIT" && nb !== "CREDIT") {
    throw ApiError.badRequest("Assets must have normal balance DEBIT or CREDIT (contra-asset).");
  }
  if (t === "LIABILITY" && nb !== "CREDIT") {
    throw ApiError.badRequest("Liabilities must have normal balance CREDIT.");
  }
  if (t === "EQUITY" && nb !== "CREDIT" && nb !== "DEBIT") {
    throw ApiError.badRequest("Equity must have normal balance CREDIT or DEBIT (drawings).");
  }
  if (t === "REVENUE" && nb !== "CREDIT" && nb !== "DEBIT") {
    throw ApiError.badRequest("Revenue must have normal balance CREDIT or DEBIT (sales returns).");
  }
  if (t === "EXPENSE" && nb !== "DEBIT") {
    throw ApiError.badRequest("Expenses must have normal balance DEBIT.");
  }
}

export async function createAccount(
  ctx: AgencyContext,
  data: {
    code: string;
    name: string;
    type: string;
    category?: string;
    normalBalance: string;
    description?: string;
    parentAccountId?: string;
    branchId?: string;
  }
) {
  validateNormalBalance(data.type, data.normalBalance);

  const existing = await prisma.chartOfAccount.findFirst({
    where: { agencyId: ctx.agencyId, code: data.code.trim() },
  });
  if (existing) throw ApiError.conflict(`Account code ${data.code} is already in use.`);

  const duplicateName = await prisma.chartOfAccount.findFirst({
    where: {
      agencyId: ctx.agencyId,
      name: { equals: data.name.trim(), mode: "insensitive" },
    },
  });
  if (duplicateName) {
    throw ApiError.conflict(`An account with the name "${data.name}" already exists.`);
  }

  if (data.parentAccountId) {
    const parent = await prisma.chartOfAccount.findFirst({
      where: { id: data.parentAccountId, agencyId: ctx.agencyId },
    });
    if (!parent) throw ApiError.badRequest("Parent account not found.");
  }

  return prisma.chartOfAccount.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: data.branchId || ctx.userBranchId || ctx.branchId || "11111111-1111-1111-1111-111111111101",
      code: data.code.trim(),
      name: data.name.trim(),
      type: data.type.toUpperCase() as any,
      category: data.category?.trim() || null,
      normalBalance: data.normalBalance.toUpperCase() as any,
      description: data.description?.trim() || null,
      parentAccountId: data.parentAccountId || null,
      isSystem: false,
      isActive: true,
    },
  });
}

export async function updateAccount(
  ctx: AgencyContext,
  accountId: string,
  data: {
    name?: string;
    category?: string;
    description?: string;
    parentAccountId?: string | null;
    normalBalance?: string;
  }
) {
  const account = await prisma.chartOfAccount.findFirst({
    where: { id: accountId, agencyId: ctx.agencyId },
  });
  if (!account) throw ApiError.notFound("Account");

  if (data.normalBalance) {
    validateNormalBalance(account.type, data.normalBalance);
  }

  if (data.name && data.name.trim().toLowerCase() !== account.name.toLowerCase()) {
    const duplicate = await prisma.chartOfAccount.findFirst({
      where: {
        agencyId: ctx.agencyId,
        id: { not: accountId },
        name: { equals: data.name.trim(), mode: "insensitive" },
      },
    });
    if (duplicate) throw ApiError.conflict(`An account with the name "${data.name}" already exists.`);
  }

  return prisma.chartOfAccount.update({
    where: { id: accountId },
    data: {
      name: data.name?.trim() || account.name,
      category: data.category !== undefined ? data.category?.trim() || null : account.category,
      description: data.description !== undefined ? data.description?.trim() || null : account.description,
      parentAccountId: data.parentAccountId !== undefined ? data.parentAccountId : account.parentAccountId,
      normalBalance: (data.normalBalance?.toUpperCase() as any) || account.normalBalance,
    },
  });
}

export async function toggleAccountStatus(ctx: AgencyContext, accountId: string, isActive?: boolean) {
  const account = await prisma.chartOfAccount.findFirst({
    where: { id: accountId, agencyId: ctx.agencyId },
  });
  if (!account) throw ApiError.notFound("Account");

  const newStatus = isActive !== undefined ? isActive : !account.isActive;

  return prisma.chartOfAccount.update({
    where: { id: accountId },
    data: { isActive: newStatus },
  });
}

export async function deleteAccount(ctx: AgencyContext, accountId: string) {
  const account = await prisma.chartOfAccount.findFirst({
    where: { id: accountId, agencyId: ctx.agencyId },
  });
  if (!account) throw ApiError.notFound("Account");

  if (account.isSystem) {
    throw ApiError.badRequest("System default accounts cannot be deleted. You may deactivate them instead.");
  }

  const journalLinesCount = await prisma.journalLine.count({
    where: { accountId, agencyId: ctx.agencyId },
  });
  if (journalLinesCount > 0) {
    throw ApiError.badRequest(
      `Cannot delete account "${account.code} - ${account.name}" because it has ${journalLinesCount} historical journal transaction(s). Please deactivate it instead.`
    );
  }

  const subAccountsCount = await prisma.chartOfAccount.count({
    where: { parentAccountId: accountId, agencyId: ctx.agencyId },
  });
  if (subAccountsCount > 0) {
    throw ApiError.badRequest("Cannot delete an account that has sub-accounts linked to it.");
  }

  const linkedExpensesCount = await prisma.expense.count({
    where: { OR: [{ accountId }, { paymentAccountId: accountId }] },
  });
  if (linkedExpensesCount > 0) {
    throw ApiError.badRequest("Cannot delete an account linked to operational expenses. Please deactivate it.");
  }

  return prisma.chartOfAccount.delete({
    where: { id: accountId },
  });
}

export async function getAccountBalance(ctx: AgencyContext, accountId: string) {
  const account = await prisma.chartOfAccount.findFirst({
    where: { id: accountId, agencyId: ctx.agencyId },
  });
  if (!account) throw ApiError.notFound("Account");

  const result = await prisma.journalLine.aggregate({
    where: { agencyId: ctx.agencyId, accountId },
    _sum: { debit: true, credit: true },
  });
  const rawBalance = (result._sum.debit || 0) - (result._sum.credit || 0);
  const balance = account.normalBalance === "CREDIT" ? -rawBalance : rawBalance;
  return { accountId, code: account.code, name: account.name, balance };
}

export async function getTrialBalance(ctx: AgencyContext) {
  const accounts = await prisma.chartOfAccount.findMany({
    where: { agencyId: ctx.agencyId, isActive: true },
    orderBy: { code: "asc" },
  });

  const groupedBalances = await prisma.journalLine.groupBy({
    by: ["accountId"],
    where: {
      agencyId: ctx.agencyId,
      journalEntry: { status: "POSTED" },
    },
    _sum: {
      baseDebit: true,
      baseCredit: true,
    },
  });

  const balancesMap = new Map(
    groupedBalances.map((gb) => [
      gb.accountId,
      {
        debit: gb._sum.baseDebit || 0,
        credit: gb._sum.baseCredit || 0,
      },
    ])
  );

  const balances = accounts.map((acc) => {
    const agg = balancesMap.get(acc.id) || { debit: 0, credit: 0 };
    const net = agg.debit - agg.credit;
    return {
      id: acc.id,
      code: acc.code,
      name: acc.name,
      type: acc.type,
      debit: net > 0 ? net : 0,
      credit: net < 0 ? Math.abs(net) : 0,
      balance: net,
    };
  });

  const totalDebits = balances.reduce((sum, a) => sum + a.debit, 0);
  const totalCredits = balances.reduce((sum, a) => sum + a.credit, 0);

  return { accounts: balances, totalDebits, totalCredits };
}

// ─── Journal Entries Listing & Reversal ──────────────────────────────────────

export async function listJournalEntries(
  ctx: AgencyContext,
  pagination?: PaginationOptions,
  dates?: DateFilterOptions
) {
  const filter: any = { agencyId: ctx.agencyId };
  applyDateFilter(filter, dates, "date");

  if (!pagination) {
    const data = await prisma.journalEntry.findMany({
      where: filter,
      orderBy: { date: "desc" },
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
        createdByUser: { select: { firstName: true, lastName: true } },
      },
    });
    return { data, total: data.length, page: 1, limit: data.length, totalPages: 1 };
  }

  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: filter,
      orderBy: { date: "desc" },
      skip,
      take: limit,
      include: {
        lines: { include: { account: { select: { code: true, name: true } } } },
        createdByUser: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.journalEntry.count({ where: filter }),
  ]);

  return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getJournalEntry(ctx: AgencyContext, id: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, agencyId: ctx.agencyId },
    include: {
      lines: { include: { account: { select: { code: true, name: true } } } },
      createdByUser: { select: { firstName: true, lastName: true } },
    },
  });
  if (!entry) throw ApiError.notFound("JournalEntry");
  return entry;
}

export async function reverseJournalEntry(ctx: AgencyContext, id: string, reason: string, userId: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, agencyId: ctx.agencyId },
  });
  if (!entry) throw ApiError.notFound("JournalEntry");
  if (entry.status === "REVERSED") throw ApiError.badRequest("Entry is already reversed");
  if (entry.status === "DRAFT") throw ApiError.badRequest("Cannot reverse a draft entry — delete it instead");

  const originalLines = await prisma.journalLine.findMany({
    where: { journalEntryId: id, agencyId: ctx.agencyId },
  });

  const reversingEntry = await postJournalEntry(ctx, {
    description: `Reversal of ${entry.entryNumber}: ${reason}`,
    date: new Date(),
    sourceModule: "MANUAL",
    reference: entry.entryNumber,
    lines: originalLines.map((l) => ({
      accountId: l.accountId,
      debit: l.credit,
      credit: l.debit,
      description: `Reversal of ${l.description || entry.description}`,
    })),
    createdBy: userId || undefined,
  });

  await prisma.journalEntry.update({
    where: { id },
    data: {
      status: "REVERSED",
      reversedAt: new Date(),
      reversingEntryId: reversingEntry.id,
    },
  });

  return reversingEntry;
}

export async function postJournalEntryById(ctx: AgencyContext, id: string, userId: string) {
  const entry = await prisma.journalEntry.findFirst({
    where: { id, agencyId: ctx.agencyId },
    include: { lines: true },
  });
  if (!entry) throw ApiError.notFound("JournalEntry");
  if (entry.status === "POSTED") throw ApiError.badRequest("Entry is already posted");
  if (entry.status === "REVERSED") throw ApiError.badRequest("Entry is reversed");

  const totalDebit = entry.lines.reduce((sum, l) => sum + Number(l.baseDebit), 0);
  const totalCredit = entry.lines.reduce((sum, l) => sum + Number(l.baseCredit), 0);
  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw ApiError.badRequest(`Debits (${totalDebit}) and Credits (${totalCredit}) must balance in base currency.`);
  }

  const updated = await prisma.journalEntry.update({
    where: { id },
    data: {
      status: "POSTED",
      postedAt: new Date(),
    },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: entry.branchId || undefined,
      type: "JOURNAL_POSTED",
      title: "Manual Journal Posted",
      detail: `Journal Entry ${entry.entryNumber} posted manually.`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: userId || undefined,
    },
  }).catch(() => {});

  return updated;
}

// ─── Automated Accounting Posting Functions ───────────────────────────────────

/**
 * Invoice Journal Posting:
 * DR 1100 Accounts Receivable – Customers (Customer Total)
 * CR 2000 Due to Suppliers (Estimated, pre-invoice) (For unconfirmed supplier costs)
 * CR 2010 Accounts Payable – Suppliers (Confirmed) (For already confirmed supplier costs)
 * CR 2200 Output VAT Payable (Tax amount)
 * CR 4000-4030 / 4900 Service Fee Income (Agency Margin categorized by service)
 */
export async function postInvoiceJournal(ctx: AgencyContext, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, agencyId: ctx.agencyId },
    include: { booking: { include: { services: true } } },
  });
  if (!invoice) throw ApiError.notFound("Invoice");
  if (!invoice.booking) throw ApiError.badRequest("Invoice has no associated booking");

  const existing = await prisma.journalEntry.findFirst({
    where: { agencyId: ctx.agencyId, sourceModule: "INVOICE", sourceId: invoiceId },
  });
  if (existing) return existing;

  const [
    arAccount,
    vatAccount,
    supplierEstimatedAccount,
    supplierConfirmedAccount,
    costVarianceAccount,
  ] = await Promise.all([
    mapping.getARAccount(ctx.agencyId, invoice.branchId!),
    mapping.getOutputVATAccount(ctx.agencyId, invoice.branchId!),
    mapping.getSupplierEstimatedAccount(ctx.agencyId, invoice.branchId!),
    mapping.getSupplierConfirmedAccount(ctx.agencyId, invoice.branchId!),
    mapping.getCostVarianceAccount(ctx.agencyId, invoice.branchId!),
  ]);

  let totalCustomerAmount = 0;
  let totalVAT = 0;

  const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];

  const categories = Array.from(new Set(invoice.booking.services.map(s => s.serviceCategory)));
  const revenueAccountEntries = await Promise.all(
    categories.map(async (cat) => {
      const acc = await mapping.getRevenueAccountForCategory(ctx.agencyId, invoice.branchId!, cat);
      return [cat, acc];
    })
  );
  const revenueAccountMap = Object.fromEntries(revenueAccountEntries);

  for (const svc of invoice.booking.services) {
    const cost = Number(svc.costPrice);
    const sellingPrice = Number(svc.sellingPrice);
    const taxAmount = Number(svc.taxAmount || 0);
    const customerTotal = Number(svc.customerTotal || sellingPrice + taxAmount);
    
    // Margin is selling price minus estimated supplier cost
    const margin = Number(
      svc.expectedMargin ?? (sellingPrice - cost)
    );

    totalCustomerAmount += customerTotal;
    totalVAT += taxAmount;

    // Supplier liability: ALWAYS credit 2000 (Estimated obligation) at invoice recognition.
    if (cost > 0) {
      lines.push({
        accountId: supplierEstimatedAccount.id,
        debit: 0,
        credit: cost,
        description: `Estimated Supplier Accrual for ${svc.title || svc.serviceCategory}`,
      });
    }

    // Revenue categorized by service type, or Cost Variance for negative margin
    if (margin > 0) {
      const revAccount = revenueAccountMap[svc.serviceCategory];
      lines.push({
        accountId: revAccount.id,
        debit: 0,
        credit: margin,
        description: `Service Fee Margin – ${svc.title || svc.serviceCategory}`,
      });
    } else if (margin < 0) {
      const loss = Math.abs(margin);
      lines.push({
        accountId: costVarianceAccount.id,
        debit: loss,
        credit: 0,
        description: `Trading Discount/Loss (Negative Margin) – ${svc.title || svc.serviceCategory}`,
      });
    }
  }

  // Add Debit for Customer AR (1100)
  lines.unshift({
    accountId: arAccount.id,
    debit: totalCustomerAmount,
    credit: 0,
    description: `AR for Invoice ${invoice.invoiceRef}`,
  });

  // Add Credit for Output VAT (2200)
  if (totalVAT > 0) {
    lines.push({
      accountId: vatAccount.id,
      debit: 0,
      credit: totalVAT,
      description: `Output VAT on Invoice ${invoice.invoiceRef}`,
    });
  }

  // Ensure perfect balance rounding adjustment
  const totalDebits = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredits = lines.reduce((sum, l) => sum + l.credit, 0);
  const diff = totalDebits - totalCredits;
  if (Math.abs(diff) > 0 && Math.abs(diff) <= 0.05) {
    // assign minor fractional rounding difference to the first revenue line or cost variance line
    const revLine = lines.find((l) => l.credit > 0 && l.accountId !== vatAccount.id && l.accountId !== supplierConfirmedAccount.id && l.accountId !== supplierEstimatedAccount.id);
    if (revLine) {
      revLine.credit += diff;
    } else {
      const varianceLine = lines.find((l) => l.debit > 0 && l.accountId === costVarianceAccount.id);
      if (varianceLine) {
        varianceLine.debit -= diff;
      }
    }
  }

  const je = await postJournalEntry(ctx, {
    description: `Invoice ${invoice.invoiceRef} Recognition`,
    date: invoice.createdAt,
    sourceModule: "INVOICE",
    sourceId: invoiceId,
    reference: invoice.invoiceRef,
    branchId: invoice.branchId || undefined,
    lines,
    createdBy: ctx.callerId || undefined,
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: invoice.branchId || undefined,
      type: "INVOICE_POSTED",
      title: "Invoice Journal Posted",
      detail: `Invoice ${invoice.invoiceRef} journal posted: ${totalCustomerAmount} AR, VAT ${totalVAT}`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: ctx.callerId || undefined,
    },
  }).catch(() => {});

  // Check if this booking has unapplied customer advances (e.g. deposited to 2100 before invoice)
  if (invoice.bookingId) {
    const advanceAccount = await mapping.getCustomerAdvanceAccount(ctx.agencyId, invoice.branchId!);
    const bookingPayments = await prisma.customerPayment.findMany({
      where: { bookingId: invoice.bookingId, agencyId: ctx.agencyId, status: { not: "reversed" } },
    });

    const pJEs = await prisma.journalEntry.findMany({
      where: {
        agencyId: ctx.agencyId,
        sourceModule: "CUSTOMER_PAYMENT",
        sourceId: { in: bookingPayments.map(p => p.id) },
        status: "POSTED",
      },
      include: { lines: true },
    });
    const pJEMap = new Map(pJEs.map(je => [je.sourceId, je]));

    const priorSettlementsList = await prisma.journalEntry.findMany({
      where: {
        agencyId: ctx.agencyId,
        sourceModule: { in: ["CUSTOMER_ADVANCE_SETTLEMENT", "CUSTOMER_ADVANCE_ALLOCATION"] },
        status: "POSTED",
        reference: { in: bookingPayments.map(p => p.paymentRef) },
      },
      include: { lines: true },
    });
    const priorSettlementsMap = new Map();
    priorSettlementsList.forEach(je => {
      if (!priorSettlementsMap.has(je.reference)) {
        priorSettlementsMap.set(je.reference, []);
      }
      priorSettlementsMap.get(je.reference).push(je);
    });

    let totalAdvanceForBooking = 0;
    for (const p of bookingPayments) {
      const pJE = pJEMap.get(p.id);
      if (pJE) {
        const advLine = pJE.lines.find((l) => l.accountId === advanceAccount.id);
        if (advLine && advLine.credit > 0) {
          const priorSettlements = priorSettlementsMap.get(p.paymentRef) || [];
          const alreadySettled = priorSettlements.reduce((sum: number, sje: any) => {
            const debLine = sje.lines.find((l: any) => l.accountId === advanceAccount.id);
            return sum + (debLine ? debLine.debit : 0);
          }, 0);
          const remainingOnPayment = Math.max(0, advLine.credit - alreadySettled);
          totalAdvanceForBooking += remainingOnPayment;
        }
      }
    }

    if (totalAdvanceForBooking > 0) {
      const settleAmount = Math.min(totalAdvanceForBooking, totalCustomerAmount);
      if (settleAmount > 0) {
        await postJournalEntry(ctx, {
          description: `Customer Advance Settlement for Invoice ${invoice.invoiceRef}`,
          date: new Date(),
          sourceModule: "CUSTOMER_ADVANCE_SETTLEMENT",
          sourceId: invoice.id,
          reference: invoice.invoiceRef,
          branchId: invoice.branchId || undefined,
          lines: [
            {
              accountId: advanceAccount.id,
              debit: settleAmount,
              credit: 0,
              description: `Apply Customer Advance 2100 to Invoice ${invoice.invoiceRef}`,
            },
            {
              accountId: arAccount.id,
              debit: 0,
              credit: settleAmount,
              description: `Clear AR 1100 for Invoice ${invoice.invoiceRef}`,
            },
          ],
          createdBy: ctx.callerId || undefined,
        });

        // Update invoice payment status
        const isFullyPaid = settleAmount >= totalCustomerAmount;
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: isFullyPaid ? "paid" : "sent",
            paidAt: isFullyPaid ? new Date() : null,
          },
        });

        await prisma.recentActivity.create({
          data: {
            agencyId: ctx.agencyId,
            branchId: invoice.branchId || undefined,
            type: "CUSTOMER_ADVANCE_SETTLED",
            title: "Customer Advance Settled",
            detail: `Settled PKR ${settleAmount.toLocaleString()} advance from 2100 against Invoice ${invoice.invoiceRef}. Remaining advance: PKR ${(totalAdvanceForBooking - settleAmount).toLocaleString()}`,
            createdBy: ctx.callerRole || "system",
            createdByUserId: ctx.callerId || undefined,
          },
        }).catch(() => {});
      }
    }
  }

  return je;
}

/**
 * Confirm Supplier Obligation (Reclassification & Cost Variance):
 * Converts an estimated obligation (2000) into confirmed payable (2010) without double counting.
 * DR 2000 Due to Suppliers (Estimated, pre-invoice) [Original costPrice]
 * CR 2010 Accounts Payable – Suppliers (Confirmed) [Actual supplierInvoiceAmount]
 * DR/CR 5000 Cost Variance (Gain)/Loss [Difference between actual and estimated]
 */
export async function confirmSupplierInvoice(
  ctx: AgencyContext,
  params: {
    bookingServiceId: string;
    supplierInvoiceAmount: number;
    reference?: string;
    date?: Date;
  }
) {
  const svc = await prisma.bookingService.findFirst({
    where: { id: params.bookingServiceId, agencyId: ctx.agencyId },
    include: { booking: { select: { branchId: true } } },
  });
  if (!svc) throw ApiError.notFound("BookingService");

  const estimatedCost = Number(svc.costPrice);
  const actualCost = Number(params.supplierInvoiceAmount);
  const variance = actualCost - estimatedCost;

  // 1. Reverse any prior active confirmation journal entries for this service to prevent duplicate liability accumulation
  const priorConfirmations = await prisma.journalEntry.findMany({
    where: {
      agencyId: ctx.agencyId,
      sourceModule: "SUPPLIER_INVOICE_CONFIRMATION",
      sourceId: svc.id,
      status: "POSTED",
    },
  });

  for (const prior of priorConfirmations) {
    await reverseJournalEntry(
      ctx,
      prior.id,
      `Adjusted supplier bill confirmation on ${svc.title}`,
      ctx.callerId || "system"
    );
  }

  const estimatedAccount = await mapping.getSupplierEstimatedAccount(ctx.agencyId, svc.booking.branchId!);
  const confirmedAccount = await mapping.getSupplierConfirmedAccount(ctx.agencyId, svc.booking.branchId!);
  const varianceAccount = await mapping.getCostVarianceAccount(ctx.agencyId, svc.booking.branchId!);

  const lines: { accountId: string; debit: number; credit: number; description?: string }[] = [];

  // Clear estimated liability
  if (estimatedCost > 0) {
    lines.push({
      accountId: estimatedAccount.id,
      debit: estimatedCost,
      credit: 0,
      description: `Clear estimated obligation for ${svc.title}`,
    });
  }

  // Credit confirmed payable
  if (actualCost > 0) {
    lines.push({
      accountId: confirmedAccount.id,
      debit: 0,
      credit: actualCost,
      description: `Confirmed AP for ${svc.title} (Bill: ${params.reference || "Verified"})`,
    });
  }

  // Cost variance
  if (Math.abs(variance) > 0.001) {
    if (variance > 0) {
      // Cost increased: Debit Cost Variance (Loss / Direct Cost)
      lines.push({
        accountId: varianceAccount.id,
        debit: variance,
        credit: 0,
        description: `Cost Variance (Loss) on ${svc.title}`,
      });
    } else {
      // Cost decreased: Credit Cost Variance (Gain)
      lines.push({
        accountId: varianceAccount.id,
        debit: 0,
        credit: Math.abs(variance),
        description: `Cost Variance (Gain) on ${svc.title}`,
      });
    }
  }

  const je = await postJournalEntry(ctx, {
    description: `Supplier Cost Confirmation for ${svc.title}`,
    date: params.date || new Date(),
    sourceModule: "SUPPLIER_INVOICE_CONFIRMATION",
    sourceId: svc.id,
    reference: params.reference || undefined,
    lines,
    createdBy: ctx.callerId || undefined,
  });

  // Update booking service financial state
  await prisma.bookingService.update({
    where: { id: svc.id },
    data: {
      supplierInvoiceAmount: actualCost,
      actualMargin: Number(svc.sellingPrice) - actualCost - Number(svc.taxAmount || 0),
      costVariance: variance,
      financialStatus: "confirmed",
    },
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      type: "SUPPLIER_CONFIRMED",
      title: "Supplier Obligation Confirmed",
      detail: `Confirmed supplier bill for ${svc.title}: actual ${actualCost} vs estimated ${estimatedCost} (Variance: ${variance})`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: ctx.callerId || undefined,
    },
  }).catch(() => {});

  return je;
}

/**
 * Customer Payment Posting:
 * - If against invoice: DR Bank (1000/1010/1020), CR 1100 Accounts Receivable (up to invoice balance), CR 2100 Customer Advances (excess)
 * - If customer advance (deposit before invoice): DR Bank, CR 2100 Customer Advances Received
 */
export async function postCustomerPaymentJournal(
  ctx: AgencyContext,
  paymentId: string,
  options?: { accountId?: string }
) {
  const payment = await prisma.customerPayment.findFirst({
    where: { id: paymentId, agencyId: ctx.agencyId },
    include: { allocations: true },
  });
  if (!payment) throw ApiError.notFound("Payment");

  const existing = await prisma.journalEntry.findFirst({
    where: { agencyId: ctx.agencyId, sourceModule: "CUSTOMER_PAYMENT", sourceId: paymentId },
  });
  if (existing) return existing;

  const bank = await mapping.getBankOrCashAccount(ctx.agencyId, payment.branchId!, {
    currency: (payment as any).currency || "PKR",
    paymentMethod: payment.paymentMethod,
    accountId: options?.accountId,
  });

  const arAccount = await mapping.getARAccount(ctx.agencyId, payment.branchId!);
  const advanceAccount = await mapping.getCustomerAdvanceAccount(ctx.agencyId, payment.branchId!);

  // Check whether an active invoice exists for this booking
  let invoice = null;
  if (payment.bookingId) {
    invoice = await prisma.invoice.findFirst({
      where: { bookingId: payment.bookingId, agencyId: ctx.agencyId, status: { not: "cancelled" } },
    });
  }

  const lines: {
    accountId: string;
    debit: number;
    credit: number;
    currency?: string;
    exchangeRate?: number;
    baseDebit?: number;
    baseCredit?: number;
    description?: string;
  }[] = [];

  // Bank debit line
  lines.push({
    accountId: bank.id,
    debit: payment.amount,
    credit: 0,
    currency: (payment as any).currency || "PKR",
    description: `Bank/Cash Receipt for ${payment.paymentRef}`,
  });

  if (invoice) {
    // Find prior allocations / payments to this booking to determine outstanding AR
    const priorAllocs = await prisma.paymentAllocation.findMany({
      where: {
        bookingId: invoice.bookingId!,
        agencyId: ctx.agencyId,
        customerPaymentId: { not: payment.id },
      },
    });
    const priorAllocated = priorAllocs.reduce((sum, a) => sum + a.amount, 0);
    const outstandingAR = Math.max(0, invoice.total - priorAllocated);

    const arAmount = Math.min(payment.amount, outstandingAR);
    const advanceAmount = Math.max(0, payment.amount - arAmount);

    if (arAmount > 0) {
      lines.push({
        accountId: arAccount.id,
        debit: 0,
        credit: arAmount,
        currency: (payment as any).currency || "PKR",
        description: `Clear AR for Invoice ${invoice.invoiceRef}`,
      });
    }

    if (advanceAmount > 0) {
      lines.push({
        accountId: advanceAccount.id,
        debit: 0,
        credit: advanceAmount,
        currency: (payment as any).currency || "PKR",
        description: `Customer Advance (Excess over Invoice ${invoice.invoiceRef})`,
      });
    }
  } else {
    // Unallocated deposit or payment before invoice -> Customer Advances Received (2100)
    lines.push({
      accountId: advanceAccount.id,
      debit: 0,
      credit: payment.amount,
      currency: (payment as any).currency || "PKR",
      description: `Customer Advance Received ${payment.paymentRef}`,
    });
  }

  const je = await postJournalEntry(ctx, {
    description: `Customer Payment ${payment.paymentRef}`,
    date: payment.date,
    sourceModule: "CUSTOMER_PAYMENT",
    sourceId: paymentId,
    reference: payment.paymentRef,
    branchId: payment.branchId || undefined,
    lines,
    createdBy: ctx.callerId || undefined,
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: payment.branchId || undefined,
      type: "CUSTOMER_PAYMENT_POSTED",
      title: "Customer Payment Posted",
      detail: `Customer Payment ${payment.paymentRef} of ${payment.amount} posted to GL (${invoice ? `Invoice ${invoice.invoiceRef}` : "Customer Advance 2100"})`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: ctx.callerId || undefined,
    },
  }).catch(() => {});

  return je;
}

/**
 * Supplier Payment Posting:
 * DR 2010 Accounts Payable – Suppliers (Confirmed)
 * CR 1000/1010/1020 Bank / Cash
 */
export async function postSupplierPaymentJournal(
  ctx: AgencyContext,
  paymentId: string,
  options?: { accountId?: string }
) {
  const payment = await prisma.supplierPayment.findFirst({
    where: { id: paymentId, agencyId: ctx.agencyId },
  });
  if (!payment) throw ApiError.notFound("Payment");

  const existing = await prisma.journalEntry.findFirst({
    where: { agencyId: ctx.agencyId, sourceModule: "SUPPLIER_PAYMENT", sourceId: paymentId },
  });
  if (existing) return existing;

  const bank = await mapping.getBankOrCashAccount(ctx.agencyId, payment.branchId!, {
    currency: (payment as any).currency || "PKR",
    paymentMethod: payment.paymentMethod,
    accountId: options?.accountId,
  });

  // Reduces confirmed supplier payable (2010)
  const ap = await mapping.getSupplierConfirmedAccount(ctx.agencyId, payment.branchId!);

  const je = await postJournalEntry(ctx, {
    description: `Payment to Supplier ${payment.paymentRef}`,
    date: payment.date,
    sourceModule: "SUPPLIER_PAYMENT",
    sourceId: paymentId,
    reference: payment.paymentRef,
    branchId: payment.branchId || undefined,
    lines: [
      { accountId: ap.id, debit: payment.amount, credit: 0, currency: (payment as any).currency || "PKR", description: "Clear Confirmed Supplier AP" },
      { accountId: bank.id, debit: 0, credit: payment.amount, currency: (payment as any).currency || "PKR", description: "Bank/Cash Outflow" },
    ],
    createdBy: ctx.callerId || undefined,
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: payment.branchId || undefined,
      type: "SUPPLIER_PAYMENT_POSTED",
      title: "Supplier Payment Posted",
      detail: `Supplier Payment ${payment.paymentRef} of ${payment.amount} posted to GL (Cleared 2010 Confirmed AP)`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: ctx.callerId || undefined,
    },
  }).catch(() => {});

  return je;
}

/**
 * Credit Note Posting:
 * DR Service Fee Income (reversal) / Other Income
 * CR 1100 Accounts Receivable – Customers
 */
export async function postCreditNoteJournal(ctx: AgencyContext, creditNoteId: string) {
  const cn = await prisma.creditNote.findFirst({
    where: { id: creditNoteId, agencyId: ctx.agencyId },
    include: { booking: { include: { services: true } } },
  });
  if (!cn) throw ApiError.notFound("Credit Note");

  const existing = await prisma.journalEntry.findFirst({
    where: { agencyId: ctx.agencyId, sourceModule: "CREDIT_NOTE", sourceId: creditNoteId },
  });
  if (existing) return existing;

  const ar = await mapping.getARAccount(ctx.agencyId, cn.branchId!);

  // Identify service category if available, else Other Income / General revenue
  const firstServiceCat = cn.booking?.services?.[0]?.serviceCategory;
  const revAccount = await mapping.getRevenueAccountForCategory(ctx.agencyId, cn.branchId!, firstServiceCat);

  return postJournalEntry(ctx, {
    description: `Credit Note ${cn.creditNoteRef}: ${cn.reason}`,
    date: cn.issuedAt,
    sourceModule: "CREDIT_NOTE",
    sourceId: cn.id,
    reference: cn.creditNoteRef,
    branchId: cn.branchId || undefined,
    lines: [
      { accountId: revAccount.id, debit: cn.amount, credit: 0, description: `Sales Return / Margin Reversal` },
      { accountId: ar.id, debit: 0, credit: cn.amount, description: "Reduce Customer AR" },
    ],
    createdBy: ctx.callerId || undefined,
  });
}

/**
 * Expense Posting:
 * DR Expense Account (or Prepaid Asset Account 1200/1210/1220 if capitalized)
 * CR Payment Account (1000/1010/1020)
 */
export async function postExpenseJournal(
  ctx: AgencyContext,
  expenseId: string,
  prepaidOptions?: { isPrepaid: boolean; amortizeOverMonths: number; startDate: Date }
) {
  const expense = await prisma.expense.findFirst({
    where: { id: expenseId, agencyId: ctx.agencyId },
  });
  if (!expense) throw ApiError.notFound("Expense");

  const existing = await prisma.journalEntry.findFirst({
    where: { agencyId: ctx.agencyId, sourceModule: "EXPENSE", sourceId: expenseId },
  });
  if (existing) return existing;

  let expenseAccountId = expense.accountId;
  if (!expenseAccountId) {
    const defaultAcc = await mapping.getExpenseAccountForCategory(ctx.agencyId, expense.branchId, expense.category);
    expenseAccountId = defaultAcc.id;
    await prisma.expense.update({
      where: { id: expenseId },
      data: { accountId: expenseAccountId },
    });
  }

  // Dr Expense account or Prepaid Asset
  let debitAccountId = expenseAccountId;
  if (prepaidOptions?.isPrepaid) {
    const prepaidAsset = await mapping.getPrepaidAssetAccount(ctx.agencyId, expense.branchId, expense.category);
    debitAccountId = prepaidAsset.id;
  }

  // Cr Payment method
  let creditAccountId = expense.paymentAccountId;
  if (!creditAccountId) {
    const defaultBank = await mapping.getBankOrCashAccount(ctx.agencyId, expense.branchId!, {
      paymentMethod: expense.paymentMethod,
    });
    creditAccountId = defaultBank.id;
    await prisma.expense.update({
      where: { id: expenseId },
      data: { paymentAccountId: creditAccountId },
    });
  }

  // Build journal lines — if expense has input VAT, split into net + VAT lines
  const inputVat = (expense as any).inputVat ?? 0;
  const grossAmount = expense.amount;
  const netExpenseAmount = inputVat > 0 ? grossAmount - inputVat : grossAmount;

  const lines: { accountId: string; debit: number; credit: number; description: string }[] = [
    {
      accountId: debitAccountId,
      debit: netExpenseAmount,
      credit: 0,
      description: prepaidOptions?.isPrepaid
        ? `Prepaid Expense Capitalization – ${expense.title}`
        : `Operating Expense – ${expense.title}`,
    },
  ];

  // If input VAT is recoverable, debit Account 1250 (Input VAT Recoverable)
  if (inputVat > 0) {
    const inputVATAccount = await mapping.getInputVATAccount(ctx.agencyId, expense.branchId!);
    lines.push({
      accountId: inputVATAccount.id,
      debit: inputVat,
      credit: 0,
      description: `Input VAT Recoverable – ${expense.title}`,
    });
  }

  lines.push({
    accountId: creditAccountId,
    debit: 0,
    credit: grossAmount,
    description: "Payment Outflow",
  });

  const je = await postJournalEntry(ctx, {
    description: `Expense ${expense.expenseRef} – ${expense.title}`,
    date: expense.date,
    sourceModule: "EXPENSE",
    sourceId: expenseId,
    reference: expense.expenseRef,
    branchId: expense.branchId || undefined,
    lines,
    createdBy: ctx.callerId || undefined,
  });

  await prisma.recentActivity.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: expense.branchId || undefined,
      type: "EXPENSE_RECORDED",
      title: "Expense Journal Posted",
      detail: `Expense ${expense.expenseRef} (${expense.title}) posted: ${expense.amount}`,
      createdBy: ctx.callerRole || "system",
      createdByUserId: ctx.callerId || undefined,
    },
  }).catch(() => {});

  // Handle Amortization Schedule Creation
  if (prepaidOptions?.isPrepaid && prepaidOptions.amortizeOverMonths > 0) {
    const endDate = new Date(prepaidOptions.startDate);
    endDate.setMonth(endDate.getMonth() + prepaidOptions.amortizeOverMonths);

    const sched = await prisma.amortizationSchedule.create({
      data: {
        agencyId: ctx.agencyId,
        expenseId: expense.id,
        assetAccountId: debitAccountId,
        expenseAccountId: expenseAccountId, // Original P&L expense account
        totalAmount: expense.amount,
        recognizedAmount: 0,
        startDate: prepaidOptions.startDate,
        endDate: endDate,
        frequency: "MONTHLY",
        status: "ACTIVE",
      },
    });

    const monthlyAmount = expense.amount / prepaidOptions.amortizeOverMonths;
    const items = [];
    for (let i = 0; i < prepaidOptions.amortizeOverMonths; i++) {
      const scheduledDate = new Date(prepaidOptions.startDate);
      scheduledDate.setMonth(scheduledDate.getMonth() + i);
      items.push({
        scheduleId: sched.id,
        scheduledDate,
        amount: monthlyAmount,
        status: "PENDING" as any,
      });
    }

    await prisma.amortizationScheduleItem.createMany({
      data: items,
    });
  }

  return je;
}

// ─── Prepaid Expenses Amortization Engine ─────────────────────────────────────

export async function processAmortizations(agencyId: string, upToDate: Date = new Date()) {
  const pendingItems = await prisma.amortizationScheduleItem.findMany({
    where: {
      schedule: { agencyId, status: "ACTIVE" },
      status: "PENDING",
      scheduledDate: { lte: upToDate },
    },
    include: { schedule: true },
  });

  const results = { processed: 0, errors: 0 };

  for (const item of pendingItems) {
    try {
      const je = await postJournalEntry(
        { agencyId, callerId: "" } as AgencyContext,
        {
          description: `Amortization for Expense ${item.schedule.expenseId}`,
          date: item.scheduledDate,
          sourceModule: "AMORTIZATION",
          sourceId: item.id,
          lines: [
            {
              accountId: item.schedule.expenseAccountId,
              debit: Number(item.amount),
              credit: 0,
              description: "Prepaid Amortization Expense",
            },
            {
              accountId: item.schedule.assetAccountId,
              debit: 0,
              credit: Number(item.amount),
              description: "Prepaid Amortization Asset Reduction",
            },
          ],
          createdBy: undefined,
        }
      );

      await prisma.$transaction(async (tx) => {
        await tx.amortizationScheduleItem.update({
          where: { id: item.id },
          data: { status: "POSTED", journalEntryId: je.id },
        });

        const sched = await tx.amortizationSchedule.findUnique({
          where: { id: item.scheduleId },
        });
        if (sched) {
          const newRecognized = Number(sched.recognizedAmount) + Number(item.amount);
          const newStatus =
            newRecognized >= Number(sched.totalAmount) - 0.01 ? "COMPLETED" : "ACTIVE";

          await tx.amortizationSchedule.update({
            where: { id: sched.id },
            data: { recognizedAmount: newRecognized, status: newStatus },
          });
        }
      });

      results.processed++;
    } catch (e) {
      console.error(`Failed to process amortization item ${item.id}:`, e);
      results.errors++;
    }
  }

  return results;
}
