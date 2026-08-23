from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_reports_service
from app.schemas.reports import TimelineEventResponse
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("", response_model=list[TimelineEventResponse])
async def list_timeline(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[TimelineEventResponse]:
    return await service.list_timeline(identity.user_id)
