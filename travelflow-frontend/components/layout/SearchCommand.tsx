"use client";

import {
  Search,
  LayoutDashboard,
  UserPlus,
  Users,
  Plane,
  Building2,
  CreditCard,
  BarChart3,
  GitBranch,
  UserCog,
  Settings,
  Plus,
  ArrowRight,
  FileText,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { withCreateDrawer } from "@/constants/create-drawer";
import { useCreateDrawerStore } from "@/store/create-drawer.store";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/use-permissions";

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  action: () => void;
  group: string;
  keywords?: string[];
  roles?: string[];
  permission?: string | string[];
}

export function SearchCommand() {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const requestCreateDrawer = useCreateDrawerStore(
    (state) => state.requestOpen,
  );
  const { user } = useAuthStore();
  const { hasPermission, isAdmin } = usePermissions();
  const role = user?.role || "agent";
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const navigate = useCallback(
    (href: string) => {
      setIsOpen(false);
      setSearchQuery("");
      router.push(href);
    },
    [router],
  );

  const navigateAndCreate = useCallback(
    (href: string) => {
      setIsOpen(false);
      setSearchQuery("");
      requestCreateDrawer();
      router.push(withCreateDrawer(href));
    },
    [router, requestCreateDrawer],
  );

  const allItems: CommandItem[] = [
    // Navigation
    {
      id: "nav-dashboard",
      label: "Dashboard",
      description: "Overview and KPIs",
      icon: LayoutDashboard,
      action: () => navigate("/dashboard"),
      group: "Navigate",
      keywords: ["home", "overview"],
      roles: ["admin", "manager"],
    },
    {
      id: "nav-leads",
      label: "Leads",
      description: "Sales pipeline",
      icon: UserPlus,
      action: () => navigate("/leads"),
      group: "Navigate",
      keywords: ["pipeline", "crm"],
      permission: "Leads: View",
    },
    {
      id: "nav-customers",
      label: "Customers",
      description: "Customer database",
      icon: Users,
      action: () => navigate("/customers"),
      group: "Navigate",
      keywords: ["clients"],
      permission: "Customers: View",
    },
    {
      id: "nav-bookings",
      label: "Bookings",
      description: "Flight & package bookings",
      icon: Plane,
      action: () => navigate("/bookings"),
      group: "Navigate",
      keywords: ["flights", "tickets", "pnr"],
      permission: "Bookings: View",
    },
    {
      id: "nav-quotations",
      label: "Quotations",
      description: "Customer quotations",
      icon: FileText,
      action: () => navigate("/quotations"),
      group: "Navigate",
      keywords: ["quotes", "proposals", "quotation", "quotaion"],
      permission: "Quotations: View",
    },
    {
      id: "nav-suppliers",
      label: "Suppliers",
      description: "B2B partners & airlines",
      icon: Building2,
      action: () => navigate("/suppliers"),
      group: "Navigate",
      keywords: ["vendors", "airlines"],
      permission: "Suppliers: View",
    },
    {
      id: "nav-expenses",
      label: "Expenses",
      description: "Operational costs",
      icon: CreditCard,
      action: () => navigate("/expenses"),
      group: "Navigate",
      keywords: ["costs", "finance"],
      roles: ["admin", "manager"],
      permission: "Expenses: View",
    },
    {
      id: "nav-reports",
      label: "Reports",
      description: "Analytics & insights",
      icon: BarChart3,
      action: () => navigate("/reports"),
      group: "Navigate",
      keywords: ["analytics"],
      roles: ["admin", "manager"],
      permission: "Reports: View",
    },
    {
      id: "nav-branches",
      label: "Branches",
      description: "Office locations",
      icon: GitBranch,
      action: () => navigate("/branches"),
      group: "Navigate",
      keywords: ["offices"],
      roles: ["admin", "manager"],
      permission: ["Branches: View", "Branches: Access All"],
    },
    {
      id: "nav-users",
      label: "Users",
      description: "Staff management",
      icon: UserCog,
      action: () => navigate("/users"),
      group: "Navigate",
      keywords: ["agents", "staff"],
      roles: ["admin", "manager"],
      permission: "Users: View",
    },
    {
      id: "nav-settings",
      label: "Settings",
      description: "System configuration",
      icon: Settings,
      action: () => navigate("/settings"),
      group: "Navigate",
      keywords: ["config", "preferences"],
      roles: ["admin", "manager"],
      permission: "Settings: View",
    },
    // Quick Actions
    {
      id: "act-new-lead",
      label: "Add New Lead",
      description: "Create a lead inquiry",
      icon: Plus,
      action: () => navigateAndCreate("/leads"),
      group: "Quick Actions",
      keywords: ["create lead", "new lead"],
      permission: "Leads: Create",
    },
    {
      id: "act-new-customer",
      label: "Add Customer",
      description: "Register a new customer",
      icon: Plus,
      action: () => navigateAndCreate("/customers"),
      group: "Quick Actions",
      keywords: ["create customer", "new customer"],
      permission: "Customers: Create",
    },
    {
      id: "act-new-booking",
      label: "Create Booking",
      description: "New flight/package booking",
      icon: Plus,
      action: () => navigateAndCreate("/bookings"),
      group: "Quick Actions",
      keywords: ["new booking", "flight"],
      permission: "Bookings: Create",
    },
    {
      id: "act-new-quotation",
      label: "Create Quotation",
      description: "New customer quotation",
      icon: Plus,
      action: () => navigateAndCreate("/quotations"),
      group: "Quick Actions",
      keywords: ["quotation", "quote", "quotation management"],
      permission: "Quotations: Create",
    },

    {
      id: "act-new-supplier",
      label: "Add Supplier",
      description: "Register a B2B partner",
      icon: Plus,
      action: () => navigateAndCreate("/suppliers"),
      group: "Quick Actions",
      keywords: ["new supplier", "vendor"],
      permission: "Suppliers: Create",
    },
    {
      id: "act-new-expense",
      label: "Log Expense",
      description: "Record an operational cost",
      icon: Plus,
      action: () => navigateAndCreate("/expenses"),
      group: "Quick Actions",
      keywords: ["add expense", "new expense"],
      roles: ["admin", "manager"],
      permission: "Expenses: Create",
    },
  ].filter((item) => {
    if (
      item.roles &&
      !isAdmin &&
      !item.roles.some((r) => r.toLowerCase() === role.toLowerCase())
    ) {
      return false;
    }
    if (item.permission && !hasPermission(item.permission)) {
      return false;
    }
    return true;
  });

  const filtered = searchQuery.trim()
    ? allItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.includes(q))
      );
    })
    : allItems;

  // Group filtered items
  const groups = filtered.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(groups).flat();

  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
      if (!isOpen) return;
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearchQuery("");
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && flatFiltered[selectedIndex]) {
        flatFiltered[selectedIndex].action();
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, [isOpen, flatFiltered, selectedIndex]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(
      `[data-index="${selectedIndex}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  let globalIndex = 0;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-full max-w-[320px] items-center gap-2 rounded-lg border-tf-border bg-tf-surface-2 px-3 text-sm font-normal text-tf-text-muted hover:bg-tf-surface hover:border-[var(--tf-border-strong)] normal-case tracking-normal justify-start"
        aria-label="Open command palette"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left truncate">Search or jump to...</span>
        <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-[var(--tf-border-strong)] bg-tf-surface px-1.5 font-mono text-[10px] font-medium text-tf-text-secondary">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 pt-[8vh] backdrop-blur-sm"
          onClick={() => {
            setIsOpen(false);
            setSearchQuery("");
          }}
        >
          <div
            className="w-full max-w-[620px] rounded-xl bg-tf-surface shadow-2xl border border-tf-border overflow-hidden mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center border-b border-tf-border px-4 py-3">
              <Search className="h-5 w-5 text-tf-text-muted mr-3 shrink-0" />
              <Input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search or type a command..."
                className="flex-1 border-0 bg-transparent shadow-none text-tf-text-primary placeholder:text-tf-text-muted text-sm focus-visible:ring-0"
                aria-label="Command search"
              />
              <kbd
                className="ml-2 inline-flex h-6 items-center gap-1 rounded bg-tf-surface-2 px-2 font-mono text-[10px] font-medium text-tf-text-muted cursor-pointer hover:bg-tf-border"
                onClick={() => {
                  setIsOpen(false);
                  setSearchQuery("");
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[420px] overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-tf-text-muted">
                  No results for &quot;{searchQuery}&quot;
                </div>
              ) : (
                Object.entries(groups).map(([groupName, items]) => (
                  <div key={groupName} className="mb-3">
                    <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-tf-text-muted">
                      {groupName}
                    </div>
                    {items.map((item) => {
                      const idx = globalIndex++;
                      const isSelected = idx === selectedIndex;
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.id}
                          data-index={idx}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors group ${isSelected
                              ? "bg-tf-primary text-white"
                              : "text-tf-text-primary hover:bg-tf-surface-2"
                            }`}
                        >
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${isSelected
                                ? "bg-white/20 text-white"
                                : "bg-tf-surface-2 text-tf-text-secondary"
                              }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm font-medium truncate ${isSelected ? "text-white" : "text-tf-text-primary"}`}
                            >
                              {item.label}
                            </div>
                            {item.description && (
                              <div
                                className={`text-xs truncate ${isSelected ? "text-white/70" : "text-tf-text-muted"}`}
                              >
                                {item.description}
                              </div>
                            )}
                          </div>
                          <ArrowRight
                            className={`h-4 w-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${isSelected ? "text-white opacity-100" : "text-tf-text-muted"}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-tf-border px-4 py-2 flex items-center gap-4 text-xs text-tf-text-muted">
              <span className="flex items-center gap-1">
                <kbd className="bg-tf-surface-2 px-1.5 py-0.5 rounded text-[10px]">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-tf-surface-2 px-1.5 py-0.5 rounded text-[10px]">
                  ↵
                </kbd>{" "}
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="bg-tf-surface-2 px-1.5 py-0.5 rounded text-[10px]">
                  ESC
                </kbd>{" "}
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
