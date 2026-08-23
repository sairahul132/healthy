import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import Medicine


class MedicinesRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:
        self._db.add(instance)

    async def get_by_id(self, medicine_id: uuid.UUID) -> Medicine | None:
        return await self._db.get(Medicine, medicine_id)

    async def list_for_user(self, user_id: uuid.UUID) -> list[Medicine]:
        stmt = (
            select(Medicine).where(Medicine.user_id == user_id).order_by(Medicine.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())
