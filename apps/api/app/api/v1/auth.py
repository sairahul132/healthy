import uuid

from fastapi import APIRouter, Depends, Request, Response

from app.api.v1.cookies import clear_session_cookies, set_session_cookies
from app.api.v1.deps import (
    REFRESH_COOKIE_NAME,
    CurrentIdentity,
    get_auth_service,
    get_current_identity,
)
from app.core.errors import UnauthorizedError
from app.core.security import decode_access_token
from app.schemas.auth import IdentifierRequest, OtpChallengeResponse, VerifyOtpRequest
from app.schemas.user import SessionResponse
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=OtpChallengeResponse)
async def register(
    body: IdentifierRequest, service: AuthService = Depends(get_auth_service)
) -> OtpChallengeResponse:
    retry_after, expires_in = await service.request_register_otp(body.identifier)
    return OtpChallengeResponse(
        identifier=body.identifier, retry_after_seconds=retry_after, expires_in_seconds=expires_in
    )


@router.post("/login", response_model=OtpChallengeResponse)
async def login(
    body: IdentifierRequest, service: AuthService = Depends(get_auth_service)
) -> OtpChallengeResponse:
    retry_after, expires_in = await service.request_login_otp(body.identifier)
    return OtpChallengeResponse(
        identifier=body.identifier, retry_after_seconds=retry_after, expires_in_seconds=expires_in
    )


@router.post("/verify-otp", response_model=SessionResponse)
async def verify_otp(
    body: VerifyOtpRequest,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    user, access_token, refresh_cookie_value = await service.verify_otp(body.identifier, body.code)
    set_session_cookies(
        response, access_token=access_token, refresh_cookie_value=refresh_cookie_value
    )
    user_response = await service.get_user_response(user.id)
    return SessionResponse(user=user_response)


@router.post("/refresh", response_model=SessionResponse)
async def refresh(
    request: Request,
    response: Response,
    service: AuthService = Depends(get_auth_service),
) -> SessionResponse:
    refresh_cookie_value = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_cookie_value:
        raise UnauthorizedError("Not authenticated.")

    access_token, new_refresh_cookie_value = await service.refresh(refresh_cookie_value)
    set_session_cookies(
        response, access_token=access_token, refresh_cookie_value=new_refresh_cookie_value
    )

    payload = decode_access_token(access_token)
    user_response = await service.get_user_response(uuid.UUID(payload["sub"]))
    return SessionResponse(user=user_response)


@router.post("/logout", status_code=204)
async def logout(
    response: Response,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AuthService = Depends(get_auth_service),
) -> None:
    await service.logout(identity.session_id, identity.user_id)
    clear_session_cookies(response)
