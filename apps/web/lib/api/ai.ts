import { apiFetch } from "./client";
import type { AiConversation, AiMessage, DoctorSummary, ExplainResult, ReportComparison } from "./types";

export function explainResult(resultId: string): Promise<ExplainResult> {
  return apiFetch<ExplainResult>(`/ai/results/${resultId}/explain`, { method: "POST" });
}

export function compareReport(
  reportId: string,
  compareToReportId?: string,
): Promise<ReportComparison> {
  return apiFetch<ReportComparison>(`/ai/reports/${reportId}/compare`, {
    method: "POST",
    body: compareToReportId ? { compareToReportId } : {},
  });
}

export function generateDoctorSummary(): Promise<DoctorSummary> {
  return apiFetch<DoctorSummary>("/ai/doctor-summary", { method: "POST" });
}

export function createConversation(): Promise<AiConversation> {
  return apiFetch<AiConversation>("/ai/conversations", { method: "POST" });
}

export function listConversations(): Promise<AiConversation[]> {
  return apiFetch<AiConversation[]>("/ai/conversations");
}

export function listMessages(conversationId: string): Promise<AiMessage[]> {
  return apiFetch<AiMessage[]>(`/ai/conversations/${conversationId}/messages`);
}

export function sendMessage(conversationId: string, content: string): Promise<AiMessage> {
  return apiFetch<AiMessage>(`/ai/conversations/${conversationId}/messages`, {
    method: "POST",
    body: { content },
  });
}
