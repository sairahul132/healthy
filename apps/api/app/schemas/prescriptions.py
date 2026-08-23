from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel


class PrescriptionResponse(CamelModel):
    id: str
    file_name: str
    status: str
    failure_reason: str | None
    doctor_name: str | None
    prescribed_date: date | None
    item_count: int
    uploaded_at: datetime


class PrescriptionItemResponse(CamelModel):
    id: str
    prescription_id: str
    medicine_name: str
    dosage: str | None
    frequency: str | None
    duration: str | None
    extraction_confidence: float
    corrected: bool


class CorrectPrescriptionItemRequest(CamelModel):
    medicine_name: str = Field(min_length=1, max_length=200)
    dosage: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    duration: str | None = Field(default=None, max_length=100)
