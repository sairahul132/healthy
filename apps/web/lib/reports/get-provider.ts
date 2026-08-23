import { httpReportsProvider } from "./http-reports-provider";
import type { ReportsProvider } from "./provider";
// import { MockReportsProvider } from "@/lib/mock/mock-reports-provider";

/**
 * Single seam between UI code and report storage/processing. apps/api now
 * has real /reports, /reports/upload, and /timeline routes, so this
 * defaults to the HTTP-backed provider — same pattern as
 * lib/auth/get-provider.ts. `MockReportsProvider` still exists for offline
 * frontend-only preview; swap the import above if you need that.
 */
export function getReportsProvider(): ReportsProvider {
  return httpReportsProvider;
}
