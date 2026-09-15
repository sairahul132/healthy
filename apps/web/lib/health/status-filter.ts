export type HealthStatusFilter = "all" | "ok" | "attn";

/** Maps the `?filter=` query param (e.g. from the dashboard's "Outside
 * range" list, §OutsideRangeList) to the stat-tile filter it should land
 * on. Anything unrecognized — including no param at all — defaults to
 * "all" records, which is also the Health page's default when reached any
 * other way (sidebar nav, etc). A plain (non "use client") module so both
 * the server page components and HealthMasterDetail can import it. */
export function parseHealthStatusFilter(value: string | undefined): HealthStatusFilter {
  if (value === "attention") return "attn";
  if (value === "in-range") return "ok";
  return "all";
}
