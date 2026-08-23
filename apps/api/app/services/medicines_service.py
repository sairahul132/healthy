"""Medicine management (docs/SPEC.md §39) — manual entry, independent of
prescription OCR. Medication reminders (also §39) aren't built: that needs
a notification system this project doesn't have yet (see docs/ROADMAP.md).
"""

import uuid
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.errors import NotFoundError
from app.db.models import Medicine, TimelineEvent, TimelineEventType
from app.repositories.audit_repository import AuditRepository
from app.repositories.medicines_repository import MedicinesRepository
from app.schemas.medicines import CreateMedicineRequest, MedicineResponse, UpdateMedicineRequest


def _to_response(medicine: Medicine) -> MedicineResponse:
    return MedicineResponse(
        id=str(medicine.id),
        name=medicine.name,
        strength=medicine.strength,
        dosage=medicine.dosage,
        frequency=medicine.frequency,
        start_date=medicine.start_date,
        end_date=medicine.end_date,
        prescribing_doctor=medicine.prescribing_doctor,
        reason=medicine.reason,
        active=medicine.active,
    )


class MedicinesService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._medicines = MedicinesRepository(db)
        self._audit = AuditRepository(db)

    async def create(self, user_id: uuid.UUID, body: CreateMedicineRequest) -> MedicineResponse:
        medicine = Medicine(
            user_id=user_id,
            name=body.name,
            strength=body.strength,
            dosage=body.dosage,
            frequency=body.frequency,
            start_date=body.start_date,
            end_date=body.end_date,
            prescribing_doctor=body.prescribing_doctor,
            reason=body.reason,
            active=True,
        )
        self._medicines.add(medicine)
        await self._db.flush()

        self._medicines.add(  # generic add works for any model — see repository
            TimelineEvent(
                user_id=user_id,
                event_type=TimelineEventType.MEDICINE,
                title=body.name,
                description=body.reason,
                occurred_at=body.start_date or date.today(),
            )
        )

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.MEDICINE_CREATED,
            outcome="success",
            resource_type="medicine",
            resource_id=str(medicine.id),
            metadata={"name": body.name},
        )
        await self._db.commit()
        return _to_response(medicine)

    async def list_for_user(self, user_id: uuid.UUID) -> list[MedicineResponse]:
        medicines = await self._medicines.list_for_user(user_id)
        return [_to_response(m) for m in medicines]

    async def update(
        self, user_id: uuid.UUID, medicine_id: uuid.UUID, body: UpdateMedicineRequest
    ) -> MedicineResponse:
        medicine = await self._medicines.get_by_id(medicine_id)
        if medicine is None or medicine.user_id != user_id:
            raise NotFoundError("Medicine not found.")

        updates = body.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(medicine, field, value)

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.MEDICINE_UPDATED,
            outcome="success",
            resource_type="medicine",
            resource_id=str(medicine.id),
            metadata={"fields": list(updates.keys())},
        )
        await self._db.commit()
        return _to_response(medicine)
