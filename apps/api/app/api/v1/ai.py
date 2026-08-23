import uuid

from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_ai_service, get_current_identity
from app.schemas.ai import (
    AiConversationResponse,
    AiMessageResponse,
    CompareReportsRequest,
    CompareReportsResponse,
    DoctorSummaryResponse,
    ExplainResultResponse,
    SendMessageRequest,
)
from app.services.ai_service import AiService

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/results/{result_id}/explain", response_model=ExplainResultResponse)
async def explain_result(
    result_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> ExplainResultResponse:
    return await service.explain_result(identity.user_id, result_id)


@router.post("/reports/{report_id}/compare", response_model=CompareReportsResponse)
async def compare_reports(
    report_id: uuid.UUID,
    body: CompareReportsRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> CompareReportsResponse:
    return await service.compare_reports(identity.user_id, report_id, body)


@router.post("/doctor-summary", response_model=DoctorSummaryResponse)
async def doctor_summary(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> DoctorSummaryResponse:
    return await service.generate_doctor_summary(identity.user_id)


@router.post("/conversations", response_model=AiConversationResponse, status_code=201)
async def create_conversation(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> AiConversationResponse:
    return await service.create_conversation(identity.user_id)


@router.get("/conversations", response_model=list[AiConversationResponse])
async def list_conversations(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> list[AiConversationResponse]:
    return await service.list_conversations(identity.user_id)


@router.get("/conversations/{conversation_id}/messages", response_model=list[AiMessageResponse])
async def list_messages(
    conversation_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> list[AiMessageResponse]:
    return await service.list_messages(identity.user_id, conversation_id)


@router.post(
    "/conversations/{conversation_id}/messages", response_model=AiMessageResponse, status_code=201
)
async def send_message(
    conversation_id: uuid.UUID,
    body: SendMessageRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: AiService = Depends(get_ai_service),
) -> AiMessageResponse:
    return await service.send_message(identity.user_id, conversation_id, body)
