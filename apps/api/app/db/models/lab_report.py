import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class ReportProcessingStatus(str, enum.Enum):
    """docs/SPEC.md §76 processing pipeline states."""

    UPLOADED = "UPLOADED"
    SCANNING = "SCANNING"
    PROCESSING = "PROCESSING"
    EXTRACTING = "EXTRACTING"
    ANALYZING = "ANALYZING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class LabReport(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """An uploaded lab report and its processing state (§17 original
    document preservation, §76 pipeline). The original file is never
    modified after upload — `storage_key` always points at exactly the
    bytes the user uploaded; extracted/derived data lives in LabResult
    rows, not here.
    """

    __tablename__ = "lab_reports"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(500), nullable=False)
    content_hash: Mapped[str] = mapped_column(String(64), nullable=False)  # SHA-256, §17
    mime_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[ReportProcessingStatus] = mapped_column(
        Enum(ReportProcessingStatus),
        default=ReportProcessingStatus.UPLOADED,
        nullable=False,
        index=True,
    )
    failure_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)

    collection_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    lab_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    result_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    abnormal_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # §141 report processing versioning — which parser produced these results.
    ocr_engine: Mapped[str | None] = mapped_column(String(100), nullable=True)
    extractor_version: Mapped[str] = mapped_column(
        String(50), default="lab-extract-v1", nullable=False
    )

    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
