from datetime import datetime

from pydantic import Field, field_validator

from app.core.health_categories import is_valid_category
from app.schemas.auth import validate_identifier
from app.schemas.base import CamelModel

MIN_DURATION_HOURS = 1
MAX_DURATION_HOURS = 24 * 30  # 30 days


def _validate_categories(value: list[str]) -> list[str]:
    if not value:
        raise ValueError("Select at least one category to share.")
    invalid = [c for c in value if not is_valid_category(c)]
    if invalid:
        raise ValueError(f"Unknown category: {', '.join(invalid)}")
    return list(dict.fromkeys(value))  # de-dupe, preserve order


def _validate_duration(value: int) -> int:
    if not (MIN_DURATION_HOURS <= value <= MAX_DURATION_HOURS):
        raise ValueError(
            f"Duration must be between {MIN_DURATION_HOURS} and {MAX_DURATION_HOURS} hours."
        )
    return value


class CreateSharingSessionRequest(CamelModel):
    category_ids: list[str]
    recipient_identifier: str
    duration_hours: int

    @field_validator("category_ids")
    @classmethod
    def _categories(cls, v: list[str]) -> list[str]:
        return _validate_categories(v)

    @field_validator("recipient_identifier")
    @classmethod
    def _identifier(cls, v: str) -> str:
        return validate_identifier(v)

    @field_validator("duration_hours")
    @classmethod
    def _duration(cls, v: int) -> int:
        return _validate_duration(v)


class SharingSessionResponse(CamelModel):
    id: str
    share_url: str
    recipient_identifier_masked: str
    category_ids: list[str]
    status: str  # active | expired | revoked
    created_at: datetime
    expires_at: datetime
    revoked_at: datetime | None


class AccessRequestResponse(CamelModel):
    id: str
    session_id: str
    category: str
    reason: str
    requested_duration_hours: int
    recipient_identifier_masked: str
    status: str
    created_at: datetime
    decided_at: datetime | None


# --- Recipient-facing (public) ---


class SharePreviewResponse(CamelModel):
    healthify_id: str | None
    status: str  # active | expired | revoked


class ShareOtpRequest(CamelModel):
    identifier: str

    @field_validator("identifier")
    @classmethod
    def _identifier(cls, v: str) -> str:
        return validate_identifier(v)


class ShareOtpChallengeResponse(CamelModel):
    retry_after_seconds: int


class ShareOtpVerifyRequest(CamelModel):
    identifier: str
    code: str = Field(pattern=r"^\d{6}$")

    @field_validator("identifier")
    @classmethod
    def _identifier(cls, v: str) -> str:
        return validate_identifier(v)


class ShareAccessTokenResponse(CamelModel):
    access_token: str
    expires_in_minutes: int


class ShareCategoryStatus(CamelModel):
    id: str
    authorized: bool


class ShareCategoriesResponse(CamelModel):
    healthify_id: str
    categories: list[ShareCategoryStatus]
    expires_at: datetime
    data_note: str


class CreateAccessRequestRequest(CamelModel):
    category: str
    reason: str = Field(min_length=1, max_length=500)
    requested_duration_hours: int

    @field_validator("category")
    @classmethod
    def _category(cls, v: str) -> str:
        if not is_valid_category(v):
            raise ValueError(f"Unknown category: {v}")
        return v

    @field_validator("requested_duration_hours")
    @classmethod
    def _duration(cls, v: int) -> int:
        return _validate_duration(v)


class CreateAccessRequestResponse(CamelModel):
    id: str
    status: str
