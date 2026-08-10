import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import UUIDPrimaryKeyMixin
from app.db.types import GUID, JSONEncodedDict


class AuditLog(UUIDPrimaryKeyMixin, Base):
    """Append-only (§54/§55). The `healthy_audit_writer` DB role used by the API has
    GRANT INSERT, SELECT only — no UPDATE/DELETE — see alembic migration 0001.
    `row_hash` chains from `prev_hash` so any out-of-band tampering breaks the chain.
    """

    __tablename__ = "audit_logs"

    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    resource_type: Mapped[str | None] = mapped_column(String(64), nullable=True)
    resource_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    outcome: Mapped[str] = mapped_column(String(16), nullable=False)
    event_metadata: Mapped[dict] = mapped_column(JSONEncodedDict, default=dict, nullable=False)
    prev_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    row_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
