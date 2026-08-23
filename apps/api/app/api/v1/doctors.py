import uuid

from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_doctor_service
from app.schemas.doctors import (
    DoctorPatientSessionResponse,
    DoctorProfileResponse,
    RegisterDoctorProfileRequest,
)
from app.schemas.reports import LabResultResponse
from app.schemas.sharing import ShareCategoriesResponse
from app.services.doctor_service import DoctorService

router = APIRouter(prefix="/doctors", tags=["doctors"])


@router.post("/register", response_model=DoctorProfileResponse, status_code=201)
async def register_profile(
    body: RegisterDoctorProfileRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorProfileResponse:
    return await service.register_profile(identity.user_id, body)


@router.get("/me", response_model=DoctorProfileResponse)
async def get_profile(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: DoctorService = Depends(get_doctor_service),
) -> DoctorProfileResponse:
    return await service.get_profile(identity.user_id)


@router.get("/patients", response_model=list[DoctorPatientSessionResponse])
async def list_patients(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: DoctorService = Depends(get_doctor_service),
) -> list[DoctorPatientSessionResponse]:
    return await service.list_patients(identity.user_id)


@router.get("/patients/{session_id}/categories", response_model=ShareCategoriesResponse)
async def get_patient_categories(
    session_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: DoctorService = Depends(get_doctor_service),
) -> ShareCategoriesResponse:
    return await service.get_patient_categories(identity.user_id, session_id)


@router.get(
    "/patients/{session_id}/categories/{category}/results", response_model=list[LabResultResponse]
)
async def get_patient_category_results(
    session_id: uuid.UUID,
    category: str,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: DoctorService = Depends(get_doctor_service),
) -> list[LabResultResponse]:
    return await service.get_patient_category_results(identity.user_id, session_id, category)
