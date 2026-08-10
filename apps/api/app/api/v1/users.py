from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_auth_service, get_current_identity
from app.schemas.user import UpdateProfileRequest, UserResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
async def get_me(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return await service.get_user_response(identity.user_id)


@router.patch("/me", response_model=UserResponse)
async def update_me(
    body: UpdateProfileRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AuthService = Depends(get_auth_service),
) -> UserResponse:
    return await service.update_profile(identity.user_id, body)
