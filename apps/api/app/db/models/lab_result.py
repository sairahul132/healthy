import uuid
from datetime import date

from sqlalchemy import Date, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class LabResult(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One structured test result extracted from a LabReport (§18 structured
    lab data, §20 unit normalization, §29/§30 status). `user_id` is
    denormalized from the parent report so every query stays user-scoped
    without a join (§70 multi-tenancy).
    """

    __tablename__ = "lab_results"

    report_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    test_name: Mapped[str] = mapped_column(String(200), nullable=False)  # as extracted, verbatim
    canonical_test_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    canonical_code: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(50), nullable=False, index=True)

    value: Mapped[float] = mapped_column(Float, nullable=False)
    unit: Mapped[str] = mapped_column(String(50), nullable=False)
    normalized_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    normalized_unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    normalization_version: Mapped[str | None] = mapped_column(String(50), nullable=True)

    reference_low: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_high: Mapped[float | None] = mapped_column(Float, nullable=True)
    reference_text: Mapped[str] = mapped_column(String(200), nullable=False)

    status_direction: Mapped[str] = mapped_column(String(20), nullable=False)
    status_severity: Mapped[str] = mapped_column(String(20), nullable=False)
    status_label: Mapped[str] = mapped_column(String(50), nullable=False)

    extraction_confidence: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    collection_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    # Snapshotted at extraction time from the most recent prior COMPLETED
    # report for the same canonical test (see ReportsRepository.get_previous_result) —
    # not recomputed later, so a result's displayed trend never silently
    # changes as unrelated newer reports are uploaded.
    previous_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    previous_collection_date: Mapped[date | None] = mapped_column(Date, nullable=True)
