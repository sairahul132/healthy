"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReportsProvider } from "./get-provider";

const TERMINAL_STATUSES = new Set(["COMPLETED", "FAILED"]);

export const reportsKeys = {
  list: ["reports"] as const,
  detail: (id: string) => ["reports", id] as const,
  results: (id: string) => ["reports", id, "results"] as const,
  timeline: ["timeline"] as const,
  history: ["timeline", "history"] as const,
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

/** Whether the signed-in user has uploaded at least one report — the gate
 * most other pages depend on before they show real content (see
 * components/reports/RequireReports.tsx). */
export function useHasReports() {
  const { data, isLoading, isError, refetch } = useReports();
  return {
    hasReports: (data?.length ?? 0) > 0,
    isLoading,
    isError,
    refetch,
    reports: data,
  };
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

/** Fallback delete for a timeline card with no dedicated owner — see
 * lib/api/reports.ts's deleteTimelineEvent. Reports and medicines use their
 * own delete hooks instead (useDeleteReport / useDeleteMedicine), which
 * also remove the record the card describes. */
export function useDeleteTimelineEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => getReportsProvider().deleteTimelineEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.timeline });
    },
  });
}

export function useTimelineHistory() {
  return useQuery({
    queryKey: reportsKeys.history,
    queryFn: () => getReportsProvider().getHistory(),
  });
}

export function useClearHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => getReportsProvider().clearHistory(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.history });
    },
  });
}

export function useDownloadReportFile() {
  return useMutation({
    mutationFn: (reportId: string) => getReportsProvider().downloadReportFile(reportId),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    },
  });
}

export function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reportId: string) => getReportsProvider().deleteReport(reportId),
    onSuccess: (_data, reportId) => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.list });
      queryClient.invalidateQueries({ queryKey: reportsKeys.timeline });
      // A deleted report can remove the last result in a category (so it
      // should stop appearing on the Health page) and always changes
      // which tests are currently out of range — both need a refetch, not
      // just the reports list itself.
      queryClient.invalidateQueries({ queryKey: ["health"] });
      queryClient.removeQueries({ queryKey: reportsKeys.detail(reportId) });
      queryClient.removeQueries({ queryKey: reportsKeys.results(reportId) });
    },
  });
}

export function useUploadReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => getReportsProvider().uploadReport(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reportsKeys.list });
      queryClient.invalidateQueries({ queryKey: reportsKeys.timeline });
      // A new report can introduce a category the user had no results in
      // before, add new trend points, and change the attention count.
      queryClient.invalidateQueries({ queryKey: ["health"] });
    },
  });
}
