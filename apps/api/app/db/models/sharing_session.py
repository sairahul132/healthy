import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class SharingSession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A patient-created share (§42/§43). The link/QR embeds the raw opaque
    token once, at creation time; only `token_hash` is ever persisted, the
    same selector/validator-free pattern as refresh tokens — the token
    itself must never be recoverable from a DB read (§134).
    """

    __tablename__ = "sharing_sessions"

    patient_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String, nullable=False, unique=True, index=True)
    recipient_identifier_encrypted: Mapped[str] = mapped_column(String, nullable=False)
    recipient_identifier_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
