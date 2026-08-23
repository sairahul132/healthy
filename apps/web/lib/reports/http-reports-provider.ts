import * as reportsApi from "@/lib/api/reports";
import type { ReportsProvider } from "./provider";

/** Real implementation — calls apps/api's /reports, /reports/upload, and
 * /timeline endpoints (docs/SPEC.md §137/§138 provider-abstraction
 * pattern). Mirrors lib/auth/http-auth-provider.ts's shape. */
export const httpReportsProvider: ReportsProvider = {
  listReports: reportsApi.listReports,
  getReport: reportsApi.getReport,
  getResults: reportsApi.getResults,
  uploadReport: reportsApi.uploadReport,
  listTimelineEvents: reportsApi.listTimelineEvents,
};
