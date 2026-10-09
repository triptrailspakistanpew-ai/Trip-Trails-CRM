"use client";

import { useSidebarStore } from "@/store/sidebar.store";
import { Breadcrumbs } from "./Breadcrumbs";
import { SearchCommand } from "./SearchCommand";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";
import { IconButton } from "@/components/shared/IconButton";
import { Focus, Menu, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function Topbar() {
  const { toggle, setIsOpen } = useSidebarStore();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleFocusMode = () => {
    const next = !isFocusMode;
    setIsFocusMode(next);
    // Focus mode collapses the sidebar to give maximum working space
    setIsOpen(!next);
  };

  return (
    <header className="sticky top-0 z-30 flex h-[var(--tf-topbar-height)] shrink-0 items-center gap-4 border-b border-tf-border bg-[var(--tf-header-bg)] px-4 sm:px-6 shadow-sm">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <IconButton
          onClick={toggle}
          className="lg:hidden"
          aria-label="Toggle Menu"
        >
          <Menu className="h-5 w-5" />
        </IconButton>
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
      </div>

      {/* Center */}
      <div className="flex flex-1 items-center justify-center lg:justify-start lg:pl-8 xl:justify-center">
        <SearchCommand />
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Focus Mode */}
        <IconButton
          onClick={handleFocusMode}
          className={`hidden sm:flex ${isFocusMode
              ? "bg-tf-primary-soft text-tf-primary hover:bg-tf-primary-soft hover:text-tf-primary"
              : ""
            }`}
          aria-label="Toggle Focus Mode"
          title="Focus Mode — collapses sidebar"
        >
          <Focus className="h-5 w-5" />
        </IconButton>

        <NotificationsDropdown />

        {mounted && (
          <IconButton
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </IconButton>
        )}

        <div className="ml-2">
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
