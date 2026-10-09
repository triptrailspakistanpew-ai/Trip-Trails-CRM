import {
  LayoutDashboard,
  UserPlus,
  Users,
  Plane,
  FileText,
  Receipt,
  Building2,
  CreditCard,
  BarChart3,
  GitBranch,
  UserCog,
  ShieldCheck,
  Settings,
  FileMinus,
  BookOpen,
  ScrollText,
  LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  roles?: string[];
  permission?: string | string[];
  exact?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const sidebarNav: NavGroup[] = [
  {
    label: "MAIN MENU",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "manager"],
      },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        title: "Leads",
        href: "/leads",
        icon: UserPlus,
        permission: "Leads: View",
      },
      {
        title: "Customers",
        href: "/customers",
        icon: Users,
        permission: "Customers: View",
      },
      {
        title: "Quotations",
        href: "/quotations",
        icon: FileText,
        roles: ["admin", "manager"],
        permission: "Quotations: View",
      },
    ],
  },
  {
    label: "SALES",
    items: [
      {
        title: "Bookings",
        href: "/bookings",
        icon: Plane,
        permission: "Bookings: View",
      },
      {
        title: "Invoices",
        href: "/invoices",
        icon: FileText,
        permission: "Invoices: View",
      },
      {
        title: "Credit Notes",
        href: "/credit-notes",
        icon: FileMinus,
        permission: "Invoices: View",
      },
      {
        title: "Payments",
        href: "/receipts",
        icon: Receipt,
        permission: "Accounting: AR",
      },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      {
        title: "Suppliers",
        href: "/suppliers",
        icon: Building2,
        permission: "Suppliers: View",
      },
      {
        title: "Expenses",
        href: "/expenses",
        icon: CreditCard,
        roles: ["admin", "manager"],
        permission: "Expenses: View",
      },
    ],
  },
  {
    label: "ACCOUNTING",
    items: [
      {
        title: "A/R Ledger",
        href: "/accounting/ar",
        icon: Users,
        roles: ["admin", "manager"],
        permission: "Accounting: AR",
      },
      {
        title: "A/P Ledger",
        href: "/accounting/ap",
        icon: Building2,
        roles: ["admin", "manager"],
        permission: "Accounting: AP",
      },
      {
        title: "Chart of Accounts",
        href: "/accounting",
        icon: BookOpen,
        roles: ["admin", "manager"],
        permission: "Accounting: Chart of Accounts",
        exact: true,
      },
      {
        title: "Journal Entries",
        href: "/accounting/journal-entries",
        icon: ScrollText,
        roles: ["admin", "manager"],
        permission: "Accounting: Journal",
      },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      {
        title: "Reports",
        href: "/reports",
        icon: BarChart3,
        roles: ["admin", "manager"],
        permission: "Reports: View",
      },
    ],
  },
  {
    label: "ADMINISTRATION",
    items: [
      {
        title: "Branches",
        href: "/branches",
        icon: GitBranch,
        roles: ["admin", "manager"],
        permission: ["Branches: View", "Branches: Access All"],
      },
      {
        title: "Users",
        href: "/users",
        icon: UserCog,
        roles: ["admin", "manager"],
        permission: "Users: View",
      },
      {
        title: "Roles",
        href: "/roles",
        icon: ShieldCheck,
        roles: ["admin", "manager"],
        permission: "Roles: View",
      },
    ],
  },
  {
    label: "SETTINGS",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings,
        roles: ["admin", "manager"],
        permission: "Settings: View",
      },
    ],
  },
];
