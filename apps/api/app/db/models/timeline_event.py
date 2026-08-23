import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class TimelineEventType(str, enum.Enum):
    """docs/SPEC.md §37. Only LAB_REPORT is ever produced today (Phase
    2/3 scope) — the rest exist so later phases (prescriptions,
    consultations, ...) can append to the same timeline without a schema
    change.
    """

    LAB_REPORT = "LAB_REPORT"
    DOCTOR_VISIT = "DOCTOR_VISIT"
    PRESCRIPTION = "PRESCRIPTION"
    MEDICINE = "MEDICINE"
    DIAGNOSIS = "DIAGNOSIS"
    PROCEDURE = "PROCEDURE"
    IMAGING = "IMAGING"
    VACCINATION = "VACCINATION"
    DOCUMENT = "DOCUMENT"


class TimelineEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "timeline_events"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[TimelineEventType] = mapped_column(Enum(TimelineEventType), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    occurred_at: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    related_report_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=True
    )
