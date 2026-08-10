import type { LabReport, LabResult, TimelineEvent } from "@/lib/api/types";

export interface UploadInput {
  name: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Provider interface for report storage/processing (docs/SPEC.md §137/§138
 * provider-abstraction pattern). Swapping the mock implementation for one
 * backed by apps/api's future /reports endpoints should require no changes
 * outside lib/reports/get-provider.ts.
 */
export interface ReportsProvider {
  listReports(): Promise<LabReport[]>;
  getReport(id: string): Promise<LabReport | null>;
  getResults(reportId: string): Promise<LabResult[]>;
  uploadReport(file: UploadInput): Promise<LabReport>;
  listTimelineEvents(): Promise<TimelineEvent[]>;
}

export class ReportValidationError extends Error {}
