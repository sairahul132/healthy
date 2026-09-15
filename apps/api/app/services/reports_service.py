"""Report upload + processing pipeline (docs/SPEC.md §15/§16/§76) and the
read-side queries for reports, health categories, trends, timeline, search
(§65, §145, §31, §37, §62).
"""

import hashlib
import logging
import uuid
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.canonical_tests import get_by_code
from app.core.clinical_rules import compute_clinical_status
from app.core.errors import NotFoundError, ValidationAppError
from app.core.health_categories import HEALTH_CATEGORY_IDS
from app.core.unit_normalization import normalize
from app.db.models import (
    LabReport,
    LabResult,
    ReportProcessingStatus,
    TimelineEvent,
    TimelineEventType,
    User,
)
from app.providers.ocr_provider import OcrProvider
from app.providers.storage_provider import StorageProvider, build_object_key
from app.providers.virus_scan_provider import VirusScanProvider
from app.repositories.audit_repository import AuditRepository
from app.repositories.reports_repository import ReportsRepository
from app.schemas.reports import (
    AttentionSummaryResponse,
    ClinicalStatusResponse,
    HealthCategoryDetailResponse,
    HealthCategoryResponse,
    HistoryEntryResponse,
    LabReportResponse,
    LabResultResponse,
    SearchResultResponse,
    TestTrendResponse,
    TimelineEventResponse,
    TrendPointResponse,
)
from app.services.lab_extraction import extract_results
from app.services.report_metadata_extraction import extract_collection_date
from app.services.report_presenters import (
    report_to_response,
    result_to_response,
    results_to_response_with_live_previous,
)

logger = logging.getLogger("healthy.reports")

MAX_UPLOAD_BYTES = 20 * 1024 * 1024  # 20MB — matches apps/web's mock validateUpload
_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".txt", ".csv"}

_CATEGORY_LABELS: dict[str, tuple[str, str]] = {
    # Kept byte-for-byte in sync with apps/web's lib/health/categories.ts —
    # that file's own comment flags itself as the stopgap this endpoint replaces.
    "blood": ("Blood", "🩸"),
    "heart": ("Heart & Cardiovascular", "❤️"),
    "liver": ("Liver", "🫁"),
    "kidney": ("Kidney", "🫘"),
    "thyroid": ("Thyroid", "🦋"),
    "diabetes": ("Diabetes & Metabolic", "🩹"),
    "vitamins": ("Vitamins & Minerals", "🧪"),
    "urine": ("Urine", "💧"),
    "hormones": ("Hormones", "⚛️"),
    "infection": ("Infection & Immunity", "🛡️"),
    "allergy": ("Allergy", "🌿"),
    "autoimmune": ("Autoimmune", "🧬"),
    "imaging": ("Imaging", "🖼️"),
    "tumor_markers": ("Cancer/Tumor Markers", "🔬"),
    "other": ("Other", "📄"),
}

# Worse-first ordering for the "outside range" list (§29/§30 severities).
_SEVERITY_RANK = {"red": 0, "orange": 1, "yellow": 2, "green": 3}

# Only domain CRUD events belong on the user-facing activity history — the
# rest of the audit trail (logins, OTPs, shares, AI usage, ...) exists for
# security/compliance, not for this feed (§55 vs. this being a convenience
# view of "what did I add/remove").
_HISTORY_EVENT_TYPES = {
    audit_events.REPORT_UPLOADED,
    audit_events.REPORT_DELETED,
    audit_events.MEDICINE_CREATED,
    audit_events.MEDICINE_UPDATED,
    audit_events.MEDICINE_DELETED,
}

_HISTORY_TITLES = {
    audit_events.REPORT_UPLOADED: "Report added",
    audit_events.REPORT_DELETED: "Report deleted",
    audit_events.MEDICINE_CREATED: "Medicine added",
    audit_events.MEDICINE_UPDATED: "Medicine edited",
    audit_events.MEDICINE_DELETED: "Medicine deleted",
}


def _describe_history_entry(event_type: str, metadata: dict) -> str | None:
    if event_type in (audit_events.REPORT_UPLOADED, audit_events.REPORT_DELETED):
        return metadata.get("fileName")
    if event_type in (
        audit_events.MEDICINE_CREATED,
        audit_events.MEDICINE_UPDATED,
        audit_events.MEDICINE_DELETED,
    ):
        return metadata.get("name")
    return None


def _sniff_mime(data: bytes, filename: str, declared_content_type: str) -> str | None:
    """§15: never trust the client-supplied Content-Type — check magic bytes."""
    if data.startswith(b"%PDF"):
        return "application/pdf"
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if suffix in ("txt", "csv"):
        try:
            data.decode("utf-8")
        except UnicodeDecodeError:
            return None
        return "text/plain" if suffix == "txt" else "text/csv"
    return None


class ReportsService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        storage: StorageProvider,
        virus_scanner: VirusScanProvider,
        ocr: OcrProvider,
    ) -> None:
        self._db = db
        self._storage = storage
        self._virus_scanner = virus_scanner
        self._ocr = ocr
        self._reports = ReportsRepository(db)
        self._audit = AuditRepository(db)

    # --- Upload ---

    async def upload_report(
        self, user_id: uuid.UUID, *, filename: str, declared_content_type: str, data: bytes
    ) -> LabReportResponse:
        suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        if f".{suffix}" not in _ALLOWED_EXTENSIONS:
            raise ValidationAppError("Unsupported file type. Upload a PDF, JPG, PNG, TXT, or CSV.")
        if len(data) == 0:
            raise ValidationAppError("The file is empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            raise ValidationAppError("File is too large (max 20MB).")

        mime_type = _sniff_mime(data, filename, declared_content_type)
        if mime_type is None:
            raise ValidationAppError(
                "This file doesn't look like a valid PDF, JPG, PNG, TXT, or CSV."
            )

        content_hash = hashlib.sha256(data).hexdigest()
        key = build_object_key(user_id, filename)
        await self._storage.put(key, data, content_type=mime_type)

        report = LabReport(
            user_id=user_id,
            file_name=filename,
            storage_key=key,
            content_hash=content_hash,
            mime_type=mime_type,
            size_bytes=len(data),
            status=ReportProcessingStatus.UPLOADED,
        )
        self._reports.add(report)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.REPORT_UPLOADED,
            outcome="success",
            resource_type="lab_report",
            resource_id=str(report.id),
            metadata={"fileName": filename, "sizeBytes": len(data), "mimeType": mime_type},
        )
        await self._db.commit()
        return report_to_response(report, categories=[])

    # --- Background processing (§76) ---

    async def process_report(self, report_id: uuid.UUID) -> None:
        """Runs UPLOADED -> SCANNING -> PROCESSING -> EXTRACTING -> ANALYZING
        -> COMPLETED|FAILED. Called from a FastAPI BackgroundTask with its
        own DB session (see app/api/v1/reports.py) — no Celery/Redis worker
        is available in this environment, so this in-process background task
        is the local-dev stand-in for the job queue §76 calls for; it still
        never blocks the upload request itself.
        """
        report = await self._reports.get_report_by_id(report_id)
        if report is None:
            return
        try:
            data = await self._storage.get(report.storage_key)

            report.status = ReportProcessingStatus.SCANNING
            await self._db.commit()
            scan = await self._virus_scanner.scan(data)
            if not scan.clean:
                report.status = ReportProcessingStatus.FAILED
                report.failure_reason = "This file was rejected by malware scanning."
                await self._audit.record(
                    actor_user_id=report.user_id,
                    event_type=audit_events.REPORT_UPLOAD_REJECTED,
                    outcome="failure",
                    resource_type="lab_report",
                    resource_id=str(report.id),
                    metadata={"reason": scan.reason},
                )
                await self._db.commit()
                return

            report.status = ReportProcessingStatus.PROCESSING
            await self._db.commit()

            report.status = ReportProcessingStatus.EXTRACTING
            await self._db.commit()
            ocr_result = await self._ocr.extract_text(data, report.mime_type)
            report.ocr_engine = ocr_result.engine

            if not ocr_result.text.strip():
                reason = (
                    ocr_result.engine.split(":", 1)[1]
                    if ":" in ocr_result.engine
                    else "This document's text could not be read."
                )
                await self._fail(report, reason)
                return

            extracted = extract_results(ocr_result.text)
            if not extracted:
                await self._fail(
                    report, "No recognized lab test values were found in this document."
                )
                return

            report.collection_date = extract_collection_date(ocr_result.text)

            report.status = ReportProcessingStatus.ANALYZING
            await self._db.commit()

            categories: set[str] = set()
            abnormal_count = 0
            for item in extracted:
                normalized = normalize(item.canonical.code, item.value, item.unit)
                status = compute_clinical_status(
                    item.value, item.reference_low, item.reference_high
                )
                previous = await self._reports.get_previous_result(
                    report.user_id,
                    item.canonical.code,
                    exclude_report_id=report.id,
                    before_date=report.collection_date,
                )
                result = LabResult(
                    report_id=report.id,
                    user_id=report.user_id,
                    test_name=item.test_name or item.canonical.name,
                    canonical_test_name=item.canonical.name,
                    canonical_code=item.canonical.code,
                    category=item.canonical.category,
                    value=item.value,
                    unit=item.unit,
                    normalized_value=normalized.value,
                    normalized_unit=normalized.unit,
                    normalization_version=normalized.method_version,
                    reference_low=item.reference_low,
                    reference_high=item.reference_high,
                    reference_text=item.reference_text,
                    status_direction=status.direction,
                    status_severity=status.severity,
                    status_label=status.label,
                    extraction_confidence=item.confidence,
                    collection_date=report.collection_date,
                    previous_value=previous.value if previous else None,
                    previous_collection_date=previous.collection_date if previous else None,
                )
                self._reports.add(result)
                categories.add(item.canonical.category)
                if status.direction != "NORMAL":
                    abnormal_count += 1

            report.result_count = len(extracted)
            report.abnormal_count = abnormal_count
            report.status = ReportProcessingStatus.COMPLETED
            report.processed_at = datetime.now(UTC)
            await self._db.flush()

            event = TimelineEvent(
                user_id=report.user_id,
                event_type=TimelineEventType.LAB_REPORT,
                title=report.file_name,
                description=f"{report.result_count} result(s) processed.",
                occurred_at=report.collection_date or date.today(),
                related_report_id=report.id,
            )
            await self._reports.add_timeline_event(event)

            await self._audit.record(
                actor_user_id=report.user_id,
                event_type=audit_events.REPORT_PROCESSED,
                outcome="success",
                resource_type="lab_report",
                resource_id=str(report.id),
                metadata={"resultCount": report.result_count, "abnormalCount": abnormal_count},
            )
            await self._db.commit()
        except Exception:
            logger.exception("Report processing failed [report_id=%s]", report_id)
            await self._db.rollback()
            report = await self._reports.get_report_by_id(report_id)
            if report is not None:
                await self._fail(
                    report, "Processing failed unexpectedly. Please try uploading again."
                )

    async def _fail(self, report: LabReport, reason: str) -> None:
        report.status = ReportProcessingStatus.FAILED
        report.failure_reason = reason
        await self._audit.record(
            actor_user_id=report.user_id,
            event_type=audit_events.REPORT_PROCESSING_FAILED,
            outcome="failure",
            resource_type="lab_report",
            resource_id=str(report.id),
            metadata={"reason": reason},
        )
        await self._db.commit()

    # --- Reads ---

    async def list_reports(self, user_id: uuid.UUID) -> list[LabReportResponse]:
        reports = await self._reports.list_reports_for_user(user_id)
        responses = []
        for report in reports:
            results = await self._reports.list_results_for_report(report.id)
            categories = sorted({r.category for r in results})
            responses.append(report_to_response(report, categories))
        return responses

    async def get_report(self, user_id: uuid.UUID, report_id: uuid.UUID) -> LabReportResponse:
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")
        results = await self._reports.list_results_for_report(report.id)
        categories = sorted({r.category for r in results})
        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.REPORT_VIEWED,
            outcome="success",
            resource_type="lab_report",
            resource_id=str(report.id),
            metadata={},
        )
        await self._db.commit()
        return report_to_response(report, categories)

    async def delete_report(self, user_id: uuid.UUID, report_id: uuid.UUID) -> None:
        """Deletes a report, its results, and its timeline events, then
        best-effort removes the underlying file bytes. Storage deletion is
        attempted after the DB commit succeeds and never rolls it back on
        failure — an orphaned blob is recoverable manual cleanup, but a
        report the user can still see with none of its data would not be."""
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")
        storage_key = report.storage_key
        file_name = report.file_name

        await self._reports.delete_report(report)
        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.REPORT_DELETED,
            outcome="success",
            resource_type="lab_report",
            resource_id=str(report_id),
            metadata={"fileName": file_name},
        )
        await self._db.commit()

        try:
            await self._storage.delete(storage_key)
        except Exception:
            logger.exception("Failed to delete storage object for report %s", report_id)

    async def get_report_file(
        self, user_id: uuid.UUID, report_id: uuid.UUID
    ) -> tuple[bytes, str, str]:
        """Returns (data, mime_type, filename) for the original uploaded
        document — the "Download" action (§58). Same ownership check as
        get_report; reads through the storage provider so this works
        identically regardless of STORAGE_PROVIDER (local/s3/database)."""
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")
        data = await self._storage.get(report.storage_key)
        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.REPORT_FILE_DOWNLOADED,
            outcome="success",
            resource_type="lab_report",
            resource_id=str(report.id),
            metadata={},
        )
        await self._db.commit()
        return data, report.mime_type, report.file_name

    async def get_results(
        self, user_id: uuid.UUID, report_id: uuid.UUID
    ) -> list[LabResultResponse]:
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")
        results = await self._reports.list_results_for_report(report_id)
        # Live, not the frozen previous_value/previous_collection_date
        # columns — see results_to_response_with_live_previous for why:
        # this is what keeps "Trends from Previous Reports" correct after a
        # report is deleted.
        return await results_to_response_with_live_previous(self._reports, results)

    # --- Health categories (§21, §145) ---

    @staticmethod
    def _dedup_latest_by_code(results: list[LabResult]) -> dict[str, LabResult]:
        """Collapses a result list down to one row per canonical test —
        whichever has the latest `collection_date` — so a test that used to
        be abnormal doesn't stay counted once a newer report shows it back
        in range. Shared by category detail, the attention count, and
        anywhere else that means "current value" rather than "history"."""
        latest_by_code: dict[str, LabResult] = {}
        for result in results:
            existing = latest_by_code.get(result.canonical_code)
            if existing is None or (
                result.collection_date
                and (
                    existing.collection_date is None
                    or result.collection_date > existing.collection_date
                )
            ):
                latest_by_code[result.canonical_code] = result
        return latest_by_code

    async def list_categories(self, user_id: uuid.UUID) -> list[HealthCategoryResponse]:
        """Only the categories the user actually has a result in — not the
        full fixed list. A user who has only ever uploaded a blood panel
        shouldn't see 14 empty category tiles for organs nothing has been
        tested for yet."""
        results = await self._reports.list_results_for_user(user_id)
        present = {r.category for r in results if r.category in _CATEGORY_LABELS}
        return [
            HealthCategoryResponse(
                id=cid, label=_CATEGORY_LABELS[cid][0], icon=_CATEGORY_LABELS[cid][1]
            )
            for cid in HEALTH_CATEGORY_IDS
            if cid in present
        ]

    async def get_category_detail(
        self, user_id: uuid.UUID, category_id: str
    ) -> HealthCategoryDetailResponse:
        if category_id not in _CATEGORY_LABELS:
            raise NotFoundError("Unknown health category.")
        results = await self._reports.list_results_for_user(user_id, category=category_id)
        latest_by_test = self._dedup_latest_by_code(results)
        label, icon = _CATEGORY_LABELS[category_id]
        return HealthCategoryDetailResponse(
            id=category_id,
            label=label,
            icon=icon,
            latest_results=[result_to_response(r) for r in latest_by_test.values()],
        )

    async def get_attention_summary(self, user_id: uuid.UUID) -> AttentionSummaryResponse:
        """Count of tests currently outside their reference range, using
        each test's most recent result only — so this number rises and
        falls with the user's actual latest results instead of only ever
        growing as more reports pile up (see get_trends' same-shaped fix
        below for why a naive per-report sum is wrong)."""
        results = await self._reports.list_results_for_user(user_id)
        latest_by_test = self._dedup_latest_by_code(results)
        abnormal = [r for r in latest_by_test.values() if r.status_direction != "NORMAL"]
        abnormal.sort(
            key=lambda r: (_SEVERITY_RANK.get(r.status_severity, 9), r.canonical_test_name)
        )
        return AttentionSummaryResponse(
            abnormal_count=len(abnormal),
            results=[result_to_response(r) for r in abnormal],
        )

    # --- Trends (§31) ---

    async def get_trends(self, user_id: uuid.UUID) -> list[TestTrendResponse]:
        results = await self._reports.list_results_for_user(user_id)
        by_code: dict[str, list[LabResult]] = {}
        for result in results:
            by_code.setdefault(result.canonical_code, []).append(result)

        trends: list[TestTrendResponse] = []
        for code, items in by_code.items():
            canonical = get_by_code(code)
            if canonical is None:
                continue
            ordered = sorted(items, key=lambda r: r.collection_date or date.min)
            latest = ordered[-1]
            trends.append(
                TestTrendResponse(
                    canonical_test_name=canonical.name,
                    canonical_code=code,
                    category=canonical.category,
                    unit=canonical.unit,
                    reference_low=latest.reference_low,
                    reference_high=latest.reference_high,
                    reference_text=latest.reference_text,
                    points=[
                        TrendPointResponse(
                            id=str(r.id),
                            report_id=str(r.report_id),
                            value=r.value,
                            unit=r.unit,
                            collection_date=r.collection_date,
                            status=ClinicalStatusResponse(
                                direction=r.status_direction,
                                severity=r.status_severity,
                                label=r.status_label,
                            ),
                        )
                        for r in ordered
                    ],
                )
            )
        return trends

    # --- Timeline (§37) ---

    async def list_timeline(self, user_id: uuid.UUID) -> list[TimelineEventResponse]:
        events = await self._reports.list_timeline_for_user(user_id)
        return [
            TimelineEventResponse(
                id=str(e.id),
                type=e.event_type.value,
                title=e.title,
                description=e.description,
                occurred_at=e.occurred_at,
                related_report_id=str(e.related_report_id) if e.related_report_id else None,
                related_medicine_id=str(e.related_medicine_id) if e.related_medicine_id else None,
            )
            for e in events
        ]

    async def delete_timeline_event(self, user_id: uuid.UUID, event_id: uuid.UUID) -> None:
        """Fallback delete for a timeline entry with no domain-specific owner
        (e.g. a future DOCTOR_VISIT/DIAGNOSIS entry) — LAB_REPORT and
        MEDICINE entries are deleted through their own service instead
        (ReportsService.delete_report / MedicinesService.delete), which also
        remove the record the entry was describing, not just the entry."""
        event = await self._reports.get_timeline_event_by_id(event_id)
        if event is None or event.user_id != user_id:
            raise NotFoundError("Timeline event not found.")
        await self._reports.delete_timeline_event(event)
        await self._db.commit()

    # --- Activity history (§55-adjacent: a user-facing view over the same
    # append-only audit trail, filtered to domain CRUD and rendered in plain
    # language) ---

    async def get_history(self, user_id: uuid.UUID) -> list[HistoryEntryResponse]:
        user = await self._db.get(User, user_id)
        after = user.history_cleared_at if user else None
        entries = await self._audit.list_for_user(
            user_id, event_types=_HISTORY_EVENT_TYPES, after=after
        )
        return [
            HistoryEntryResponse(
                id=str(e.id),
                event_type=e.event_type,
                title=_HISTORY_TITLES.get(e.event_type, e.event_type.replace("_", " ").title()),
                description=_describe_history_entry(e.event_type, e.event_metadata),
                occurred_at=e.created_at,
            )
            for e in entries
        ]

    async def clear_history(self, user_id: uuid.UUID) -> None:
        """Doesn't touch a single AuditLog row — those are append-only by
        design (§55, DB-level GRANT). "Clearing" just moves this user's
        history-visibility cutoff forward; get_history only shows entries
        after it."""
        user = await self._db.get(User, user_id)
        if user is None:
            raise NotFoundError("User not found.")
        user.history_cleared_at = datetime.now(UTC)
        await self._db.commit()

    # --- Search (§62) ---

    async def search(self, user_id: uuid.UUID, query: str) -> list[SearchResultResponse]:
        query = query.strip()
        if len(query) < 2:
            return []
        reports, results = await self._reports.search(user_id, query)
        response: list[SearchResultResponse] = []
        for report in reports:
            response.append(
                SearchResultResponse(
                    kind="report",
                    id=str(report.id),
                    title=report.file_name,
                    subtitle=report.status.value.title(),
                    related_report_id=str(report.id),
                )
            )
        for result in results:
            response.append(
                SearchResultResponse(
                    kind="result",
                    id=str(result.id),
                    title=result.canonical_test_name,
                    subtitle=f"{result.value} {result.unit} · {result.status_label}",
                    related_report_id=str(result.report_id),
                )
            )
        return response
