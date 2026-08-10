"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icons";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Primary" className={cn("flex flex-col gap-0.5 p-3", className)}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (!item.enabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-text-faint)]"
            >
              <Icon name={item.icon} />
              {item.label}
              <span className="ml-auto rounded-full bg-[var(--color-accent-tint)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)] shadow-sm"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]",
            )}
          >
            <Icon
              name={item.icon}
              className={cn(
                "transition-colors",
                isActive ? "text-[var(--color-brand-foreground)]" : "text-[var(--color-text-faint)] group-hover:text-[var(--color-text)]",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
