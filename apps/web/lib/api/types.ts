/**
 * Shared API contract types.
 *
 * These mirror the REST contract described in docs/ARCHITECTURE.md and the
 * Healthify master spec. They are hand-written for now; once apps/api ships
 * its OpenAPI schema, this file should be replaced by a generated client
 * (packages/types in the monorepo plan) so frontend and backend can't drift.
 */

export type Identifier = string; // phone (E.164) or email

export interface User {
  healthifyId: string; // e.g. "HFY-7K29-AX84" — never the internal UUID
  name: string | null;
  dateOfBirth: string | null; // ISO date
  sex: "male" | "female" | "other" | "unspecified" | null;
  phone: string | null;
  email: string | null;
  bloodGroup: string | null;
  emergencyContact: EmergencyContact | null;
  allergies: string[];
  currentMedications: string[];
  preferredLanguage: string;
  createdAt: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface Session {
  user: User;
}

export type HealthCategoryId =
  | "blood"
  | "heart"
  | "liver"
  | "kidney"
  | "thyroid"
  | "diabetes"
  | "vitamins"
  | "urine"
  | "hormones"
  | "infection"
  | "allergy"
  | "autoimmune"
  | "imaging"
  | "tumor_markers"
  | "other";

export interface HealthCategory {
  id: HealthCategoryId;
  label: string;
  icon: string; // accessible text glyph/emoji paired with the label, never color alone
}

/**
 * Deterministic clinical status. Computed by lib/health/status-engine.ts
 * from a numeric value and a reference range — never by an LLM.
 * See docs/SPEC.md §29/§30.
 */
export type ClinicalDirection =
  | "LOW"
  | "NORMAL"
  | "HIGH"
  | "CRITICAL_LOW"
  | "CRITICAL_HIGH"
  | "UNKNOWN";

export type ClinicalSeverity = "green" | "yellow" | "orange" | "red";

export interface ClinicalStatus {
  direction: ClinicalDirection;
  severity: ClinicalSeverity;
  label: string;
}

export type ReportProcessingStatus =
  | "UPLOADED"
  | "SCANNING"
  | "PROCESSING"
  | "EXTRACTING"
  | "ANALYZING"
  | "COMPLETED"
  | "FAILED";

export interface LabReport {
  id: string;
  fileName: string;
  status: ReportProcessingStatus;
  failureReason: string | null;
  collectionDate: string | null; // ISO date, from report
  labName: string | null;
  categories: HealthCategoryId[];
  uploadedAt: string;
  resultCount: number;
  abnormalCount: number;
}

export interface LabResult {
  id: string;
  reportId: string;
  testName: string;
  canonicalTestName: string;
  value: number;
  unit: string;
  referenceLow: number | null;
  referenceHigh: number | null;
  referenceText: string;
  category: HealthCategoryId;
  status: ClinicalStatus;
  previousValue: number | null;
  previousCollectionDate: string | null;
  extractionConfidence: number; // 0-1
  collectionDate: string | null;
}

export type TimelineEventType =
  | "LAB_REPORT"
  | "DOCTOR_VISIT"
  | "PRESCRIPTION"
  | "MEDICINE"
  | "DIAGNOSIS"
  | "PROCEDURE"
  | "IMAGING"
  | "VACCINATION"
  | "DOCUMENT";

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  title: string;
  description: string | null;
  occurredAt: string; // ISO date
  relatedReportId: string | null;
}

// --- Sharing (docs/SPEC.md §42-57) — real backend, no mock provider ---

export type SharingSessionStatus = "active" | "expired" | "revoked";
export type AccessRequestStatus = "pending" | "approved" | "declined";

export interface SharingSession {
  id: string;
  /** Only populated once, on the create-session response — the raw token
   * can't be recovered from the backend afterward (only its hash is
   * stored), so the list view always shows "". */
  shareUrl: string;
  recipientIdentifierMasked: string;
  categoryIds: HealthCategoryId[];
  status: SharingSessionStatus;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
}

export interface AccessRequest {
  id: string;
  sessionId: string;
  category: HealthCategoryId;
  reason: string;
  requestedDurationHours: number;
  recipientIdentifierMasked: string;
  status: AccessRequestStatus;
  createdAt: string;
  decidedAt: string | null;
}

export interface SharePreview {
  healthifyId: string | null;
  status: SharingSessionStatus;
}

export interface ShareAccessToken {
  accessToken: string;
  expiresInMinutes: number;
}

export interface ShareCategoryStatus {
  id: HealthCategoryId;
  authorized: boolean;
}

export interface ShareCategories {
  healthifyId: string;
  categories: ShareCategoryStatus[];
  expiresAt: string;
  dataNote: string;
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export class ApiError extends Error {
  code: string;
  status: number;
  requestId: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.error.message);
    this.name = "ApiError";
    this.code = body.error.code;
    this.status = status;
    this.requestId = body.error.requestId;
  }
}
