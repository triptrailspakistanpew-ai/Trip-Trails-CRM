"use client";

import { useTheme } from "next-themes";
import { useSidebarStore } from "@/store/sidebar.store";
import { SidebarNav } from "./SidebarNav";
import appData from "@/app.json";
import {
  Plane,
  PanelLeftClose,
  PanelRightClose,
  Building,
  ChevronDown,
  LogOut,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { showSuccess } from "@/lib/toast-utils";
import { useAuthStore } from "@/store/auth.store";
import { useBranchStore } from "@/store/branch.store";
import { IconButton } from "@/components/shared/IconButton";
import { Button } from "@/components/ui/button";
import { ApiClient as API } from "@/lib/api-client";
import type { Branch } from "@/types";

export function Sidebar() {
  const { resolvedTheme } = useTheme();
  const { isOpen, toggle } = useSidebarStore();
  const [isAgencyOpen, setIsAgencyOpen] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const router = useRouter();
  const { logout, user } = useAuthStore();
  const { activeBranchId, setActiveBranchId, setActiveBranch } = useBranchStore();

  const userRole = user?.role?.toLowerCase();
  const isSuperAdmin = userRole === "admin" || userRole === "owner";

  useEffect(() => {
    if (isSuperAdmin) {
      API.getBranches().then(setBranches).catch(console.error);
    }
  }, [isSuperAdmin]);

  const logo =
    resolvedTheme === "dark" ? appData["logo-light"] : appData["logo-dark"];

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Ahmad Khan";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const handleLogout = async () => {
    showSuccess("Signing out...");
    await logout();
    window.location.href = "/login?logout=true";
  };

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-tf-border bg-tf-sidebar-bg transition-all duration-300 ease-out ${isOpen
        ? "w-[var(--tf-sidebar-width)]"
        : "w-[var(--tf-sidebar-collapsed-width)]"
        }`}
    >
      {/* Logo Area */}
      <div className="flex h-[var(--tf-topbar-height)] shrink-0 items-center justify-between border-b border-tf-border px-4">
        <Link
          href="/dashboard"
          className={`flex items-center gap-2 ${!isOpen && "justify-center w-full"}`}
        >
          {logo ? (
            <img src={logo} alt="Logo" className="w-20 object-contain" />
          ) : (
            <>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-tf-primary text-white">
                <Plane className="h-4 w-4" />
              </div>
              {isOpen && (
                <span className="tf-h4 text-tf-text-primary">
                  {appData.platformName}
                </span>
              )}
            </>
          )}
        </Link>
        {isOpen && (
          <IconButton
            onClick={toggle}
            size="icon-xs"
            aria-label="Collapse Sidebar"
          >
            <PanelLeftClose className="h-5 w-5" />
          </IconButton>
        )}
      </div>

      {!isOpen && (
        <div className="flex justify-center p-2 border-b border-tf-border">
          <IconButton onClick={toggle} aria-label="Expand Sidebar">
            <PanelRightClose className="h-5 w-5" />
          </IconButton>
        </div>
      )}

      {/* Agency Switcher */}
      {isSuperAdmin && (
        <div className={`border-b border-tf-border ${isOpen ? "p-4" : "p-2"}`}>
          <Button
            variant="outline"
            onClick={() => setIsAgencyOpen(!isAgencyOpen)}
            className={`flex h-auto w-full items-center gap-3 rounded-lg border border-tf-border bg-tf-surface p-2 hover:bg-tf-surface-2 normal-case tracking-normal ${!isOpen && "justify-center"}`}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-tf-primary-soft text-tf-primary">
              <Building className="h-4 w-4" />
            </div>
            {isOpen && (
              <>
                <div className="flex flex-1 flex-col items-start overflow-hidden text-left">
                  <span className="tf-body-sm w-full truncate font-semibold text-tf-text-primary">
                    {activeBranchId === "all"
                      ? (user?.agency?.name || "TravelFlow Agency")
                      : (branches.find(b => b.id === activeBranchId)?.name || "TravelFlow Agency")}
                  </span>
                  <span className="tf-caption w-full truncate text-tf-text-muted">
                    {activeBranchId === "all"
                      ? "All Branches"
                      : (branches.find(b => b.id === activeBranchId)?.city || "Branch")}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-tf-text-muted shrink-0 transition-transform ${isAgencyOpen ? "rotate-180" : ""}`}
                />
              </>
            )}
          </Button>

          {isOpen && isAgencyOpen && (
            <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {branches.map(branch => (
                <div
                  key={branch.id}
                  onClick={() => {
                    setActiveBranch(branch.id, branch.currency || "PKR");
                    window.location.reload();
                  }}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm text-tf-text-secondary hover:bg-tf-surface-2 cursor-pointer transition-colors ${activeBranchId === branch.id ? "bg-tf-surface-2" : ""}`}
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-tf-surface border border-tf-border text-xs font-medium text-tf-text-primary">
                    {branch.name.charAt(0)}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate font-medium leading-tight">{branch.name}</span>
                    <span className="truncate text-[10px] text-tf-text-muted">{branch.city}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4">
        <SidebarNav isOpen={isOpen} />
      </div>

      {/* User Profile */}
      <div className="border-t border-tf-border p-4">
        <div
          className={`flex items-center gap-3 ${!isOpen && "justify-center"}`}
        >
          <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-tf-surface-2 border border-tf-border flex items-center justify-center font-semibold text-tf-text-secondary">
            {initials}
          </div>
          {isOpen && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="tf-body-sm truncate font-semibold text-tf-text-primary">
                {displayName}
              </span>
              <span className="tf-caption truncate text-tf-text-muted">
                Agency Owner
              </span>
            </div>
          )}
          {isOpen && (
            <IconButton
              onClick={handleLogout}
              tone="danger"
              aria-label="Sign Out"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </IconButton>
          )}
        </div>
      </div>
    </aside>
  );
}
