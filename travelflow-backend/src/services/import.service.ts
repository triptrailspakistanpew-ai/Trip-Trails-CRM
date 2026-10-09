/**
 * import.service.ts — Bulk CSV/Excel Data Import Service
 *
 * Handles importing sales (income) rows and expense rows from
 * CSV/Excel uploads, creating full audit trails:
 *   - Customer + Booking + BookingService + Invoice + Journal Entry (Sales)
 *   - Expense + Journal Entry with VAT split (Expenses)
 *
 * Reference numbers respect the transaction year from each row's date.
 */

import { prisma } from "../lib/prisma";
import { generateRef } from "../utils/refGenerator";
import { calculateServiceFinancials, TaxTreatment } from "../lib/financial-calculator";
import { AgencyContext } from "./domain.service";
import { postExpenseJournal } from "./accounting.service";
import * as mapping from "./accounting-mapping.service";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SalesImportRow {
  date: string;          // e.g. "01-Aug-2024" or ISO date
  description: string;   // Line item description / title
  invoiceNo?: string;    // Optional override (e.g. "INV-0001")
  serviceType: string;   // e.g. "Hotel Booking", "Ticketing Services", "Dubai Visit Visa"
  supplier?: string;     // Supplier name
  supplierRef?: string;  // e.g. "SUP-TVA-0001"
  costPrice: number;
  sellingPrice: number;
  customerName?: string; // Optional — extracted from description if absent
  status?: string;       // e.g. "Matched (Stage A - Exact)", "REVIEW - Cost Not Found"
}

export interface ExpenseImportRow {
  date: string;
  description: string;   // Line item description / title
  invoiceNo?: string;
  category: string;      // e.g. "Telephone/Mobile", "Salary Azmat", "Office Rent"
  supplier?: string;
  supplierRef?: string;
  amountPaid: number;    // Gross amount (inclusive of VAT if applicable)
  vatTreatment?: string; // e.g. "Recoverable (assumed)", "Non-Recoverable", etc.
  paymentMethod?: string;
}

export interface ImportResult {
  success: boolean;
  totalRows: number;
  importedRows: number;
  failedRows: number;
  errors: { row: number; message: string }[];
  createdRefs: string[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseDate(dateStr: string): Date {
  // Handle multiple date formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // Try DD-MMM-YYYY format (e.g. "01-Aug-2024")
  const parts = dateStr.match(/^(\d{1,2})-(\w{3})-(\d{4})$/);
  if (parts) {
    const parsed = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  throw new Error(`Cannot parse date: ${dateStr}`);
}

function extractYear(date: Date): number {
  return date.getFullYear();
}

/**
 * Normalize category strings for the "Salary Azmat" pattern:
 * If category starts with "Salary " followed by a name, extract payee.
 */
function normalizeSalaryCategory(rawCategory: string): { category: string; paidTo?: string } {
  const trimmed = rawCategory.trim();
  const salaryMatch = trimmed.match(/^salary\s+(.+)$/i);
  if (salaryMatch) {
    return { category: "Salaries & Wages", paidTo: salaryMatch[1].trim() };
  }
  return { category: trimmed };
}

/**
 * Resolve or create a supplier by name within the agency/branch.
 * Uses upsert-like logic: find by name first, create if not found.
 */
async function resolveSupplier(
  agencyId: string,
  branchId: string,
  supplierName: string,
  serviceCategory?: string,
): Promise<string> {
  const existing = await prisma.supplier.findFirst({
    where: { agencyId, name: supplierName, isDeleted: false },
  });
  if (existing) return existing.id;

  // Determine supplier category from service type
  let category = "other";
  const cat = (serviceCategory || "").toLowerCase();
  if (cat.includes("hotel")) category = "hotel";
  else if (cat.includes("flight") || cat.includes("ticket") || cat.includes("air")) category = "airline";
  else if (cat.includes("visa")) category = "visa";
  else if (cat.includes("transport") || cat.includes("transfer")) category = "transport";
  else if (cat.includes("insurance")) category = "insurance";

  const supplier = await prisma.supplier.create({
    data: {
      agencyId,
      branchId,
      name: supplierName,
      category,
      balance: 0,
      status: "active",
    },
  });
  return supplier.id;
}

/**
 * Resolve or create a customer by name within the agency/branch.
 */
async function resolveCustomer(
  agencyId: string,
  branchId: string,
  customerName: string,
  customYear: number,
): Promise<string> {
  // Try to find existing customer by name match
  const nameParts = customerName.trim().split(/\s+/);
  const firstName = nameParts[0] || "Imported";
  const lastName = nameParts.slice(1).join(" ") || "Client";

  const existing = await prisma.customer.findFirst({
    where: {
      agencyId,
      firstName: { equals: firstName, mode: "insensitive" },
      lastName: { equals: lastName, mode: "insensitive" },
      isDeleted: false,
    },
  });
  if (existing) return existing.id;

  const customerRef = await generateRef("CUS", agencyId, customYear);
  const customer = await prisma.customer.create({
    data: {
      agencyId,
      branchId,
      customerRef,
      type: "individual",
      firstName,
      lastName,
      phone: "+0000000000", // Placeholder for imports
    },
  });
  return customer.id;
}

// ─── Sales Import ───────────────────────────────────────────────────────────

export async function importSalesRows(
  ctx: AgencyContext,
  branchId: string,
  rows: SalesImportRow[],
  defaultCustomerName?: string,
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    failedRows: 0,
    errors: [],
    createdRefs: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // 1. Parse date and extract year
      const txDate = parseDate(row.date);
      const txYear = extractYear(txDate);

      // 2. Resolve or create supplier
      let supplierId: string | undefined;
      if (row.supplier && row.supplier.trim()) {
        supplierId = await resolveSupplier(ctx.agencyId, branchId, row.supplier.trim(), row.serviceType);
      }

      // 3. Resolve or create customer
      const customerName = row.customerName || defaultCustomerName || "Imported Client";
      const customerId = await resolveCustomer(ctx.agencyId, branchId, customerName, txYear);

      // 4. Get agent (first user of branch)
      const agent = await prisma.user.findFirst({
        where: { agencyId: ctx.agencyId, branchId, isDeleted: false },
      });
      if (!agent) throw new Error("No agent/user found for the target branch");

      // 5. Create Booking
      const bookingRef = await generateRef("BK", ctx.agencyId, txYear);
      const booking = await prisma.booking.create({
        data: {
          agencyId: ctx.agencyId,
          branchId,
          bookingRef,
          customerId,
          agentId: agent.id,
          title: row.description || row.serviceType,
          departureDate: txDate,
          bookingStatus: "completed",
          paymentStatus: "paid",
          sourceType: "manual",
          createdAt: txDate,
        },
      });

      // 6. Calculate service financials
      const costPrice = Number(row.costPrice) || 0;
      const sellingPrice = Number(row.sellingPrice) || 0;
      const srvInput = {
        costPrice,
        sellingPrice,
        supplierInvoiceAmount: costPrice,
        taxTreatment: "VAT_ON_MARGIN" as TaxTreatment,
        vatRate: 5,
      };
      const fin = calculateServiceFinancials(srvInput);

      // 7. Create BookingService
      // Map serviceType to internal serviceCategory
      const serviceCategory = mapServiceTypeToCategory(row.serviceType);
      await prisma.bookingService.create({
        data: {
          agencyId: ctx.agencyId,
          bookingId: booking.id,
          serviceCategory,
          title: row.description || row.serviceType,
          supplierId: supplierId || null,
          supplierRef: row.supplierRef || null,
          costPrice: fin.costPrice,
          sellingPrice: fin.sellingPrice,
          supplierInvoiceAmount: costPrice,
          taxTreatment: "VAT_ON_MARGIN",
          vatRate: 5,
          taxBase: fin.taxBase,
          taxAmount: fin.taxAmount,
          expectedMargin: fin.expectedMargin,
          actualMargin: fin.actualMargin,
          costVariance: fin.costVariance,
          customerTotal: fin.customerTotal,
          financialStatus: "invoiced",
          status: "completed",
          reconciliationStatus: row.status || null,
          quantity: 1,
          unit: "Person",
          createdAt: txDate,
        },
      });

      // 8. Create Invoice
      const invoiceRef = row.invoiceNo || await generateRef("INV", ctx.agencyId, txYear);
      const invoice = await prisma.invoice.create({
        data: {
          agencyId: ctx.agencyId,
          branchId,
          invoiceRef,
          bookingId: booking.id,
          customerId,
          subtotal: fin.sellingPrice,
          tax: fin.taxAmount,
          total: fin.customerTotal,
          status: "paid",
          paidAt: txDate,
          createdAt: txDate,
        },
      });

      // 9. Create Customer Payment
      const paymentRef = await generateRef("REC", ctx.agencyId, txYear);
      const payment = await prisma.customerPayment.create({
        data: {
          agencyId: ctx.agencyId,
          branchId,
          paymentRef,
          customerId,
          bookingId: booking.id,
          amount: fin.customerTotal,
          paymentMethod: "bank_transfer",
          status: "completed",
          date: txDate,
          createdAt: txDate,
        },
      });

      // 10. Post Journal Entries (Invoice Revenue + Customer Payment + Cost Accrual)
      try {
        // a. Invoice Journal: Dr AR, Cr Revenue, Cr VAT Payable
        const arAccount = await mapping.getARAccount(ctx.agencyId, branchId);
        const revenueAccount = await mapping.getRevenueAccountForCategory(ctx.agencyId, branchId, row.serviceType);
        const vatAccount = await mapping.getOutputVATAccount(ctx.agencyId, branchId);

        const invJeRef = await generateRef("JE", ctx.agencyId, txYear);
        const invJeLines = [
          { accountId: arAccount.id, debit: fin.customerTotal, credit: 0, description: `AR – ${invoiceRef}` },
          { accountId: revenueAccount.id, debit: 0, credit: fin.sellingPrice, description: `Revenue – ${row.serviceType}` },
        ];
        if (fin.taxAmount > 0) {
          invJeLines.push({ accountId: vatAccount.id, debit: 0, credit: fin.taxAmount, description: `Output VAT – ${invoiceRef}` });
        }

        await prisma.journalEntry.create({
          data: {
            agencyId: ctx.agencyId,
            branchId,
            entryNumber: invJeRef,
            date: txDate,
            description: `Invoice ${invoiceRef} – ${row.description || row.serviceType}`,
            status: "POSTED",
            sourceModule: "INVOICE",
            sourceId: invoice.id,
            reference: invoiceRef,
            createdBy: ctx.callerId || null,
            postedAt: txDate,
            createdAt: txDate,
            lines: {
              create: invJeLines.map((l) => ({
                agencyId: ctx.agencyId,
                accountId: l.accountId,
                debit: l.debit,
                credit: l.credit,
                currency: "AED",
                exchangeRate: 1,
                baseDebit: l.debit,
                baseCredit: l.credit,
                description: l.description,
              })),
            },
          },
        });

        // b. Customer Payment Journal: Dr Bank, Cr AR
        const bankAccount = await mapping.getBankOrCashAccount(ctx.agencyId, branchId, { paymentMethod: "bank_transfer" });
        const payJeRef = await generateRef("JE", ctx.agencyId, txYear);
        await prisma.journalEntry.create({
          data: {
            agencyId: ctx.agencyId,
            branchId,
            entryNumber: payJeRef,
            date: txDate,
            description: `Customer Payment ${paymentRef}`,
            status: "POSTED",
            sourceModule: "CUSTOMER_PAYMENT",
            sourceId: payment.id,
            reference: paymentRef,
            createdBy: ctx.callerId || null,
            postedAt: txDate,
            createdAt: txDate,
            lines: {
              create: [
                { agencyId: ctx.agencyId, accountId: bankAccount.id, debit: fin.customerTotal, credit: 0, currency: "AED", exchangeRate: 1, baseDebit: fin.customerTotal, baseCredit: 0, description: `Cash/Bank – ${paymentRef}` },
                { agencyId: ctx.agencyId, accountId: arAccount.id, debit: 0, credit: fin.customerTotal, currency: "AED", exchangeRate: 1, baseDebit: 0, baseCredit: fin.customerTotal, description: `Clear AR – ${paymentRef}` },
              ],
            },
          },
        });

        // c. Cost Accrual Journal: Dr Cost, Cr Supplier Liability
        if (costPrice > 0) {
          const costAccount = await mapping.getCostVarianceAccount(ctx.agencyId, branchId);
          const supplierLiability = await mapping.getSupplierLiabilityAccount(ctx.agencyId, branchId, true);
          const costJeRef = await generateRef("JE", ctx.agencyId, txYear);
          await prisma.journalEntry.create({
            data: {
              agencyId: ctx.agencyId,
              branchId,
              entryNumber: costJeRef,
              date: txDate,
              description: `Supplier Cost Accrual – ${bookingRef}`,
              status: "POSTED",
              sourceModule: "BOOKING",
              sourceId: booking.id,
              reference: bookingRef,
              createdBy: ctx.callerId || null,
              postedAt: txDate,
              createdAt: txDate,
              lines: {
                create: [
                  { agencyId: ctx.agencyId, accountId: costAccount.id, debit: costPrice, credit: 0, currency: "AED", exchangeRate: 1, baseDebit: costPrice, baseCredit: 0, description: `Supplier Cost – ${row.supplier || "N/A"}` },
                  { agencyId: ctx.agencyId, accountId: supplierLiability.id, debit: 0, credit: costPrice, currency: "AED", exchangeRate: 1, baseDebit: 0, baseCredit: costPrice, description: `AP – ${row.supplier || "N/A"}` },
                ],
              },
            },
          });
        }
      } catch (jeError: any) {
        // Journal entries failed but data was created — log warning but don't fail import
        result.errors.push({ row: rowNum, message: `Data imported but journal entry failed: ${jeError?.message}` });
      }

      // Update supplier balance
      if (supplierId && costPrice > 0) {
        await prisma.supplier.update({
          where: { id: supplierId },
          data: { balance: { increment: costPrice } },
        }).catch(() => {});
      }

      result.importedRows++;
      result.createdRefs.push(bookingRef);
    } catch (err: any) {
      result.failedRows++;
      result.errors.push({ row: rowNum, message: err?.message || String(err) });
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

// ─── Expense Import ─────────────────────────────────────────────────────────

export async function importExpenseRows(
  ctx: AgencyContext,
  branchId: string,
  rows: ExpenseImportRow[],
): Promise<ImportResult> {
  const result: ImportResult = {
    success: true,
    totalRows: rows.length,
    importedRows: 0,
    failedRows: 0,
    errors: [],
    createdRefs: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    try {
      // 1. Parse date and extract year
      const txDate = parseDate(row.date);
      const txYear = extractYear(txDate);

      // 2. Normalize category (handles "Salary Azmat" -> category + paidTo)
      const { category, paidTo } = normalizeSalaryCategory(row.category);

      // 3. Calculate VAT split (5/105 for recoverable)
      const grossAmount = Number(row.amountPaid) || 0;
      const isRecoverable = (row.vatTreatment || "").toLowerCase().includes("recoverable");
      const inputVat = isRecoverable ? round2(grossAmount * 5 / 105) : 0;
      const netAmount = round2(grossAmount - inputVat);

      // 4. Resolve supplier if provided
      let supplierId: string | undefined;
      if (row.supplier && row.supplier.trim()) {
        supplierId = await resolveSupplier(ctx.agencyId, branchId, row.supplier.trim());
      }

      // 5. Resolve expense account and payment account
      const expenseAccount = await mapping.getExpenseAccountForCategory(ctx.agencyId, branchId, category);
      const paymentMethod = row.paymentMethod || "bank_transfer";
      const bankAccount = await mapping.getBankOrCashAccount(ctx.agencyId, branchId, { paymentMethod });

      // 6. Create Expense
      const expenseRef = await generateRef("EXP", ctx.agencyId, txYear);
      const expense = await prisma.expense.create({
        data: {
          agencyId: ctx.agencyId,
          branchId,
          expenseRef,
          title: row.description || category,
          category,
          amount: grossAmount,
          currency: "AED",
          exchangeRate: 1,
          date: txDate,
          paidTo: paidTo || row.supplier || null,
          paymentMethod,
          notes: row.invoiceNo ? `Imported from invoice ${row.invoiceNo}` : null,
          recordedById: ctx.callerId as string,
          status: "approved",
          accountId: expenseAccount.id,
          paymentAccountId: bankAccount.id,
          // VAT & Supplier fields
          supplierId: supplierId || null,
          supplierRef: row.supplierRef || null,
          vatTreatment: isRecoverable ? "RECOVERABLE" : "NONE",
          vatRate: isRecoverable ? 5 : 0,
          inputVat,
          netAmount,
          refundReceived: 0,
          createdAt: txDate,
        },
      });

      // 7. Post journal entry (with VAT split handled by postExpenseJournal)
      try {
        await postExpenseJournal(ctx, expense.id);
      } catch (jeError: any) {
        result.errors.push({ row: rowNum, message: `Expense created but journal failed: ${jeError?.message}` });
      }

      result.importedRows++;
      result.createdRefs.push(expenseRef);
    } catch (err: any) {
      result.failedRows++;
      result.errors.push({ row: rowNum, message: err?.message || String(err) });
    }
  }

  result.success = result.failedRows === 0;
  return result;
}

// ─── Category Mapping ───────────────────────────────────────────────────────

/**
 * Map free-text service type names from Excel sheets to internal serviceCategory values.
 */
function mapServiceTypeToCategory(serviceType: string): string {
  const st = (serviceType || "").toLowerCase().trim();

  if (st.includes("hotel")) return "hotel";
  if (st.includes("flight") || st.includes("ticket")) return "flight";
  if (st.includes("visa") || st.includes("consultancy") || st.includes("company formation")) return "visa";
  if (st.includes("umrah") || st.includes("hajj")) return "activity";
  if (st.includes("tour") || st.includes("package") || st.includes("inbound") || st.includes("tourism")) return "activity";
  if (st.includes("transfer") || st.includes("transport")) return "transfer";
  if (st.includes("insurance")) return "insurance";
  if (st.includes("safari")) return "activity";
  if (st.includes("cruise")) return "activity";

  return "other";
}
