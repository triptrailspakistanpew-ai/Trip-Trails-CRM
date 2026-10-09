/**
 * Financial Calculator for TravelFlow
 *
 * Encapsulates all service-level financial calculations for the
 * agent-based travel business model.
 *
 * IMPORTANT:
 * - The backend is the financial source of truth.
 * - The frontend may preview values but must never be trusted.
 * - All monetary values are rounded to 2 decimal places.
 */

export type TaxTreatment =
  | "VAT_ON_MARGIN"
  | "VAT_ON_SELLING_PRICE"
  | "ZERO_RATED"
  | "EXEMPT"
  | "NO_VAT";

export const TAX_TREATMENTS: TaxTreatment[] = [
  "VAT_ON_MARGIN",
  "VAT_ON_SELLING_PRICE",
  "ZERO_RATED",
  "EXEMPT",
  "NO_VAT",
];

export interface ServiceFinancialInput {
  unitCost?: number;
  costPrice?: number;
  unitSellingPrice?: number;
  sellingPrice?: number;
  quantity?: number;
  supplierInvoiceAmount?: number | null;
  taxTreatment: TaxTreatment;
  vatRate: number; // percentage, e.g. 5 for 5%
}

export interface CalculatedFinancials {
  quantity: number;
  unitCost: number;
  unitSellingPrice: number;
  lineCost: number;
  lineSelling: number;
  costPrice: number; // alias for lineCost (stored in DB)
  sellingPrice: number; // alias for lineSelling (stored in DB)
  taxBase: number;
  taxAmount: number;
  expectedMargin: number;
  actualMargin: number | null;
  costVariance: number | null;
  customerTotal: number;
}

/**
 * Round a number to 2 decimal places using banker's rounding.
 * Avoids JS floating-point drift in financial calculations.
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculate all derived financial fields for a single BookingService.
 *
 * Tax treatment determines how tax is applied:
 *
 * VAT_ON_MARGIN      → tax = margin × rate / 100   (Agent model default)
 * VAT_ON_SELLING_PRICE → tax = sellingPrice × rate / 100
 * ZERO_RATED         → taxBase = sellingPrice, taxAmount = 0
 * EXEMPT / NO_VAT    → taxBase = 0, taxAmount = 0
 *
 * Customer Total = lineSelling + taxAmount
 * Expected Margin = lineSelling − lineCost
 * Actual Margin   = lineSelling − supplierInvoiceAmount (when available)
 * Cost Variance   = supplierInvoiceAmount − lineCost     (when available)
 */
export function calculateServiceFinancials(
  input: ServiceFinancialInput,
): CalculatedFinancials {
  const quantity = Math.max(1, Math.round(Number(input.quantity) || 1));
  const unitCost = Number(input.unitCost ?? input.costPrice ?? 0);
  const unitSellingPrice = Number(input.unitSellingPrice ?? input.sellingPrice ?? 0);
  const vatRate = Number(input.vatRate) || 0;

  const lineCost = round2(unitCost * quantity);
  const lineSelling = round2(unitSellingPrice * quantity);

  const supplierInvoiceAmount =
    input.supplierInvoiceAmount != null
      ? Number(input.supplierInvoiceAmount)
      : null;

  // --- Margins & Variance ---
  const expectedMargin = round2(lineSelling - lineCost);

  const actualMargin =
    supplierInvoiceAmount != null
      ? round2(lineSelling - supplierInvoiceAmount)
      : null;

  const costVariance =
    supplierInvoiceAmount != null
      ? round2(supplierInvoiceAmount - lineCost)
      : null;

  // --- Tax ---
  let taxBase = 0;
  let taxAmount = 0;

  switch (input.taxTreatment) {
    case "VAT_ON_MARGIN":
      taxBase = Math.max(0, expectedMargin);
      taxAmount = round2((taxBase * vatRate) / 100);
      break;

    case "VAT_ON_SELLING_PRICE":
      taxBase = lineSelling;
      taxAmount = round2((taxBase * vatRate) / 100);
      break;

    case "ZERO_RATED":
      taxBase = lineSelling;
      taxAmount = 0;
      break;

    case "EXEMPT":
    case "NO_VAT":
      taxBase = 0;
      taxAmount = 0;
      break;

    default:
      // Fallback to VAT_ON_MARGIN if unknown treatment
      taxBase = Math.max(0, expectedMargin);
      taxAmount = round2((taxBase * vatRate) / 100);
      break;
  }

  const customerTotal = round2(lineSelling + taxAmount);

  return {
    quantity,
    unitCost: round2(unitCost),
    unitSellingPrice: round2(unitSellingPrice),
    lineCost,
    lineSelling,
    costPrice: lineCost,
    sellingPrice: lineSelling,
    taxBase: round2(taxBase),
    taxAmount,
    expectedMargin,
    actualMargin,
    costVariance,
    customerTotal,
  };
}

/**
 * Aggregate financial totals across multiple services.
 * Used by enrichBooking to compute booking-level summaries.
 */
export function aggregateServiceFinancials(
  services: Array<{
    costPrice: number;
    supplierInvoiceAmount?: number | null;
    sellingPrice: number;
    taxAmount?: number;
    customerTotal?: number;
    expectedMargin?: number;
  }>,
) {
  let totalCost = 0;
  let totalSell = 0;
  let totalTax = 0;
  let totalCustomerPayable = 0;
  let totalExpectedMargin = 0;

  for (const svc of services) {
    totalCost += svc.supplierInvoiceAmount ?? svc.costPrice;
    totalSell += svc.sellingPrice;
    totalTax += svc.taxAmount ?? 0;
    totalCustomerPayable += svc.customerTotal || svc.sellingPrice;
    totalExpectedMargin += svc.expectedMargin ?? (svc.sellingPrice - svc.costPrice);
  }

  const totalProfit = totalSell - totalCost;
  const profitMargin = totalSell > 0 ? (totalProfit / totalSell) * 100 : 0;

  return {
    totalCost: round2(totalCost),
    totalSell: round2(totalSell),
    totalProfit: round2(totalProfit),
    profitMargin: round2(profitMargin),
    totalTax: round2(totalTax),
    totalCustomerPayable: round2(totalCustomerPayable),
    totalExpectedMargin: round2(totalExpectedMargin),
  };
}
