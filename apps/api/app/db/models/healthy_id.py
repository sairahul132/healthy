import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class HealthyId(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "healthy_ids"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
    )
    healthy_id: Mapped[str] = mapped_column(String(14), nullable=False, unique=True, index=True)
