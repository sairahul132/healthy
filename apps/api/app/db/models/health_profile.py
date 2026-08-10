import enum
import uuid
from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID, JSONEncodedDict


class Sex(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"
    UNSPECIFIED = "unspecified"


class HealthProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Phase 1 subset of §13. No sensitive field is required — matches "do not make
    sensitive fields mandatory unless required."
    """

    __tablename__ = "health_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    display_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    date_of_birth: Mapped[date | None] = mapped_column(Date, nullable=True)
    sex: Mapped[Sex] = mapped_column(Enum(Sex), default=Sex.UNSPECIFIED, nullable=False)
    blood_group: Mapped[str | None] = mapped_column(String(5), nullable=True)
    # Free-text lists, not yet a normalized allergy/medicine catalog (that's
    # §22-28/§38-39 territory — out of scope until reports/prescriptions are
    # real). Stored as plain JSON, not encrypted: no PII, just clinical
    # free-text the user typed in themselves.
    allergies: Mapped[list[str]] = mapped_column(JSONEncodedDict, default=list, nullable=False)
    current_medications: Mapped[list[str]] = mapped_column(
        JSONEncodedDict, default=list, nullable=False
    )
    emergency_contact: Mapped[dict | None] = mapped_column(JSONEncodedDict, nullable=True)
    preferred_language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
