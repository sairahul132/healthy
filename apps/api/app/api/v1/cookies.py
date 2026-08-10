from fastapi import Response

from app.api.v1.deps import ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
from app.core.config import get_settings


def set_session_cookies(
    response: Response, *, access_token: str, refresh_cookie_value: str
) -> None:
    settings = get_settings()
    # `secure=False` in dev only because localhost is typically plain HTTP;
    # this MUST be True (the default posture) anywhere reachable over the
    # network (§106).
    secure = settings.is_production
    response.set_cookie(
        ACCESS_COOKIE_NAME,
        access_token,
        max_age=settings.access_token_ttl_minutes * 60,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )
    response.set_cookie(
        REFRESH_COOKIE_NAME,
        refresh_cookie_value,
        max_age=settings.refresh_token_ttl_days * 86400,
        httponly=True,
        secure=secure,
        samesite="lax",
        path="/",
    )


def clear_session_cookies(response: Response) -> None:
    response.delete_cookie(ACCESS_COOKIE_NAME, path="/")
    response.delete_cookie(REFRESH_COOKIE_NAME, path="/")
