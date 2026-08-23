import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import OtpChallenge


class OtpRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def create(self, **kwargs: Any) -> OtpChallenge:
        challenge = OtpChallenge(**kwargs)
        self._db.add(challenge)
        return challenge

    async def get_latest_active(self, identity_value_hash: str) -> OtpChallenge | None:
        stmt = (
            select(OtpChallenge)
            .where(
                OtpChallenge.identity_value_hash == identity_value_hash,
                OtpChallenge.consumed_at.is_(None),
                OtpChallenge.expires_at > datetime.now(UTC),
            )
            .order_by(OtpChallenge.created_at.desc())
            .limit(1)
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def get_by_id(self, challenge_id: uuid.UUID) -> OtpChallenge | None:
        return await self._db.get(OtpChallenge, challenge_id)
