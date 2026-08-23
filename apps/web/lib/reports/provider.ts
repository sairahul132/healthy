import type { LabReport, LabResult, TimelineEvent } from "@/lib/api/types";

/**
 * Provider interface for report storage/processing (docs/SPEC.md §137/§138
 * provider-abstraction pattern). `uploadReport` takes the real browser
 * `File` (not just its metadata) since apps/api actually reads the bytes
 * now — swapping providers should require no changes outside
 * lib/reports/get-provider.ts.
 */
export interface ReportsProvider {
  listReports(): Promise<LabReport[]>;
  getReport(id: string): Promise<LabReport | null>;
  getResults(reportId: string): Promise<LabResult[]>;
  uploadReport(file: File): Promise<LabReport>;
  listTimelineEvents(): Promise<TimelineEvent[]>;
}

export class ReportValidationError extends Error {}
