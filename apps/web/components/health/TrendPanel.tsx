"use client";

import { useMemo, useState } from "react";
import type { TrendPoint } from "@/lib/api/types";
import { toneFor } from "@/lib/health/status-engine";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type RangeKey = "1W" | "3M" | "6M" | "1Y" | "ALL";
const RANGE_LABELS: { key: RangeKey; label: string }[] = [
  { key: "1W", label: "1W" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
  { key: "ALL", label: "All" },
];
const RANGE_DAYS: Partial<Record<RangeKey, number>> = { "1W": 7, "3M": 90, "6M": 182, "1Y": 365 };

const TONE_COLOR: Record<string, string> = {
  success: "var(--status-green)",
  warning: "var(--status-yellow)",
  critical: "var(--status-red)",
  neutral: "var(--status-neutral)",
};

const WIDTH = 900;
const HEIGHT = 190;
const PAD_X = 40;
const TOP = 30;
const BASE_Y = 130;
const LABEL_Y = 150;

/** Isolated so the impure `Date.now()` read lives in a plain utility
 * function rather than directly in a component/hook body — same pattern
 * as lib/utils/format.ts's relative-time helper. */
function cutoffMillisAgo(days: number): number {
  return Date.now() - days * 24 * 60 * 60 * 1000;
}

function evenlySpacedIndices(count: number, max: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  const n = Math.min(max, count);
  const indices = new Set<number>();
  for (let i = 0; i < n; i++) {
    indices.add(Math.round((i * (count - 1)) / (n - 1)));
  }
  return Array.from(indices).sort((a, b) => a - b);
}

/** A test's history as a chart, with a time-range filter and a hover
 * tooltip. A single result renders as one centered dot rather than an
 * empty chart — history fills in as more reports come in, it isn't an
 * error state. */
export function TrendPanel({
  testName,
  points,
  unit,
  referenceLow,
  referenceHigh,
}: {
  testName: string;
  points: TrendPoint[];
  unit: string;
  referenceLow?: number | null;
  referenceHigh?: number | null;
}) {
  const [range, setRange] = useState<RangeKey>("ALL");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const days = RANGE_DAYS[range];
    if (!days) return points;
    const cutoff = cutoffMillisAgo(days);
    return points.filter((p) => p.collectionDate && new Date(p.collectionDate).getTime() >= cutoff);
  }, [points, range]);

  const rangeText =
    referenceLow !== null && referenceLow !== undefined && referenceHigh !== null && referenceHigh !== undefined
      ? ` · reference ${referenceLow}–${referenceHigh} ${unit}`
      : "";

  return (
    <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-5 py-5 sm:rounded-[14px] sm:px-[26px] sm:py-[22px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-sm text-[var(--color-text)]">
          {testName} over time
          <span className="font-sans text-[var(--color-text-muted)]">{rangeText}</span>
        </p>
        <div className="flex gap-0.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
          {RANGE_LABELS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={cn(
                "rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors",
                range === r.key
                  ? "bg-[var(--color-brand)] text-[var(--color-brand-foreground)]"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)]",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-[var(--color-text-faint)]">No results in this range.</p>
        ) : (
          <Chart points={filtered} hoverIndex={hoverIndex} onHover={setHoverIndex} />
        )}
      </div>

      {points.length === 1 ? (
        <div className="mt-3 flex items-center gap-2 text-xs text-[var(--color-text-faint)]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Only one result so far — the trend fills in as you upload more reports with this test.
        </div>
      ) : null}
    </div>
  );
}

/** Deliberately plain — a single baseline, a line, and dots, matching
 * design/health-page-mockup.html's chart exactly (no area fill, no extra
 * grid rows). The hover tooltip is the one interactive addition the static
 * mockup couldn't show. */
function Chart({
  points,
  hoverIndex,
  onHover,
}: {
  points: TrendPoint[];
  hoverIndex: number | null;
  onHover: (index: number | null) => void;
}) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const singlePoint = points.length === 1;

  const coords = points.map((point, index) => {
    const x = singlePoint ? WIDTH / 2 : PAD_X + (index / (points.length - 1)) * (WIDTH - PAD_X * 2);
    const y = singlePoint ? TOP + (BASE_Y - TOP) / 2 : BASE_Y - ((point.value - min) / range) * (BASE_Y - TOP);
    return { x, y, point };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const labelIndices = evenlySpacedIndices(points.length, 6);
  const hovered = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      width="100%"
      height={HEIGHT}
      role="img"
      aria-label={`Trend of ${points.length} result${points.length === 1 ? "" : "s"}, from ${points[0]!.value} to ${points.at(-1)!.value}`}
      style={{ overflow: "visible" }}
    >
      <line x1={PAD_X - 20} y1={BASE_Y} x2={WIDTH - PAD_X + 20} y2={BASE_Y} stroke="var(--color-border)" strokeWidth="1" />
      {!singlePoint ? <path d={path} fill="none" stroke="var(--color-border-strong)" strokeWidth="1.6" /> : null}

      {coords.map(({ x, y, point }, index) => (
        <g key={index}>
          <circle
            cx={x}
            cy={y}
            r="12"
            fill="transparent"
            onMouseEnter={() => onHover(index)}
            onMouseLeave={() => onHover(null)}
            style={{ cursor: "pointer" }}
          />
          <circle
            cx={x}
            cy={y}
            r={hoverIndex === index ? 6 : 4.5}
            fill={TONE_COLOR[toneFor(point.status.direction)] ?? TONE_COLOR.neutral}
            stroke="var(--color-surface-muted)"
            strokeWidth={hoverIndex === index ? 2.5 : 2}
            style={{ pointerEvents: "none" }}
          />
        </g>
      ))}

      {labelIndices.map((index) => (
        <text
          key={index}
          x={coords[index]!.x}
          y={LABEL_Y}
          fontSize="10.5"
          fill="var(--color-text-faint)"
          textAnchor="middle"
          className="font-mono"
        >
          {formatDate(coords[index]!.point.collectionDate)}
        </text>
      ))}

      {hovered ? (
        <g transform={`translate(${hovered.x},${hovered.y})`} style={{ pointerEvents: "none" }}>
          <rect x={-52} y={-38} width={104} height={27} rx="7" fill="var(--color-brand)" />
          <polygon points="-5,-11 5,-11 0,-4" fill="var(--color-brand)" />
          <text
            x="0"
            y="-19"
            textAnchor="middle"
            fontSize="12"
            fontWeight="600"
            fill="var(--color-brand-foreground)"
            className="font-mono"
          >
            {hovered.point.value} {hovered.point.unit}
          </text>
        </g>
      ) : null}
    </svg>
  );
}
