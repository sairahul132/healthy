from datetime import datetime

from pydantic import Field, field_validator

from app.core.health_categories import is_valid_category
from app.schemas.auth import validate_identifier
from app.schemas.base import CamelModel
from app.schemas.validation import validate_category_ids, validate_duration_hours


class CreateSharingSessionRequest(CamelModel):
    category_ids: list[str]
    recipient_identifier: str
    duration_hours: int

    @field_validator("category_ids")
    @classmethod
    def _categories(cls, v: list[str]) -> list[str]:
        return validate_category_ids(v)

    @field_validator("recipient_identifier")
    @classmethod
    def _identifier(cls, v: str) -> str:
        return validate_identifier(v)

    @field_validator("duration_hours")
    @classmethod
    def _duration(cls, v: int) -> int:
        return validate_duration_hours(v)


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
    healthy_id: str | None
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
    healthy_id: str
    categories: list[ShareCategoryStatus]
    expires_at: datetime
    data_note: str


class ShareStatusResponse(CamelModel):
    """Minimal, unaudited shape for polling — see
    SharingService.get_status: unlike get_categories, reading this does NOT
    write a SHARE_VIEWED audit row, since a background poll checking for a
    newly-approved category isn't a patient-meaningful "view" of their data."""

    category_ids: list[str]


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
        return validate_duration_hours(v)


class CreateAccessRequestResponse(CamelModel):
    id: str
    status: str
