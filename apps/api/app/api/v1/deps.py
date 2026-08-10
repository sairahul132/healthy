import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import UnauthorizedError
from app.core.security import decode_access_token
from app.db.base import get_db
from app.db.models import SharingSession
from app.providers.otp_provider import OtpProvider, get_otp_provider
from app.providers.rate_limiter import RateLimiter, get_rate_limiter
from app.services.auth_service import AuthService
from app.services.sharing_service import SharingService

ACCESS_COOKIE_NAME = "hfy_access"
REFRESH_COOKIE_NAME = "hfy_refresh"


@dataclass(frozen=True)
class CurrentIdentity:
    user_id: uuid.UUID
    session_id: uuid.UUID


async def get_current_identity(request: Request) -> CurrentIdentity:
    """Zero-trust: every protected route depends on this, never on anything
    the frontend claims about itself (§67). A missing/expired/malformed
    access token is always 401, regardless of what cookie is present.
    """
    token = request.cookies.get(ACCESS_COOKIE_NAME)
    if not token:
        raise UnauthorizedError("Not authenticated.")
    try:
        payload = decode_access_token(token)
    except jwt.PyJWTError as exc:
        raise UnauthorizedError("Session expired.") from exc
    try:
        return CurrentIdentity(
            user_id=uuid.UUID(payload["sub"]), session_id=uuid.UUID(payload["sid"])
        )
    except (KeyError, ValueError) as exc:
        raise UnauthorizedError("Invalid session.") from exc


def get_auth_service(
    db: AsyncSession = Depends(get_db),
    otp_provider: OtpProvider = Depends(get_otp_provider),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> AuthService:
    return AuthService(db, otp_provider=otp_provider, rate_limiter=rate_limiter)


def get_sharing_service(
    db: AsyncSession = Depends(get_db),
    otp_provider: OtpProvider = Depends(get_otp_provider),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> SharingService:
    return SharingService(db, otp_provider=otp_provider, rate_limiter=rate_limiter)


async def get_authenticated_share_session(
    token: str,
    authorization: str | None = Header(default=None),
    service: SharingService = Depends(get_sharing_service),
) -> SharingSession:
    """A recipient is a different kind of actor than a patient — verified
    for one specific share only, never given a cookie session. They send
    the short-lived token from POST /share/{token}/otp/verify as a Bearer
    header instead (§43/§44)."""
    if not authorization or not authorization.lower().startswith("bearer "):
        raise UnauthorizedError("Not authenticated.")
    bearer_token = authorization.split(" ", 1)[1].strip()
    return await service.resolve_recipient_token(token, bearer_token)
