export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
  textColor: string;
}

export const PERMISSION_GROUPS = [
  {
    module: "Customers",
    actions: ["Customers: View", "Customers: Create", "Customers: Edit", "Customers: Delete"]
  },
  {
    module: "Leads",
    actions: ["Leads: View", "Leads: Create", "Leads: Edit", "Leads: Delete"]
  },
  {
    module: "Bookings",
    actions: ["Bookings: View", "Bookings: Create", "Bookings: Edit", "Bookings: Delete"]
  },
  {
    module: "Quotations",
    actions: ["Quotations: View", "Quotations: Create", "Quotations: Edit", "Quotations: Delete"]
  },
  {
    module: "Invoices",
    actions: ["Invoices: View", "Invoices: Create", "Invoices: Edit", "Invoices: Delete"]
  },
  {
    module: "Payments",
    actions: ["Payments: View", "Payments: Create", "Payments: Edit", "Payments: Delete"]
  },
  {
    module: "Expenses",
    actions: ["Expenses: View", "Expenses: Create", "Expenses: Edit", "Expenses: Delete"]
  },
  {
    module: "Suppliers",
    actions: ["Suppliers: View", "Suppliers: Create", "Suppliers: Edit", "Suppliers: Delete"]
  },
  {
    module: "Users",
    actions: ["Users: View", "Users: Create", "Users: Edit", "Users: Delete"]
  },
  {
    module: "Branches",
    actions: ["Branches: View", "Branches: Create", "Branches: Edit", "Branches: Delete", "Branches: Access All"]
  },
  {
    module: "Roles",
    actions: ["Roles: View", "Roles: Create", "Roles: Edit", "Roles: Delete"]
  },
  {
    module: "Reports",
    actions: ["Reports: View"]
  },
  {
    module: "Accounting",
    actions: [
      "Accounting: Journal",
      "Accounting: Ledger",
      "Accounting: AR",
      "Accounting: AP",
      "Accounting: Chart of Accounts"
    ]
  },
  {
    module: "Settings",
    actions: ["Settings: View", "Settings: Edit"]
  }
] as const;

export const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(g => g.actions);

export type Permission = (typeof ALL_PERMISSIONS)[number];
