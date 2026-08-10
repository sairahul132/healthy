import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class IdentityType(str, enum.Enum):
    PHONE = "phone"
    EMAIL = "email"


class UserIdentity(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Phone/email live here, encrypted, separate from health data (§9). Lookups go
    through `identity_value_hash` (HMAC), never a plaintext scan of `identity_value_encrypted`.
    """

    __tablename__ = "user_identities"
    __table_args__ = (
        UniqueConstraint("identity_type", "identity_value_hash", name="uq_identity_lookup"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    identity_type: Mapped[IdentityType] = mapped_column(Enum(IdentityType), nullable=False)
    identity_value_encrypted: Mapped[str] = mapped_column(String, nullable=False)
    identity_value_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
