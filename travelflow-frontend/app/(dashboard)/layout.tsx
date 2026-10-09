"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { useSidebarStore } from "@/store/sidebar.store";
import { useAuthStore } from "@/store/auth.store";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { WifiOff, Users, Target, FileText, Calendar, ArrowRight, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { usePermissions } from "@/hooks/use-permissions";

// Pages that are restricted by role
const ROLE_RESTRICTIONS: Record<string, string[]> = {
  "/dashboard": ["owner", "admin", "manager"],
  "/settings": ["owner", "admin", "manager"],
  "/users": ["owner", "admin", "manager"],
  "/roles": ["owner", "admin", "manager"],
  "/reports": ["owner", "admin", "manager"],
  "/expenses": ["owner", "admin", "manager"],
  "/branches": ["owner", "admin", "manager"],
  "/quotations": ["owner", "admin", "manager"],
};

// Pages that require specific granular permissions
const ROUTE_PERMISSIONS: Record<string, string | string[]> = {
  "/branches": ["Branches: View", "Branches: Access All"],
  "/settings": "Settings: View",
  "/users": "Users: View",
  "/roles": "Roles: View",
  "/reports": "Reports: View",
  "/expenses": "Expenses: View",
  "/quotations": "Quotations: View",
  "/customers": "Customers: View",
  "/leads": "Leads: View",
  "/bookings": "Bookings: View",
  "/invoices": "Invoices: View",
  "/credit-notes": "Invoices: View",
  "/suppliers": "Suppliers: View",
  "/receipts": "Accounting: AR",
  "/accounting": [
    "Accounting: Journal",
    "Accounting: Ledger",
    "Accounting: AR",
    "Accounting: AP",
    "Accounting: Chart of Accounts",
  ],
};

function getRequiredRoles(path: string): string[] | null {
  for (const [route, roles] of Object.entries(ROLE_RESTRICTIONS)) {
    if (path === route || path.startsWith(route + "/")) {
      return roles;
    }
  }
  return null;
}

function getRequiredPermission(path: string): string | string[] | null {
  for (const [route, perm] of Object.entries(ROUTE_PERMISSIONS)) {
    if (path === route || path.startsWith(route + "/")) {
      return perm;
    }
  }
  return null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebarStore();
  const { user, isAuthenticated, isLoading, serverError } = useAuthStore();
  const { hasPermission, isAdmin } = usePermissions();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (serverError) return;
    if (isLoading) return; // Wait for initial auth check

    // Redirect unauthenticated users to login
    if (!isAuthenticated || !user) {
      router.replace("/login");
      return;
    }
  }, [isAuthenticated, user, isLoading, pathname, router, serverError]);

  // Show server error state if backend is down
  if (serverError) {
    return (
      <div className="flex min-h-screen w-full flex-col items-center justify-center bg-[var(--tf-bg)] p-6">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="mx-auto w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <WifiOff className="w-10 h-10 text-red-500" />
          </div>
          
          <div className="space-y-3">
            <h2 className="text-3xl font-bold text-tf-text-primary tracking-tight">Can't connect right now</h2>
            <p className="text-tf-text-secondary text-lg">We're having trouble reaching the server. Please check your connection or try again.</p>
          </div>

          <Button 
            size="lg"
            onClick={() => window.location.reload()} 
            className="w-full bg-tf-primary text-white hover:bg-tf-primary-hover font-semibold h-12"
          >
            Try Again
          </Button>

          <div className="pt-8 border-t border-tf-border text-left">
            <h3 className="text-sm font-semibold text-tf-text-secondary uppercase tracking-wider mb-4">Quick Links</h3>
            <div className="grid grid-cols-2 gap-3">
              <Link href="/leads" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
                <Target className="w-5 h-5 text-tf-primary mr-3" />
                <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Leads</span>
              </Link>
              <Link href="/customers" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
                <Users className="w-5 h-5 text-tf-primary mr-3" />
                <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Customers</span>
              </Link>
              <Link href="/quotations" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
                <FileText className="w-5 h-5 text-tf-primary mr-3" />
                <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Quotations</span>
              </Link>
              <Link href="/bookings" prefetch={false} className="flex items-center p-3 rounded-xl border border-tf-border bg-tf-surface hover:bg-tf-surface-hover transition-colors group">
                <Calendar className="w-5 h-5 text-tf-primary mr-3" />
                <span className="text-sm font-medium text-tf-text-primary group-hover:text-tf-primary transition-colors">Bookings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't render layout until auth is confirmed, but show a spinner instead of blank page
  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--tf-bg)]">
        <div className="text-tf-text-secondary flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-tf-primary border-t-transparent"></div>
          <p>Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Check if current page is allowed for this user
  const requiredRoles = getRequiredRoles(pathname);
  const requiredPermission = getRequiredPermission(pathname);
  const userRole = user.role?.toLowerCase();

  const isRoleDenied =
    !isAdmin &&
    requiredRoles &&
    !requiredRoles.some((r) => r.toLowerCase() === userRole);

  const isPermissionDenied =
    !isAdmin &&
    requiredPermission &&
    !hasPermission(requiredPermission);

  const isDenied = isRoleDenied || isPermissionDenied;

  return (
    <div className="flex h-screen w-full bg-[var(--tf-bg)]">
      <Sidebar />
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ease-out ${
          isOpen
            ? "ml-[var(--tf-sidebar-width)]"
            : "ml-[var(--tf-sidebar-collapsed-width)]"
        }`}
      >
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-[var(--tf-bg)] p-6">
          <ErrorBoundary>
            {isDenied ? (
              <div className="flex min-h-[60vh] w-full flex-col items-center justify-center text-center p-6 bg-tf-surface rounded-xl border border-tf-border mt-4">
                <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-tf-text-primary tracking-tight">Access Denied</h2>
                <p className="text-tf-text-secondary text-sm max-w-md mt-2 mb-6">
                  You do not have permission to access this page. If you require access, please contact your agency administrator.
                </p>
                <Button
                  onClick={() => router.push(hasPermission("Leads: View") ? "/leads" : "/dashboard")}
                  className="bg-tf-primary text-white hover:bg-tf-primary-hover shadow-sm"
                >
                  Return to Accessible Page
                </Button>
              </div>
            ) : (
              children
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
