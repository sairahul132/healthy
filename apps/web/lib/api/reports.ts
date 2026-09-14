import { apiDownload, apiFetch, apiUpload } from "./client";
import type {
  AttentionSummary,
  HealthCategory,
  HealthCategoryDetail,
  HistoryEntry,
  LabReport,
  LabResult,
  SearchResult,
  TestTrend,
  TimelineEvent,
} from "./types";

export function listReports(): Promise<LabReport[]> {
  return apiFetch<LabReport[]>("/reports");
}

export function getReport(id: string): Promise<LabReport> {
  return apiFetch<LabReport>(`/reports/${id}`);
}

export function getResults(reportId: string): Promise<LabResult[]> {
  return apiFetch<LabResult[]>(`/reports/${reportId}/results`);
}

export function uploadReport(file: File): Promise<LabReport> {
  const formData = new FormData();
  formData.append("file", file, file.name);
  return apiUpload<LabReport>("/reports/upload", formData);
}

export function downloadReportFile(id: string): Promise<{ blob: Blob; filename: string }> {
  return apiDownload(`/reports/${id}/file`);
}

export function deleteReport(id: string): Promise<void> {
  return apiFetch<void>(`/reports/${id}`, { method: "DELETE" });
}

export function listTimelineEvents(): Promise<TimelineEvent[]> {
  return apiFetch<TimelineEvent[]>("/timeline");
}

/** Fallback delete for a timeline entry with no dedicated owner — reports
 * and medicines are deleted through deleteReport/deleteMedicine instead,
 * which also remove the record the entry describes, not just the card. */
export function deleteTimelineEvent(id: string): Promise<void> {
  return apiFetch<void>(`/timeline/${id}`, { method: "DELETE" });
}

export function getHistory(): Promise<HistoryEntry[]> {
  return apiFetch<HistoryEntry[]>("/timeline/history");
}

export function clearHistory(): Promise<void> {
  return apiFetch<void>("/timeline/history", { method: "DELETE" });
}

export function listHealthCategories(): Promise<HealthCategory[]> {
  return apiFetch<HealthCategory[]>("/health/categories");
}

export function getHealthCategoryDetail(categoryId: string): Promise<HealthCategoryDetail> {
  return apiFetch<HealthCategoryDetail>(`/health/categories/${categoryId}`);
}

export function getHealthTrends(): Promise<TestTrend[]> {
  return apiFetch<TestTrend[]>("/health/trends");
}

export function getAttentionSummary(): Promise<AttentionSummary> {
  return apiFetch<AttentionSummary>("/health/attention-summary");
}

export function search(query: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
}
