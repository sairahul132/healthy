from datetime import datetime

from pydantic import Field, field_validator

from app.schemas.base import CamelModel
from app.schemas.validation import validate_category_ids, validate_duration_hours


class CreatePermissionRoleRequest(CamelModel):
    name: str = Field(min_length=1, max_length=100)
    category_ids: list[str]
    default_duration_hours: int

    @field_validator("category_ids")
    @classmethod
    def _categories(cls, v: list[str]) -> list[str]:
        return validate_category_ids(v)

    @field_validator("default_duration_hours")
    @classmethod
    def _duration(cls, v: int) -> int:
        return validate_duration_hours(v)


class UpdatePermissionRoleRequest(CamelModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    category_ids: list[str] | None = None
    default_duration_hours: int | None = None

    @field_validator("category_ids")
    @classmethod
    def _categories(cls, v: list[str] | None) -> list[str] | None:
        return v if v is None else validate_category_ids(v)

    @field_validator("default_duration_hours")
    @classmethod
    def _duration(cls, v: int | None) -> int | None:
        return v if v is None else validate_duration_hours(v)


class PermissionRoleResponse(CamelModel):
    id: str
    name: str
    category_ids: list[str]
    default_duration_hours: int
    created_at: datetime
