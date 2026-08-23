"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReportsProvider } from "./get-provider";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

export const reportsKeys = {
  list: ["reports"] as const,
  detail: (id: string) => ["reports", id] as const,
  results: (id: string) => ["reports", id, "results"] as const,
  timeline: ["timeline"] as const,
};

export function useReports() {
  return useQuery({
    queryKey: reportsKeys.list,
    queryFn: () => getReportsProvider().listReports(),
    refetchInterval: (query) => {
      const reports = query.state.data;
      const hasInFlight = reports?.some((r) => !TERMINAL_STATUSES.has(r.status));
      return hasInFlight ? 700 : false;
    },
  });
}

export function useReport(reportId: string) {
  return useQuery({
    queryKey: reportsKeys.detail(reportId),
    queryFn: () => getReportsProvider().getReport(reportId),
    refetchInterval: (query) =>
      query.state.data && !TERMINAL_STATUSES.has(query.state.data.status) ? 700 : false,
  });
}

export function useReportResults(reportId: string, enabled: boolean) {
  return useQuery({
    queryKey: reportsKeys.results(reportId),
    queryFn: () => getReportsProvider().getResults(reportId),
    enabled,
  });
}

export function useTimelineEvents() {
  return useQuery({
    queryKey: reportsKeys.timeline,
    queryFn: () => getReportsProvider().listTimelineEvents(),
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => getReportsProvider().uploadReport(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.list });
      queryClient.invalidateQueries({ queryKey: reportsKeys.timeline });
    },
  });
}
