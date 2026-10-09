import { PrismaClient, AccountType, NormalBalance } from "@prisma/client";

const prisma = new PrismaClient();

export interface AuthoritativeAccountDef {
  code: string;
  name: string;
  type: AccountType;
  normalBalance: NormalBalance;
  category: string;
  description?: string;
}

export const AUTHORITATIVE_COA: AuthoritativeAccountDef[] = [
  // ASSETS
  { code: "1000", name: "Bank – Current Account (AED)", type: "ASSET", normalBalance: "DEBIT", category: "Cash & Bank", description: "Primary AED operational current account" },
  { code: "1010", name: "Bank – Foreign Currency Account", type: "ASSET", normalBalance: "DEBIT", category: "Cash & Bank", description: "Bank accounts held in foreign currencies (PKR, USD, EUR)" },
  { code: "1020", name: "Petty Cash", type: "ASSET", normalBalance: "DEBIT", category: "Cash & Bank", description: "Cash held for minor day-to-day office expenses" },
  { code: "1100", name: "Accounts Receivable – Customers", type: "ASSET", normalBalance: "DEBIT", category: "Receivables", description: "Amounts due from clients for invoices issued" },
  { code: "1110", name: "Staff Advances Receivable", type: "ASSET", normalBalance: "DEBIT", category: "Receivables", description: "Short-term advances and loans provided to employees" },
  { code: "1120", name: "Supplier Advances (Prepayments)", type: "ASSET", normalBalance: "DEBIT", category: "Receivables", description: "Prepayments and deposits made to airlines/hotels before booking completion" },
  { code: "1130", name: "Other Receivables", type: "ASSET", normalBalance: "DEBIT", category: "Receivables", description: "Non-trade receivables and sundry claims" },
  { code: "1200", name: "Prepaid Rent", type: "ASSET", normalBalance: "DEBIT", category: "Prepaid Expenses", description: "Prepaid office leases subject to monthly amortization" },
  { code: "1210", name: "Prepaid Insurance", type: "ASSET", normalBalance: "DEBIT", category: "Prepaid Expenses", description: "Annual insurance premiums subject to monthly amortization" },
  { code: "1220", name: "Other Prepaid Expenses", type: "ASSET", normalBalance: "DEBIT", category: "Prepaid Expenses", description: "Annual IT subscriptions, licenses, and other capitalized prepayments" },
  { code: "1250", name: "Input VAT Recoverable", type: "ASSET", normalBalance: "DEBIT", category: "Taxes", description: "Recoverable VAT incurred on business expenses and supplier bills" },
  { code: "1260", name: "Advance Corporate Tax Paid", type: "ASSET", normalBalance: "DEBIT", category: "Taxes", description: "Quarterly or advance corporate tax payments made to tax authorities" },
  { code: "1500", name: "Office Equipment", type: "ASSET", normalBalance: "DEBIT", category: "Fixed Assets", description: "Printers, telephone systems, projectors, and office machinery" },
  { code: "1510", name: "Furniture & Fixtures", type: "ASSET", normalBalance: "DEBIT", category: "Fixed Assets", description: "Desks, chairs, filing cabinets, and office fittings" },
  { code: "1520", name: "Computers & IT Equipment", type: "ASSET", normalBalance: "DEBIT", category: "Fixed Assets", description: "Laptops, servers, workstations, and network hardware" },
  { code: "1530", name: "Motor Vehicles", type: "ASSET", normalBalance: "DEBIT", category: "Fixed Assets", description: "Agency-owned vehicles used for operations and client transport" },
  { code: "1590", name: "Accumulated Depreciation", type: "ASSET", normalBalance: "CREDIT", category: "Fixed Assets", description: "Cumulative depreciation on all fixed assets (Contra-Asset)" },

  // LIABILITIES
  { code: "2000", name: "Due to Suppliers (Estimated, pre-invoice)", type: "LIABILITY", normalBalance: "CREDIT", category: "Supplier Liabilities", description: "Accrued supplier obligations estimated at booking time before actual supplier bill is confirmed" },
  { code: "2010", name: "Accounts Payable – Suppliers (Confirmed)", type: "LIABILITY", normalBalance: "CREDIT", category: "Supplier Liabilities", description: "Confirmed supplier payables backed by supplier invoices; feeds AP aging and settlement" },
  { code: "2020", name: "Accrued Expenses Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Accrued Liabilities", description: "Accrued operational expenses incurred but not yet invoiced (audit, utilities)" },
  { code: "2100", name: "Customer Advances Received", type: "LIABILITY", normalBalance: "CREDIT", category: "Customer Liabilities", description: "Prepayments and deposits received from clients prior to invoice generation" },
  { code: "2110", name: "Unearned/Deferred Revenue", type: "LIABILITY", normalBalance: "CREDIT", category: "Customer Liabilities", description: "Invoiced tour packages or services where departure/delivery date is in a future period" },
  { code: "2200", name: "Output VAT Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Taxes Payable", description: "VAT collected/charged on client margins and taxable sales owed to FTA" },
  { code: "2210", name: "Corporate Tax Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Taxes Payable", description: "Corporate tax liability accrued on annual taxable business profits" },
  { code: "2220", name: "Withholding Tax Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Taxes Payable", description: "Taxes withheld at source on applicable vendor payments" },
  { code: "2300", name: "Salaries Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Payroll Liabilities", description: "Accrued net wages and salaries pending bank disbursement" },
  { code: "2310", name: "End-of-Service Gratuity Provision", type: "LIABILITY", normalBalance: "CREDIT", category: "Payroll Liabilities", description: "Accrued indemnity provision for employee end-of-service gratuity (UAE Labor Law)" },
  { code: "2320", name: "Other Payroll Deductions Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Payroll Liabilities", description: "Garnishments, health insurance contributions, or employee payroll deductions" },
  { code: "2400", name: "Bank Loan Payable", type: "LIABILITY", normalBalance: "CREDIT", category: "Loans & Borrowings", description: "Long-term borrowings and term loans from commercial banks" },
  { code: "2410", name: "Director/Related-Party Loan", type: "LIABILITY", normalBalance: "CREDIT", category: "Loans & Borrowings", description: "Loans and advances provided to the business by directors or shareholders" },

  // EQUITY
  { code: "3000", name: "Owner's Capital", type: "EQUITY", normalBalance: "CREDIT", category: "Equity", description: "Initial and subsequent capital introduced by the agency owner" },
  { code: "3100", name: "Owner's Drawings", type: "EQUITY", normalBalance: "DEBIT", category: "Equity", description: "Funds withdrawn from the business by owner for personal use (Contra-Equity)" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY", normalBalance: "CREDIT", category: "Equity", description: "Cumulative net earnings retained in the business from prior fiscal periods" },

  // REVENUE
  { code: "4000", name: "Service Fee Income – Visa", type: "REVENUE", normalBalance: "CREDIT", category: "Operating Revenue", description: "Agency margin and processing fee income from visa facilitation services" },
  { code: "4010", name: "Service Fee Income – Hotel", type: "REVENUE", normalBalance: "CREDIT", category: "Operating Revenue", description: "Agency margin earned on hotel bookings and ground accommodations" },
  { code: "4020", name: "Service Fee Income – Ticketing", type: "REVENUE", normalBalance: "CREDIT", category: "Operating Revenue", description: "Agency commission and markup earned on airline flight ticketing" },
  { code: "4030", name: "Service Fee Income – Tour Packages/Umrah", type: "REVENUE", normalBalance: "CREDIT", category: "Operating Revenue", description: "Agency margin earned on customized tour packages, safaris, and Umrah/Hajj itineraries" },
  { code: "4900", name: "Other Income", type: "REVENUE", normalBalance: "CREDIT", category: "Other Income", description: "Incidental revenues, cancellation administrative fees, and supplier incentives" },

  // DIRECT COST
  { code: "5000", name: "Cost Variance (Gain)/Loss", type: "EXPENSE", normalBalance: "DEBIT", category: "Direct Cost", description: "Variance recognized when confirmed supplier invoice differs from initial estimated costPrice" },

  // OPERATING EXPENSES
  { code: "6000", name: "Rent Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Monthly office space rental expense" },
  { code: "6010", name: "Utilities (DEWA/Water/Electricity)", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Electricity, water, cooling, and municipal utility bills" },
  { code: "6020", name: "Office Maintenance", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Office cleaning, air conditioning servicing, repairs, and facility upkeep" },
  { code: "6100", name: "Salaries & Wages Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Payroll Expense", description: "Base compensation, regular wages, and overtime for agency employees" },
  { code: "6110", name: "Staff Benefits & Allowances", type: "EXPENSE", normalBalance: "DEBIT", category: "Payroll Expense", description: "Housing, transportation, mobile phone allowances, and staff meal benefits" },
  { code: "6120", name: "End-of-Service Gratuity Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Payroll Expense", description: "Monthly provision charge for employee end-of-service gratuity entitlement" },
  { code: "6130", name: "Staff Visa & Medical Insurance", type: "EXPENSE", normalBalance: "DEBIT", category: "Payroll Expense", description: "Work visa issuance, Emirates ID, medical fitness tests, and mandatory health insurance" },
  { code: "6140", name: "Staff Training", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "GDS certification, customer service training, and professional development courses" },
  { code: "6200", name: "Office Supplies", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Stationery, copier paper, pens, desk supplies, and office consumables" },
  { code: "6210", name: "Telephone & Internet", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Office landlines, high-speed fiber internet, and corporate mobile lines" },
  { code: "6220", name: "IT & Software Subscriptions", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "TravelFlow ERP hosting, email services, GDS terminal fees, and SaaS subscriptions" },
  { code: "6230", name: "Printing & Stationery", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Brochures, travel vouchers, business cards, and marketing collateral printing" },
  { code: "6240", name: "Insurance Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "General liability insurance, professional indemnity, and office contents insurance" },
  { code: "6250", name: "Legal & Professional Fees", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "External audit fees, corporate PRO services, and legal advisory retainers" },
  { code: "6260", name: "License & Government Fees", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "DED trade license renewal, DTCM tourism permits, and Chamber of Commerce fees" },
  { code: "6300", name: "Marketing & Advertising", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Meta/Google ad spend, travel expos, influencer partnerships, and promotional campaigns" },
  { code: "6310", name: "Commission Paid to Agents/Referrals", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Sales commissions paid to sub-agents, freelance affiliates, and referral partners" },
  { code: "6400", name: "Depreciation Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Periodic depreciation charge on computers, furniture, vehicles, and equipment" },
  { code: "6410", name: "Bank Charges", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Credit card merchant gateway processing fees, wire transfer charges, and bank maintenance" },
  { code: "6420", name: "Interest Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Finance charges and interest incurred on bank loans and credit facilities" },
  { code: "6600", name: "Client Entertainment", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Corporate lunches, VIP client hospitality, and business relationship development" },
  { code: "6610", name: "Staff Entertainment & Welfare", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Pantry supplies, team lunches, annual staff celebrations, and workplace welfare" },
  { code: "6620", name: "Donations & CSR", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Corporate social responsibility contributions and community support donations" },
  { code: "6630", name: "Fines & Penalties", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Municipal fines, traffic violations, or late submission penalties (non-deductible)" },
  { code: "6640", name: "Corporate Tax Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Current period corporate tax provision under UAE Federal Corporate Tax" },
  { code: "6900", name: "General & Admin Expense – Other", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Miscellaneous administrative, courier, postal, and office sundry expenses" },
  { code: "6990", name: "Miscellaneous Expense", type: "EXPENSE", normalBalance: "DEBIT", category: "Operating Expense", description: "Unclassified minor operational expenses" },
];

async function migrate() {
  console.log("Starting Authoritative Chart of Accounts Migration...");

  const agencies = await prisma.agency.findMany();
  console.log(`Found ${agencies.length} agency/agencies to migrate.`);

  for (const agency of agencies) {
    console.log(`\nProcessing Agency: ${agency.name} (${agency.id})`);

    // Step 1: Safe renumbering of existing historical accounts
    // Critical: Account 2100 in old COA was VAT Payable. In authoritative COA, Output VAT is 2200, and 2100 is Customer Advances Received!
    const oldVat = await prisma.chartOfAccount.findFirst({
      where: { agencyId: agency.id, code: "2100" },
    });

    if (oldVat && oldVat.name.toLowerCase().includes("vat")) {
      console.log(`-> Migrating old VAT account (id: ${oldVat.id}) from code 2100 to 2200 (Output VAT Payable)`);
      const existing2200 = await prisma.chartOfAccount.findFirst({
        where: { agencyId: agency.id, code: "2200" },
      });
      if (existing2200 && existing2200.id !== oldVat.id) {
        await prisma.journalLine.updateMany({
          where: { accountId: oldVat.id },
          data: { accountId: existing2200.id },
        });
        await prisma.chartOfAccount.delete({ where: { id: oldVat.id } });
      } else {
        await prisma.chartOfAccount.update({
          where: { id: oldVat.id },
          data: {
            code: "2200",
            name: "Output VAT Payable",
            category: "Taxes Payable",
            isSystem: true,
          },
        });
      }
      console.log("   VAT account successfully renumbered to 2200.");
    }

    // Step 2: Remap old expense accounts that had historical journal entries
    const expenseRemap: Record<string, { newCode: string; name: string; category: string }> = {
      "5200": { newCode: "6000", name: "Rent Expense", category: "Operating Expense" },
      "5300": { newCode: "6100", name: "Salaries & Wages Expense", category: "Payroll Expense" },
      "5400": { newCode: "6300", name: "Marketing & Advertising", category: "Operating Expense" },
      "5500": { newCode: "6010", name: "Utilities (DEWA/Water/Electricity)", category: "Operating Expense" },
      "5600": { newCode: "6200", name: "Office Supplies", category: "Operating Expense" },
      "5700": { newCode: "6410", name: "Bank Charges", category: "Operating Expense" },
      "5900": { newCode: "6990", name: "Miscellaneous Expense", category: "Operating Expense" },
    };

    for (const [oldCode, target] of Object.entries(expenseRemap)) {
      const oldAcc = await prisma.chartOfAccount.findFirst({
        where: { agencyId: agency.id, code: oldCode },
      });
      if (oldAcc && oldCode !== target.newCode) {
        const targetExisting = await prisma.chartOfAccount.findFirst({
          where: { agencyId: agency.id, code: target.newCode },
        });
        if (!targetExisting) {
          console.log(`-> Renumbering account ${oldCode} -> ${target.newCode} (${target.name})`);
          await prisma.chartOfAccount.update({
            where: { id: oldAcc.id },
            data: {
              code: target.newCode,
              name: target.name,
              category: target.category,
              isSystem: true,
            },
          });
        }
      }
    }

    // Step 3: Upsert all Authoritative Accounts
    console.log(`-> Upserting full authoritative COA (${AUTHORITATIVE_COA.length} accounts)...`);
    let createdCount = 0;
    let updatedCount = 0;

    for (const acc of AUTHORITATIVE_COA) {
      const existing = await prisma.chartOfAccount.findFirst({
        where: { agencyId: agency.id, code: acc.code },
      });

      if (existing) {
        await prisma.chartOfAccount.update({
          where: { id: existing.id },
          data: {
            name: acc.name,
            type: acc.type,
            category: acc.category,
            normalBalance: acc.normalBalance,
            description: acc.description,
            isSystem: true,
            isActive: true,
          },
        });
        updatedCount++;
      } else {
        await prisma.chartOfAccount.create({
          data: {
            agencyId: agency.id,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            category: acc.category,
            normalBalance: acc.normalBalance,
            description: acc.description,
            isSystem: true,
            isActive: true,
          },
        });
        createdCount++;
      }
    }

    console.log(`   Agency complete: ${createdCount} created, ${updatedCount} updated.`);
  }

  console.log("\nMigration completed successfully!");
}

migrate()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
