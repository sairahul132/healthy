from fastapi import APIRouter, Depends, Query

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_reports_service
from app.schemas.reports import SearchResultResponse
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResultResponse])
async def search(
    q: str = Query(default="", min_length=0, max_length=200),
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[SearchResultResponse]:
    return await service.search(identity.user_id, q)
