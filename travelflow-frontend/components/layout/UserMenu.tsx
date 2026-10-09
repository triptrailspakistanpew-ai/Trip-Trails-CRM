"use client";

import { User, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { showSuccess } from "@/lib/toast-utils";
import { useAuthStore } from "@/store/auth.store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function UserMenu() {
  const router = useRouter();
  const { logout, user } = useAuthStore();

  const handleLogout = async () => {
    showSuccess("Signing out...");
    await logout();
    window.location.href = "/login?logout=true";
  };

  const displayName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : "Ahmad Khan";
  const displayEmail = user?.email ?? "ahmad@prestigetravel.com";
  const initials = user
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
    : displayName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-full p-1 hover:bg-tf-surface-2 normal-case tracking-normal"
          aria-label="User menu"
        >
          <div className="h-8 w-8 rounded-full bg-tf-primary-soft text-tf-primary flex items-center justify-center border border-tf-border">
            <span className="text-sm font-semibold">{initials}</span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 border-tf-border bg-tf-surface"
      >
        <DropdownMenuLabel className="normal-case tracking-normal">
          <p className="text-sm font-medium text-tf-text-primary">
            {displayName}
          </p>
          <p className="text-xs font-normal text-tf-text-muted mt-0.5 truncate">
            {displayEmail}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="normal-case tracking-normal">
          <Link href="/settings" prefetch={false} className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Account Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={handleLogout}
          className="normal-case tracking-normal"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
