"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

function formatPathSegment(segment: string): string {
  // Check if it's an ID like bk-1, cust-1, LD-2024
  if (segment.includes("-") && /\d/.test(segment)) {
    return `Ref ${segment.toUpperCase()}`;
  }
  return segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
}

export function Breadcrumbs() {
  const pathname = usePathname();
  const paths = pathname.split("/").filter(Boolean);

  if (paths.length === 0) return null;

  return (
    <nav className="flex items-center text-[13px] text-tf-text-muted font-medium">
      <Link
        href="/dashboard"
        prefetch={false}
        className="hover:text-tf-primary transition-colors"
      >
        Dashboard
      </Link>

      {paths.map((path, index) => {
        // Skip dashboard if it's the only one
        if (path === "dashboard" && index === 0) return null;

        const href = `/${paths.slice(0, index + 1).join("/")}`;
        const isLast = index === paths.length - 1;
        const formattedPath = formatPathSegment(path);

        return (
          <div key={path} className="flex items-center">
            <ChevronRight className="mx-1 h-4 w-4" />
            {isLast ? (
              <span className="text-tf-text-primary">{formattedPath}</span>
            ) : (
              <Link
                href={href}
                prefetch={false}
                className="hover:text-tf-primary transition-colors"
              >
                {formattedPath}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
