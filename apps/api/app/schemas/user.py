from datetime import date, datetime

from app.schemas.base import CamelModel


class EmergencyContact(CamelModel):
    name: str
    relationship: str
    phone: str


class UserResponse(CamelModel):
    healthify_id: str
    name: str | None
    date_of_birth: date | None
    sex: str | None
    phone: str | None
    email: str | None
    blood_group: str | None
    emergency_contact: EmergencyContact | None
    allergies: list[str]
    current_medications: list[str]
    preferred_language: str
    created_at: datetime


class SessionResponse(CamelModel):
    user: UserResponse


class UpdateProfileRequest(CamelModel):
    """PATCH semantics: only fields present in the request body are
    changed — `model_dump(exclude_unset=True)` in the service is what makes
    that distinction, not a default here."""

    name: str | None = None
    date_of_birth: str | None = None
    sex: str | None = None
    blood_group: str | None = None
    emergency_contact: EmergencyContact | None = None
    allergies: list[str] | None = None
    current_medications: list[str] | None = None
