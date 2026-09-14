"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccessRequests } from "@/lib/sharing/hooks";
import { cn } from "@/lib/utils/cn";
import { Icon } from "./icons";
import { NAV_ITEMS } from "./nav-items";

export function Sidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const { data: pendingRequests } = useAccessRequests(true);
  const pendingCount = pendingRequests?.length ?? 0;

  return (
    <nav aria-label="Primary" className={cn("flex flex-col gap-0.5 p-3", className)}>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

        if (!item.enabled) {
          return (
            <span
              key={item.href}
              aria-disabled="true"
              className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm text-[var(--color-brand-foreground)]/40"
            >
              <Icon name={item.icon} />
              {item.label}
              <span className="ml-auto rounded-full bg-[var(--color-brand-foreground)]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent-bright)]">
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
              "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-[var(--color-brand-foreground)]/12 text-[var(--color-brand-foreground)]"
                : "text-[var(--color-brand-foreground)]/60 hover:bg-[var(--color-brand-foreground)]/8 hover:text-[var(--color-brand-foreground)]/90",
            )}
          >
            {isActive ? (
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-[var(--color-accent-bright)]"
              />
            ) : null}
            <Icon
              name={item.icon}
              className={cn(
                "transition-colors",
                isActive ? "text-[var(--color-brand-foreground)]" : "text-[var(--color-brand-foreground)]/45 group-hover:text-[var(--color-brand-foreground)]/80",
              )}
            />
            {item.label}
            {item.href === "/share" && pendingCount > 0 ? (
              <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-danger)] px-1.5 text-[10px] font-semibold text-white">
                {pendingCount}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
