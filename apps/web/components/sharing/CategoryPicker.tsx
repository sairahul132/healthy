import type { HealthCategoryId } from "@/lib/api/types";
import { useHealthCategories } from "@/lib/health/hooks";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { LoadingState } from "@/components/ui/States";
import { cn } from "@/lib/utils/cn";

/** Only offers categories the patient actually has results in — sharing a
 * category with nothing in it isn't a useful grant, and the recipient side
 * (ShareCategoriesResponse) already only lists categories with data, so
 * offering more here than that would ever show would be misleading. */
export function CategoryPicker({
  selected,
  onChange,
  disabled,
}: {
  selected: HealthCategoryId[];
  onChange: (next: HealthCategoryId[]) => void;
  disabled?: boolean;
}) {
  const { data: categories, isLoading } = useHealthCategories();

  function toggle(id: HealthCategoryId) {
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);
  }

  if (isLoading) return <LoadingState label="Loading categories…" />;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {(categories ?? []).map((category) => {
        const id = category.id;
        const isSelected = selected.includes(id);
        return (
          <button
            key={category.id}
            type="button"
            disabled={disabled}
            onClick={() => toggle(id)}
            aria-pressed={isSelected}
            className={cn(
              "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-all duration-150 disabled:opacity-50",
              isSelected
                ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text)]",
            )}
          >
            <CategoryIcon id={id} />
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
