"""Prescription upload + processing pipeline (docs/SPEC.md §38). Reuses the
exact same storage/virus-scan/OCR providers as reports (app/services/
reports_service.py) — same document-handling infrastructure, different
domain-specific extraction step.
"""

import hashlib
import logging
import uuid
from datetime import UTC, date, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.errors import NotFoundError, ValidationAppError
from app.db.models import (
    Prescription,
    PrescriptionItem,
    ReportProcessingStatus,
    TimelineEvent,
    TimelineEventType,
)
from app.providers.ocr_provider import OcrProvider
from app.providers.storage_provider import StorageProvider, build_object_key
from app.providers.virus_scan_provider import VirusScanProvider
from app.repositories.audit_repository import AuditRepository
from app.repositories.prescriptions_repository import PrescriptionsRepository
from app.schemas.prescriptions import (
    CorrectPrescriptionItemRequest,
    PrescriptionItemResponse,
    PrescriptionResponse,
)
from app.services.prescription_extraction import extract_prescription_items

logger = logging.getLogger("healthy.prescriptions")

MAX_UPLOAD_BYTES = 20 * 1024 * 1024
_ALLOWED_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".txt", ".csv"}


def _sniff_mime(data: bytes, filename: str) -> str | None:
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


def _prescription_to_response(prescription: Prescription) -> PrescriptionResponse:
    return PrescriptionResponse(
        id=str(prescription.id),
        file_name=prescription.file_name,
        status=prescription.status.value,
        failure_reason=prescription.failure_reason,
        doctor_name=prescription.doctor_name,
        prescribed_date=prescription.prescribed_date,
        item_count=prescription.item_count,
        uploaded_at=prescription.created_at,
    )


def _item_to_response(item: PrescriptionItem) -> PrescriptionItemResponse:
    return PrescriptionItemResponse(
        id=str(item.id),
        prescription_id=str(item.prescription_id),
        medicine_name=item.medicine_name,
        dosage=item.dosage,
        frequency=item.frequency,
        duration=item.duration,
        extraction_confidence=item.extraction_confidence,
        corrected=item.corrected_at is not None,
    )


class PrescriptionsService:
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
        self._prescriptions = PrescriptionsRepository(db)
        self._audit = AuditRepository(db)

    async def upload_prescription(
        self, user_id: uuid.UUID, *, filename: str, data: bytes
    ) -> PrescriptionResponse:
        suffix = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
        if f".{suffix}" not in _ALLOWED_EXTENSIONS:
            raise ValidationAppError("Unsupported file type. Upload a PDF, JPG, PNG, TXT, or CSV.")
        if len(data) == 0:
            raise ValidationAppError("The file is empty.")
        if len(data) > MAX_UPLOAD_BYTES:
            raise ValidationAppError("File is too large (max 20MB).")

        mime_type = _sniff_mime(data, filename)
        if mime_type is None:
            raise ValidationAppError(
                "This file doesn't look like a valid PDF, JPG, PNG, TXT, or CSV."
            )

        content_hash = hashlib.sha256(data).hexdigest()
        key = build_object_key(user_id, filename)
        await self._storage.put(key, data, content_type=mime_type)

        prescription = Prescription(
            user_id=user_id,
            file_name=filename,
            storage_key=key,
            content_hash=content_hash,
            mime_type=mime_type,
            size_bytes=len(data),
            status=ReportProcessingStatus.UPLOADED,
        )
        self._prescriptions.add(prescription)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.PRESCRIPTION_UPLOADED,
            outcome="success",
            resource_type="prescription",
            resource_id=str(prescription.id),
            metadata={"fileName": filename},
        )
        await self._db.commit()
        return _prescription_to_response(prescription)

    async def process_prescription(self, prescription_id: uuid.UUID) -> None:
        prescription = await self._prescriptions.get_by_id(prescription_id)
        if prescription is None:
            return
        try:
            data = await self._storage.get(prescription.storage_key)

            prescription.status = ReportProcessingStatus.SCANNING
            await self._db.commit()
            scan = await self._virus_scanner.scan(data)
            if not scan.clean:
                await self._fail(prescription, "This file was rejected by malware scanning.")
                return

            prescription.status = ReportProcessingStatus.EXTRACTING
            await self._db.commit()
            ocr_result = await self._ocr.extract_text(data, prescription.mime_type)
            prescription.ocr_engine = ocr_result.engine

            if not ocr_result.text.strip():
                reason = (
                    ocr_result.engine.split(":", 1)[1]
                    if ":" in ocr_result.engine
                    else "This document's text could not be read."
                )
                await self._fail(prescription, reason)
                return

            prescription.status = ReportProcessingStatus.ANALYZING
            await self._db.commit()
            extracted = extract_prescription_items(ocr_result.text)
            if not extracted:
                await self._fail(prescription, "No medicines could be recognized in this document.")
                return

            for entry in extracted:
                item = PrescriptionItem(
                    prescription_id=prescription.id,
                    medicine_name=entry.medicine_name,
                    dosage=entry.dosage,
                    frequency=entry.frequency,
                    duration=entry.duration,
                    extraction_confidence=entry.confidence,
                )
                self._prescriptions.add(item)

            prescription.item_count = len(extracted)
            prescription.status = ReportProcessingStatus.COMPLETED
            prescription.processed_at = datetime.now(UTC)

            self._prescriptions.add(
                TimelineEvent(
                    user_id=prescription.user_id,
                    event_type=TimelineEventType.PRESCRIPTION,
                    title=prescription.file_name,
                    description=f"{prescription.item_count} medicine(s) processed.",
                    occurred_at=prescription.prescribed_date or date.today(),
                )
            )

            await self._audit.record(
                actor_user_id=prescription.user_id,
                event_type=audit_events.PRESCRIPTION_PROCESSED,
                outcome="success",
                resource_type="prescription",
                resource_id=str(prescription.id),
                metadata={"itemCount": prescription.item_count},
            )
            await self._db.commit()
        except Exception:
            logger.exception("Prescription processing failed [prescription_id=%s]", prescription_id)
            await self._db.rollback()
            prescription = await self._prescriptions.get_by_id(prescription_id)
            if prescription is not None:
                await self._fail(prescription, "Processing failed unexpectedly. Please try again.")

    async def _fail(self, prescription: Prescription, reason: str) -> None:
        prescription.status = ReportProcessingStatus.FAILED
        prescription.failure_reason = reason
        await self._audit.record(
            actor_user_id=prescription.user_id,
            event_type=audit_events.PRESCRIPTION_PROCESSING_FAILED,
            outcome="failure",
            resource_type="prescription",
            resource_id=str(prescription.id),
            metadata={"reason": reason},
        )
        await self._db.commit()

    async def list_prescriptions(self, user_id: uuid.UUID) -> list[PrescriptionResponse]:
        prescriptions = await self._prescriptions.list_for_user(user_id)
        return [_prescription_to_response(p) for p in prescriptions]

    async def get_prescription(
        self, user_id: uuid.UUID, prescription_id: uuid.UUID
    ) -> PrescriptionResponse:
        prescription = await self._prescriptions.get_by_id(prescription_id)
        if prescription is None or prescription.user_id != user_id:
            raise NotFoundError("Prescription not found.")
        return _prescription_to_response(prescription)

    async def get_items(
        self, user_id: uuid.UUID, prescription_id: uuid.UUID
    ) -> list[PrescriptionItemResponse]:
        prescription = await self._prescriptions.get_by_id(prescription_id)
        if prescription is None or prescription.user_id != user_id:
            raise NotFoundError("Prescription not found.")
        items = await self._prescriptions.list_items(prescription_id)
        return [_item_to_response(i) for i in items]

    async def correct_item(
        self,
        user_id: uuid.UUID,
        prescription_id: uuid.UUID,
        item_id: uuid.UUID,
        body: CorrectPrescriptionItemRequest,
    ) -> PrescriptionItemResponse:
        prescription = await self._prescriptions.get_by_id(prescription_id)
        if prescription is None or prescription.user_id != user_id:
            raise NotFoundError("Prescription not found.")
        item = await self._prescriptions.get_item(item_id)
        if item is None or item.prescription_id != prescription_id:
            raise NotFoundError("Prescription item not found.")

        # §143: preserve the original extracted value on first correction only.
        if item.corrected_at is None:
            item.original_medicine_name = item.medicine_name
            item.original_dosage = item.dosage
            item.original_frequency = item.frequency
            item.original_duration = item.duration

        item.medicine_name = body.medicine_name
        item.dosage = body.dosage
        item.frequency = body.frequency
        item.duration = body.duration
        item.corrected_at = datetime.now(UTC)

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.PRESCRIPTION_ITEM_CORRECTED,
            outcome="success",
            resource_type="prescription_item",
            resource_id=str(item.id),
        )
        await self._db.commit()
        return _item_to_response(item)
