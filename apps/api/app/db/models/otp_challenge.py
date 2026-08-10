import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import UUIDPrimaryKeyMixin
from app.db.types import GUID


class OtpChallenge(UUIDPrimaryKeyMixin, Base):
    """Only the argon2 hash of the OTP code is ever stored (§10).

    Shared between two contexts: a patient authenticating themselves
    (`context="patient_auth"`, `sharing_session_id` null) and a sharing
    recipient authenticating to view a specific share
    (`context="share_recipient"`, scoped to `sharing_session_id` so a code
    issued for one share can't be replayed against another).
    """

    __tablename__ = "otp_challenges"

    user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True
    )
    context: Mapped[str] = mapped_column(String(32), nullable=False, default="patient_auth")
    sharing_session_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("sharing_sessions.id", ondelete="CASCADE"), nullable=True, index=True
    )
    identity_value_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    otp_code_hash: Mapped[str] = mapped_column(String, nullable=False)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
