import type { LabReport, LabResult, ReportProcessingStatus, TimelineEvent } from "@/lib/api/types";
import { computeClinicalStatus } from "@/lib/health/status-engine";
import {
  CANONICAL_TESTS,
  REPORT_TEMPLATES,
  type CanonicalTest,
} from "@/lib/mock/canonical-tests";
import type { ReportsProvider, UploadInput } from "@/lib/reports/provider";
import { ReportValidationError } from "@/lib/reports/provider";

/**
 * ⚠️ MOCK — in-browser fake for local development only.
 *
 * apps/api has no /reports, upload, or OCR pipeline yet (see docs/ROADMAP.md
 * — Phase 2). This class simulates the async processing pipeline from
 * docs/SPEC.md §76 (UPLOADED → SCANNING → PROCESSING → EXTRACTING →
 * ANALYZING → COMPLETED) entirely client-side, using setTimeout instead of a
 * real job queue, and generates synthetic lab values instead of running
 * OCR. State lives in memory + localStorage for demo persistence across
 * reloads — never real patient data (§113). Delete this file once the real
 * provider exists; nothing outside lib/reports/get-provider.ts should ever
 * import it directly.
 */

const STORAGE_KEY = "healthy_mock_reports_v1";
const ALLOWED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png"];
const MAX_SIZE_BYTES = 20 * 1024 * 1024;

interface MockState {
  reports: LabReport[];
  resultsByReport: Record<string, LabResult[]>;
  timelineEvents: TimelineEvent[];
}

function id(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `mock_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function generateSyntheticValue(test: CanonicalTest): number {
  const raw = test.typicalLow + Math.random() * (test.typicalHigh - test.typicalLow);
  return roundTo(raw, test.decimals);
}

function testToResult(
  test: CanonicalTest,
  reportId: string,
  collectionDate: string,
  previous: LabResult | null,
): LabResult {
  const value = generateSyntheticValue(test);
  const status = computeClinicalStatus(value, {
    low: test.referenceLow,
    high: test.referenceHigh,
  });
  const referenceText =
    test.referenceLow !== null && test.referenceHigh !== null
      ? `${test.referenceLow} - ${test.referenceHigh} ${test.unit}`
      : test.referenceHigh !== null
        ? `< ${test.referenceHigh} ${test.unit}`
        : test.referenceLow !== null
          ? `> ${test.referenceLow} ${test.unit}`
          : "Not available";

  return {
    id: id(),
    reportId,
    testName: test.name,
    canonicalTestName: test.name,
    value,
    unit: test.unit,
    referenceLow: test.referenceLow,
    referenceHigh: test.referenceHigh,
    referenceText,
    category: test.category,
    status,
    previousValue: previous?.value ?? null,
    previousCollectionDate: previous?.collectionDate ?? null,
    extractionConfidence: roundTo(0.9 + Math.random() * 0.099, 3),
    collectionDate,
  };
}

function loadState(): MockState {
  if (typeof window === "undefined") {
    return { reports: [], resultsByReport: {}, timelineEvents: [] };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as MockState;
  } catch {
    // Corrupt/unavailable storage — fall through to a fresh seeded state.
  }
  return seedState();
}

function seedState(): MockState {
  const cbcTests = CANONICAL_TESTS.filter((t) =>
    REPORT_TEMPLATES[0]!.testCodes.includes(t.code),
  );
  const lipidTests = CANONICAL_TESTS.filter((t) =>
    REPORT_TEMPLATES[1]!.testCodes.includes(t.code),
  );

  const lipidReportId = id();
  const cbcReportId = id();
  const lipidDate = daysAgo(180);
  const cbcDate = daysAgo(21);

  const lipidResults = lipidTests.map((t) => testToResult(t, lipidReportId, lipidDate, null));
  const cbcResults = cbcTests.map((t) => testToResult(t, cbcReportId, cbcDate, null));

  const countAbnormal = (results: LabResult[]) =>
    results.filter((r) => r.status.direction !== "NORMAL").length;

  const reports: LabReport[] = [
    {
      id: lipidReportId,
      fileName: "lipid-profile.pdf",
      status: "COMPLETED",
      failureReason: null,
      collectionDate: lipidDate,
      labName: "City Diagnostics Lab",
      categories: ["heart"],
      uploadedAt: lipidDate,
      resultCount: lipidResults.length,
      abnormalCount: countAbnormal(lipidResults),
    },
    {
      id: cbcReportId,
      fileName: "cbc-report.pdf",
      status: "COMPLETED",
      failureReason: null,
      collectionDate: cbcDate,
      labName: "City Diagnostics Lab",
      categories: ["blood"],
      uploadedAt: cbcDate,
      resultCount: cbcResults.length,
      abnormalCount: countAbnormal(cbcResults),
    },
  ];

  const timelineEvents: TimelineEvent[] = [
    {
      id: id(),
      type: "LAB_REPORT",
      title: "Lipid Profile uploaded",
      description: `${lipidResults.length} tests processed`,
      occurredAt: lipidDate,
      relatedReportId: lipidReportId,
    },
    {
      id: id(),
      type: "DOCTOR_VISIT",
      title: "Annual check-up with Dr. Rao",
      description: "Routine consultation",
      occurredAt: daysAgo(175),
      relatedReportId: null,
    },
    {
      id: id(),
      type: "VACCINATION",
      title: "Influenza vaccine",
      description: null,
      occurredAt: daysAgo(90),
      relatedReportId: null,
    },
    {
      id: id(),
      type: "LAB_REPORT",
      title: "Complete Blood Count uploaded",
      description: `${cbcResults.length} tests processed`,
      occurredAt: cbcDate,
      relatedReportId: cbcReportId,
    },
  ];

  const state: MockState = {
    reports,
    resultsByReport: {
      [lipidReportId]: lipidResults,
      [cbcReportId]: cbcResults,
    },
    timelineEvents,
  };
  persist(state);
  return state;
}

function persist(state: MockState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full/unavailable — the mock simply won't persist across reloads.
  }
}

const PROCESSING_SEQUENCE: ReportProcessingStatus[] = [
  "UPLOADED",
  "SCANNING",
  "PROCESSING",
  "EXTRACTING",
  "ANALYZING",
  "COMPLETED",
];

function validateUpload(file: UploadInput) {
  const lower = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!hasAllowedExtension) {
    throw new ReportValidationError(
      "Unsupported file type. Upload a PDF, JPG, or PNG report.",
    );
  }
  if (file.sizeBytes > MAX_SIZE_BYTES) {
    throw new ReportValidationError("File is too large. The limit is 20 MB.");
  }
  if (file.sizeBytes === 0) {
    throw new ReportValidationError("That file appears to be empty.");
  }
  // Real validation must also check magic bytes / MIME sniffing server-side
  // (§15) — the client never gets to be the only line of defense.
}

function pickTemplate(fileName: string) {
  const lower = fileName.toLowerCase();
  const matched = REPORT_TEMPLATES.find((template) =>
    template.testCodes.some((code) => lower.includes(code.toLowerCase())) ||
    lower.includes(template.label.toLowerCase().split(" ")[0]!.toLowerCase()),
  );
  return matched ?? REPORT_TEMPLATES[Math.floor(Math.random() * REPORT_TEMPLATES.length)]!;
}

export class MockReportsProvider implements ReportsProvider {
  private state: MockState = seedState();
  private hydrated = false;

  private ensureHydrated() {
    if (this.hydrated) return;
    this.state = loadState();
    this.hydrated = true;
  }

  async listReports(): Promise<LabReport[]> {
    this.ensureHydrated();
    return [...this.state.reports].sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
  }

  async getReport(reportId: string): Promise<LabReport | null> {
    this.ensureHydrated();
    return this.state.reports.find((r) => r.id === reportId) ?? null;
  }

  async getResults(reportId: string): Promise<LabResult[]> {
    this.ensureHydrated();
    return this.state.resultsByReport[reportId] ?? [];
  }

  async listTimelineEvents(): Promise<TimelineEvent[]> {
    this.ensureHydrated();
    return [...this.state.timelineEvents].sort(
      (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
    );
  }

  async uploadReport(file: UploadInput): Promise<LabReport> {
    this.ensureHydrated();
    validateUpload(file);

    const template = pickTemplate(file.name);
    const report: LabReport = {
      id: id(),
      fileName: file.name,
      status: "UPLOADED",
      failureReason: null,
      collectionDate: new Date().toISOString(),
      labName: "Uploaded by patient",
      categories: [],
      uploadedAt: new Date().toISOString(),
      resultCount: 0,
      abnormalCount: 0,
    };

    this.state.reports = [report, ...this.state.reports];
    persist(this.state);
    this.runProcessingPipeline(report.id, template.testCodes);
    return report;
  }

  private runProcessingPipeline(reportId: string, testCodes: string[]) {
    const stepDelaysMs = [600, 900, 900, 700, 500];
    let currentIndex = 0;

    const advance = () => {
      currentIndex += 1;
      const nextStatus = PROCESSING_SEQUENCE[currentIndex];
      const report = this.state.reports.find((r) => r.id === reportId);
      if (!report || !nextStatus) return;

      // Small simulated failure chance once extraction begins, so the UI's
      // failure state is reachable without special-casing a demo button.
      if (nextStatus === "ANALYZING" && Math.random() < 0.08) {
        report.status = "FAILED";
        report.failureReason = "Could not extract structured values from this document.";
        persist(this.state);
        return;
      }

      if (nextStatus === "COMPLETED") {
        const tests = CANONICAL_TESTS.filter((t) => testCodes.includes(t.code));
        const collectionDate = report.collectionDate ?? new Date().toISOString();
        const results = tests.map((test) => {
          const previous = this.mostRecentResultFor(test.name, reportId);
          return testToResult(test, reportId, collectionDate, previous);
        });
        this.state.resultsByReport[reportId] = results;
        report.resultCount = results.length;
        report.abnormalCount = results.filter((r) => r.status.direction !== "NORMAL").length;
        report.categories = Array.from(new Set(tests.map((t) => t.category)));

        this.state.timelineEvents = [
          {
            id: id(),
            type: "LAB_REPORT",
            title: `${report.fileName} processed`,
            description: `${results.length} tests extracted`,
            occurredAt: new Date().toISOString(),
            relatedReportId: reportId,
          },
          ...this.state.timelineEvents,
        ];
      }

      report.status = nextStatus;
      persist(this.state);

      if (currentIndex < PROCESSING_SEQUENCE.length - 1) {
        window.setTimeout(advance, stepDelaysMs[currentIndex]);
      }
    };

    window.setTimeout(advance, stepDelaysMs[0]);
  }

  private mostRecentResultFor(canonicalTestName: string, excludingReportId: string): LabResult | null {
    const candidates = Object.entries(this.state.resultsByReport)
      .filter(([reportId]) => reportId !== excludingReportId)
      .flatMap(([, results]) => results)
      .filter((r) => r.canonicalTestName === canonicalTestName)
      .sort(
        (a, b) =>
          new Date(b.collectionDate ?? 0).getTime() - new Date(a.collectionDate ?? 0).getTime(),
      );
    return candidates[0] ?? null;
  }
}
