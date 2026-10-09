import { PrismaClient } from "@prisma/client";
import { ApiError } from "../utils/ApiError";
import { AgencyContext } from "./domain.service";
import { generateRef } from "../utils/refGenerator";
import { postExpenseJournal } from "./accounting.service";

const prisma = new PrismaClient();

export async function createExpense(ctx: AgencyContext, data: any) {
  const expenseRef = await generateRef("EXP", ctx.agencyId);

  const expense = await prisma.expense.create({
    data: {
      agencyId: ctx.agencyId,
      branchId: data.branchId || undefined,
      expenseRef,
      title: data.title,
      category: data.category || "General",
      date: new Date(data.date || Date.now()),
      amount: Number(data.amount),
      paidTo: data.paidTo || null,
      paymentMethod: data.paymentMethod || "cash",
      accountId: data.accountId || null,
      paymentAccountId: data.paymentAccountId || null,
      notes: data.notes || null,
      receiptUrl: data.receiptUrl || null,
      recordedById: ctx.callerId as string,
      status: "approved",
    },
  });

  // Automatically post journal entry for the expense
  if (expense.accountId && expense.paymentAccountId) {
    await postExpenseJournal(ctx, expense.id, {
      isPrepaid: data.isPrepaid || false,
      amortizeOverMonths: data.amortizeOverMonths || 12,
      startDate: data.startDate ? new Date(data.startDate) : expense.date,
    });
  }

  return expense;
}

export async function getExpenses(ctx: AgencyContext) {
  return prisma.expense.findMany({
    where: { agencyId: ctx.agencyId, isDeleted: false },
    include: {
      branch: true,
      recordedBy: true,
      account: true,
      paymentAccount: true,
    },
    orderBy: { date: "desc" },
  });
}

export async function getExpense(ctx: AgencyContext, id: string) {
  const expense = await prisma.expense.findFirst({
    where: { id, agencyId: ctx.agencyId, isDeleted: false },
    include: {
      branch: true,
      recordedBy: true,
      account: true,
      paymentAccount: true,
    },
  });
  if (!expense) throw ApiError.notFound("Expense");
  return expense;
}
