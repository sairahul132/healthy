import type { ClinicalSeverity } from "@/lib/api/types";
import { cn } from "@/lib/utils/cn";

const SEVERITY_STYLE: Record<ClinicalSeverity, string> = {
  green: "bg-[var(--status-green-tint)] text-[var(--status-green)]",
  yellow: "bg-[var(--status-yellow-tint)] text-[var(--status-yellow)]",
  orange: "bg-[var(--status-orange-tint)] text-[var(--status-orange)]",
  red: "bg-[var(--status-red-tint)] text-[var(--status-red)]",
};

// Distinct glyphs per severity so meaning survives without color (§84/§122).
const SEVERITY_ICON: Record<ClinicalSeverity, string> = {
  green: "●",
  yellow: "▲",
  orange: "▲",
  red: "■",
};

export interface StatusBadgeProps {
  severity: ClinicalSeverity;
  label: string;
  className?: string;
}

export function StatusBadge({ severity, label, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        SEVERITY_STYLE[severity],
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.6rem]">
        {SEVERITY_ICON[severity]}
      </span>
      {label}
    </span>
  );
}
