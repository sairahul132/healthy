import uuid

from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_reports_service
from app.schemas.reports import HistoryEntryResponse, TimelineEventResponse
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/timeline", tags=["timeline"])


@router.get("", response_model=list[TimelineEventResponse])
async def list_timeline(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[TimelineEventResponse]:
    return await service.list_timeline(identity.user_id)


@router.get("/history", response_model=list[HistoryEntryResponse])
async def get_history(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[HistoryEntryResponse]:
    return await service.get_history(identity.user_id)


@router.delete("/history", status_code=204)
async def clear_history(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> None:
    await service.clear_history(identity.user_id)


@router.delete("/{event_id}", status_code=204)
async def delete_timeline_event(
    event_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> None:
    await service.delete_timeline_event(identity.user_id, event_id)
