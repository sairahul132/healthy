import { apiFetch } from "./client";
import type {
  AccessRequest,
  HealthCategoryId,
  Identifier,
  ShareAccessToken,
  ShareCategories,
  SharePreview,
  SharingSession,
} from "./types";

// --- Patient side (cookie-authenticated) ---

export interface CreateSharingSessionInput {
  categoryIds: HealthCategoryId[];
  recipientIdentifier: Identifier;
  durationHours: number;
}

export function createSharingSession(input: CreateSharingSessionInput): Promise<SharingSession> {
  return apiFetch<SharingSession>("/sharing/sessions", { method: "POST", body: input });
}

export function listSharingSessions(): Promise<SharingSession[]> {
  return apiFetch<SharingSession[]>("/sharing/sessions");
}

export function revokeSharingSession(sessionId: string): Promise<void> {
  return apiFetch<void>(`/sharing/sessions/${sessionId}/revoke`, { method: "POST" });
}

export function listAccessRequests(pendingOnly = true): Promise<AccessRequest[]> {
  return apiFetch<AccessRequest[]>(`/sharing/requests?pendingOnly=${pendingOnly}`);
}

export function approveAccessRequest(requestId: string): Promise<void> {
  return apiFetch<void>(`/sharing/requests/${requestId}/approve`, { method: "POST" });
}

export function declineAccessRequest(requestId: string): Promise<void> {
  return apiFetch<void>(`/sharing/requests/${requestId}/decline`, { method: "POST" });
}

// --- Recipient side (public token + bearer share-access token) ---

export function getSharePreview(token: string): Promise<SharePreview> {
  return apiFetch<SharePreview>(`/share/${token}`);
}

export function requestShareOtp(
  token: string,
  identifier: Identifier,
): Promise<{ retryAfterSeconds: number }> {
  return apiFetch(`/share/${token}/otp/request`, { method: "POST", body: { identifier } });
}

export function verifyShareOtp(
  token: string,
  identifier: Identifier,
  code: string,
): Promise<ShareAccessToken> {
  return apiFetch<ShareAccessToken>(`/share/${token}/otp/verify`, {
    method: "POST",
    body: { identifier, code },
  });
}

function bearer(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getShareCategories(token: string, accessToken: string): Promise<ShareCategories> {
  return apiFetch<ShareCategories>(`/share/${token}/categories`, {
    headers: bearer(accessToken),
  });
}

export interface CreateAccessRequestInput {
  category: HealthCategoryId;
  reason: string;
  requestedDurationHours: number;
}

export function createAccessRequest(
  token: string,
  accessToken: string,
  input: CreateAccessRequestInput,
): Promise<{ id: string; status: string }> {
  return apiFetch(`/share/${token}/requests`, {
    method: "POST",
    body: input,
    headers: bearer(accessToken),
  });
}
