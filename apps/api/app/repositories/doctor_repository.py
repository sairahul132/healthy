import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import DoctorProfile, SharingSession
from app.db.models.doctor_profile import DoctorVerificationStatus


class DoctorRepository:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db

    def add(self, instance: DoctorProfile) -> None:
        self._db.add(instance)

    async def get_by_user_id(self, user_id: uuid.UUID) -> DoctorProfile | None:
        stmt = select(DoctorProfile).where(DoctorProfile.user_id == user_id)
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def get_verified_by_identifier_hash(self, identifier_hash: str) -> DoctorProfile | None:
        """Used to link a SharingSession to a persistent doctor account the
        moment they OTP-verify as a recipient with a matching identifier
        (see SharingService._link_verified_doctor) — only VERIFIED doctors
        are eligible, never PENDING/REJECTED ones (§131)."""
        from app.db.models import UserIdentity

        stmt = (
            select(DoctorProfile)
            .join(UserIdentity, UserIdentity.user_id == DoctorProfile.user_id)
            .where(
                UserIdentity.identity_value_hash == identifier_hash,
                DoctorProfile.verification_status == DoctorVerificationStatus.VERIFIED,
            )
        )
        return (await self._db.execute(stmt)).scalar_one_or_none()

    async def list_sessions_for_doctor(self, doctor_user_id: uuid.UUID) -> list[SharingSession]:
        stmt = (
            select(SharingSession)
            .where(SharingSession.doctor_user_id == doctor_user_id)
            .order_by(SharingSession.created_at.desc())
        )
        return list((await self._db.execute(stmt)).scalars().all())

    async def get_session_for_doctor(
        self, doctor_user_id: uuid.UUID, session_id: uuid.UUID
    ) -> SharingSession | None:
        session = await self._db.get(SharingSession, session_id)
        if session is None or session.doctor_user_id != doctor_user_id:
            return None
        return session
