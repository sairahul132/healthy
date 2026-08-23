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
)
from app.providers.ocr_provider import OcrProvider
from app.providers.storage_provider import StorageProvider, build_object_key
from app.providers.virus_scan_provider import VirusScanProvider
from app.repositories.audit_repository import AuditRepository
from app.repositories.reports_repository import ReportsRepository
from app.schemas.reports import (
    ClinicalStatusResponse,
    HealthCategoryDetailResponse,
    HealthCategoryResponse,
    LabReportResponse,
    LabResultResponse,
    SearchResultResponse,
    TestTrendResponse,
    TimelineEventResponse,
    TrendPointResponse,
)
from app.services.lab_extraction import extract_results
from app.services.report_metadata_extraction import extract_collection_date
from app.services.report_presenters import report_to_response, result_to_response

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

    async def get_results(
        self, user_id: uuid.UUID, report_id: uuid.UUID
    ) -> list[LabResultResponse]:
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")
        results = await self._reports.list_results_for_report(report_id)
        return [result_to_response(r) for r in results]

    # --- Health categories (§21, §145) ---

    def list_categories(self) -> list[HealthCategoryResponse]:
        return [
            HealthCategoryResponse(
                id=cid, label=_CATEGORY_LABELS[cid][0], icon=_CATEGORY_LABELS[cid][1]
            )
            for cid in HEALTH_CATEGORY_IDS
        ]

    async def get_category_detail(
        self, user_id: uuid.UUID, category_id: str
    ) -> HealthCategoryDetailResponse:
        if category_id not in _CATEGORY_LABELS:
            raise NotFoundError("Unknown health category.")
        results = await self._reports.list_results_for_user(user_id, category=category_id)
        latest_by_test: dict[str, LabResult] = {}
        for result in results:
            existing = latest_by_test.get(result.canonical_code)
            if existing is None or (
                result.collection_date
                and (
                    existing.collection_date is None
                    or result.collection_date > existing.collection_date
                )
            ):
                latest_by_test[result.canonical_code] = result
        label, icon = _CATEGORY_LABELS[category_id]
        return HealthCategoryDetailResponse(
            id=category_id,
            label=label,
            icon=icon,
            latest_results=[result_to_response(r) for r in latest_by_test.values()],
        )

    # --- Trends (§31) ---

    async def get_trends(self, user_id: uuid.UUID) -> list[TestTrendResponse]:
        results = await self._reports.list_results_for_user(user_id)
        by_code: dict[str, list[LabResult]] = {}
        for result in results:
            by_code.setdefault(result.canonical_code, []).append(result)

        trends: list[TestTrendResponse] = []
        for code, items in by_code.items():
            if len(items) < 2:
                continue
            canonical = get_by_code(code)
            if canonical is None:
                continue
            ordered = sorted(items, key=lambda r: r.collection_date or date.min)
            trends.append(
                TestTrendResponse(
                    canonical_test_name=canonical.name,
                    canonical_code=code,
                    category=canonical.category,
                    unit=canonical.unit,
                    points=[
                        TrendPointResponse(
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
            )
            for e in events
        ]

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
