import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { API } from "@/lib/data-source";
import { queryKeys } from "@/lib/query-keys";

export function useExpenses(filters?: any) {
  return useQuery({
    queryKey: queryKeys.finance.expenses.list(filters || {}),
    queryFn: () => API.getExpenses(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useCreateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createExpense(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useUpdateExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateExpense(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useDeleteExpense() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => API.deleteExpense(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}


export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounting.accounts.list(),
    queryFn: () => API.getChartOfAccounts(),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function usePayments(filters?: any) {
  return useQuery({
    queryKey: queryKeys.finance.payments.list(filters || {}),
    queryFn: () => API.getPayments(filters),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useCreateCustomerPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => API.createCustomerPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    },
  });
}

export function useCreditNotes() {
  return useQuery({
    queryKey: queryKeys.finance.creditnotes.list(),
    queryFn: () => API.getCreditNotes(),
  });
}

export function useCreateCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { invoiceId: string; amount: number; reason: string; notes?: string; bookingId?: string }) =>
      API.createCreditNote(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useApplyCreditNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.applyCreditNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finance.all });
    },
  });
}

export function useCreateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => API.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useUpdateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => API.updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useToggleAccountStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive?: boolean }) =>
      API.toggleAccountStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.deleteAccount(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useJournalEntries() {
  return useQuery({
    queryKey: queryKeys.accounting.journalEntries.list(),
    queryFn: () => API.getJournalEntries(),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useReverseJournalEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      API.reverseJournalEntry(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounting.all });
    },
  });
}

export function useTrialBalance() {
  return useQuery({
    queryKey: queryKeys.accounting.reports.trialBalance(),
    queryFn: () => API.getTrialBalance(),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useARLedger() {
  return useQuery({
    queryKey: queryKeys.accounting.reports.arLedger(),
    queryFn: () => API.getARLedger(),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useAPLedger() {
  return useQuery({
    queryKey: queryKeys.accounting.reports.apLedger(),
    queryFn: () => API.getAPLedger(),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useProfitAndLoss(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: queryKeys.accounting.reports.profitAndLoss(dateRange),
    queryFn: () => API.getProfitAndLoss(dateRange?.from, dateRange?.to),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useBalanceSheet(asOfDate?: Date) {
  return useQuery({
    queryKey: queryKeys.accounting.reports.balanceSheet(asOfDate),
    queryFn: () => API.getBalanceSheet(asOfDate),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}

export function useAnalytics(params?: { timeRange?: string; branchId?: string }) {
  return useQuery({
    queryKey: queryKeys.reports.analytics(params),
    queryFn: () => API.getAnalytics(params),
    placeholderData: (previousData) => previousData,
    staleTime: 60_000,
  });
}



