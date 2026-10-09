export interface ChartOfAccount {
  id: string;
  agencyId: string;
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  category?: string;
  parentAccountId?: string | null;
  normalBalance: 'DEBIT' | 'CREDIT';
  isSystem: boolean;
  isActive: boolean;
  description?: string;
  balance?: number;
}

export interface JournalLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debit: number;
  credit: number;
  description?: string;
  account?: ChartOfAccount;
}

export interface JournalEntry {
  id: string;
  agencyId: string;
  entryNumber: string;
  date: string;
  reference?: string;
  description: string;
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  sourceModule?: string;
  sourceId?: string;
  lines: JournalLine[];
  createdByUser?: { firstName: string; lastName: string };
  createdAt: string;
}

export interface TrialBalanceAccount {
  id: string;
  code: string;
  name: string;
  balance: number;
}

export interface TrialBalance {
  accounts: TrialBalanceAccount[];
  totalDebits: number;
  totalCredits: number;
}
