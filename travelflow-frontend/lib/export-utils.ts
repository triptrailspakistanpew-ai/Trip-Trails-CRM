/**
 * export-utils.ts — Excel export helpers for TravelFlow
 *
 * Uses the `xlsx` library (SheetJS) to generate professionally structured
 * .xlsx files directly in the browser.
 */

import * as XLSX from "xlsx";
import type { Booking, BookingService } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtNum(n: number | null | undefined): number {
  return Number((n ?? 0).toFixed(2));
}

function downloadWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, filename);
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws["!cols"] = widths.map((w) => ({ wch: w }));
}

// ─── Job Booking Sheet (single booking) ──────────────────────────────────────

export function exportJobBookingSheet(
  booking: Booking,
  currency: string = "PKR",
) {
  const wb = XLSX.utils.book_new();

  // --- Build rows ---
  const rows: (string | number)[][] = [];

  // Header section
  rows.push(["Job Booking Sheet"]);
  rows.push([]);
  rows.push(["Job No", booking.bookingRef]);
  rows.push(["Job Date", fmt(booking.createdAt)]);
  rows.push([
    "Customer",
    booking.customer
      ? `${booking.customer.firstName} ${booking.customer.lastName}`
      : "-",
  ]);
  rows.push(["Status", booking.bookingStatus]);
  rows.push([
    "Departure",
    fmt(booking.departureDate),
    "",
    "Return",
    booking.returnDate ? fmt(booking.returnDate) : "-",
  ]);
  rows.push([
    "Travelers",
    `${booking.expectedAdults} Adults, ${booking.expectedChildren} Children, ${booking.expectedInfants} Infants`,
  ]);
  rows.push([]);

  // Table header
  rows.push([
    "Line",
    "Service Type",
    "Supplier",
    `Cost Price (${currency})`,
    `Selling Price (${currency})`,
    `Margin (${currency})`,
    `VAT on Margin (${currency})`,
    `Invoice Value (${currency})`,
    "Cost Status",
  ]);

  // Service rows
  (booking.services ?? []).forEach((svc: BookingService, idx: number) => {
    const cost = fmtNum(svc.supplierInvoiceAmount ?? svc.costPrice);
    const sell = fmtNum(svc.sellingPrice);
    const margin = fmtNum(sell - cost);
    const tax = fmtNum(svc.taxAmount);
    const invoiceValue = fmtNum(svc.customerTotal ?? sell + tax);
    const supplierName =
      (svc as any).supplier?.name || (svc as any).supplierName || "-";

    rows.push([
      idx + 1,
      svc.serviceCategory,
      supplierName,
      cost,
      sell,
      margin,
      tax,
      invoiceValue,
      svc.financialStatus || "Estimated",
    ]);
  });

  // Totals row
  rows.push([]);
  rows.push([
    "",
    "",
    "TOTALS",
    fmtNum(booking.totalCost),
    fmtNum(booking.totalSell),
    fmtNum(booking.totalProfit),
    fmtNum(booking.totalTax),
    fmtNum(booking.totalCustomerPayable ?? booking.totalSell),
    "",
  ]);

  // Notes
  if (booking.notes) {
    rows.push([]);
    rows.push(["Notes", booking.notes]);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [6, 16, 24, 18, 18, 16, 18, 18, 14]);

  // Merge the title row
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Job Sheet");
  downloadWorkbook(
    wb,
    `Job_Sheet_${booking.bookingRef}_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
}

// ─── Sales Report (list of bookings) ─────────────────────────────────────────

export function exportSalesReport(
  bookings: Booking[],
  currency: string = "PKR",
  dateLabel?: string,
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  // Header
  rows.push(["Sales Report"]);
  if (dateLabel) {
    rows.push(["Period", dateLabel]);
  }
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  // Column headers
  rows.push([
    "Date",
    "Ref/Invoice No.",
    "Client / Description",
    "Type",
    `Gross Revenue (${currency})`,
    `Supplier Cost (${currency})`,
    `Tax (${currency})`,
    `Net Margin (${currency})`,
    "Payment Status",
    "Booking Status",
  ]);

  let totalRevenue = 0;
  let totalCost = 0;
  let totalTax = 0;
  let totalMargin = 0;

  bookings.forEach((b) => {
    const revenue = fmtNum(b.totalSell);
    const cost = fmtNum(b.totalCost);
    const tax = fmtNum(b.totalTax);
    const margin = fmtNum(b.totalProfit);
    const customerName = b.customer
      ? `${b.customer.firstName} ${b.customer.lastName}`
      : "-";
    const description = b.title
      ? `${b.title} - ${customerName}`
      : customerName;

    totalRevenue += revenue;
    totalCost += cost;
    totalTax += tax;
    totalMargin += margin;

    rows.push([
      fmt(b.createdAt),
      b.bookingRef,
      description,
      "Revenue",
      revenue,
      cost,
      tax,
      margin,
      b.paymentStatus,
      b.bookingStatus,
    ]);
  });

  // Summary
  rows.push([]);
  rows.push([
    "",
    "",
    `TOTALS (${bookings.length} bookings)`,
    "",
    fmtNum(totalRevenue),
    fmtNum(totalCost),
    fmtNum(totalTax),
    fmtNum(totalMargin),
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [14, 16, 32, 10, 18, 18, 14, 16, 16, 16]);

  // Merge title
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Sales Report");

  const dateSuffix = dateLabel
    ? dateLabel.replace(/\s+/g, "_")
    : new Date().toISOString().slice(0, 10);
  downloadWorkbook(wb, `Sales_Report_${dateSuffix}.xlsx`);
}

// ─── Generic table export (for any DataTable) ───────────────────────────────

export function exportTableToExcel(
  headers: string[],
  rows: (string | number)[][],
  sheetName: string = "Export",
  filename: string = "export.xlsx",
) {
  const wb = XLSX.utils.book_new();
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  // Auto-size columns
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 4, 14) }));
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  downloadWorkbook(wb, filename);
}

// ─── Trial Balance Export ────────────────────────────────────────────────────

export function exportTrialBalance(
  accounts: { code: string; name: string; balance: number }[],
  totalDebits: number,
  totalCredits: number,
  currency: string = "PKR",
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push(["Trial Balance"]);
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  rows.push([
    "Account Code",
    "Account Name",
    `Debit (${currency})`,
    `Credit (${currency})`,
  ]);

  accounts.forEach((a) => {
    rows.push([
      a.code,
      a.name,
      a.balance > 0 ? fmtNum(a.balance) : "",
      a.balance < 0 ? fmtNum(Math.abs(a.balance)) : "",
    ]);
  });

  rows.push([]);
  rows.push([
    "",
    "TOTALS",
    fmtNum(totalDebits),
    fmtNum(totalCredits),
  ]);

  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;
  rows.push([]);
  rows.push(["Status", isBalanced ? "BALANCED" : "UNBALANCED"]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [16, 32, 18, 18]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Trial Balance");
  downloadWorkbook(wb, `Trial_Balance_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Chart of Accounts Export ────────────────────────────────────────────────

export function exportChartOfAccounts(
  accounts: {
    code: string;
    name: string;
    type: string;
    category?: string;
    isSystem?: boolean;
    normalBalance: string;
    balance?: number;
    isActive: boolean;
  }[],
  currency: string = "AED",
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push(["Chart of Accounts"]);
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  rows.push([
    "Account Code",
    "Account Name",
    "Type",
    "Category",
    "Origin",
    "Normal Balance",
    `Balance (${currency})`,
    "Status",
  ]);

  accounts.forEach((a) => {
    rows.push([
      a.code,
      a.name,
      a.type,
      a.category || "-",
      a.isSystem ? "System" : "Custom",
      a.normalBalance,
      fmtNum(a.balance ?? 0),
      a.isActive ? "Active" : "Inactive",
    ]);
  });

  rows.push([]);
  rows.push(["", `Total Accounts: ${accounts.length}`, "", "", "", "", "", ""]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [16, 34, 14, 22, 12, 16, 18, 12]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Chart of Accounts");
  downloadWorkbook(wb, `Chart_of_Accounts_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── AR Ledger Export ────────────────────────────────────────────────────────

export function exportARLedger(
  data: { name: string; totalBilled: number; totalPaid: number; outstandingBalance: number }[],
  currency: string = "PKR",
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push(["Accounts Receivable (AR) Ledger"]);
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  rows.push([
    "Customer",
    `Total Billed (${currency})`,
    `Total Paid (${currency})`,
    `Outstanding Balance (${currency})`,
  ]);

  let totalBilled = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  data.forEach((row) => {
    totalBilled += row.totalBilled;
    totalPaid += row.totalPaid;
    totalOutstanding += row.outstandingBalance;
    rows.push([
      row.name,
      fmtNum(row.totalBilled),
      fmtNum(row.totalPaid),
      fmtNum(row.outstandingBalance),
    ]);
  });

  rows.push([]);
  rows.push([
    `TOTALS (${data.length} customers)`,
    fmtNum(totalBilled),
    fmtNum(totalPaid),
    fmtNum(totalOutstanding),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [28, 20, 20, 22]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  XLSX.utils.book_append_sheet(wb, ws, "AR Ledger");
  downloadWorkbook(wb, `AR_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── AP Ledger Export ────────────────────────────────────────────────────────

export function exportAPLedger(
  data: { name: string; totalIncurred: number; totalPaid: number; outstandingBalance: number }[],
  currency: string = "PKR",
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push(["Accounts Payable (AP) Ledger"]);
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  rows.push([
    "Supplier",
    `Total Incurred (${currency})`,
    `Total Paid (${currency})`,
    `Outstanding Balance (${currency})`,
  ]);

  let totalIncurred = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;

  data.forEach((row) => {
    totalIncurred += row.totalIncurred;
    totalPaid += row.totalPaid;
    totalOutstanding += row.outstandingBalance;
    rows.push([
      row.name,
      fmtNum(row.totalIncurred),
      fmtNum(row.totalPaid),
      fmtNum(row.outstandingBalance),
    ]);
  });

  rows.push([]);
  rows.push([
    `TOTALS (${data.length} suppliers)`,
    fmtNum(totalIncurred),
    fmtNum(totalPaid),
    fmtNum(totalOutstanding),
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [28, 20, 20, 22]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];

  XLSX.utils.book_append_sheet(wb, ws, "AP Ledger");
  downloadWorkbook(wb, `AP_Ledger_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ─── Journal Entries Export ──────────────────────────────────────────────────

export function exportJournalEntries(
  entries: {
    entryNumber: string;
    date: string;
    description: string;
    sourceModule?: string;
    status: string;
    lines: { debit: number; credit: number; account?: { code: string; name: string } }[];
    createdByUser?: { firstName: string; lastName: string };
  }[],
  currency: string = "PKR",
) {
  const wb = XLSX.utils.book_new();
  const rows: (string | number)[][] = [];

  rows.push(["Journal Entries Report"]);
  rows.push(["Generated", fmt(new Date())]);
  rows.push([]);

  rows.push([
    "Entry #",
    "Date",
    "Description",
    "Source",
    `Total Debit (${currency})`,
    `Total Credit (${currency})`,
    "Status",
    "Created By",
  ]);

  let grandDebit = 0;
  let grandCredit = 0;

  entries.forEach((e) => {
    const totalDebit = (e.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
    const totalCredit = (e.lines || []).reduce((s, l) => s + (l.credit || 0), 0);
    grandDebit += totalDebit;
    grandCredit += totalCredit;

    rows.push([
      e.entryNumber,
      fmt(e.date),
      e.description,
      e.sourceModule || "Manual",
      fmtNum(totalDebit),
      fmtNum(totalCredit),
      e.status,
      e.createdByUser ? `${e.createdByUser.firstName} ${e.createdByUser.lastName}` : "-",
    ]);
  });

  rows.push([]);
  rows.push([
    "",
    "",
    `TOTALS (${entries.length} entries)`,
    "",
    fmtNum(grandDebit),
    fmtNum(grandCredit),
    "",
    "",
  ]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  setColWidths(ws, [14, 14, 32, 14, 18, 18, 12, 20]);
  ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];

  XLSX.utils.book_append_sheet(wb, ws, "Journal Entries");
  downloadWorkbook(wb, `Journal_Entries_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
