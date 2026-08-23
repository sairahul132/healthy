import uuid

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_reports_service
from app.db.base import get_session_factory
from app.providers.ocr_provider import OcrProvider, get_ocr_provider
from app.providers.storage_provider import StorageProvider, get_storage_provider
from app.providers.virus_scan_provider import VirusScanProvider, get_virus_scan_provider
from app.schemas.reports import LabReportResponse, LabResultResponse
from app.services.reports_service import ReportsService

router = APIRouter(prefix="/reports", tags=["reports"])


async def _run_processing(
    report_id: uuid.UUID,
    session_factory: async_sessionmaker[AsyncSession],
    storage: StorageProvider,
    virus_scanner: VirusScanProvider,
    ocr: OcrProvider,
) -> None:
    """Runs in a FastAPI BackgroundTask, after the response has already been
    sent — needs its own DB session, since the request-scoped one (get_db)
    closes as soon as the endpoint returns (§76: don't block the upload
    request on processing). Every dependency is threaded through from the
    request via Depends(...) rather than imported/called directly, so tests
    can override them (e.g. storage pointed at a tmp_path) the same way
    they override any other FastAPI dependency."""
    async with session_factory() as db:
        service = ReportsService(db, storage=storage, virus_scanner=virus_scanner, ocr=ocr)
        await service.process_report(report_id)


@router.post("/upload", response_model=LabReportResponse, status_code=201)
async def upload_report(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
    session_factory: async_sessionmaker[AsyncSession] = Depends(get_session_factory),
    storage: StorageProvider = Depends(get_storage_provider),
    virus_scanner: VirusScanProvider = Depends(get_virus_scan_provider),
    ocr: OcrProvider = Depends(get_ocr_provider),
) -> LabReportResponse:
    data = await file.read()
    response = await service.upload_report(
        identity.user_id,
        filename=file.filename or "report",
        declared_content_type=file.content_type or "application/octet-stream",
        data=data,
    )
    background_tasks.add_task(
        _run_processing, uuid.UUID(response.id), session_factory, storage, virus_scanner, ocr
    )
    return response


@router.get("", response_model=list[LabReportResponse])
async def list_reports(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[LabReportResponse]:
    return await service.list_reports(identity.user_id)


@router.get("/{report_id}", response_model=LabReportResponse)
async def get_report(
    report_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> LabReportResponse:
    return await service.get_report(identity.user_id, report_id)


@router.get("/{report_id}/results", response_model=list[LabResultResponse])
async def get_report_results(
    report_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: ReportsService = Depends(get_reports_service),
) -> list[LabResultResponse]:
    return await service.get_results(identity.user_id, report_id)
