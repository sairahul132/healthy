import re

from pydantic import Field, field_validator

from app.schemas.base import CamelModel

_PHONE_PATTERN = re.compile(r"^\+?[1-9]\d{7,14}$")
_EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def validate_identifier(value: str) -> str:
    """Mirrors apps/web's lib/validation/auth.ts identifierSchema — the
    frontend validates too, but the backend can never trust that (§67)."""
    value = value.strip()
    if not (_PHONE_PATTERN.match(value) or _EMAIL_PATTERN.match(value)):
        raise ValueError("Enter a valid mobile number (with country code) or email address.")
    return value


class IdentifierRequest(CamelModel):
    identifier: str = Field(min_length=1, max_length=254)

    @field_validator("identifier")
    @classmethod
    def _validate_identifier(cls, v: str) -> str:
        return validate_identifier(v)


class OtpChallengeResponse(CamelModel):
    identifier: str
    retry_after_seconds: int
    expires_in_seconds: int


class VerifyOtpRequest(CamelModel):
    identifier: str
    code: str = Field(pattern=r"^\d{6}$")

    @field_validator("identifier")
    @classmethod
    def _validate_identifier(cls, v: str) -> str:
        return validate_identifier(v)
