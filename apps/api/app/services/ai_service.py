"""Phase 7 — AI features (docs/ROADMAP.md): explain a result, compare two
reports, draft a doctor-visit summary, and the "Ask Healthy" chat. Every
prompt sent to the AI provider is built here — never in the provider itself —
so this is the one place that decides what data reaches the model and how
untrusted document-derived text is contained (§153/§154, see
app/core/ai_prompt_safety.py). The provider is pure text-in/text-out with no
tool-calling and no write access, so even a successful injection can only
taint the reply text it returns, never trigger an action.
"""

import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.ai_prompt_safety import UNTRUSTED_DATA_INSTRUCTION, wrap_untrusted
from app.core.clinical_rules import compute_trend
from app.core.errors import NotFoundError, RateLimitedError
from app.db.models import AiConversation, AiMessage, AiMessageRole, ReportProcessingStatus
from app.providers.ai_provider import AiProvider
from app.providers.rate_limiter import RateLimiter
from app.repositories.ai_repository import AiRepository
from app.repositories.audit_repository import AuditRepository
from app.repositories.medicines_repository import MedicinesRepository
from app.repositories.reports_repository import ReportsRepository
from app.schemas.ai import (
    AiConversationResponse,
    AiMessageResponse,
    CompareReportsRequest,
    CompareReportsResponse,
    DoctorSummaryResponse,
    ExplainResultResponse,
    SendMessageRequest,
)

DOCTOR_SUMMARY_WINDOW_DAYS = 90


def _conversation_to_response(conversation: AiConversation) -> AiConversationResponse:
    return AiConversationResponse(
        id=str(conversation.id),
        title=conversation.title,
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


def _message_to_response(message: AiMessage) -> AiMessageResponse:
    return AiMessageResponse(
        id=str(message.id),
        conversation_id=str(message.conversation_id),
        role=message.role.value,
        content=message.content,
        created_at=message.created_at,
    )


class AiService:
    def __init__(self, db: AsyncSession, *, ai: AiProvider, rate_limiter: RateLimiter) -> None:
        self._db = db
        self._ai = ai
        self._rate_limiter = rate_limiter
        self._reports = ReportsRepository(db)
        self._medicines = MedicinesRepository(db)
        self._ai_repo = AiRepository(db)
        self._audit = AuditRepository(db)

    # ---------- Explain ----------

    async def explain_result(
        self, user_id: uuid.UUID, result_id: uuid.UUID
    ) -> ExplainResultResponse:
        result = await self._reports.get_result_by_id(result_id)
        if result is None or result.user_id != user_id:
            raise NotFoundError("Result not found.")

        allowed = await self._rate_limiter.allow(
            f"ai_explain:{user_id}", limit=30, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many explanation requests. Try again later.")

        lines = [
            f"Test: {result.canonical_test_name}",
            f"Value: {result.value} {result.unit}",
            f"Reference range: {result.reference_text}",
            f"Status: {result.status_label} ({result.status_direction})",
        ]
        if result.previous_value is not None:
            trend = compute_trend(result.value, result.previous_value)
            if trend is not None:
                lines.append(
                    f"Previous value: {result.previous_value} {result.unit} on "
                    f"{result.previous_collection_date} (trend: {trend.direction}, "
                    f"change {trend.absolute_change:+.2f})"
                )

        system_prompt = (
            "You are Ask Healthy, an assistant that explains a single lab test result "
            "to the patient who owns it, in plain, reassuring, non-alarming language. "
            "The clinical status given below is already computed deterministically — "
            "never re-diagnose or override it, only explain what it means. Do not give "
            "medical advice or a diagnosis; suggest discussing results with a doctor "
            "when relevant. " + UNTRUSTED_DATA_INSTRUCTION
        )
        explanation = await self._ai.generate(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": "\n".join(lines)}],
        )

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.AI_EXPLAIN_REQUESTED,
            outcome="success",
            resource_type="lab_result",
            resource_id=str(result.id),
        )
        await self._db.commit()

        return ExplainResultResponse(
            result_id=str(result.id), explanation=explanation, generated_at=datetime.now(UTC)
        )

    # ---------- Compare ----------

    async def compare_reports(
        self, user_id: uuid.UUID, report_id: uuid.UUID, body: CompareReportsRequest
    ) -> CompareReportsResponse:
        report = await self._reports.get_report_by_id(report_id)
        if report is None or report.user_id != user_id:
            raise NotFoundError("Report not found.")

        if body.compare_to_report_id is not None:
            try:
                compare_to_id = uuid.UUID(body.compare_to_report_id)
            except ValueError:
                raise NotFoundError("Report not found.") from None
            compare_to = await self._reports.get_report_by_id(compare_to_id)
            if compare_to is None or compare_to.user_id != user_id:
                raise NotFoundError("Report not found.")
        else:
            compare_to = await self._reports.get_previous_report(
                user_id, exclude_report_id=report.id, before_date=report.collection_date
            )
            if compare_to is None:
                raise NotFoundError("No previous report to compare with.")

        allowed = await self._rate_limiter.allow(
            f"ai_compare:{user_id}", limit=20, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many comparison requests. Try again later.")

        current_results = await self._reports.list_results_for_report(report.id)
        previous_results = await self._reports.list_results_for_report(compare_to.id)
        previous_by_code = {r.canonical_code: r for r in previous_results}

        lines = [
            f"Report A (current): {report.collection_date or 'unknown date'}",
            f"Report B (previous): {compare_to.collection_date or 'unknown date'}",
            "",
            "Shared tests:",
        ]
        shared: list[str] = []
        for result in current_results:
            prev = previous_by_code.get(result.canonical_code)
            if prev is None:
                continue
            trend = compute_trend(result.value, prev.value)
            direction = trend.direction if trend is not None else "flat"
            shared.append(
                f"- {result.canonical_test_name}: {prev.value} {prev.unit} -> "
                f"{result.value} {result.unit} ({direction}), current status "
                f"{result.status_label}"
            )
        lines.extend(shared or ["(No tests appear in both reports.)"])

        system_prompt = (
            "You are Ask Healthy, an assistant that narrates how a patient's lab results "
            "changed between two of their own reports, in plain, reassuring language. "
            "The status/direction values given are already computed deterministically — "
            "never re-diagnose or override them, only describe the change. Do not give "
            "medical advice or a diagnosis; suggest discussing results with a doctor when "
            "relevant. " + UNTRUSTED_DATA_INSTRUCTION
        )
        narrative = await self._ai.generate(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": "\n".join(lines)}],
        )

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.AI_COMPARE_REQUESTED,
            outcome="success",
            resource_type="lab_report",
            resource_id=str(report.id),
            metadata={"comparedToReportId": str(compare_to.id)},
        )
        await self._db.commit()

        return CompareReportsResponse(
            report_id=str(report.id),
            compared_to_report_id=str(compare_to.id),
            narrative=narrative,
            generated_at=datetime.now(UTC),
        )

    # ---------- Doctor summary ----------

    async def generate_doctor_summary(self, user_id: uuid.UUID) -> DoctorSummaryResponse:
        allowed = await self._rate_limiter.allow(
            f"ai_doctor_summary:{user_id}", limit=10, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many summary requests. Try again later.")

        today = date.today()
        window_start = today - timedelta(days=DOCTOR_SUMMARY_WINDOW_DAYS)
        reports = await self._reports.list_reports_for_user(user_id)
        completed = [r for r in reports if r.status == ReportProcessingStatus.COMPLETED]
        windowed = [
            r for r in completed if r.collection_date is not None and r.collection_date >= window_start
        ]
        if not windowed and completed:
            # Never leave an infrequent uploader with an empty summary — fall
            # back to their single most recent report.
            windowed = completed[:1]
            window_start = windowed[0].collection_date or today

        result_lines: list[str] = []
        for report in windowed:
            for result in await self._reports.list_results_for_report(report.id):
                if result.status_severity != "green":
                    result_lines.append(
                        f"- {result.canonical_test_name}: {result.value} {result.unit} "
                        f"({result.status_label}) on {report.collection_date or 'unknown date'}"
                    )

        active_medicines = [m for m in await self._medicines.list_for_user(user_id) if m.active]
        medicine_lines = [
            wrap_untrusted(
                "medicine_name",
                m.name + (f" {m.strength}" if m.strength else "") + (f" — {m.frequency}" if m.frequency else ""),
            )
            for m in active_medicines
        ]

        lines = [
            f"Window: {window_start} to {today}",
            f"Reports in window: {len(windowed)}",
            "",
            "Notable results (non-normal severity):",
            *(result_lines or ["(None — all results in this window were within normal range.)"]),
            "",
            "Active medicines:",
            *(medicine_lines or ["(No active medicines on file.)"]),
        ]

        system_prompt = (
            "You are Ask Healthy, an assistant that drafts a short summary a patient can "
            "hand to their doctor at a visit, covering notable (non-normal) lab results "
            "and current medicines. Status values given are already computed "
            "deterministically — never re-diagnose or override them. Do not give medical "
            "advice or a diagnosis. " + UNTRUSTED_DATA_INSTRUCTION
        )
        narrative = await self._ai.generate(
            system_prompt=system_prompt,
            messages=[{"role": "user", "content": "\n".join(lines)}],
        )

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.AI_DOCTOR_SUMMARY_REQUESTED,
            outcome="success",
            resource_type="user",
            resource_id=str(user_id),
            metadata={"reportCount": len(windowed)},
        )
        await self._db.commit()

        return DoctorSummaryResponse(
            narrative=narrative,
            window_start=window_start,
            window_end=today,
            report_count=len(windowed),
            generated_at=datetime.now(UTC),
        )

    # ---------- Ask Healthy (chat) ----------

    async def _build_context_snapshot(self, user_id: uuid.UUID) -> str:
        active_medicines = [m for m in await self._medicines.list_for_user(user_id) if m.active]
        medicine_lines = [
            wrap_untrusted("medicine_name", m.name + (f" {m.dosage}" if m.dosage else ""))
            for m in active_medicines[:20]
        ]
        results = await self._reports.list_results_for_user(user_id)
        notable = [r for r in results if r.status_severity != "green"][:10]
        result_lines = [
            f"- {r.canonical_test_name}: {r.value} {r.unit} ({r.status_label}) on "
            f"{r.collection_date or 'unknown date'}"
            for r in notable
        ]
        reports = await self._reports.list_reports_for_user(user_id)

        lines = [
            f"Report count: {len(reports)}",
            "Active medicines:",
            *(medicine_lines or ["(none on file)"]),
            "Recent non-normal results:",
            *(result_lines or ["(none)"]),
        ]
        return "\n".join(lines)

    async def create_conversation(self, user_id: uuid.UUID) -> AiConversationResponse:
        snapshot = await self._build_context_snapshot(user_id)
        conversation = AiConversation(user_id=user_id, context_snapshot=snapshot)
        self._ai_repo.add(conversation)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.AI_CONVERSATION_CREATED,
            outcome="success",
            resource_type="ai_conversation",
            resource_id=str(conversation.id),
        )
        await self._db.commit()
        return _conversation_to_response(conversation)

    async def list_conversations(self, user_id: uuid.UUID) -> list[AiConversationResponse]:
        conversations = await self._ai_repo.list_conversations_for_user(user_id)
        return [_conversation_to_response(c) for c in conversations]

    async def list_messages(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID
    ) -> list[AiMessageResponse]:
        conversation = await self._ai_repo.get_conversation_by_id(conversation_id)
        if conversation is None or conversation.user_id != user_id:
            raise NotFoundError("Conversation not found.")
        messages = await self._ai_repo.list_messages(conversation_id)
        return [_message_to_response(m) for m in messages]

    async def send_message(
        self, user_id: uuid.UUID, conversation_id: uuid.UUID, body: SendMessageRequest
    ) -> AiMessageResponse:
        conversation = await self._ai_repo.get_conversation_by_id(conversation_id)
        if conversation is None or conversation.user_id != user_id:
            raise NotFoundError("Conversation not found.")

        allowed = await self._rate_limiter.allow(f"ai_ask:{user_id}", limit=60, window_seconds=3600)
        if not allowed:
            raise RateLimitedError("Too many messages. Try again later.")

        user_message = AiMessage(
            conversation_id=conversation.id, role=AiMessageRole.USER, content=body.content
        )
        self._ai_repo.add(user_message)
        if conversation.title is None:
            conversation.title = body.content.strip()[:200]
        await self._db.flush()

        history = await self._ai_repo.list_messages(conversation.id)
        messages = [
            {"role": "user" if m.role == AiMessageRole.USER else "assistant", "content": m.content}
            for m in history
        ]
        system_prompt = (
            "You are Ask Healthy, an assistant answering a patient's questions about "
            "their own health records. Use the context snapshot below, computed from "
            "their own data. Do not give medical advice or a diagnosis; suggest "
            "discussing concerns with a doctor when relevant. "
            + UNTRUSTED_DATA_INSTRUCTION
            + "\n\nContext snapshot:\n"
            + (conversation.context_snapshot or "(none)")
        )
        reply_text = await self._ai.generate(system_prompt=system_prompt, messages=messages)

        assistant_message = AiMessage(
            conversation_id=conversation.id, role=AiMessageRole.ASSISTANT, content=reply_text
        )
        self._ai_repo.add(assistant_message)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.AI_CONVERSATION_MESSAGE_SENT,
            outcome="success",
            resource_type="ai_conversation",
            resource_id=str(conversation.id),
        )
        await self._db.commit()
        return _message_to_response(assistant_message)
