import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import AiConversation, AiMessage


class AiRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:
        self._db.add(instance)

    async def get_conversation_by_id(self, conversation_id: uuid.UUID) -> AiConversation | None:
        return await self._db.get(AiConversation, conversation_id)

    async def list_conversations_for_user(self, user_id: uuid.UUID) -> list[AiConversation]:
        stmt = (
            select(AiConversation)
            .where(AiConversation.user_id == user_id)
            .order_by(AiConversation.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_messages(self, conversation_id: uuid.UUID) -> list[AiMessage]:
        # Ascending — chat order, unlike every other list_* in this codebase
        # (which lists newest-first for a feed/history view).
        stmt = (
            select(AiMessage)
            .where(AiMessage.conversation_id == conversation_id)
            .order_by(AiMessage.created_at.asc())
        )
        return list((await self._db.execute(stmt)).scalars().all())
