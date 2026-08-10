import type { HealthCategoryId } from "@/lib/api/types";
import { HEALTH_CATEGORIES } from "@/lib/health/categories";
import { cn } from "@/lib/utils/cn";

export function CategoryPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: HealthCategoryId[];
  onChange: (next: HealthCategoryId[]) => void;
  disabled?: boolean;
}) {
  function toggle(id: HealthCategoryId) {
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {Object.values(HEALTH_CATEGORIES).map((category) => {
        const isSelected = selected.includes(category.id);
        return (
          <button
            key={category.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(category.id)}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 disabled:opacity-50",
              isSelected
                ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
            )}
          >
            <span aria-hidden="true">{category.icon}</span>
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
