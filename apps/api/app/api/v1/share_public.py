from fastapi import APIRouter, Depends

from app.api.v1.deps import get_authenticated_share_session, get_sharing_service
from app.db.models import SharingSession
from app.schemas.sharing import (
    CreateAccessRequestRequest,
    CreateAccessRequestResponse,
    ShareAccessTokenResponse,
    ShareCategoriesResponse,
    ShareOtpChallengeResponse,
    ShareOtpRequest,
    ShareOtpVerifyRequest,
    SharePreviewResponse,
)
from app.services.sharing_service import SharingService

# Deliberately unauthenticated (patient-session-wise) — this is the
# recipient-facing side of sharing (§43-46). Every route here re-validates
# the token/session itself; nothing is trusted from the caller (§67).
router = APIRouter(prefix="/share", tags=["share-public"])


@router.get("/{token}", response_model=SharePreviewResponse)
async def preview(
    token: str, service: SharingService = Depends(get_sharing_service)
) -> SharePreviewResponse:
    return await service.get_preview(token)


@router.post("/{token}/otp/request", response_model=ShareOtpChallengeResponse)
async def request_otp(
    token: str, body: ShareOtpRequest, service: SharingService = Depends(get_sharing_service)
) -> ShareOtpChallengeResponse:
    retry_after = await service.request_recipient_otp(token, body.identifier)
    return ShareOtpChallengeResponse(retry_after_seconds=retry_after)


@router.post("/{token}/otp/verify", response_model=ShareAccessTokenResponse)
async def verify_otp(
    token: str, body: ShareOtpVerifyRequest, service: SharingService = Depends(get_sharing_service)
) -> ShareAccessTokenResponse:
    access_token, ttl_minutes = await service.verify_recipient_otp(
        token, body.identifier, body.code
    )
    return ShareAccessTokenResponse(access_token=access_token, expires_in_minutes=ttl_minutes)


@router.get("/{token}/categories", response_model=ShareCategoriesResponse)
async def get_categories(
    session: SharingSession = Depends(get_authenticated_share_session),
    service: SharingService = Depends(get_sharing_service),
) -> ShareCategoriesResponse:
    return await service.get_categories(session)


@router.post("/{token}/requests", response_model=CreateAccessRequestResponse, status_code=201)
async def create_access_request(
    body: CreateAccessRequestRequest,
    session: SharingSession = Depends(get_authenticated_share_session),
    service: SharingService = Depends(get_sharing_service),
) -> CreateAccessRequestResponse:
    request = await service.create_access_request(
        session,
        category=body.category,
        reason=body.reason,
        requested_duration_hours=body.requested_duration_hours,
    )
    return CreateAccessRequestResponse(id=str(request.id), status=request.status.value)
