import { PrismaClient, AccountType, NormalBalance } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const AGENCY_ID = "a1000000-0000-0000-0000-000000000001";
const BRANCH_ID = "11111111-1111-1111-1111-111111111101";

// ═══════════════════════════════════════════════════════════════════════════════
// COA TEMPLATE
// ═══════════════════════════════════════════════════════════════════════════════
const coaTemplate = [
  // ASSETS (1000-1599)
  { code: "1000", name: "Bank – Current Account (AED)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1010", name: "Bank – Foreign Currency Account", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1020", name: "Petty Cash", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1100", name: "Accounts Receivable – Customers", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1110", name: "Staff Advances Receivable", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1120", name: "Supplier Advances (Prepayments)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1130", name: "Other Receivables", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1200", name: "Prepaid Rent", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1210", name: "Prepaid Insurance", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1220", name: "Other Prepaid Expenses", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1250", name: "Input VAT Recoverable", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax" },
  { code: "1260", name: "Advance Corporate Tax Paid", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax" },
  { code: "1500", name: "Office Equipment", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "1510", name: "Furniture & Fixtures", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "1520", name: "Computers & IT Equipment", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "1530", name: "Motor Vehicles", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "1590", name: "Accumulated Depreciation (contra)", type: "ASSET" as AccountType, normal: "CREDIT" as NormalBalance, category: "Fixed Assets" },

  // LIABILITIES (2000-2499)
  { code: "2000", name: "Due to Suppliers (Estimated, pre-invoice)", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payables" },
  { code: "2010", name: "Accounts Payable – Suppliers (Confirmed)", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payables" },
  { code: "2020", name: "Accrued Expenses Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payables" },
  { code: "2100", name: "Customer Advances Received", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Deferred" },
  { code: "2110", name: "Unearned/Deferred Revenue", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Deferred" },
  { code: "2200", name: "Output VAT Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2210", name: "Corporate Tax Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2220", name: "Withholding Tax Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2300", name: "Salaries Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payroll" },
  { code: "2310", name: "End-of-Service Gratuity Provision", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payroll" },
  { code: "2320", name: "Other Payroll Deductions Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payroll" },
  { code: "2400", name: "Bank Loan Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Loans" },
  { code: "2410", name: "Director/Related-Party Loan", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Loans" },

  // EQUITY (3000-3999)
  { code: "3000", name: "Owner's Capital", type: "EQUITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Equity" },
  { code: "3100", name: "Owner's Drawings (contra)", type: "EQUITY" as AccountType, normal: "DEBIT" as NormalBalance, category: "Equity" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Equity" },

  // REVENUE (4000-4999)
  { code: "4000", name: "Service Fee Income – Visa", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4010", name: "Service Fee Income – Hotel", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4020", name: "Service Fee Income – Ticketing", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4030", name: "Service Fee Income – Tour Packages/Umrah", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4900", name: "Other Income", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Other" },

  // DIRECT COST (5000-5099)
  { code: "5000", name: "Cost Variance (Gain)/Loss", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "COGS" },

  // OPERATING EXPENSES (6000-6999)
  { code: "6000", name: "Rent Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6010", name: "Utilities (DEWA/Water/Electricity)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6020", name: "Office Maintenance", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6100", name: "Salaries & Wages Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6110", name: "Staff Benefits & Allowances", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6120", name: "End-of-Service Gratuity Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6130", name: "Staff Visa & Medical Insurance", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6140", name: "Staff Training", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6200", name: "Office Supplies", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6210", name: "Telephone & Internet", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6220", name: "IT & Software Subscriptions", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6230", name: "Printing & Stationery", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6240", name: "Insurance Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6250", name: "Legal & Professional Fees", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6260", name: "License & Government Fees", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6300", name: "Marketing & Advertising", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Marketing" },
  { code: "6310", name: "Commission Paid to Agents/Referrals", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Marketing" },
  { code: "6400", name: "Depreciation Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "6410", name: "Bank Charges", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Finance" },
  { code: "6420", name: "Interest Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Finance" },
  { code: "6600", name: "Client Entertainment (50% deductible)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax-Restricted" },
  { code: "6610", name: "Staff Entertainment & Welfare (100% deductible)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6620", name: "Donations & CSR (conditionally deductible)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax-Restricted" },
  { code: "6630", name: "Fines & Penalties (non-deductible)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax-Restricted" },
  { code: "6640", name: "Corporate Tax Expense (current provision)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax" },
  { code: "6900", name: "General & Admin Expense – Other", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6990", name: "Miscellaneous Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
];

async function main() {
  console.log("Cleaning existing data...");
  // Clear related tables first to satisfy foreign key constraints
  await prisma.journalLine.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.fiscalPeriod.deleteMany();
  await prisma.chartOfAccount.deleteMany();
  await prisma.counter.deleteMany();

  await prisma.paymentAllocation.deleteMany();
  await prisma.customerPayment.deleteMany();
  await prisma.supplierPaymentAllocation.deleteMany();
  await prisma.supplierPayment.deleteMany();

  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.bookingService.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.quotationItem.deleteMany();
  await prisma.quotation.deleteMany();
  await prisma.leadActivity.deleteMany();
  await prisma.lead.deleteMany();

  await prisma.customer.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.agency.deleteMany();

  console.log("Creating Agency...");
  await prisma.agency.create({
    data: {
      id: AGENCY_ID, name: "TripTrails Pakistan", slug: "triptrails", code: "TT",
      contactEmail: "triptrails.pakistan@gmail.com", contactPhone: "+971502856506", city: "Karachi",
      currency: "PKR",
    }
  });



  console.log("Creating 1 Branch...");
  await prisma.branch.create({
    data: { id: BRANCH_ID, agencyId: AGENCY_ID, name: "Head Office", code: "HQ", city: "Karachi", currency: "PKR", isHeadOffice: true }
  });

  console.log("Creating Roles...");
  await prisma.role.createMany({
    data: [
      { id: "33333333-3333-3333-3333-333333333301", agencyId: AGENCY_ID, name: "admin", description: "Admin", permissions: ["all"], color: "#dc2626", textColor: "#ffffff" },
      { id: "33333333-3333-3333-3333-333333333302", agencyId: AGENCY_ID, name: "manager", description: "Mgr", permissions: ["all"], color: "#2563eb", textColor: "#ffffff" },
    ]
  });

  console.log("Creating Admin User...");
  const hashedPassword = await bcrypt.hash("Password123!", 10);
  await prisma.user.create({
    data: {
      id: "22222222-2222-2222-2222-222222222201", agencyId: AGENCY_ID, branchId: BRANCH_ID,
      firstName: "Owner", lastName: "Admin", email: "owner@triptrails.pk",
      password: hashedPassword, role: "admin", status: "active"
    }
  });

  console.log("Creating Sample Customer...");
  await prisma.customer.create({
    data: {
      id: "44444444-4444-4444-4444-444444444401",
      agencyId: AGENCY_ID,
      branchId: BRANCH_ID,
      customerRef: "CUS-000001",
      type: "individual",
      firstName: "Ahmed",
      lastName: "Khan",
      email: "ahmed.khan@example.com",
      phone: "+971501234567",
      city: "Dubai",
      country: "United Arab Emirates",
    }
  });

  console.log("Creating Chart of Accounts...");
  for (const acc of coaTemplate) {
    await prisma.chartOfAccount.create({
      data: {
        agencyId: AGENCY_ID, branchId: BRANCH_ID,
        code: acc.code, name: acc.name, type: acc.type, normalBalance: acc.normal,
        category: acc.category, isSystem: true, isActive: true
      }
    });
  }

  console.log("Database reset and seeded with Owner, 1 Branch, and Chart of Accounts.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
