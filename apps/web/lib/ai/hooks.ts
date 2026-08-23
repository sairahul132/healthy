"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as aiApi from "@/lib/api/ai";

export const aiKeys = {
  explain: (resultId: string) => ["ai", "explain", resultId] as const,
  conversations: ["ai", "conversations"] as const,
  messages: (conversationId: string) => ["ai", "conversations", conversationId, "messages"] as const,
};

export function useExplainResult(resultId: string, enabled: boolean) {
  return useQuery({
    queryKey: aiKeys.explain(resultId),
    queryFn: () => aiApi.explainResult(resultId),
    enabled,
  });
}

export function useCompareReport() {
  return useMutation({
    mutationFn: ({ reportId, compareToReportId }: { reportId: string; compareToReportId?: string }) =>
      aiApi.compareReport(reportId, compareToReportId),
  });
}

export function useDoctorSummary() {
  return useMutation({
    mutationFn: () => aiApi.generateDoctorSummary(),
  });
}

export function useConversations() {
  return useQuery({
    queryKey: aiKeys.conversations,
    queryFn: () => aiApi.listConversations(),
  });
}

export function useConversationMessages(conversationId: string | null) {
  return useQuery({
    queryKey: aiKeys.messages(conversationId ?? "none"),
    queryFn: () => aiApi.listMessages(conversationId as string),
    enabled: conversationId !== null,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => aiApi.createConversation(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ conversationId, content }: { conversationId: string; content: string }) =>
      aiApi.sendMessage(conversationId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.messages(variables.conversationId) });
      queryClient.invalidateQueries({ queryKey: aiKeys.conversations });
    },
  });
}
