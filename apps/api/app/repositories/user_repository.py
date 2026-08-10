import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import HealthifyId, HealthProfile, User, UserIdentity
from app.db.models.user_identity import IdentityType


class UserRepository:
    """Covers the `users` aggregate: User + UserIdentity + HealthifyId + HealthProfile.
    These are created together in one transaction (see AuthService.complete_registration)
    so they're read/written through a single repository rather than four.
    """

    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._db.get(User, user_id)

    async def find_identity_by_hash(
        self, identity_type: IdentityType, identity_value_hash: str
    ) -> UserIdentity | None:
        stmt = select(UserIdentity).where(
            UserIdentity.identity_type == identity_type,
            UserIdentity.identity_value_hash == identity_value_hash,
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def list_identities(self, user_id: uuid.UUID) -> list[UserIdentity]:
        stmt = select(UserIdentity).where(UserIdentity.user_id == user_id)
        return list((await self._db.execute(stmt)).scalars().all())

    async def get_healthify_id(self, user_id: uuid.UUID) -> HealthifyId | None:
        stmt = select(HealthifyId).where(HealthifyId.user_id == user_id)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def get_health_profile(self, user_id: uuid.UUID) -> HealthProfile | None:
        stmt = select(HealthProfile).where(HealthProfile.user_id == user_id)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def healthify_id_exists(self, healthify_id: str) -> bool:
        stmt = select(HealthifyId.id).where(HealthifyId.healthify_id == healthify_id)
        return (await self._db.execute(stmt)).scalar_one_or_none() is not None

    def add(self, instance: Base) -> None:  # generic add for the aggregate's models
        self._db.add(instance)
