"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { HealthCategoryId } from "@/lib/api/types";
import { getCategory } from "@/lib/health/categories";
import { CategoryIcon } from "@/components/health/CategoryIcon";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils/cn";

export type StatusFilter = "all" | "in_range" | "attention" | "not_available";
export type SortBy = "category" | "status" | "name";

const STATUS_OPTIONS: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All results" },
  { id: "in_range", label: "In range" },
  { id: "attention", label: "Needs attention" },
  { id: "not_available", label: "Not available" },
];

const SORT_OPTIONS: Array<{ id: SortBy; label: string }> = [
  { id: "category", label: "By category" },
  { id: "status", label: "By status" },
  { id: "name", label: "By name (A–Z)" },
];

function useClickOutside(ref: RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handler(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside]);
}

const triggerClass =
  "inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2 text-sm font-medium text-[var(--color-text)] shadow-sm hover:bg-[var(--color-surface-muted)]";

const menuClass =
  "absolute z-20 mt-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-1.5 shadow-lg";

function Chevron() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function CategoryMenu({
  categories,
  counts,
  selected,
  onChange,
}: {
  categories: HealthCategoryId[];
  counts: Map<HealthCategoryId, number>;
  selected: HealthCategoryId[];
  onChange: (ids: HealthCategoryId[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const label =
    selected.length === 0
      ? "All categories"
      : selected.length === 1
        ? getCategory(selected[0]!).label
        : `${selected.length} categories`;

  function toggle(id: HealthCategoryId) {
    onChange(selected.includes(id) ? selected.filter((c) => c !== id) : [...selected, id]);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass} aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        {label}
        <Chevron />
      </button>
      {open ? (
        <div className={cn(menuClass, "w-64")}>
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-[11px] font-semibold tracking-wide text-[var(--color-text-faint)] uppercase">
              Categories
            </span>
            {selected.length > 0 ? (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs font-semibold text-[var(--color-brand)]"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="max-h-72 overflow-y-auto">
            {categories.map((id) => {
              const category = getCategory(id);
              const checked = selected.includes(id);
              return (
                <label
                  key={id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-2 text-sm hover:bg-[var(--color-surface-muted)]"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(id)}
                    className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                  />
                  <CategoryIcon id={id} className="text-[var(--color-text-muted)]" />
                  <span className="flex-1 text-[var(--color-text)]">{category.label}</span>
                  <span className="text-xs text-[var(--color-text-faint)] tabular-nums">
                    {counts.get(id) ?? 0}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatusMenu({
  value,
  onChange,
}: {
  value: StatusFilter;
  onChange: (v: StatusFilter) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const current = STATUS_OPTIONS.find((o) => o.id === value)!;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass} aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" />
        </svg>
        {value === "all" ? "Filter" : current.label}
        <Chevron />
      </button>
      {open ? (
        <div className={cn(menuClass, "w-48")}>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm",
                value === option.id
                  ? "bg-[var(--color-brand-tint)] font-medium text-[var(--color-brand)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SortMenu({ value, onChange }: { value: SortBy; onChange: (v: SortBy) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));
  const current = SORT_OPTIONS.find((o) => o.id === value)!;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className={triggerClass} aria-expanded={open}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M7 4v16M7 4l-3 3M7 4l3 3M17 20V4M17 20l-3-3M17 20l3-3" />
        </svg>
        Sort: {current.label}
        <Chevron />
      </button>
      {open ? (
        <div className={cn(menuClass, "w-44")}>
          {SORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                onChange(option.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm",
                value === option.id
                  ? "bg-[var(--color-brand-tint)] font-medium text-[var(--color-brand)]"
                  : "text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReportToolbar({
  categories,
  categoryCounts,
  selectedCategories,
  onCategoriesChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  onDownload,
  isDownloading,
  onShare,
  onDelete,
}: {
  categories: HealthCategoryId[];
  categoryCounts: Map<HealthCategoryId, number>;
  selectedCategories: HealthCategoryId[];
  onCategoriesChange: (ids: HealthCategoryId[]) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  sortBy: SortBy;
  onSortByChange: (v: SortBy) => void;
  onDownload: () => void;
  isDownloading: boolean;
  onShare: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <CategoryMenu
        categories={categories}
        counts={categoryCounts}
        selected={selectedCategories}
        onChange={onCategoriesChange}
      />
      <StatusMenu value={statusFilter} onChange={onStatusFilterChange} />
      <SortMenu value={sortBy} onChange={onSortByChange} />

      <div className="ml-auto flex items-center gap-2">
        <Button variant="secondary" size="sm" isLoading={isDownloading} onClick={onDownload}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 3v12m0 0-4-4m4 4 4-4" />
            <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
          </svg>
          Download
        </Button>
        <Button variant="secondary" size="sm" onClick={onShare}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <circle cx="18" cy="5" r="2.3" />
            <circle cx="6" cy="12" r="2.3" />
            <circle cx="18" cy="19" r="2.3" />
            <path d="m8.2 10.7 7.6-4.5M8.2 13.3l7.6 4.5" />
          </svg>
          Share
        </Button>
        <Button variant="danger" size="sm" onClick={onDelete}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 7h16M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2m3 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7" />
          </svg>
          Delete
        </Button>
      </div>
    </div>
  );
}
