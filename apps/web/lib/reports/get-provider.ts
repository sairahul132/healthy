import { MockReportsProvider } from "@/lib/mock/mock-reports-provider";
import type { ReportsProvider } from "./provider";

/**
 * Single seam between UI code and report storage/processing. Once apps/api
 * exposes /reports, /reports/upload, etc., replace this with an
 * HttpReportsProvider that calls apiFetch — no other file should need to
 * change (docs/SPEC.md §137/§138 provider-abstraction pattern).
 */
let instance: ReportsProvider | null = null;

export function getReportsProvider(): ReportsProvider {
  if (!instance) {
    instance = new MockReportsProvider();
  }
  return instance;
}
