/**
 * TravelFlow Pakistan - Production-Quality Demo Data Seeder
 * Populates an interconnected Pakistani travel agency ecosystem:
 * Branches, Users, RBAC, Chart of Accounts, Suppliers, Leads,
 * Customers, Quotations, Bookings, Invoices, Customer Payments,
 * Supplier Bills/Settlements, Expenses, and Double-Entry General Ledger.
 */

import { PrismaClient, AccountType, NormalBalance } from "@prisma/client";
import bcrypt from "bcryptjs";
import { DEMO_CONFIG } from "./config";
import {
  PAKISTANI_FIRST_NAMES,
  PAKISTANI_LAST_NAMES,
  PAKISTANI_CITIES_AND_AREAS,
  CORPORATE_CLIENT_NAMES,
  DEMO_USERS_SPEC,
  DEMO_SUPPLIERS_SPEC,
  TRAVEL_PACKAGES,
  OFFICE_EXPENSE_TEMPLATES,
  generateSyntheticPakistaniPhone,
  generateSyntheticCNIC,
  generateSyntheticPassport,
} from "./pakistani-data";
import { calculateServiceFinancials } from "../lib/financial-calculator";
import { generateRef } from "../utils/refGenerator";
import {
  postInvoiceJournal,
  confirmSupplierInvoice,
  postCustomerPaymentJournal,
  postSupplierPaymentJournal,
  postExpenseJournal,
} from "../services/accounting.service";

const prisma = new PrismaClient();

// Standard Chart of Accounts template tailored for Pakistani Travel Operations
export const PAKISTAN_COA_TEMPLATE = [
  // ASSETS (1000-1599)
  { code: "1000", name: "Bank – HBL Main Account (PKR)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1010", name: "Bank – Meezan Bank Islamic Account (PKR)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1020", name: "Petty Cash", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Cash & Bank" },
  { code: "1100", name: "Accounts Receivable – Customers", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1110", name: "Staff Advances Receivable", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1120", name: "Supplier Advances (Prepayments)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1130", name: "Other Receivables", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Receivables" },
  { code: "1200", name: "Prepaid Office Rent", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1210", name: "Prepaid Insurance", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1220", name: "Other Prepaid Expenses", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Prepayments" },
  { code: "1250", name: "Input Sales Tax / VAT Recoverable", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax" },
  { code: "1260", name: "Advance Income Tax Paid (FBR WHT)", type: "ASSET" as AccountType, normal: "DEBIT" as NormalBalance, category: "Tax" },
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
  { code: "2110", name: "Unearned/Deferred Tour Revenue", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Deferred" },
  { code: "2200", name: "Output Sales Tax Payable (SRB/PRA)", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2210", name: "Corporate Tax Payable (FBR)", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2220", name: "Withholding Tax Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Tax" },
  { code: "2300", name: "Salaries Payable", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payroll" },
  { code: "2310", name: "Staff Gratuity Provision", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Payroll" },
  { code: "2400", name: "Bank Financing / Running Finance", type: "LIABILITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Loans" },

  // EQUITY (3000-3999)
  { code: "3000", name: "Owner's Capital", type: "EQUITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Equity" },
  { code: "3100", name: "Owner's Drawings (contra)", type: "EQUITY" as AccountType, normal: "DEBIT" as NormalBalance, category: "Equity" },
  { code: "3900", name: "Retained Earnings", type: "EQUITY" as AccountType, normal: "CREDIT" as NormalBalance, category: "Equity" },

  // REVENUE (4000-4999)
  { code: "4000", name: "Service Fee Income – Visa Consultancy", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4010", name: "Service Fee Income – Hotel Booking", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4020", name: "Service Fee Income – Airline Ticketing", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4030", name: "Service Fee Income – Tour Packages & Umrah", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Operating Income" },
  { code: "4900", name: "Other Travel Services Income", type: "REVENUE" as AccountType, normal: "CREDIT" as NormalBalance, category: "Other" },

  // DIRECT COST (5000-5099)
  { code: "5000", name: "Cost Variance (Gain)/Loss", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "COGS" },

  // OPERATING EXPENSES (6000-6999)
  { code: "6000", name: "Office Rent Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6010", name: "Utilities Expense (K-Electric/LESCO/Gas)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6020", name: "Office Maintenance & Janitorial", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Occupancy" },
  { code: "6100", name: "Salaries & Wages Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6110", name: "Staff Benefits & Medical Allowances", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6120", name: "Staff Gratuity Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6200", name: "Office Supplies & Refreshments", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6210", name: "Telephone & Commercial Fiber Internet", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6220", name: "IT & GDS Software Subscriptions (Sabre/Amadeus)", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6230", name: "Printing, Stationery & Document Folders", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6240", name: "General Insurance Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6250", name: "Legal, Tax & Corporate Consultancy", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6260", name: "DTS, SECP & Government Licensing Fees", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6300", name: "Marketing & Digital Advertising", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Marketing" },
  { code: "6310", name: "Sub-Agent Commission Paid", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Marketing" },
  { code: "6400", name: "Depreciation Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Fixed Assets" },
  { code: "6410", name: "Bank Charges & POS Terminal Fees", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Finance" },
  { code: "6600", name: "Client Entertainment & Hospitality", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6610", name: "Staff Welfare & Tea Club", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Payroll" },
  { code: "6900", name: "General & Admin Expense – Other", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
  { code: "6990", name: "Miscellaneous Expense", type: "EXPENSE" as AccountType, normal: "DEBIT" as NormalBalance, category: "Admin" },
];

export async function seedDemoEnvironment(options: { reset?: boolean } = {}) {
  console.log("===============================================================");
  console.log("✈️  STARTING TRAVELFLOW PAKISTAN DEMO SEEDING PIPELINE");
  console.log("===============================================================");

  const agencyId = DEMO_CONFIG.agency.id;

  // 1. Configure or Upsert Agency
  console.log(`[1/8] Upserting Primary Agency: ${DEMO_CONFIG.agency.name}...`);
  await prisma.agency.upsert({
    where: { id: agencyId },
    update: {
      name: DEMO_CONFIG.agency.name,
      slug: DEMO_CONFIG.agency.slug,
      code: DEMO_CONFIG.agency.code,
      contactEmail: DEMO_CONFIG.agency.contactEmail,
      contactPhone: DEMO_CONFIG.agency.contactPhone,
      address: DEMO_CONFIG.agency.address,
      city: DEMO_CONFIG.agency.city,
      country: DEMO_CONFIG.agency.country,
      currency: DEMO_CONFIG.agency.currency,
      registrationNo: DEMO_CONFIG.agency.registrationNo,
      status: "active",
      isDeleted: false,
    },
    create: {
      id: agencyId,
      name: DEMO_CONFIG.agency.name,
      slug: DEMO_CONFIG.agency.slug,
      code: DEMO_CONFIG.agency.code,
      contactEmail: DEMO_CONFIG.agency.contactEmail,
      contactPhone: DEMO_CONFIG.agency.contactPhone,
      address: DEMO_CONFIG.agency.address,
      city: DEMO_CONFIG.agency.city,
      country: DEMO_CONFIG.agency.country,
      currency: DEMO_CONFIG.agency.currency,
      registrationNo: DEMO_CONFIG.agency.registrationNo,
      status: "active",
    },
  });

  // 2. Upsert Branches
  console.log(`[2/8] Setting up ${DEMO_CONFIG.branches.length} Agency Branches...`);
  const branchMap = new Map<string, string>(); // code -> id
  for (const b of DEMO_CONFIG.branches) {
    let branch = await prisma.branch.findFirst({
      where: { agencyId, OR: [{ id: b.id }, { code: b.code }] },
    });

    if (branch) {
      branch = await prisma.branch.update({
        where: { id: branch.id },
        data: {
          name: b.name,
          code: b.code,
          city: b.city,
          address: b.address,
          phone: b.phone,
          currency: b.currency,
          isHeadOffice: b.isHeadOffice,
          status: "active",
          isDeleted: false,
        },
      });
    } else {
      branch = await prisma.branch.create({
        data: {
          id: b.id,
          agencyId,
          name: b.name,
          code: b.code,
          city: b.city,
          address: b.address,
          phone: b.phone,
          currency: b.currency,
          isHeadOffice: b.isHeadOffice,
          status: "active",
        },
      });
    }
    branchMap.set(b.code, branch.id);
  }

  // 3. Upsert Roles & Permissions
  console.log("[3/8] Configuring Roles & Granular Permissions...");
  const roleDefinitions = [
    { name: "admin", description: "System Administrator", permissions: ["all"], color: "#dc2626", textColor: "#ffffff" },
    {
      name: "manager",
      description: "Branch Manager",
      permissions: [
        "Customers: View", "Customers: Create", "Customers: Edit", "Customers: Delete",
        "Leads: View", "Leads: Create", "Leads: Edit", "Leads: Delete",
        "Bookings: View", "Bookings: Create", "Bookings: Edit", "Bookings: Delete",
        "Quotations: View", "Quotations: Create", "Quotations: Edit", "Quotations: Delete",
        "Invoices: View", "Invoices: Create", "Invoices: Edit", "Invoices: Delete",
        "Expenses: View", "Expenses: Create", "Expenses: Edit", "Expenses: Delete",
        "Suppliers: View", "Suppliers: Create", "Suppliers: Edit", "Suppliers: Delete",
        "Payments: View", "Payments: Create", "Payments: Edit", "Payments: Delete",
        "Users: View", "Users: Create", "Users: Edit",
        "Branches: View", "Branches: Access All",
        "Roles: View", "Reports: View",
        "Accounting: Journal", "Accounting: Ledger", "Accounting: AR", "Accounting: AP", "Accounting: Chart of Accounts",
        "Settings: View",
      ],
      color: "#2563eb",
      textColor: "#ffffff",
    },
    {
      name: "agent",
      description: "Travel Consultant",
      permissions: [
        "Customers: View", "Customers: Create", "Customers: Edit",
        "Leads: View", "Leads: Create", "Leads: Edit",
        "Bookings: View", "Bookings: Create", "Bookings: Edit",
        "Quotations: View", "Quotations: Create", "Quotations: Edit",
        "Invoices: View", "Invoices: Create",
        "Payments: View", "Payments: Create",
        "Expenses: View",
      ],
      color: "#16a34a",
      textColor: "#ffffff",
    },
    {
      name: "accountant",
      description: "Finance & Accounts",
      permissions: [
        "Invoices: View", "Invoices: Create", "Invoices: Edit",
        "Payments: View", "Payments: Create", "Payments: Edit",
        "Expenses: View", "Expenses: Create", "Expenses: Edit",
        "Reports: View",
        "Accounting: Journal", "Accounting: Ledger", "Accounting: AR", "Accounting: AP", "Accounting: Chart of Accounts",
      ],
      color: "#9333ea",
      textColor: "#ffffff",
    },
    {
      name: "operations",
      description: "Operations & Ticketing Specialist",
      permissions: [
        "Bookings: View", "Bookings: Edit",
        "Suppliers: View", "Suppliers: Create", "Suppliers: Edit",
        "Customers: View", "Invoices: View", "Payments: View",
      ],
      color: "#d97706",
      textColor: "#ffffff",
    },
    {
      name: "owner",
      description: "Agency Owner",
      permissions: ["all"],
      color: "#0f172a",
      textColor: "#ffffff",
    },
  ];

  for (const r of roleDefinitions) {
    const existing = await prisma.role.findFirst({
      where: { agencyId, name: { equals: r.name, mode: "insensitive" } },
    });
    if (existing) {
      await prisma.role.update({
        where: { id: existing.id },
        data: { permissions: r.permissions, description: r.description, color: r.color, textColor: r.textColor, isDeleted: false },
      });
    } else {
      await prisma.role.create({
        data: {
          agencyId,
          name: r.name,
          description: r.description,
          permissions: r.permissions,
          color: r.color,
          textColor: r.textColor,
        },
      });
    }
  }

  // 4. Upsert Users
  console.log(`[4/8] Creating/Updating ${DEMO_USERS_SPEC.length} Realistic Staff Members...`);
  const hashedPassword = await bcrypt.hash(DEMO_CONFIG.defaultPassword, 10);
  const userMap = new Map<string, any>(); // email -> user

  for (const u of DEMO_USERS_SPEC) {
    const branchId = branchMap.get(u.branchCode) || branchMap.get("KHI")!;
    const existing = await prisma.user.findFirst({
      where: { agencyId, email: u.email.toLowerCase() },
    });

    let savedUser;
    if (existing) {
      savedUser = await prisma.user.update({
        where: { id: existing.id },
        data: {
          firstName: u.firstName,
          lastName: u.lastName,
          role: u.role,
          phone: u.phone,
          branchId,
          password: hashedPassword,
          status: "active",
          isDeleted: false,
        },
      });
    } else {
      savedUser = await prisma.user.create({
        data: {
          agencyId,
          branchId,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email.toLowerCase(),
          password: hashedPassword,
          phone: u.phone,
          role: u.role,
          status: "active",
        },
      });
    }
    userMap.set(u.email.toLowerCase(), savedUser);
  }

  // 5. Chart of Accounts Setup
  console.log("[5/8] Setting up Chart of Accounts for all Branches...");
  for (const [, bId] of branchMap.entries()) {
    for (const acc of PAKISTAN_COA_TEMPLATE) {
      const existing = await prisma.chartOfAccount.findFirst({
        where: { agencyId, branchId: bId, code: acc.code },
      });
      if (!existing) {
        await prisma.chartOfAccount.create({
          data: {
            agencyId,
            branchId: bId,
            code: acc.code,
            name: acc.name,
            type: acc.type,
            normalBalance: acc.normal,
            category: acc.category,
            isSystem: true,
            isActive: true,
          },
        });
      }
    }
  }

  // 6. Upsert Suppliers
  console.log(`[6/8] Seeding ${DEMO_SUPPLIERS_SPEC.length} Travel Industry Suppliers...`);
  const supplierMap = new Map<string, any>(); // name -> supplier
  const khiBranchId = branchMap.get("KHI")!;

  for (const s of DEMO_SUPPLIERS_SPEC) {
    const existing = await prisma.supplier.findFirst({
      where: { agencyId, name: s.name },
    });

    let savedSupplier;
    if (existing) {
      savedSupplier = await prisma.supplier.update({
        where: { id: existing.id },
        data: {
          category: s.category,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          city: s.city,
          country: s.country,
          address: s.address,
          status: "active",
          isDeleted: false,
        },
      });
    } else {
      savedSupplier = await prisma.supplier.create({
        data: {
          agencyId,
          branchId: khiBranchId,
          name: s.name,
          category: s.category,
          contactPerson: s.contactPerson,
          email: s.email,
          phone: s.phone,
          city: s.city,
          country: s.country,
          address: s.address,
          balance: 0,
          status: "active",
        },
      });
    }
    supplierMap.set(s.name, savedSupplier);
  }

  // 7. Check if historical data exists
  const existingBookingsCount = await prisma.booking.count({ where: { agencyId, isDeleted: false } });
  if (existingBookingsCount >= 20 && !options.reset) {
    console.log(`ℹ️  Found ${existingBookingsCount} existing bookings. Preserving historical timeline.`);
    console.log("   (Pass { reset: true } if you explicitly want to re-seed historical transactions)");
    return { success: true, message: "Reference data ensured. Historical data already populated." };
  }

  // 8. Generate 5-Month Historical Activity Timeline
  console.log(`[7/8] Generating ${DEMO_CONFIG.history.targetLeads} Historical Leads & Transactions across ${DEMO_CONFIG.history.daysBack} Days...`);

  const now = Date.now();
  const DAY_MS = 24 * 60 * 60 * 1000;
  const agentsList = Array.from(userMap.values()).filter((u) => u.role === "agent");
  const adminUser = userMap.get("admin@travelflow.demo") || agentsList[0];

  const ctx = {
    agencyId,
    callerId: adminUser.id,
    callerRole: adminUser.role,
  };

  let totalLeadsCreated = 0;
  let totalQuotationsCreated = 0;
  let totalBookingsCreated = 0;
  let totalInvoicesCreated = 0;
  let totalPaymentsCreated = 0;
  let totalSuppliersSettled = 0;

  for (let i = 0; i < DEMO_CONFIG.history.targetLeads; i++) {
    // Distribute randomly across the past 150 days
    const dayOffset = Math.floor(Math.random() * (DEMO_CONFIG.history.daysBack - 2)) + 2;
    const leadTime = new Date(now - dayOffset * DAY_MS);

    // Pick branch and agent
    const branchIndex = Math.random() < 0.6 ? 0 : Math.random() < 0.85 ? 1 : 2;
    const branchCode = DEMO_CONFIG.branches[branchIndex].code;
    const branchId = branchMap.get(branchCode)!;

    const branchAgents = agentsList.filter((a) => a.branchId === branchId);
    const assignedAgent = branchAgents[i % branchAgents.length] || agentsList[0];

    // Pick travel package
    const pkg = TRAVEL_PACKAGES[i % TRAVEL_PACKAGES.length];
    const adults = Math.floor(Math.random() * 3) + 1;
    const children = Math.random() < 0.4 ? Math.floor(Math.random() * 2) + 1 : 0;
    const totalTravelers = adults + children;

    // Believable Pakistani lead person
    const firstName = PAKISTANI_FIRST_NAMES[(i * 3) % PAKISTANI_FIRST_NAMES.length];
    const lastName = PAKISTANI_LAST_NAMES[(i * 7) % PAKISTANI_LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i + 100}@example.test`;
    const phone = generateSyntheticPakistaniPhone(i + 100);
    const loc = PAKISTANI_CITIES_AND_AREAS[i % PAKISTANI_CITIES_AND_AREAS.length];

    const sources = ["Website", "WhatsApp Inquiry", "Walk-in Branch", "Referral", "Meta Ad Campaign", "Corporate Contact"];
    const source = sources[i % sources.length];

    // Funnel outcome:
    // 0-35: Converted to Booking
    // 36-55: Quotation sent / negotiating
    // 56-75: Contacted / Qualified
    // 76-88: New recent lead
    // 89-99: Lost
    const outcomeRoll = (i * 13) % 100;
    let status = "new";
    if (outcomeRoll < 35) status = "converted";
    else if (outcomeRoll < 55) status = "proposal_sent";
    else if (outcomeRoll < 75) status = "contacted";
    else if (outcomeRoll < 88) status = "new";
    else status = "lost";

    const leadRef = await generateRef("LD", agencyId, leadTime.getFullYear());

    // 8.1 Create Lead
    const lead = await prisma.lead.create({
      data: {
        agencyId,
        branchId,
        leadRef,
        name: fullName,
        phone,
        whatsapp: phone,
        email,
        destination: pkg.destination,
        travelDate: new Date(leadTime.getTime() + 25 * DAY_MS),
        budget: pkg.services.reduce((s, it) => s + it.unitSelling, 0) * totalTravelers,
        adults,
        children,
        source,
        status,
        assignedAgentId: assignedAgent.id,
        notes: `Inquiry for ${pkg.title}. Client prefers travel from ${branchCode}.`,
        createdAt: leadTime,
        updatedAt: leadTime,
      },
    });
    totalLeadsCreated++;

    // Add Lead Activities
    await prisma.leadActivity.create({
      data: {
        agencyId,
        leadId: lead.id,
        type: "call",
        description: `Introductory call with ${fullName} regarding ${pkg.title}`,
        outcome: status === "lost" ? "Budget exceeded customer expectations" : "Interested, requested itinerary proposal",
        createdBy: assignedAgent.firstName,
        createdAt: new Date(leadTime.getTime() + 2 * 3600 * 1000),
      },
    });

    // If Contacted / New / Lost, stop here for this lead
    if (status !== "converted" && status !== "proposal_sent") {
      continue;
    }

    // 8.2 Create Customer
    const customerRef = await generateRef("CUS", agencyId, leadTime.getFullYear());
    const isCorporate = i % 8 === 0;
    const companyName = isCorporate ? CORPORATE_CLIENT_NAMES[i % CORPORATE_CLIENT_NAMES.length] : null;

    const customer = await prisma.customer.create({
      data: {
        agencyId,
        branchId,
        customerRef,
        type: isCorporate ? "corporate" : "individual",
        firstName,
        lastName,
        companyName,
        phone,
        whatsapp: phone,
        email,
        city: loc.city,
        address: `${loc.area}, ${loc.city}`,
        country: "Pakistan",
        cnic: generateSyntheticCNIC(i, loc.province),
        passportNumber: generateSyntheticPassport(i),
        status: "active",
        createdAt: new Date(leadTime.getTime() + 12 * 3600 * 1000),
      },
    });

    // Link customer to lead
    await prisma.lead.update({
      where: { id: lead.id },
      data: { customerId: customer.id },
    });

    // 8.3 Create Quotation
    const quoteTime = new Date(leadTime.getTime() + 24 * 3600 * 1000);
    const quotationNumber = await generateRef("QT", agencyId, quoteTime.getFullYear());

    let subtotal = 0;
    let costSubtotal = 0;
    const quoteItemsData: any[] = [];

    for (let sIdx = 0; sIdx < pkg.services.length; sIdx++) {
      const s = pkg.services[sIdx];
      const supplier = supplierMap.get(s.supplierName);
      const itemCost = s.unitCost * totalTravelers;
      const itemSelling = s.unitSelling * totalTravelers;
      subtotal += itemSelling;
      costSubtotal += itemCost;

      quoteItemsData.push({
        agencyId,
        serviceCategory: s.category,
        title: s.title,
        description: s.description,
        supplierId: supplier?.id || null,
        quantity: totalTravelers,
        unit: "Person",
        costPrice: itemCost,
        sellingPrice: itemSelling,
        total: itemSelling,
        sortOrder: sIdx,
        createdAt: quoteTime,
      });
    }

    const discount = i % 5 === 0 ? 5000 : 0;
    const agencyFee = 0;
    const taxTotal = 0; // Margins include local taxes
    const total = subtotal - discount;
    const estimatedProfit = subtotal - costSubtotal - discount;

    const quotation = await prisma.quotation.create({
      data: {
        agencyId,
        quotationNumber,
        title: pkg.title,
        leadId: lead.id,
        customerId: customer.id,
        branchId,
        consultantId: assignedAgent.id,
        travelType: pkg.travelType,
        destination: pkg.destination,
        departureDate: new Date(quoteTime.getTime() + 20 * DAY_MS),
        returnDate: new Date(quoteTime.getTime() + (20 + pkg.defaultDurationDays) * DAY_MS),
        adults,
        children,
        currency: "PKR",
        subtotal,
        agencyFee,
        discount,
        taxTotal,
        total,
        estimatedProfit,
        status: status === "converted" ? "accepted" : "sent",
        validUntil: new Date(quoteTime.getTime() + 14 * DAY_MS),
        customerNotes: `Official Quotation prepared for ${fullName}. Valid for 14 days.`,
        createdAt: quoteTime,
        updatedAt: quoteTime,
        items: {
          create: quoteItemsData,
        },
      },
    });
    totalQuotationsCreated++;

    // If quotation is just proposal_sent, stop here
    if (status !== "converted") {
      continue;
    }

    // 8.4 Create Booking
    const bookingTime = new Date(quoteTime.getTime() + 36 * 3600 * 1000);
    const bookingRef = await generateRef("BK", agencyId, bookingTime.getFullYear());

    // Determine booking trip status: Completed (if departure in past), or Active/Confirmed (if future)
    const departureDate = new Date(bookingTime.getTime() + 20 * DAY_MS);
    const returnDate = new Date(bookingTime.getTime() + (20 + pkg.defaultDurationDays) * DAY_MS);
    const isCompletedTrip = returnDate.getTime() < now;
    const bookingStatus = isCompletedTrip ? "completed" : "confirmed";

    // Determine payment status: 65% paid, 25% partial, 10% unpaid
    const payRoll = (i * 17) % 100;
    let paymentStatus = "paid";
    if (payRoll < 65) paymentStatus = "paid";
    else if (payRoll < 90) paymentStatus = "partial";
    else paymentStatus = "unpaid";

    const booking = await prisma.booking.create({
      data: {
        agencyId,
        bookingRef,
        customerId: customer.id,
        branchId,
        agentId: assignedAgent.id,
        leadId: lead.id,
        sourceQuotationId: quotation.id,
        sourceType: "quotation",
        title: `${pkg.travelType} – ${pkg.destination}`,
        departureDate,
        returnDate,
        expectedAdults: adults,
        expectedChildren: children,
        currency: "PKR",
        bookingStatus,
        paymentStatus,
        notes: `Confirmed travel itinerary for ${fullName}.`,
        createdAt: bookingTime,
        updatedAt: bookingTime,
      },
    });
    totalBookingsCreated++;

    // Create Booking Services with exact financial calculator
    const createdServices: any[] = [];
    for (let sIdx = 0; sIdx < quoteItemsData.length; sIdx++) {
      const qItem = quoteItemsData[sIdx];
      const financials = calculateServiceFinancials({
        unitCost: qItem.costPrice / qItem.quantity,
        unitSellingPrice: qItem.sellingPrice / qItem.quantity,
        quantity: qItem.quantity,
        supplierInvoiceAmount: null,
        taxTreatment: "VAT_ON_MARGIN",
        vatRate: 0,
      });

      const svc = await prisma.bookingService.create({
        data: {
          agencyId,
          bookingId: booking.id,
          serviceCategory: qItem.serviceCategory,
          title: qItem.title,
          description: qItem.description,
          supplierId: qItem.supplierId,
          costPrice: financials.lineCost,
          sellingPrice: financials.lineSelling,
          taxTreatment: "VAT_ON_MARGIN",
          vatRate: 0,
          taxBase: financials.taxBase,
          taxAmount: financials.taxAmount,
          expectedMargin: financials.expectedMargin,
          actualMargin: financials.actualMargin,
          costVariance: financials.costVariance,
          customerTotal: financials.customerTotal,
          financialStatus: "draft",
          quantity: financials.quantity,
          unit: "Person",
          status: isCompletedTrip ? "completed" : "confirmed",
          sortOrder: sIdx,
          createdAt: bookingTime,
        },
      });
      createdServices.push(svc);
    }

    // Create Booking Travelers
    for (let t = 0; t < totalTravelers; t++) {
      await prisma.bookingTraveler.create({
        data: {
          agencyId,
          bookingId: booking.id,
          firstName: t === 0 ? firstName : PAKISTANI_FIRST_NAMES[(i + t * 4) % PAKISTANI_FIRST_NAMES.length],
          lastName,
          type: t < adults ? "adult" : "child",
          passportNumber: generateSyntheticPassport(i * 10 + t),
          nationality: "Pakistani",
          createdAt: bookingTime,
        },
      });
    }

    // 8.5 Create Customer Invoice & Post Journal
    const invoiceTime = new Date(bookingTime.getTime() + 12 * 3600 * 1000);
    const invoiceRef = await generateRef("INV", agencyId, invoiceTime.getFullYear());

    let invoiceStatus = "sent";
    if (paymentStatus === "paid") invoiceStatus = "paid";
    else if (paymentStatus === "partial") invoiceStatus = "sent";
    else if (invoiceTime.getTime() + 14 * DAY_MS < now) invoiceStatus = "overdue";

    const invoice = await prisma.invoice.create({
      data: {
        agencyId,
        branchId,
        invoiceRef,
        bookingId: booking.id,
        customerId: customer.id,
        currency: "PKR",
        subtotal: subtotal,
        tax: 0,
        total: total,
        status: invoiceStatus,
        dueDate: new Date(invoiceTime.getTime() + 14 * DAY_MS),
        paidAt: paymentStatus === "paid" ? new Date(invoiceTime.getTime() + 5 * DAY_MS) : null,
        createdAt: invoiceTime,
        items: {
          create: createdServices.map((s) => ({
            agencyId,
            description: `${s.title} (${s.serviceCategory})`,
            quantity: s.quantity,
            unitPrice: s.sellingPrice / s.quantity,
            amount: s.sellingPrice,
            createdAt: invoiceTime,
          })),
        },
      },
    });
    totalInvoicesCreated++;

    // Post Invoice Journal
    try {
      await postInvoiceJournal(ctx, invoice.id);
    } catch (err: any) {
      console.warn(`[Invoice Journal Warning]: ${err?.message || err}`);
    }

    // 8.6 Record Customer Payments
    if (paymentStatus === "paid" || paymentStatus === "partial") {
      const payAmount = paymentStatus === "paid" ? total : Math.round((total * 0.45) / 1000) * 1000;
      const payTime = new Date(invoiceTime.getTime() + (paymentStatus === "paid" ? 3 : 1) * DAY_MS);
      const paymentRef = await generateRef("REC", agencyId, payTime.getFullYear());
      const payMethods = ["Bank Transfer", "Online", "Cash", "Cheque"];
      const payMethod = payMethods[i % payMethods.length];

      const custPayment = await prisma.customerPayment.create({
        data: {
          agencyId,
          branchId,
          paymentRef,
          customerId: customer.id,
          bookingId: booking.id,
          amount: payAmount,
          currency: "PKR",
          paymentMethod: payMethod,
          status: "completed",
          notes: `${payMethod} received for Booking ${bookingRef} (Invoice ${invoiceRef})`,
          date: payTime,
          recordedById: assignedAgent.id,
          createdAt: payTime,
          allocations: {
            create: {
              agencyId,
              bookingId: booking.id,
              amount: payAmount,
            },
          },
        },
      });
      totalPaymentsCreated++;

      // Post Customer Payment Journal
      try {
        await postCustomerPaymentJournal(ctx, custPayment.id);
      } catch (err: any) {
        console.warn(`[Payment Journal Warning]: ${err?.message || err}`);
      }

      // If fully paid, add second settlement payment if large booking
      if (paymentStatus === "paid" && total > 400000 && Math.random() < 0.4) {
        // Already recorded full in single payment for clean matching
      }
    }

    // 8.7 Confirm Supplier Invoices & Settle
    // For completed trips and ongoing trips, confirm actual supplier costs
    if (isCompletedTrip || Math.random() < 0.75) {
      for (const svc of createdServices) {
        if (!svc.supplierId) continue;
        const confirmTime = new Date(bookingTime.getTime() + 8 * DAY_MS);
        const actualCost = svc.costPrice; // matches cost

        try {
          await confirmSupplierInvoice(ctx, {
            bookingServiceId: svc.id,
            supplierInvoiceAmount: actualCost,
            reference: `BILL-${bookingRef.slice(-6)}`,
            date: confirmTime,
          });

          // Update supplier balance
          await prisma.supplier.update({
            where: { id: svc.supplierId },
            data: { balance: { increment: actualCost } },
          });
        } catch (err: any) {
          // ignore already confirmed
        }
      }
    }
  }

  // 8.8 Monthly Supplier Payment Runs & Settlements
  console.log("[7.5/8] Processing Monthly Supplier Settlements...");
  const suppliers = await prisma.supplier.findMany({ where: { agencyId, isDeleted: false } });
  for (const supp of suppliers) {
    if (supp.balance <= 0) continue;
    // Settle 70% of balance
    const settleAmount = Math.round((supp.balance * 0.7) / 1000) * 1000;
    if (settleAmount <= 0) continue;

    const settleTime = new Date(now - 10 * DAY_MS);
    const spRef = await generateRef("SPY", agencyId, settleTime.getFullYear());

    const suppPay = await prisma.supplierPayment.create({
      data: {
        agencyId,
        branchId: khiBranchId,
        supplierId: supp.id,
        paymentRef: spRef,
        amount: settleAmount,
        currency: "PKR",
        paymentMethod: "Bank Transfer",
        notes: `Monthly Account Settlement via HBL Main Account`,
        date: settleTime,
        recordedById: adminUser.id,
        createdAt: settleTime,
      },
    });

    await prisma.supplier.update({
      where: { id: supp.id },
      data: { balance: Math.max(0, supp.balance - settleAmount) },
    });

    try {
      await postSupplierPaymentJournal(ctx, suppPay.id);
      totalSuppliersSettled++;
    } catch (err: any) {
      console.warn(`[Supplier Settlement Journal Warning]: ${err?.message || err}`);
    }
  }

  // 8.9 Operating Expenses across Past 5 Months
  console.log("[7.8/8] Recording Operating Expenses & Double-Entry Ledger...");
  let totalExpensesCreated = 0;
  for (let m = DEMO_CONFIG.history.monthsBack; m >= 0; m--) {
    const monthDate = new Date(now - m * 30 * DAY_MS);
    const expenseYear = monthDate.getFullYear();

    for (const expTpl of OFFICE_EXPENSE_TEMPLATES) {
      for (const [, bId] of branchMap.entries()) {
        // Rent, electricity, payroll once a month per branch
        const expAmount = Math.round(
          (expTpl.minAmount + Math.random() * (expTpl.maxAmount - expTpl.minAmount)) / 1000
        ) * 1000;

        const expRef = await generateRef("EXP", agencyId, expenseYear);
        const expense = await prisma.expense.create({
          data: {
            agencyId,
            branchId: bId,
            expenseRef: expRef,
            title: expTpl.title,
            category: expTpl.category,
            amount: expAmount,
            currency: "PKR",
            date: monthDate,
            paidTo: expTpl.paidTo,
            paymentMethod: expTpl.paymentMethod,
            recordedById: adminUser.id,
            status: "approved",
            createdAt: monthDate,
          },
        });
        totalExpensesCreated++;

        try {
          await postExpenseJournal(ctx, expense.id);
        } catch (err: any) {
          console.warn(`[Expense Journal Warning]: ${err?.message || err}`);
        }
      }
    }
  }

  console.log("===============================================================");
  console.log("✅ TRAVELFLOW PAKISTAN DEMO SEEDING COMPLETED SUCCESSFULLY!");
  console.log("===============================================================");
  console.log(`📊 Total Leads Created:       ${totalLeadsCreated}`);
  console.log(`📑 Total Quotations Created:  ${totalQuotationsCreated}`);
  console.log(`🎟️ Total Bookings Created:    ${totalBookingsCreated}`);
  console.log(`🧾 Total Invoices Created:    ${totalInvoicesCreated}`);
  console.log(`💳 Total Payments Recorded:   ${totalPaymentsCreated}`);
  console.log(`🏢 Total Expenses Recorded:   ${totalExpensesCreated}`);
  console.log(`🤝 Supplier Settlements Run:  ${totalSuppliersSettled}`);
  console.log("===============================================================\n");

  return {
    success: true,
    metrics: {
      leads: totalLeadsCreated,
      quotations: totalQuotationsCreated,
      bookings: totalBookingsCreated,
      invoices: totalInvoicesCreated,
      payments: totalPaymentsCreated,
      expenses: totalExpensesCreated,
    },
  };
}

// Direct CLI Execution
if (require.main === module) {
  const isReset = process.argv.includes("--reset") || process.argv.includes("--force");
  seedDemoEnvironment({ reset: isReset })
    .catch((err) => {
      console.error("❌ Critical seeding error:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
