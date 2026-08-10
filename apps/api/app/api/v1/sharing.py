import uuid

from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_sharing_service
from app.schemas.sharing import (
    AccessRequestResponse,
    CreateSharingSessionRequest,
    SharingSessionResponse,
)
from app.services.sharing_service import SharingService

router = APIRouter(prefix="/sharing", tags=["sharing"])


@router.post("/sessions", response_model=SharingSessionResponse, status_code=201)
async def create_session(
    body: CreateSharingSessionRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> SharingSessionResponse:
    return await service.create_session(
        patient_user_id=identity.user_id,
        category_ids=body.category_ids,
        recipient_identifier=body.recipient_identifier,
        duration_hours=body.duration_hours,
    )


@router.get("/sessions", response_model=list[SharingSessionResponse])
async def list_sessions(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> list[SharingSessionResponse]:
    return await service.list_sessions(identity.user_id)


@router.post("/sessions/{session_id}/revoke", status_code=204)
async def revoke_session(
    session_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> None:
    await service.revoke_session(identity.user_id, session_id)


@router.get("/requests", response_model=list[AccessRequestResponse])
async def list_access_requests(
    pending_only: bool = Query(default=True, alias="pendingOnly"),
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> list[AccessRequestResponse]:
    return await service.list_access_requests(identity.user_id, pending_only=pending_only)


@router.post("/requests/{request_id}/approve", status_code=204)
async def approve_request(
    request_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> None:
    await service.decide_access_request(identity.user_id, request_id, approve=True)


@router.post("/requests/{request_id}/decline", status_code=204)
async def decline_request(
    request_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: SharingService = Depends(get_sharing_service),
) -> None:
    await service.decide_access_request(identity.user_id, request_id, approve=False)
