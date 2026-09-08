import uuid
from datetime import UTC, datetime, timedelta

import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.config import get_settings
from app.core.errors import (
    ConflictError,
    ForbiddenError,
    NotFoundError,
    RateLimitedError,
    UnauthorizedError,
)
from app.core.health_categories import HEALTH_CATEGORY_IDS
from app.core.masking import mask_identifier
from app.core.security import (
    create_share_access_token,
    decode_share_access_token,
    decrypt_field,
    encrypt_field,
    generate_opaque_token,
    generate_otp_code,
    hash_secret,
    hmac_lookup_hash,
    verify_secret,
)
from app.core.time import ensure_utc, utcnow
from app.db.models import AccessRequest, SharingSession, SharingSessionScope
from app.db.models.access_request import AccessRequestStatus
from app.providers.notification_provider import NotificationProvider
from app.providers.otp_provider import OtpProvider
from app.providers.rate_limiter import RateLimiter
from app.repositories.audit_repository import AuditRepository
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.otp_repository import OtpRepository
from app.repositories.reports_repository import ReportsRepository
from app.repositories.sharing_repository import SharingRepository, is_session_active
from app.repositories.user_repository import UserRepository
from app.schemas.reports import LabResultResponse
from app.schemas.sharing import (
    AccessRequestResponse,
    ShareCategoriesResponse,
    ShareCategoryStatus,
    SharePreviewResponse,
    ShareStatusResponse,
    SharingSessionResponse,
)
from app.services.report_presenters import result_to_response

OTP_RESEND_COOLDOWN_SECONDS = 30
DATA_NOTE = (
    "Category access grants visibility into extracted lab results only — "
    "not the original uploaded document."
)


def _session_status(session: SharingSession) -> str:
    if session.revoked_at is not None:
        return "revoked"
    if ensure_utc(session.expires_at) <= utcnow():
        return "expired"
    return "active"


class SharingService:
    def __init__(
        self,
        db: AsyncSession,
        *,
        otp_provider: OtpProvider,
        rate_limiter: RateLimiter,
        notification_provider: NotificationProvider,
    ) -> None:
        self._db = db
        self._otp_provider = otp_provider
        self._rate_limiter = rate_limiter
        self._notification_provider = notification_provider
        self._sharing = SharingRepository(db)
        self._otps = OtpRepository(db)
        self._audit = AuditRepository(db)
        self._users = UserRepository(db)
        self._reports = ReportsRepository(db)
        self._doctors = DoctorRepository(db)

    # ---------- Patient side ----------

    async def create_session(
        self,
        *,
        patient_user_id: uuid.UUID,
        category_ids: list[str],
        recipient_identifier: str,
        duration_hours: int,
    ) -> SharingSessionResponse:
        allowed = await self._rate_limiter.allow(
            f"share_create:{patient_user_id}", limit=20, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many sharing links created. Try again later.")

        token_raw = generate_opaque_token()
        session = SharingSession(
            patient_user_id=patient_user_id,
            token_hash=hmac_lookup_hash(token_raw),
            recipient_identifier_encrypted=encrypt_field(recipient_identifier),
            recipient_identifier_hash=hmac_lookup_hash(recipient_identifier),
            expires_at=datetime.now(UTC) + timedelta(hours=duration_hours),
        )
        self._sharing.add(session)
        await self._db.flush()

        for category in category_ids:
            self._sharing.add(SharingSessionScope(session_id=session.id, category=category))

        await self._audit.record(
            actor_user_id=patient_user_id,
            event_type=audit_events.SHARE_SESSION_CREATED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
            metadata={"categories": category_ids, "duration_hours": duration_hours},
        )
        await self._db.commit()

        settings = get_settings()
        return SharingSessionResponse(
            id=str(session.id),
            share_url=f"{settings.share_link_base_url}/{token_raw}",
            recipient_identifier_masked=mask_identifier(recipient_identifier),
            category_ids=category_ids,
            status=_session_status(session),
            created_at=session.created_at,
            expires_at=session.expires_at,
            revoked_at=session.revoked_at,
        )

    async def list_sessions(self, patient_user_id: uuid.UUID) -> list[SharingSessionResponse]:
        sessions = await self._sharing.list_sessions_for_patient(patient_user_id)
        results = []
        for session in sessions:
            scopes = await self._sharing.list_scopes(session.id)
            results.append(
                SharingSessionResponse(
                    id=str(session.id),
                    share_url="",  # never reconstructable — only shown once at creation
                    recipient_identifier_masked=mask_identifier(
                        decrypt_field(session.recipient_identifier_encrypted)
                    ),
                    category_ids=[s.category for s in scopes],
                    status=_session_status(session),
                    created_at=session.created_at,
                    expires_at=session.expires_at,
                    revoked_at=session.revoked_at,
                )
            )
        return results

    async def revoke_session(self, patient_user_id: uuid.UUID, session_id: uuid.UUID) -> None:
        session = await self._sharing.get_session_by_id(session_id)
        if session is None or session.patient_user_id != patient_user_id:
            # Same response whether it doesn't exist or belongs to someone
            # else — don't confirm other patients' session ids exist (§99).
            raise NotFoundError("Sharing session not found.")

        session.revoked_at = datetime.now(UTC)
        await self._audit.record(
            actor_user_id=patient_user_id,
            event_type=audit_events.SHARE_SESSION_REVOKED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session_id),
        )
        await self._db.commit()

    async def list_access_requests(
        self, patient_user_id: uuid.UUID, *, pending_only: bool
    ) -> list[AccessRequestResponse]:
        pairs = await self._sharing.list_requests_for_patient(
            patient_user_id, pending_only=pending_only
        )
        return [
            AccessRequestResponse(
                id=str(request.id),
                session_id=str(request.session_id),
                category=request.category,
                reason=request.reason,
                requested_duration_hours=request.requested_duration_hours,
                recipient_identifier_masked=mask_identifier(
                    decrypt_field(session.recipient_identifier_encrypted)
                ),
                status=request.status.value,
                created_at=request.created_at,
                decided_at=request.decided_at,
            )
            for request, session in pairs
        ]

    async def decide_access_request(
        self, patient_user_id: uuid.UUID, request_id: uuid.UUID, *, approve: bool
    ) -> None:
        request = await self._sharing.get_access_request(request_id)
        if request is None:
            raise NotFoundError("Access request not found.")

        session = await self._sharing.get_session_by_id(request.session_id)
        if session is None or session.patient_user_id != patient_user_id:
            raise NotFoundError("Access request not found.")

        if request.status != AccessRequestStatus.PENDING:
            raise ConflictError("This request has already been decided.")

        request.status = AccessRequestStatus.APPROVED if approve else AccessRequestStatus.DECLINED
        request.decided_at = datetime.now(UTC)

        if approve and not await self._sharing.scope_exists(session.id, request.category):
            self._sharing.add(SharingSessionScope(session_id=session.id, category=request.category))

        await self._audit.record(
            actor_user_id=patient_user_id,
            event_type=(
                audit_events.PERMISSION_GRANTED if approve else audit_events.PERMISSION_DECLINED
            ),
            outcome="success",
            resource_type="access_request",
            resource_id=str(request_id),
            metadata={"category": request.category, "session_id": str(session.id)},
        )
        await self._db.commit()

    # ---------- Recipient (public) side ----------

    async def _get_active_session_or_error(self, token: str) -> SharingSession:
        session = await self._sharing.get_session_by_token_hash(hmac_lookup_hash(token))
        if session is None:
            raise NotFoundError("This share link is invalid.")
        return session

    async def get_preview(self, token: str) -> SharePreviewResponse:
        session = await self._get_active_session_or_error(token)
        status = _session_status(session)
        healthy_id = None
        if status == "active":
            healthy_id_row = await self._users.get_healthy_id(session.patient_user_id)
            healthy_id = healthy_id_row.healthy_id if healthy_id_row else None
        return SharePreviewResponse(healthy_id=healthy_id, status=status)

    async def request_recipient_otp(self, token: str, identifier: str) -> int:
        settings = get_settings()
        if settings.otp_bypass_enabled and settings.is_production:
            raise RuntimeError("OTP bypass cannot be enabled in production.")
        session = await self._get_active_session_or_error(token)
        if not is_session_active(session):
            raise NotFoundError("This share link has expired or was revoked.")

        identity_hash = hmac_lookup_hash(identifier)
        if identity_hash != session.recipient_identifier_hash:
            # Deliberately generic — don't confirm/deny who the designated
            # recipient is beyond this.
            raise ForbiddenError("This share isn't associated with that identifier.")

        allowed = await self._rate_limiter.allow(
            f"share_otp_request:{session.id}:{identity_hash}", limit=5, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many code requests. Try again later.")

        code = generate_otp_code()
        self._otps.create(
            identity_value_hash=identity_hash,
            otp_code_hash=hash_secret(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.otp_ttl_minutes),
            context="share_recipient",
            sharing_session_id=session.id,
        )
        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.SHARE_OTP_REQUESTED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
        )
        await self._db.commit()

        use_static_test_recipient = (
            settings.otp_static_test_accounts_enabled
            and settings.is_static_share_number(identifier)
        )
        if not settings.otp_bypass_enabled and not use_static_test_recipient:
            await self._otp_provider.send(identifier=identifier, code=code)
        return OTP_RESEND_COOLDOWN_SECONDS

    async def verify_recipient_otp(self, token: str, identifier: str, code: str) -> tuple[str, int]:
        settings = get_settings()
        session = await self._get_active_session_or_error(token)
        if not is_session_active(session):
            raise NotFoundError("This share link has expired or was revoked.")

        identity_hash = hmac_lookup_hash(identifier)
        use_static_test_recipient = (
            settings.otp_static_test_accounts_enabled
            and settings.is_static_share_number(identifier)
        )
        if use_static_test_recipient:
            if identity_hash != session.recipient_identifier_hash:
                raise ForbiddenError("This share isn't associated with that identifier.")
            if code != settings.otp_static_share_code:
                raise UnauthorizedError("Incorrect code.")
            await self._link_verified_doctor(session, identity_hash)
            await self._db.commit()
            access_token = create_share_access_token(
                sharing_session_id=str(session.id), recipient_identifier_hash=identity_hash
            )
            return access_token, settings.share_access_token_ttl_minutes

        if settings.otp_bypass_enabled:
            if settings.is_production:
                raise RuntimeError("OTP bypass cannot be enabled in production.")
            if identity_hash != session.recipient_identifier_hash:
                raise ForbiddenError("This share isn't associated with that identifier.")
            if (
                not settings.is_static_share_number(identifier)
                or code != settings.otp_static_share_code
            ):
                raise UnauthorizedError("Incorrect code.")
            await self._link_verified_doctor(session, identity_hash)
            await self._db.commit()
            access_token = create_share_access_token(
                sharing_session_id=str(session.id), recipient_identifier_hash=identity_hash
            )
            return access_token, settings.share_access_token_ttl_minutes

        challenge = await self._otps.get_latest_active(identity_hash)

        if (
            challenge is None
            or challenge.context != "share_recipient"
            or challenge.sharing_session_id != session.id
        ):
            await self._record_share_auth_failure(session.id, "no_active_challenge")
            raise UnauthorizedError("That code has expired. Request a new one.")

        if challenge.attempt_count >= settings.otp_max_attempts:
            await self._db.commit()
            raise RateLimitedError("Too many attempts. Request a new code.")

        if not verify_secret(code, challenge.otp_code_hash):
            challenge.attempt_count += 1
            await self._record_share_auth_failure(session.id, "bad_code")
            raise UnauthorizedError("Incorrect code.")

        challenge.consumed_at = datetime.now(UTC)
        await self._link_verified_doctor(session, identity_hash)

        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.SHARE_AUTHENTICATED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
        )
        await self._db.commit()

        access_token = create_share_access_token(
            sharing_session_id=str(session.id), recipient_identifier_hash=identity_hash
        )
        return access_token, settings.share_access_token_ttl_minutes

    async def _link_verified_doctor(self, session: SharingSession, identity_hash: str) -> None:
        """First time a recipient OTP-verifies with an identifier matching a
        VERIFIED doctor account, remember it on the session — lets that
        doctor's persistent dashboard (app/services/doctor_service.py) find
        this session on return visits without needing the original link
        again. This never grants access on its own: the doctor still had to
        possess the link and pass OTP once, same as any other recipient."""
        if session.doctor_user_id is not None:
            return
        doctor = await self._doctors.get_verified_by_identifier_hash(identity_hash)
        if doctor is not None:
            session.doctor_user_id = doctor.user_id

    async def _record_share_auth_failure(self, session_id: uuid.UUID, reason: str) -> None:
        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.SHARE_AUTH_FAILURE,
            outcome="failure",
            resource_type="sharing_session",
            resource_id=str(session_id),
            metadata={"reason": reason},
        )
        await self._db.commit()

    async def resolve_recipient_token(self, token: str, bearer_token: str) -> SharingSession:
        """Validates a recipient's share-access bearer token against the
        session identified by the URL token — both must agree, and the
        session must still be active (§52: expiry always re-checked, not
        just at OTP-verify time)."""
        session = await self._get_active_session_or_error(token)
        try:
            payload = decode_share_access_token(bearer_token)
        except jwt.PyJWTError as exc:
            raise UnauthorizedError("Session expired. Please verify again.") from exc

        if payload.get("ssid") != str(session.id):
            raise UnauthorizedError("Session expired. Please verify again.")
        if not is_session_active(session):
            raise NotFoundError("This share link has expired or was revoked.")
        return session

    async def get_categories(self, session: SharingSession) -> ShareCategoriesResponse:
        scopes = await self._sharing.list_scopes(session.id)
        authorized = {s.category for s in scopes}
        healthy_id_row = await self._users.get_healthy_id(session.patient_user_id)

        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.SHARE_VIEWED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
        )
        await self._db.commit()

        return ShareCategoriesResponse(
            healthy_id=healthy_id_row.healthy_id if healthy_id_row else "",
            categories=[
                ShareCategoryStatus(id=cat, authorized=cat in authorized)
                for cat in HEALTH_CATEGORY_IDS
            ],
            expires_at=session.expires_at,
            data_note=DATA_NOTE,
        )

    async def get_status(self, session: SharingSession) -> ShareStatusResponse:
        """Cheap, unaudited read of just which categories are currently
        authorized — for the recipient page's background poll (detects a
        patient approving a pending request) without writing a SHARE_VIEWED
        row on every poll tick the way get_categories does."""
        scopes = await self._sharing.list_scopes(session.id)
        return ShareStatusResponse(category_ids=[s.category for s in scopes])

    async def get_category_results(
        self, session: SharingSession, category: str
    ) -> list[LabResultResponse]:
        """The actual data behind an "Available" category (§45/§46) — only
        reachable once `get_authenticated_share_session` has already proven
        the caller completed recipient OTP verification for this exact
        session. The backend enforces the category grant itself rather than
        trusting the frontend to only ask for authorized ones (§67)."""
        if not await self._sharing.scope_exists(session.id, category):
            raise ForbiddenError("This category hasn't been shared with you.")

        results = await self._reports.list_results_for_user(
            session.patient_user_id, category=category
        )

        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.SHARE_VIEWED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
            metadata={"category": category},
        )
        await self._db.commit()

        return [result_to_response(r) for r in results]

    async def create_access_request(
        self, session: SharingSession, *, category: str, reason: str, requested_duration_hours: int
    ) -> AccessRequest:
        if await self._sharing.scope_exists(session.id, category):
            raise ConflictError("You already have access to this category.")
        if await self._sharing.pending_request_exists(session.id, category):
            raise ConflictError("A request for this category is already pending.")

        allowed = await self._rate_limiter.allow(
            f"share_access_request:{session.id}", limit=10, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many requests. Try again later.")

        request = AccessRequest(
            session_id=session.id,
            category=category,
            reason=reason,
            requested_duration_hours=requested_duration_hours,
        )
        self._sharing.add(request)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.ACCESS_REQUESTED,
            outcome="success",
            resource_type="access_request",
            resource_id=str(request.id),
            metadata={"category": category, "session_id": str(session.id)},
        )
        await self._db.commit()
        await self._notify_patient_of_access_request(session, category)
        return request

    async def _notify_patient_of_access_request(
        self, session: SharingSession, category: str
    ) -> None:
        identities = await self._users.list_identities(session.patient_user_id)
        if not identities:
            return
        identifier = decrypt_field(identities[0].identity_value_encrypted)
        await self._notification_provider.send(
            identifier=identifier,
            subject="New access request on your Healthy share",
            message=(
                f"Someone you shared health data with has requested access to your "
                f"{category} category. Open Healthy to approve or decline."
            ),
        )
