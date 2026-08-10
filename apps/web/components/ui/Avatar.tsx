import { cn } from "@/lib/utils/cn";

function initialsFrom(name: string | null): string {
  if (!name?.trim()) return "H";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function Avatar({ name, className }: { name: string | null; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] font-display text-sm font-medium text-[var(--color-brand-foreground)]",
        className,
      )}
    >
      {initialsFrom(name)}
    </span>
  );
}
