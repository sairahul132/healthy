import { apiFetch, apiUpload } from "./client";
import type {
  HealthCategory,
  HealthCategoryDetail,
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

export function listTimelineEvents(): Promise<TimelineEvent[]> {
  return apiFetch<TimelineEvent[]>("/timeline");
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

export function search(query: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(query)}`);
}
