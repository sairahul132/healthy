import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Session as SessionModel


class SessionRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def create(self, **kwargs: Any) -> SessionModel:
        session = SessionModel(**kwargs)
        self._db.add(session)
        return session

    async def get_active(self, session_id: uuid.UUID) -> SessionModel | None:
        stmt = select(SessionModel).where(
            SessionModel.id == session_id,
            SessionModel.revoked_at.is_(None),
            SessionModel.expires_at > datetime.now(UTC),
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def revoke(self, session_id: uuid.UUID) -> None:
        session = await self._db.get(SessionModel, session_id)
        if session is not None:
            session.revoked_at = datetime.now(UTC)

    async def revoke_all_for_user(self, user_id: uuid.UUID) -> None:
        stmt = select(SessionModel).where(
            SessionModel.user_id == user_id, SessionModel.revoked_at.is_(None)
        )
        for session in (await self._db.execute(stmt)).scalars():
            session.revoked_at = datetime.now(UTC)
