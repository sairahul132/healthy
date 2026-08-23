import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.lab_report import ReportProcessingStatus
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class Prescription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An uploaded prescription document (§38). Goes through the same
    upload/scan/OCR pipeline shape as LabReport (reuses
    ReportProcessingStatus — same state machine, different domain), but
    extracts PrescriptionItem rows instead of lab values.
    """

    __tablename__ = "prescriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    # Distinct `name=` so Postgres creates a separate native enum type from
    # lab_reports.status's — reusing the same Enum() object across two
    # tables without one would collide on `CREATE TYPE` at migration time.
    status: Mapped[ReportProcessingStatus] = mapped_column(
        Enum(ReportProcessingStatus, name="prescription_processing_status"),
        default=ReportProcessingStatus.UPLOADED,
        nullable=False,
        index=True,
    )
    failure_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    ocr_engine: Mapped[str | None] = mapped_column(String(100), nullable=True)

    doctor_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    prescribed_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    item_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PrescriptionItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One extracted medicine line from a Prescription (§38). Preserves the
    original extracted value alongside any user correction (§96/§143 —
    "never silently change prescription data")."""

    __tablename__ = "prescription_items"

    prescription_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("prescriptions.id", ondelete="CASCADE"), nullable=False, index=True
    )

    medicine_name: Mapped[str] = mapped_column(String(200), nullable=False)
    dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    duration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    extraction_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)

    original_medicine_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    original_dosage: Mapped[str | None] = mapped_column(String(100), nullable=True)
    original_frequency: Mapped[str | None] = mapped_column(String(100), nullable=True)
    original_duration: Mapped[str | None] = mapped_column(String(100), nullable=True)
    corrected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
