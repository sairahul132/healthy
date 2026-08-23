import type { TrendPoint } from "@/lib/api/types";
import { formatDate } from "@/lib/utils/format";

const SEVERITY_COLOR: Record<string, string> = {
  green: "var(--status-green)",
  yellow: "var(--status-yellow)",
  orange: "var(--status-orange)",
  red: "var(--status-red)",
};

const WIDTH = 320;
const HEIGHT = 96;
const PADDING = 12;

/**
 * A small inline-SVG line chart — no charting library is installed
 * elsewhere in this codebase (React Query + hand-written Tailwind
 * components only), so a lightweight hand-rolled chart stays consistent
 * with that rather than introducing a new dependency for one component.
 */
export function TrendChart({ points, unit }: { points: TrendPoint[]; unit: string }) {
  if (points.length < 2) {
    return (
      <p className="text-sm text-[var(--color-text-faint)]">
        Not enough results yet to show a trend.
      </p>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = PADDING + (index / (points.length - 1)) * (WIDTH - PADDING * 2);
    const y = HEIGHT - PADDING - ((point.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, point };
  });

  const path = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Trend of ${points.length} results, from ${points[0]!.value} to ${points.at(-1)!.value} ${unit}`}
      >
        <path d={path} fill="none" stroke="var(--color-border-strong)" strokeWidth={1.5} />
        {coords.map(({ x, y, point }, index) => (
          <circle
            key={index}
            cx={x}
            cy={y}
            r={3.5}
            fill={SEVERITY_COLOR[point.status.severity] ?? "var(--status-neutral)"}
          />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-[var(--color-text-faint)]">
        <span>{formatDate(points[0]!.collectionDate)}</span>
        <span>{formatDate(points.at(-1)!.collectionDate)}</span>
      </div>
    </div>
  );
}
