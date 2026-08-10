import hashlib
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog


class AuditRepository:
    """Append-only writes only — no update/delete method exists on this repository
    on purpose (§55). The DB-level GRANT restriction (migration 0001) is the real
    enforcement; this is defense in depth at the application layer.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def _latest_hash(self) -> str | None:
        # Under concurrent writers this read-then-append has a race (two requests could
        # read the same prev_hash). Fine for Phase 1's traffic; before this matters at
        # scale, serialize via a Postgres advisory lock or a DB sequence-backed chain.
        stmt = select(AuditLog.row_hash).order_by(AuditLog.created_at.desc()).limit(1)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def record(
        self,
        *,
        actor_user_id: uuid.UUID | None,
        event_type: str,
        outcome: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        metadata: dict | None = None,
    ) -> AuditLog:
        prev_hash = await self._latest_hash()
        payload = (
            f"{prev_hash}|{actor_user_id}|{event_type}|{outcome}|"
            f"{resource_type}|{resource_id}|{metadata}"
        )
        row_hash = hashlib.sha256(payload.encode()).hexdigest()
        entry = AuditLog(
            actor_user_id=actor_user_id,
            event_type=event_type,
            outcome=outcome,
            resource_type=resource_type,
            resource_id=resource_id,
            event_metadata=metadata or {},
            prev_hash=prev_hash,
            row_hash=row_hash,
        )
        self._db.add(entry)
        return entry
