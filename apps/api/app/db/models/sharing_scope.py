import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import UUIDPrimaryKeyMixin
from app.db.types import GUID


class SharingSessionScope(UUIDPrimaryKeyMixin, Base):
    """One row per health category a sharing session grants access to
    (§50 granular permissions, category level). The backend has no lab
    report store yet (Phase 2/§76 OCR pipeline not built) — a granted scope
    controls *category-level authorization*, not report content, until
    reports exist server-side.
    """

    __tablename__ = "sharing_session_scopes"
    __table_args__ = (UniqueConstraint("session_id", "category", name="uq_scope_category"),)

    session_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("sharing_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
