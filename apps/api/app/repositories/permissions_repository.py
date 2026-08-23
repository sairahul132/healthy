import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import PermissionRole, PermissionRoleScope


class PermissionsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:
        self._db.add(instance)

    async def get_role_by_id(self, role_id: uuid.UUID) -> PermissionRole | None:
        return await self._db.get(PermissionRole, role_id)

    async def list_roles_for_user(self, user_id: uuid.UUID) -> list[PermissionRole]:
        stmt = (
            select(PermissionRole)
            .where(PermissionRole.patient_user_id == user_id)
            .order_by(PermissionRole.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_scopes(self, role_id: uuid.UUID) -> list[PermissionRoleScope]:
        stmt = select(PermissionRoleScope).where(PermissionRoleScope.role_id == role_id)
        return list((await self._db.execute(stmt)).scalars().all())

    async def delete(self, instance: Base) -> None:
        await self._db.delete(instance)
