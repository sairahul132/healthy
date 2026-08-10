import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.time import ensure_utc, utcnow
from app.db.base import Base
from app.db.models import AccessRequest, SharingSession, SharingSessionScope
from app.db.models.access_request import AccessRequestStatus


class SharingRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:  # generic add, mirrors UserRepository
        self._db.add(instance)

    async def get_session_by_id(self, session_id: uuid.UUID) -> SharingSession | None:
        return await self._db.get(SharingSession, session_id)

    async def get_session_by_token_hash(self, token_hash: str) -> SharingSession | None:
        stmt = select(SharingSession).where(SharingSession.token_hash == token_hash)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def list_sessions_for_patient(self, patient_user_id: uuid.UUID) -> list[SharingSession]:
        stmt = (
            select(SharingSession)
            .where(SharingSession.patient_user_id == patient_user_id)
            .order_by(SharingSession.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_scopes(self, session_id: uuid.UUID) -> list[SharingSessionScope]:
        stmt = select(SharingSessionScope).where(SharingSessionScope.session_id == session_id)
        return list((await self._db.execute(stmt)).scalars().all())

    async def scope_exists(self, session_id: uuid.UUID, category: str) -> bool:
        stmt = select(SharingSessionScope.id).where(
            SharingSessionScope.session_id == session_id, SharingSessionScope.category == category
        )
        return (await self._db.execute(stmt)).scalar_one_or_none() is not None

    async def get_access_request(self, request_id: uuid.UUID) -> AccessRequest | None:
        return await self._db.get(AccessRequest, request_id)

    async def list_requests_for_patient(
        self, patient_user_id: uuid.UUID, *, pending_only: bool
    ) -> list[tuple[AccessRequest, SharingSession]]:
        """Returns (request, its parent session) pairs — no ORM relationship
        is declared between them, so the join is explicit here rather than
        via lazy/selectin-load."""
        stmt = (
            select(AccessRequest, SharingSession)
            .join(SharingSession, AccessRequest.session_id == SharingSession.id)
            .where(SharingSession.patient_user_id == patient_user_id)
            .order_by(AccessRequest.created_at.desc())
        )
        if pending_only:
            stmt = stmt.where(AccessRequest.status == AccessRequestStatus.PENDING)
        result = await self._db.execute(stmt)
        return [(row[0], row[1]) for row in result.all()]

    async def pending_request_exists(self, session_id: uuid.UUID, category: str) -> bool:
        stmt = select(AccessRequest.id).where(
            AccessRequest.session_id == session_id,
            AccessRequest.category == category,
            AccessRequest.status == AccessRequestStatus.PENDING,
        )
        return (await self._db.execute(stmt)).scalar_one_or_none() is not None


def is_session_active(session: SharingSession) -> bool:
    return session.revoked_at is None and ensure_utc(session.expires_at) > utcnow()
