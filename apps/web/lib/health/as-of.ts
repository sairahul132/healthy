import type { TrendPoint } from "@/lib/api/types";

/** The most recent point at or before `cutoff` (an ISO date) — answers
 * "what did this test show as of that report" for the Health page's test
 * history scrubber. `points` must be sorted ascending by collection date
 * (guaranteed by ReportsService.get_trends). Falls back to the latest point
 * overall when there's no cutoff, or nothing qualifies. */
export function latestPointAsOf(points: TrendPoint[], cutoff: string | null): TrendPoint | null {
  if (points.length === 0) return null;
  if (!cutoff) return points.at(-1) ?? null;
  let result: TrendPoint | null = null;
  for (const point of points) {
    if (!point.collectionDate || point.collectionDate <= cutoff) {
      result = point;
    }
  }
  return result ?? points.at(-1) ?? null;
}
