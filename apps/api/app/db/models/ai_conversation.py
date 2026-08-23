import enum
import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class AiMessageRole(str, enum.Enum):
    USER = "USER"
    ASSISTANT = "ASSISTANT"


class AiConversation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One "Ask Healthy" chat thread (docs/ROADMAP.md Phase 7). `context_snapshot`
    is computed once at creation from the user's own data (active medicines,
    recent non-normal results) and reused for every turn's system prompt rather
    than rescanned per message — see app/services/ai_service.py."""

    __tablename__ = "ai_conversations"

    user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str | None] = mapped_column(String(200), nullable=True)
    context_snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)


class AiMessage(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """One turn in an AiConversation. `role` distinguishes the patient's own
    message from the AI provider's generated reply."""

    __tablename__ = "ai_messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[AiMessageRole] = mapped_column(
        Enum(AiMessageRole, name="ai_message_role"), nullable=False
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)
