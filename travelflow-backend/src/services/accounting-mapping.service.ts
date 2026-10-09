import { prisma } from "../lib/prisma";
import { ApiError } from "../utils/ApiError";

export const ACCOUNT_CODES = {
  // ASSETS
  BANK_CURRENT_AED: "1000",
  BANK_FOREIGN: "1010",
  PETTY_CASH: "1020",
  AR_CUSTOMERS: "1100",
  STAFF_ADVANCES: "1110",
  SUPPLIER_ADVANCES: "1120",
  OTHER_RECEIVABLES: "1130",
  PREPAID_RENT: "1200",
  PREPAID_INSURANCE: "1210",
  PREPAID_OTHER: "1220",
  INPUT_VAT_RECOVERABLE: "1250",
  ADVANCE_CORP_TAX: "1260",
  OFFICE_EQUIPMENT: "1500",
  FURNITURE_FIXTURES: "1510",
  COMPUTERS_IT: "1520",
  MOTOR_VEHICLES: "1530",
  ACCUMULATED_DEPRECIATION: "1590",

  // LIABILITIES
  SUPPLIER_ESTIMATED: "2000", // Due to Suppliers (Estimated, pre-invoice)
  SUPPLIER_CONFIRMED: "2010", // Accounts Payable – Suppliers (Confirmed)
  ACCRUED_EXPENSES: "2020",
  CUSTOMER_ADVANCES: "2100",
  UNEARNED_DEFERRED_REVENUE: "2110",
  OUTPUT_VAT_PAYABLE: "2200",
  CORP_TAX_PAYABLE: "2210",
  WITHHOLDING_TAX_PAYABLE: "2220",
  SALARIES_PAYABLE: "2300",
  GRATUITY_PROVISION: "2310",
  PAYROLL_DEDUCTIONS: "2320",
  BANK_LOAN_PAYABLE: "2400",
  DIRECTOR_LOAN: "2410",

  // EQUITY
  OWNERS_CAPITAL: "3000",
  OWNERS_DRAWINGS: "3100",
  RETAINED_EARNINGS: "3900",

  // REVENUE
  REVENUE_VISA: "4000",
  REVENUE_HOTEL: "4010",
  REVENUE_TICKETING: "4020",
  REVENUE_PACKAGES_UMRAH: "4030",
  REVENUE_OTHER_INCOME: "4900",

  // DIRECT COST
  COST_VARIANCE: "5000",

  // OPERATING EXPENSES
  RENT_EXPENSE: "6000",
  UTILITIES_EXPENSE: "6010",
  OFFICE_MAINTENANCE: "6020",
  SALARIES_WAGES_EXPENSE: "6100",
  STAFF_BENEFITS: "6110",
  GRATUITY_EXPENSE: "6120",
  STAFF_VISA_INSURANCE: "6130",
  STAFF_TRAINING: "6140",
  OFFICE_SUPPLIES: "6200",
  TELEPHONE_INTERNET: "6210",
  IT_SOFTWARE: "6220",
  PRINTING_STATIONERY: "6230",
  INSURANCE_EXPENSE: "6240",
  LEGAL_PROFESSIONAL: "6250",
  LICENSE_GOVT_FEES: "6260",
  MARKETING_ADVERTISING: "6300",
  COMMISSION_PAID: "6310",
  DEPRECIATION_EXPENSE: "6400",
  BANK_CHARGES: "6410",
  INTEREST_EXPENSE: "6420",
  CLIENT_ENTERTAINMENT: "6600",
  STAFF_ENTERTAINMENT: "6610",
  DONATIONS_CSR: "6620",
  FINES_PENALTIES: "6630",
  CORP_TAX_EXPENSE: "6640",
  GENERAL_ADMIN_OTHER: "6900",
  MISCELLANEOUS_EXPENSE: "6990",
} as const;

/**
 * Resolve an active account by its unique code within an agency (optionally branch-scoped).
 */
export async function getAccountByCode(agencyId: string, branchIdOrCode: string, code?: string) {
  let branchId: string | undefined;
  let actualCode = code;

  // Handle case where caller passed (agencyId, code) directly
  if (!actualCode) {
    actualCode = branchIdOrCode;
    branchId = undefined;
  } else {
    branchId = branchIdOrCode;
  }

  const where: any = { agencyId, code: actualCode, isActive: true };
  if (branchId) {
    where.branchId = branchId;
  }

  let account = await prisma.chartOfAccount.findFirst({ where });
  if (!account && branchId) {
    // Fallback: look for this account code across any branch in the agency
    account = await prisma.chartOfAccount.findFirst({
      where: { agencyId, code: actualCode, isActive: true },
    });
  }

  if (!account) {
    throw ApiError.badRequest(
      `Account Code ${actualCode} is not configured or is inactive. Please verify Chart of Accounts.`
    );
  }
  return account;
}

/**
 * Resolve an active account by its ID within an agency.
 */
export async function getAccountById(agencyId: string, accountId: string) {
  const account = await prisma.chartOfAccount.findFirst({
    where: { id: accountId, agencyId, isActive: true },
  });
  if (!account) {
    throw ApiError.badRequest(`Account ID ${accountId} not found or inactive.`);
  }
  return account;
}

/**
 * Resolve trade Accounts Receivable account (1100).
 */
export async function getARAccount(agencyId: string, branchId: string) {
  return getAccountByCode(
    agencyId,
    branchId, ACCOUNT_CODES.AR_CUSTOMERS);
}

/**
 * Resolve Supplier Liability account:
 * - If confirmed (actual supplier bill received/known): 2010 Accounts Payable – Suppliers (Confirmed)
 * - If estimated (pre-invoice / initial booking cost): 2000 Due to Suppliers (Estimated, pre-invoice)
 */
export async function getSupplierLiabilityAccount(agencyId: string, branchId: string, isConfirmed: boolean) {
  return getAccountByCode(
    agencyId,
    branchId, 
    isConfirmed ? ACCOUNT_CODES.SUPPLIER_CONFIRMED : ACCOUNT_CODES.SUPPLIER_ESTIMATED
  );
}

/**
 * Confirmed Supplier AP account (2010) — used for AP aging, settlement, and supplier statements.
 */
export async function getSupplierConfirmedAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.SUPPLIER_CONFIRMED);
}

/**
 * Estimated Supplier Obligation account (2000) — temporary booking accrual.
 */
export async function getSupplierEstimatedAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.SUPPLIER_ESTIMATED);
}

/**
 * Direct Cost Variance account (5000) — variance between estimated cost and actual confirmed supplier invoice.
 */
export async function getCostVarianceAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.COST_VARIANCE);
}

/**
 * Output VAT Payable (2200) — tax charged to customers on agency margin or selling price.
 */
export async function getOutputVATAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.OUTPUT_VAT_PAYABLE);
}

/**
 * Input VAT Recoverable (1250) — VAT incurred on business expenses / supplier invoices.
 */
export async function getInputVATAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.INPUT_VAT_RECOVERABLE);
}

/**
 * Customer Advances Received (2100) — customer deposits and prepayments before invoice creation.
 */
export async function getCustomerAdvanceAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.CUSTOMER_ADVANCES);
}

/**
 * Unearned / Deferred Revenue (2110) — tour package / travel revenue billed for future accounting periods.
 */
export async function getDeferredRevenueAccount(agencyId: string, branchId: string) {
  return getAccountByCode(agencyId, branchId, ACCOUNT_CODES.UNEARNED_DEFERRED_REVENUE);
}

/**
 * Resolve Service Fee Margin Revenue account dynamically based on serviceCategory:
 * - visa -> 4000 Service Fee Income – Visa
 * - hotel -> 4010 Service Fee Income – Hotel
 * - flight / ticketing -> 4020 Service Fee Income – Ticketing
 * - packages, umrah, tours, safari, activity -> 4030 Service Fee Income – Tour Packages/Umrah
 * - other / unclassified -> 4900 Other Income (or fallback to 4000)
 */
export async function getRevenueAccountForCategory(agencyId: string, branchId: string, serviceCategory?: string) {
  const cat = (serviceCategory || "").toLowerCase().trim();

  let code: string = ACCOUNT_CODES.REVENUE_OTHER_INCOME;

  // Visa-related income: Dubai Visit Visa, Saudi Visa, Turkey Visa, Visa Consultancy
  if (
    cat.includes("visa") ||
    cat.includes("consultancy") ||
    cat.includes("company formation")
  ) {
    code = ACCOUNT_CODES.REVENUE_VISA;
  // Hotel income: Hotel Booking
  } else if (cat.includes("hotel") || cat.includes("accommodation")) {
    code = ACCOUNT_CODES.REVENUE_HOTEL;
  // Ticketing income: Ticketing Services, flight, air
  } else if (cat.includes("flight") || cat.includes("ticket") || cat.includes("air")) {
    code = ACCOUNT_CODES.REVENUE_TICKETING;
  // Package / Tourism income: Tour Packages, Umrah, Dubai Inbound Tourism, etc.
  } else if (
    cat.includes("tour") ||
    cat.includes("package") ||
    cat.includes("umrah") ||
    cat.includes("hajj") ||
    cat.includes("safari") ||
    cat.includes("cruise") ||
    cat.includes("activity") ||
    cat.includes("transfer") ||
    cat.includes("inbound") ||
    cat.includes("tourism")
  ) {
    code = ACCOUNT_CODES.REVENUE_PACKAGES_UMRAH;
  }

  try {
    return await getAccountByCode(agencyId, branchId, code);
  } catch {
    // Fallback to primary service fee account if specific code not active
    return await getAccountByCode(agencyId, branchId, ACCOUNT_CODES.REVENUE_VISA);
  }
}

/**
 * Resolve Bank or Cash account based on currency and payment method:
 * - Cash -> 1020 Petty Cash
 * - AED bank -> 1000 Bank – Current Account (AED)
 * - Foreign currencies (PKR, USD, EUR, etc.) -> 1010 Bank – Foreign Currency Account
 */
export async function getBankOrCashAccount(
  agencyId: string,
  branchId: string,
  options?: { currency?: string; paymentMethod?: string; accountId?: string }
) {
  if (options?.accountId) {
    return await getAccountById(agencyId, options.accountId);
  }

  const method = (options?.paymentMethod || "").toLowerCase();
  const curr = (options?.currency || "").toUpperCase();

  if (method === "cash") {
    try {
      return await getAccountByCode(agencyId, branchId, ACCOUNT_CODES.PETTY_CASH);
    } catch {
      // fallback to AED bank if petty cash not configured
    }
  }

  if (curr === "AED") {
    try {
      return await getAccountByCode(agencyId, branchId, ACCOUNT_CODES.BANK_CURRENT_AED);
    } catch {
      // fallback to Foreign account
    }
  }

  // Default to 1010 Foreign Currency Account (or 1000 if 1010 not found)
  try {
    return await getAccountByCode(agencyId, branchId, ACCOUNT_CODES.BANK_FOREIGN);
  } catch {
    return await getAccountByCode(agencyId, branchId, ACCOUNT_CODES.BANK_CURRENT_AED);
  }
}

/**
 * Resolve Prepaid Asset account:
 * - rent -> 1200 Prepaid Rent
 * - insurance -> 1210 Prepaid Insurance
 * - other -> 1220 Other Prepaid Expenses
 */
export async function getPrepaidAssetAccount(agencyId: string, branchIdOrCategory?: string, category?: string) {
  let branchId: string | undefined;
  let cat = "";

  if (category === undefined) {
    cat = (branchIdOrCategory || "").toLowerCase();
  } else {
    branchId = branchIdOrCategory;
    cat = (category || "").toLowerCase();
  }

  let code: string = ACCOUNT_CODES.PREPAID_OTHER;
  if (cat.includes("rent")) {
    code = ACCOUNT_CODES.PREPAID_RENT;
  } else if (cat.includes("insurance")) {
    code = ACCOUNT_CODES.PREPAID_INSURANCE;
  }

  try {
    return await getAccountByCode(agencyId, branchId || "", code);
  } catch {
    return await getAccountByCode(agencyId, branchId || "", ACCOUNT_CODES.PREPAID_RENT);
  }
}

/**
 * Resolve Operating Expense account based on category.
 * Supports expanded categories for bulk import:
 *   - salary / payroll / wages     -> 6100 Salaries & Wages Expense
 *   - rent                         -> 6000 Rent Expense
 *   - marketing / ads / advertis   -> 6300 Marketing & Advertising
 *   - utilities / electric / water -> 6010 Utilities Expense
 *   - office supplies / office exp -> 6200 Office Supplies
 *   - software / it / tech         -> 6220 IT & Software Subscriptions
 *   - telephone / mobile / internet-> 6210 Telephone & Internet
 *   - printing / stationery        -> 6230 Printing & Stationery
 *   - insurance                    -> 6240 Insurance Expense
 *   - commission / agent           -> 6310 Commission Paid to Agents
 *   - food / refreshment / welfare -> 6610 Staff Entertainment & Welfare
 *   - establishment / license / govt-> 6260 License & Government Fees
 *   - fuel                         -> 6900 General & Admin
 *   - visa expense / ticket expense-> 5000 Direct Cost (operational cost pass-through)
 *   - travel / other               -> 6900 General & Admin (fallback)
 */
export async function getExpenseAccountForCategory(agencyId: string, branchIdOrCategory?: string, category?: string) {
  let branchId: string | undefined;
  let catStr = "";

  if (category === undefined) {
    catStr = (branchIdOrCategory || "").toLowerCase().trim();
  } else {
    branchId = branchIdOrCategory;
    catStr = (category || "").toLowerCase().trim();
  }

  let code: string = ACCOUNT_CODES.GENERAL_ADMIN_OTHER;

  if (catStr.includes("salary") || catStr.includes("payroll") || catStr.includes("wage")) {
    code = ACCOUNT_CODES.SALARIES_WAGES_EXPENSE;
  } else if (catStr.includes("rent")) {
    code = ACCOUNT_CODES.RENT_EXPENSE;
  } else if (catStr.includes("market") || catStr.includes("advertis")) {
    code = ACCOUNT_CODES.MARKETING_ADVERTISING;
  } else if (catStr.includes("utilit") || catStr.includes("electric") || catStr.includes("water") || catStr.includes("dewa")) {
    code = ACCOUNT_CODES.UTILITIES_EXPENSE;
  } else if (catStr.includes("telephone") || catStr.includes("mobile") || catStr.includes("internet")) {
    code = ACCOUNT_CODES.TELEPHONE_INTERNET;
  } else if (catStr.includes("printing") || catStr.includes("stationery")) {
    code = ACCOUNT_CODES.PRINTING_STATIONERY;
  } else if (catStr.includes("insurance")) {
    code = ACCOUNT_CODES.INSURANCE_EXPENSE;
  } else if (catStr.includes("commission") || catStr.includes("agent")) {
    code = ACCOUNT_CODES.COMMISSION_PAID;
  } else if (catStr.includes("food") || catStr.includes("refreshment") || catStr.includes("welfare") || catStr.includes("entertainment")) {
    code = ACCOUNT_CODES.STAFF_ENTERTAINMENT;
  } else if (catStr.includes("establishment") || catStr.includes("license") || catStr.includes("govt") || catStr.includes("government")) {
    code = ACCOUNT_CODES.LICENSE_GOVT_FEES;
  } else if (catStr.includes("office") && (catStr.includes("suppl") || catStr.includes("expense"))) {
    code = ACCOUNT_CODES.OFFICE_SUPPLIES;
  } else if (catStr.includes("suppl") || catStr.includes("station")) {
    code = ACCOUNT_CODES.OFFICE_SUPPLIES;
  } else if (catStr.includes("soft") || catStr.includes("tech")) {
    code = ACCOUNT_CODES.IT_SOFTWARE;
  } else if (catStr.includes("visa expense") || catStr.includes("saudi visa expense") || catStr.includes("ticket")) {
    code = ACCOUNT_CODES.COST_VARIANCE; // Direct cost pass-through for operational visa/ticket costs
  } else if (catStr.includes("fuel")) {
    code = ACCOUNT_CODES.GENERAL_ADMIN_OTHER;
  } else if (catStr.includes("travel")) {
    code = ACCOUNT_CODES.GENERAL_ADMIN_OTHER;
  } else if (catStr.includes("bank") || catStr.includes("charge")) {
    code = ACCOUNT_CODES.BANK_CHARGES;
  } else if (catStr.includes("legal") || catStr.includes("professional")) {
    code = ACCOUNT_CODES.LEGAL_PROFESSIONAL;
  } else if (catStr.includes("depreciation")) {
    code = ACCOUNT_CODES.DEPRECIATION_EXPENSE;
  }

  try {
    return await getAccountByCode(agencyId, branchId || "", code);
  } catch {
    return await getAccountByCode(agencyId, branchId || "", ACCOUNT_CODES.GENERAL_ADMIN_OTHER);
  }
}

