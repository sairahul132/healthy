import Link from "next/link";
import { Icon, type IconName } from "@/components/layout/icons";

const ACTIONS: Array<{ label: string; href: string; icon: IconName; enabled: boolean }> = [
  { label: "Upload Report", href: "/reports/upload", icon: "reports", enabled: true },
  { label: "View Timeline", href: "/timeline", icon: "timeline", enabled: true },
  { label: "Share Health", href: "/share", icon: "share", enabled: true },
  { label: "Ask Healthify", href: "/ask", icon: "assistant", enabled: false },
];

export function QuickActions() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ACTIONS.map((action) =>
        action.enabled ? (
          <Link
            key={action.href}
            href={action.href}
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-5 text-center text-xs font-medium text-[var(--color-text)] shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:border-[var(--color-brand)]/40 hover:shadow-md"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-brand-tint)] text-[var(--color-brand)]">
              <Icon name={action.icon} />
            </span>
            {action.label}
          </Link>
        ) : (
          <span
            key={action.href}
            aria-disabled="true"
            className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-[var(--color-border-strong)] px-3 py-5 text-center text-xs font-medium text-[var(--color-text-faint)]"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-surface-muted)]">
              <Icon name={action.icon} />
            </span>
            {action.label}
            <span className="rounded-full bg-[var(--color-accent-tint)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--color-accent)]">
              Soon
            </span>
          </span>
        ),
      )}
    </div>
  );
}
