/**
 * Shared API contract types.
 *
 * These mirror the REST contract described in docs/ARCHITECTURE.md and the
 * Healthy master spec. They are hand-written for now; once apps/api ships
 * its OpenAPI schema, this file should be replaced by a generated client
 * (packages/types in the monorepo plan) so frontend and backend can't drift.
 */

export type Identifier = string; // phone (E.164) or email

export interface User {
  healthyId: string; // e.g. "HLT-7K29-AX84" — never the internal UUID
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

export interface HealthCategoryDetail {
  id: HealthCategoryId;
  label: string;
  icon: string;
  latestResults: LabResult[];
}

export interface TrendPoint {
  reportId: string;
  value: number;
  unit: string;
  collectionDate: string | null;
  status: ClinicalStatus;
}

export interface TestTrend {
  canonicalTestName: string;
  canonicalCode: string;
  category: HealthCategoryId;
  unit: string;
  points: TrendPoint[];
}

export type SearchResultKind = "report" | "result";

export interface SearchResult {
  kind: SearchResultKind;
  id: string;
  title: string;
  subtitle: string;
  relatedReportId: string;
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
  healthyId: string | null;
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
  healthyId: string;
  categories: ShareCategoryStatus[];
  expiresAt: string;
  dataNote: string;
}

/** Minimal, cheap-to-poll shape — see lib/api/sharing.ts's getShareStatus. */
export interface ShareStatus {
  categoryIds: HealthCategoryId[];
}

export interface ApiErrorBody {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

// --- Doctor portal (docs/SPEC.md §40/§41) ---

export type DoctorVerificationStatus = "pending" | "verified" | "rejected";

export interface DoctorProfile {
  id: string;
  fullName: string;
  registrationNumber: string;
  organization: string;
  specialty: string | null;
  verificationStatus: DoctorVerificationStatus;
  verifiedAt: string | null;
}

export interface DoctorPatientSession {
  sessionId: string;
  healthyId: string;
  categoryIds: HealthCategoryId[];
  status: SharingSessionStatus;
  createdAt: string;
  expiresAt: string;
}

// --- Prescriptions & medicines (docs/SPEC.md §38/§39) ---

export interface Prescription {
  id: string;
  fileName: string;
  status: ReportProcessingStatus;
  failureReason: string | null;
  doctorName: string | null;
  prescribedDate: string | null;
  itemCount: number;
  uploadedAt: string;
}

export interface PrescriptionItem {
  id: string;
  prescriptionId: string;
  medicineName: string;
  dosage: string | null;
  frequency: string | null;
  duration: string | null;
  extractionConfidence: number;
  corrected: boolean;
}

export interface Medicine {
  id: string;
  name: string;
  strength: string | null;
  dosage: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  prescribingDoctor: string | null;
  reason: string | null;
  active: boolean;
}

// --- Ask Healthy (AI) — docs/ROADMAP.md Phase 7 ---

export interface ExplainResult {
  resultId: string;
  explanation: string;
  generatedAt: string;
}

export interface ReportComparison {
  reportId: string;
  comparedToReportId: string;
  narrative: string;
  generatedAt: string;
}

export interface DoctorSummary {
  narrative: string;
  windowStart: string;
  windowEnd: string;
  reportCount: number;
  generatedAt: string;
}

export interface AiConversation {
  id: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AiMessageRole = "USER" | "ASSISTANT";

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  createdAt: string;
}

// --- Permissions (roles) — docs/DATABASE.md RBAC/ABAC (§49) ---

export interface PermissionRole {
  id: string;
  name: string;
  categoryIds: HealthCategoryId[];
  defaultDurationHours: number;
  createdAt: string;
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
