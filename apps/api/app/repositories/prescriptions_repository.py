import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import Prescription, PrescriptionItem


class PrescriptionsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:
        self._db.add(instance)

    async def get_by_id(self, prescription_id: uuid.UUID) -> Prescription | None:
        return await self._db.get(Prescription, prescription_id)

    async def list_for_user(self, user_id: uuid.UUID) -> list[Prescription]:
        stmt = (
            select(Prescription)
            .where(Prescription.user_id == user_id)
            .order_by(Prescription.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_items(self, prescription_id: uuid.UUID) -> list[PrescriptionItem]:
        stmt = select(PrescriptionItem).where(PrescriptionItem.prescription_id == prescription_id)
        return list((await self._db.execute(stmt)).scalars().all())

    async def get_item(self, item_id: uuid.UUID) -> PrescriptionItem | None:
        return await self._db.get(PrescriptionItem, item_id)
