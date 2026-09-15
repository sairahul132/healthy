from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_reports_service
from app.schemas.reports import (
    AttentionSummaryResponse,
    HealthCategoryDetailResponse,
    HealthCategoryResponse,
    TestTrendResponse,
)
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/categories", response_model=list[HealthCategoryResponse])
async def list_categories(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[HealthCategoryResponse]:
    return await service.list_categories(identity.user_id)


@router.get("/categories/{category_id}", response_model=HealthCategoryDetailResponse)
async def get_category_detail(
    category_id: str,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> HealthCategoryDetailResponse:
    return await service.get_category_detail(identity.user_id, category_id)


@router.get("/trends", response_model=list[TestTrendResponse])
async def get_trends(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[TestTrendResponse]:
    return await service.get_trends(identity.user_id)


@router.get("/attention-summary", response_model=AttentionSummaryResponse)
async def get_attention_summary(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> AttentionSummaryResponse:
    return await service.get_attention_summary(identity.user_id)
