"""Doctor portal (docs/SPEC.md §40/§41). A doctor's login is the same
OTP-based account patients use — this service only adds the professional
profile, verification gate, and the read-only "which patients have shared
with me" view on top of it. Viewing an authorized category's actual
results still goes through the same category-scope check sharing already
enforces (§67) — being a doctor grants nothing on its own (§132).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.errors import ConflictError, ForbiddenError, NotFoundError
from app.core.health_categories import HEALTH_CATEGORY_IDS
from app.core.time import ensure_utc, utcnow
from app.db.models import DoctorProfile, SharingSession
from app.db.models.doctor_profile import DoctorVerificationStatus
from app.repositories.audit_repository import AuditRepository
from app.repositories.doctor_repository import DoctorRepository
from app.repositories.reports_repository import ReportsRepository
from app.repositories.sharing_repository import SharingRepository
from app.repositories.user_repository import UserRepository
from app.schemas.doctors import (
    DoctorPatientSessionResponse,
    DoctorProfileResponse,
    RegisterDoctorProfileRequest,
)
from app.schemas.reports import LabResultResponse
from app.schemas.sharing import ShareCategoriesResponse, ShareCategoryStatus
from app.services.report_presenters import result_to_response


def _session_status(session: SharingSession) -> str:
    if session.revoked_at is not None:
        return "revoked"
    if ensure_utc(session.expires_at) <= utcnow():
        return "expired"
    return "active"


def _profile_to_response(profile: DoctorProfile) -> DoctorProfileResponse:
    return DoctorProfileResponse(
        id=str(profile.id),
        full_name=profile.full_name,
        registration_number=profile.registration_number,
        organization=profile.organization,
        specialty=profile.specialty,
        verification_status=profile.verification_status.value,
        verified_at=profile.verified_at,
    )


class DoctorService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._doctors = DoctorRepository(db)
        self._sharing = SharingRepository(db)
        self._reports = ReportsRepository(db)
        self._users = UserRepository(db)
        self._audit = AuditRepository(db)

    async def register_profile(
        self, user_id: uuid.UUID, body: RegisterDoctorProfileRequest
    ) -> DoctorProfileResponse:
        if await self._doctors.get_by_user_id(user_id) is not None:
            raise ConflictError("You've already registered a doctor profile.")

        profile = DoctorProfile(
            user_id=user_id,
            full_name=body.full_name,
            registration_number=body.registration_number,
            organization=body.organization,
            specialty=body.specialty,
            verification_status=DoctorVerificationStatus.PENDING,
        )
        self._doctors.add(profile)
        await self._db.flush()

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.DOCTOR_PROFILE_REGISTERED,
            outcome="success",
            resource_type="doctor_profile",
            resource_id=str(profile.id),
            metadata={"organization": body.organization},
        )
        await self._db.commit()
        return _profile_to_response(profile)

    async def get_profile(self, user_id: uuid.UUID) -> DoctorProfileResponse:
        profile = await self._doctors.get_by_user_id(user_id)
        if profile is None:
            raise NotFoundError("No doctor profile registered for this account yet.")
        return _profile_to_response(profile)

    async def _require_verified(self, user_id: uuid.UUID) -> DoctorProfile:
        profile = await self._doctors.get_by_user_id(user_id)
        if profile is None:
            raise NotFoundError("No doctor profile registered for this account yet.")
        if profile.verification_status != DoctorVerificationStatus.VERIFIED:
            raise ForbiddenError(
                "Your doctor account hasn't been verified yet. This can take a little time."
            )
        return profile

    async def list_patients(self, doctor_user_id: uuid.UUID) -> list[DoctorPatientSessionResponse]:
        await self._require_verified(doctor_user_id)
        sessions = await self._doctors.list_sessions_for_doctor(doctor_user_id)
        results = []
        for session in sessions:
            scopes = await self._sharing.list_scopes(session.id)
            healthy_id_row = await self._users.get_healthy_id(session.patient_user_id)
            results.append(
                DoctorPatientSessionResponse(
                    session_id=str(session.id),
                    healthy_id=healthy_id_row.healthy_id if healthy_id_row else "",
                    category_ids=[s.category for s in scopes],
                    status=_session_status(session),
                    created_at=session.created_at,
                    expires_at=session.expires_at,
                )
            )
        return results

    async def _get_authorized_session(
        self, doctor_user_id: uuid.UUID, session_id: uuid.UUID
    ) -> SharingSession:
        await self._require_verified(doctor_user_id)
        session = await self._doctors.get_session_for_doctor(doctor_user_id, session_id)
        if session is None:
            # Same response whether it doesn't exist or isn't this doctor's — §99.
            raise NotFoundError("Patient session not found.")
        return session

    async def get_patient_categories(
        self, doctor_user_id: uuid.UUID, session_id: uuid.UUID
    ) -> ShareCategoriesResponse:
        session = await self._get_authorized_session(doctor_user_id, session_id)
        scopes = await self._sharing.list_scopes(session.id)
        authorized = {s.category for s in scopes}
        healthy_id_row = await self._users.get_healthy_id(session.patient_user_id)

        await self._audit.record(
            actor_user_id=doctor_user_id,
            event_type=audit_events.DOCTOR_PATIENT_VIEWED,
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
            data_note=(
                "Category access grants visibility into extracted lab results only — "
                "not the original uploaded document."
            ),
        )

    async def get_patient_category_results(
        self, doctor_user_id: uuid.UUID, session_id: uuid.UUID, category: str
    ) -> list[LabResultResponse]:
        session = await self._get_authorized_session(doctor_user_id, session_id)
        if not await self._sharing.scope_exists(session.id, category):
            raise ForbiddenError("This category hasn't been shared with you.")

        results = await self._reports.list_results_for_user(
            session.patient_user_id, category=category
        )

        await self._audit.record(
            actor_user_id=doctor_user_id,
            event_type=audit_events.DOCTOR_PATIENT_RESULTS_VIEWED,
            outcome="success",
            resource_type="sharing_session",
            resource_id=str(session.id),
            metadata={"category": category},
        )
        await self._db.commit()

        return [result_to_response(r) for r in results]
