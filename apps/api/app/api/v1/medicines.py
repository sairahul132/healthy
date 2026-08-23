import uuid

from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_medicines_service
from app.schemas.medicines import CreateMedicineRequest, MedicineResponse, UpdateMedicineRequest
from app.services.medicines_service import MedicinesService

router = APIRouter(prefix="/medicines", tags=["medicines"])


@router.post("", response_model=MedicineResponse, status_code=201)
async def create_medicine(
    body: CreateMedicineRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: MedicinesService = Depends(get_medicines_service),
) -> MedicineResponse:
    return await service.create(identity.user_id, body)


@router.get("", response_model=list[MedicineResponse])
async def list_medicines(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: MedicinesService = Depends(get_medicines_service),
) -> list[MedicineResponse]:
    return await service.list_for_user(identity.user_id)


@router.patch("/{medicine_id}", response_model=MedicineResponse)
async def update_medicine(
    medicine_id: uuid.UUID,
    body: UpdateMedicineRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: MedicinesService = Depends(get_medicines_service),
) -> MedicineResponse:
    return await service.update(identity.user_id, medicine_id, body)
