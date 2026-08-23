from datetime import datetime

from pydantic import Field

from app.schemas.base import CamelModel


class RegisterDoctorProfileRequest(CamelModel):
    full_name: str = Field(min_length=1, max_length=200)
    registration_number: str = Field(min_length=1, max_length=100)
    organization: str = Field(min_length=1, max_length=200)
    specialty: str | None = Field(default=None, max_length=120)


class DoctorProfileResponse(CamelModel):
    id: str
    full_name: str
    registration_number: str
    organization: str
    specialty: str | None
    verification_status: str  # pending | verified | rejected
    verified_at: datetime | None


class DoctorPatientSessionResponse(CamelModel):
    session_id: str
    healthy_id: str
    category_ids: list[str]
    status: str  # active | expired | revoked
    created_at: datetime
    expires_at: datetime
