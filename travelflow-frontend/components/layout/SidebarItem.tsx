"use client";

import { NavItem } from "@/constants/nav";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarItemProps {
  item: NavItem;
  isOpen: boolean;
}

export function SidebarItem({ item, isOpen }: SidebarItemProps) {
  const pathname = usePathname();
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);

  const link = (
    <Link
      href={item.href}
      prefetch={false}
      className={`group relative flex items-center ${isOpen ? "gap-3 px-3 py-2.5" : "justify-center py-2.5 px-0"} rounded-lg transition-all duration-200 ease-out hover:bg-tf-surface-2 ${isActive && isOpen
          ? "bg-[var(--tf-sidebar-active)] text-[var(--tf-sidebar-active-text)] font-semibold border-l-[3px] border-[var(--tf-sidebar-accent)] rounded-l-none pl-[9px]"
          : isActive && !isOpen
          ? "bg-[var(--tf-sidebar-active)] text-[var(--tf-sidebar-active-text)] font-semibold border-l-[3px] border-[var(--tf-sidebar-accent)] rounded-l-none"
          : "text-[var(--tf-sidebar-text)]"
        }`}
      aria-label={!isOpen ? item.title : undefined}
    >
      <item.icon
        className={`h-5 w-5 shrink-0 ${isActive && isOpen ? "text-[var(--tf-sidebar-active-text)]" : "text-[var(--tf-sidebar-text)] transition-colors"}`}
      />

      {isOpen && (
        <span className="flex-1 truncate tf-body-sm">{item.title}</span>
      )}

      {isOpen && item.badge && (
        <span className="shrink-0 rounded-full bg-tf-primary px-2 py-0.5 text-[10px] font-bold text-white leading-tight">
          {item.badge}
        </span>
      )}
    </Link>
  );

  if (isOpen) {
    return link;
  }

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          {link}
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={15} className="bg-tf-primary text-white border-tf-primary text-sm font-medium shadow-md">
          {item.title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
