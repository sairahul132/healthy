import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class DoctorVerificationStatus(str, enum.Enum):
    """§131: a doctor account must never display as verified until it
    actually has been. PENDING is the only state a doctor can reach via the
    API — VERIFIED only happens through the operator-run
    scripts/verify_doctor.py (§72: no hidden "master admin" API bypass)."""

    PENDING = "pending"
    VERIFIED = "verified"
    REJECTED = "rejected"


class DoctorProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A doctor's professional identity, layered on top of the same `User`/
    OTP-auth account a patient uses (§9's "logical security boundaries" is
    about data segregation, not necessarily separate login systems — the
    same person's account can carry both a HealthProfile and a
    DoctorProfile; nothing about being a doctor grants them patient-data
    access beyond what an explicit SharingSession still requires, per §132).
    """

    __tablename__ = "doctor_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    registration_number: Mapped[str] = mapped_column(String(100), nullable=False)
    organization: Mapped[str] = mapped_column(String(200), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(120), nullable=True)
    verification_status: Mapped[DoctorVerificationStatus] = mapped_column(
        Enum(DoctorVerificationStatus), default=DoctorVerificationStatus.PENDING, nullable=False
    )
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
