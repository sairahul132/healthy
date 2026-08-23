import uuid
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.base import Base
from app.db.models import LabReport, LabResult, ReportProcessingStatus, TimelineEvent


class ReportsRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: Base) -> None:
        self._db.add(instance)

    async def get_report_by_id(self, report_id: uuid.UUID) -> LabReport | None:
        return await self._db.get(LabReport, report_id)

    async def get_result_by_id(self, result_id: uuid.UUID) -> LabResult | None:
        return await self._db.get(LabResult, result_id)

    async def list_reports_for_user(self, user_id: uuid.UUID) -> list[LabReport]:
        stmt = (
            select(LabReport)
            .where(LabReport.user_id == user_id)
            .order_by(LabReport.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_results_for_report(self, report_id: uuid.UUID) -> list[LabResult]:
        stmt = (
            select(LabResult)
            .where(LabResult.report_id == report_id)
            .order_by(LabResult.canonical_test_name)
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def list_results_for_user(
        self, user_id: uuid.UUID, *, category: str | None = None
    ) -> list[LabResult]:
        stmt = select(LabResult).where(LabResult.user_id == user_id)
        if category is not None:
            stmt = stmt.where(LabResult.category == category)
        stmt = stmt.order_by(LabResult.collection_date.desc().nullslast())
        return list((await self._db.execute(stmt)).scalars().all())

    async def get_previous_result(
        self,
        user_id: uuid.UUID,
        canonical_code: str,
        *,
        exclude_report_id: uuid.UUID,
        before_date: date | None,
    ) -> LabResult | None:
        """The chronologically most recent COMPLETED result for this test
        before `before_date` (the report currently being processed's own
        collection date) — not simply the most recently *uploaded* one.
        Reports don't always arrive in the order they were collected (a
        user can upload an old report after a newer one), so trend/
        previous-value comparisons must follow collection date, not upload
        order. Falls back to upload order only when `before_date` itself
        is unknown (collection date couldn't be extracted from the
        document) — there's no better signal available in that case.
        """
        stmt = (
            select(LabResult)
            .join(LabReport, LabResult.report_id == LabReport.id)
            .where(
                LabResult.user_id == user_id,
                LabResult.canonical_code == canonical_code,
                LabResult.report_id != exclude_report_id,
                LabReport.status == ReportProcessingStatus.COMPLETED,
            )
        )
        if before_date is not None:
            stmt = stmt.where(
                LabReport.collection_date.is_not(None), LabReport.collection_date <= before_date
            )
        stmt = stmt.order_by(
            LabReport.collection_date.desc().nullslast(), LabReport.created_at.desc()
        ).limit(1)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def get_previous_report(
        self,
        user_id: uuid.UUID,
        *,
        exclude_report_id: uuid.UUID,
        before_date: date | None,
    ) -> LabReport | None:
        """Same collection-date-first ordering as get_previous_result, at
        report granularity — the "immediately preceding report" used as the
        default comparison target for AI compare (app/services/ai_service.py)."""
        stmt = select(LabReport).where(
            LabReport.user_id == user_id,
            LabReport.id != exclude_report_id,
            LabReport.status == ReportProcessingStatus.COMPLETED,
        )
        if before_date is not None:
            stmt = stmt.where(
                LabReport.collection_date.is_not(None), LabReport.collection_date <= before_date
            )
        stmt = stmt.order_by(
            LabReport.collection_date.desc().nullslast(), LabReport.created_at.desc()
        ).limit(1)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def add_timeline_event(self, event: TimelineEvent) -> None:
        self._db.add(event)

    async def list_timeline_for_user(self, user_id: uuid.UUID) -> list[TimelineEvent]:
        stmt = (
            select(TimelineEvent)
            .where(TimelineEvent.user_id == user_id)
            .order_by(TimelineEvent.occurred_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def search(
        self, user_id: uuid.UUID, query: str
    ) -> tuple[list[LabReport], list[LabResult]]:
        like = f"%{query.lower()}%"
        report_stmt = select(LabReport).where(
            LabReport.user_id == user_id,
            (LabReport.file_name.ilike(like)) | (LabReport.lab_name.ilike(like)),
        )
        result_stmt = select(LabResult).where(
            LabResult.user_id == user_id,
            (LabResult.test_name.ilike(like)) | (LabResult.canonical_test_name.ilike(like)),
        )
        reports = list((await self._db.execute(report_stmt)).scalars().all())
        results = list((await self._db.execute(result_stmt)).scalars().all())
        return reports, results
