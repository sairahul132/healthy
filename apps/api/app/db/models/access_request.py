import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class AccessRequestStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DECLINED = "declined"


class AccessRequest(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A recipient asking for a category beyond what the patient already
    granted (§47/§48). Approving one adds a SharingSessionScope row.
    """

    __tablename__ = "access_requests"

    session_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("sharing_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    reason: Mapped[str] = mapped_column(String(500), nullable=False)
    requested_duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[AccessRequestStatus] = mapped_column(
        Enum(AccessRequestStatus), default=AccessRequestStatus.PENDING, nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
