from datetime import date, datetime

from pydantic import Field

from app.schemas.base import CamelModel


class ExplainResultResponse(CamelModel):
    result_id: str
    explanation: str
    generated_at: datetime


class CompareReportsRequest(CamelModel):
    compare_to_report_id: str | None = None


class CompareReportsResponse(CamelModel):
    report_id: str
    compared_to_report_id: str
    narrative: str
    generated_at: datetime


class DoctorSummaryResponse(CamelModel):
    narrative: str
    window_start: date
    window_end: date
    report_count: int
    generated_at: datetime


class AiConversationResponse(CamelModel):
    id: str
    title: str | None
    created_at: datetime
    updated_at: datetime


class AiMessageResponse(CamelModel):
    id: str
    conversation_id: str
    role: str
    content: str
    created_at: datetime


class SendMessageRequest(CamelModel):
    content: str = Field(min_length=1, max_length=4000)
