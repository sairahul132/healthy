"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as sharingApi from "@/lib/api/sharing";
import type { CreateSharingSessionInput } from "@/lib/api/sharing";

export const sharingKeys = {
  sessions: ["sharing", "sessions"] as const,
  requests: (pendingOnly: boolean) => ["sharing", "requests", pendingOnly] as const,
};

export function useSharingSessions() {
  return useQuery({
    queryKey: sharingKeys.sessions,
    queryFn: () => sharingApi.listSharingSessions(),
  });
}

export function useCreateSharingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSharingSessionInput) => sharingApi.createSharingSession(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharingKeys.sessions });
    },
  });
}

export function useRevokeSharingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) => sharingApi.revokeSharingSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sharingKeys.sessions });
    },
  });
}

export function useAccessRequests(pendingOnly = true) {
  return useQuery({
    queryKey: sharingKeys.requests(pendingOnly),
    queryFn: () => sharingApi.listAccessRequests(pendingOnly),
  });
}

function useDecideAccessRequest(decide: (requestId: string) => Promise<void>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: decide,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sharing", "requests"] });
      queryClient.invalidateQueries({ queryKey: sharingKeys.sessions });
    },
  });
}

export function useApproveAccessRequest() {
  return useDecideAccessRequest(sharingApi.approveAccessRequest);
}

export function useDeclineAccessRequest() {
  return useDecideAccessRequest(sharingApi.declineAccessRequest);
}
