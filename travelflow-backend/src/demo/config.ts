/**
 * TravelFlow Demo Environment Configuration
 * Encapsulates all settings, tenant definitions, branch constants,
 * and operational parameters for the Pakistani Travel Agency demo.
 */

export const DEMO_CONFIG = {
  // Tenant scoping & safety
  enabled: process.env.DEMO_MODE !== "false", // Default active in dev unless explicitly disabled
  cronSecret: (process.env.CRON_SECRET && process.env.CRON_SECRET.trim().length > 0)
    ? process.env.CRON_SECRET.trim()
    : "travelflow-demo-cron-secret-2026",
  timezone: "Asia/Karachi",
  defaultCurrency: "PKR",
  defaultPassword: "DemoPassword123!",

  // Primary Dedicated Demo Agency (TravelFlow Pakistan) - Isolated from running agencies
  agency: {
    id: process.env.DEMO_AGENCY_ID || "d0000000-0000-0000-0000-000000000001",
    name: "TravelFlow Pakistan (Pvt) Ltd",
    slug: "travelflow-pakistan-demo",
    code: "TF",
    contactEmail: "contact@travelflow.demo",
    contactPhone: "+92 21 35812345",
    address: "Executive Suite 402, Business Avenue, Main Shahrah-e-Faisal, PECHS",
    city: "Karachi",
    country: "Pakistan",
    currency: "PKR",
    registrationNo: "SECP-PK-0198421",
    primaryColor: "#0ea5e9",
  },

  // Dedicated Demo Multi-branch network
  branches: [
    {
      id: "d1111111-1111-1111-1111-111111111101",
      name: "Karachi Head Office",
      code: "KHI",
      city: "Karachi",
      address: "Ground Floor, Business Avenue, Main Shahrah-e-Faisal, PECHS",
      phone: "+92 21 35812345",
      isHeadOffice: true,
      currency: "PKR",
    },
    {
      id: "d1111111-1111-1111-1111-111111111102",
      name: "Lahore Branch",
      code: "LHR",
      city: "Lahore",
      address: "Plot 18-C, Mini Market, M.M. Alam Road, Gulberg III",
      phone: "+92 42 35754321",
      isHeadOffice: false,
      currency: "PKR",
    },
    {
      id: "d1111111-1111-1111-1111-111111111103",
      name: "Islamabad Branch",
      code: "ISB",
      city: "Islamabad",
      address: "Mezzanine Floor, Beverly Centre, Blue Area",
      phone: "+92 51 2801234",
      isHeadOffice: false,
      currency: "PKR",
    },
  ],

  // Historical seeding timeline & volume targets
  history: {
    monthsBack: 5,
    daysBack: 150,
    targetLeads: 140,
    targetQuotations: 80,
    targetBookings: 45,
    targetExpenses: 65,
  },

  // Daily automated continuous activity targets
  daily: {
    minLeads: 8,
    maxLeads: 12,
    minQuotations: 3,
    maxQuotations: 6,
    minBookings: 1,
    maxBookings: 3,
    minPayments: 1,
    maxPayments: 3,
    minExpenses: 1,
    maxExpenses: 3,
  },
};
