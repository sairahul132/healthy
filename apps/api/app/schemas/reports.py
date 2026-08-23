from datetime import date, datetime

from app.schemas.base import CamelModel


class ClinicalStatusResponse(CamelModel):
    direction: str
    severity: str
    label: str


class LabReportResponse(CamelModel):
    id: str
    file_name: str
    status: str
    failure_reason: str | None
    collection_date: date | None
    lab_name: str | None
    categories: list[str]
    uploaded_at: datetime
    result_count: int
    abnormal_count: int


class LabResultResponse(CamelModel):
    id: str
    report_id: str
    test_name: str
    canonical_test_name: str
    value: float
    unit: str
    normalized_value: float | None
    normalized_unit: str | None
    reference_low: float | None
    reference_high: float | None
    reference_text: str
    category: str
    status: ClinicalStatusResponse
    previous_value: float | None
    previous_collection_date: date | None
    extraction_confidence: float
    collection_date: date | None


class HealthCategoryResponse(CamelModel):
    id: str
    label: str
    icon: str


class HealthCategoryDetailResponse(CamelModel):
    id: str
    label: str
    icon: str
    latest_results: list[LabResultResponse]


class TrendPointResponse(CamelModel):
    report_id: str
    value: float
    unit: str
    collection_date: date | None
    status: ClinicalStatusResponse


class TestTrendResponse(CamelModel):
    canonical_test_name: str
    canonical_code: str
    category: str
    unit: str
    points: list[TrendPointResponse]


class TimelineEventResponse(CamelModel):
    id: str
    type: str
    title: str
    description: str | None
    occurred_at: date
    related_report_id: str | None


class SearchResultResponse(CamelModel):
    kind: str  # report | result
    id: str
    title: str
    subtitle: str
    related_report_id: str
