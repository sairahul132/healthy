import { describe, expect, it } from "vitest";
import { computeClinicalStatus, computeTrend } from "./status-engine";

describe("computeClinicalStatus", () => {
  it("returns NORMAL when the value is inside the reference range", () => {
    const result = computeClinicalStatus(14.5, { low: 13, high: 17 });
    expect(result.direction).toBe("NORMAL");
    expect(result.severity).toBe("green");
  });

  it("returns NORMAL at the exact boundaries", () => {
    expect(computeClinicalStatus(13, { low: 13, high: 17 }).direction).toBe("NORMAL");
    expect(computeClinicalStatus(17, { low: 13, high: 17 }).direction).toBe("NORMAL");
  });

  it("flags a slightly low value as LOW, not HIGH — direction is not just 'abnormal'", () => {
    const result = computeClinicalStatus(12.4, { low: 13, high: 17 });
    expect(result.direction).toBe("LOW");
    expect(result.severity).not.toBe("green");
  });

  it("flags a value above range as HIGH, never as LOW", () => {
    // Regression guard: some tests are abnormal when high (§29) — a naive
    // "outside range = low" rule would mislabel this.
    const result = computeClinicalStatus(220, { low: 0, high: 200 });
    expect(result.direction).toBe("HIGH");
  });

  it("escalates to CRITICAL_LOW far below range", () => {
    const result = computeClinicalStatus(2, { low: 13, high: 17 });
    expect(result.direction).toBe("CRITICAL_LOW");
    expect(result.severity).toBe("red");
  });

  it("escalates to CRITICAL_HIGH far above range", () => {
    const result = computeClinicalStatus(40, { low: 13, high: 17 });
    expect(result.direction).toBe("CRITICAL_HIGH");
    expect(result.severity).toBe("red");
  });

  it("returns UNKNOWN when no reference range is available, rather than guessing", () => {
    const result = computeClinicalStatus(100, { low: null, high: null });
    expect(result.direction).toBe("UNKNOWN");
  });

  it("returns UNKNOWN for a malformed range (low > high) instead of a false result", () => {
    const result = computeClinicalStatus(100, { low: 50, high: 10 });
    expect(result.direction).toBe("UNKNOWN");
  });

  it("handles a one-sided range (high only, e.g. LDL cholesterol)", () => {
    expect(computeClinicalStatus(90, { low: null, high: 100 }).direction).toBe("NORMAL");
    expect(computeClinicalStatus(180, { low: null, high: 100 }).direction).toBe("CRITICAL_HIGH");
  });
});

describe("computeTrend", () => {
  it("returns null when there is no previous value to compare against", () => {
    expect(computeTrend(10, null)).toBeNull();
  });

  it("computes absolute and percent change with direction", () => {
    const trend = computeTrend(118, 102);
    expect(trend).not.toBeNull();
    expect(trend!.absoluteChange).toBe(16);
    expect(trend!.direction).toBe("up");
    expect(trend!.percentChange).toBeCloseTo(15.686, 2);
  });

  it("does not divide by zero when the previous value was zero", () => {
    const trend = computeTrend(5, 0);
    expect(trend!.percentChange).toBeNull();
    expect(trend!.absoluteChange).toBe(5);
  });
});
