import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_prescriptions_service
from app.db.base import get_session_factory
from app.providers.ocr_provider import OcrProvider, get_ocr_provider
from app.providers.storage_provider import StorageProvider, get_storage_provider
from app.providers.virus_scan_provider import VirusScanProvider, get_virus_scan_provider
from app.schemas.prescriptions import (
    CorrectPrescriptionItemRequest,
    PrescriptionItemResponse,
    PrescriptionResponse,
)
from app.services.prescriptions_service import PrescriptionsService

router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


async def _run_processing(
    prescription_id: uuid.UUID,
    session_factory: async_sessionmaker[AsyncSession],
    storage: StorageProvider,
    virus_scanner: VirusScanProvider,
    ocr: OcrProvider,
) -> None:
    async with session_factory() as db:
        service = PrescriptionsService(db, storage=storage, virus_scanner=virus_scanner, ocr=ocr)
        await service.process_prescription(prescription_id)


@router.post("/upload", response_model=PrescriptionResponse, status_code=201)
async def upload_prescription(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PrescriptionsService = Depends(get_prescriptions_service),
    session_factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    storage: StorageProvider = Depends(get_storage_provider),
    virus_scanner: VirusScanProvider = Depends(get_virus_scan_provider),
    ocr: OcrProvider = Depends(get_ocr_provider),
) -> PrescriptionResponse:
    data = await file.read()
    response = await service.upload_prescription(
        identity.user_id, filename=file.filename or "prescription", data=data
    )
    background_tasks.add_task(
        _run_processing, uuid.UUID(response.id), session_factory, storage, virus_scanner, ocr
    )
    return response


@router.get("", response_model=list[PrescriptionResponse])
async def list_prescriptions(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PrescriptionsService = Depends(get_prescriptions_service),
) -> list[PrescriptionResponse]:
    return await service.list_prescriptions(identity.user_id)


@router.get("/{prescription_id}", response_model=PrescriptionResponse)
async def get_prescription(
    prescription_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PrescriptionsService = Depends(get_prescriptions_service),
) -> PrescriptionResponse:
    return await service.get_prescription(identity.user_id, prescription_id)


@router.get("/{prescription_id}/items", response_model=list[PrescriptionItemResponse])
async def get_items(
    prescription_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PrescriptionsService = Depends(get_prescriptions_service),
) -> list[PrescriptionItemResponse]:
    return await service.get_items(identity.user_id, prescription_id)


@router.patch("/{prescription_id}/items/{item_id}", response_model=PrescriptionItemResponse)
async def correct_item(
    prescription_id: uuid.UUID,
    item_id: uuid.UUID,
    body: CorrectPrescriptionItemRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PrescriptionsService = Depends(get_prescriptions_service),
) -> PrescriptionItemResponse:
    return await service.correct_item(identity.user_id, prescription_id, item_id, body)
