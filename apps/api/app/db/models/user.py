from datetime import datetime

from sqlalchemy import Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Deliberately minimal: no name/phone/email/health fields here. Those live in
    UserIdentity and HealthProfile — see docs/DATABASE.md on PII/health segregation (§9).
    """

    __tablename__ = "users"

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Activity-history "clear" cutoff (see ReportsService.clear_history) — the
    # underlying AuditLog rows are append-only (§55) and never deleted, so
    # "clearing" history just moves this forward and the history read filters
    # to events after it, rather than mutating/removing audit rows.
    history_cleared_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
