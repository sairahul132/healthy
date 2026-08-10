import type { HealthCategoryId } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";

/**
 * Honest "what Healthy actually knows" summary (docs/SPEC.md §147) — this
 * exists specifically to stop users from assuming the vault reflects their
 * whole health history just because a dashboard exists.
 */
export function DataCompleteness({ knownCategories }: { knownCategories: HealthCategoryId[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-faint)]">
        Healthy knows about
      </p>
      {knownCategories.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {knownCategories.map((id) => {
            const category = getCategory(id);
            return (
              <span
                key={id}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--status-green-tint)] px-2 py-0.5 text-xs text-[var(--status-green)]"
              >
                <span aria-hidden="true">{category.icon}</span>
                {category.label}
              </span>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Nothing yet — upload a report to get started.
        </p>
      )}
      <p className="mt-3 text-xs text-[var(--color-text-faint)]">
        This reflects only what you&apos;ve uploaded. Healthy doesn&apos;t know about medical
        history you haven&apos;t added.
      </p>
    </div>
  );
}
