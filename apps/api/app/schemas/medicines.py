from datetime import date

from pydantic import Field

from app.schemas.base import CamelModel


class CreateMedicineRequest(CamelModel):
    name: str = Field(min_length=1, max_length=200)
    strength: str | None = Field(default=None, max_length=50)
    dosage: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    prescribing_doctor: str | None = Field(default=None, max_length=200)
    reason: str | None = Field(default=None, max_length=300)


class UpdateMedicineRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    strength: str | None = Field(default=None, max_length=50)
    dosage: str | None = Field(default=None, max_length=100)
    frequency: str | None = Field(default=None, max_length=100)
    start_date: date | None = None
    end_date: date | None = None
    prescribing_doctor: str | None = Field(default=None, max_length=200)
    reason: str | None = Field(default=None, max_length=300)
    active: bool | None = None


class MedicineResponse(CamelModel):
    id: str
    name: str
    strength: str | None
    dosage: str | None
    frequency: str | None
    start_date: date | None
    end_date: date | None
    prescribing_doctor: str | None
    reason: str | None
    active: bool
