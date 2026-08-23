import uuid
from datetime import UTC, date, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.config import get_settings
from app.core.errors import RateLimitedError, UnauthorizedError, ValidationAppError
from app.core.security import (
    create_access_token,
    decrypt_field,
    encrypt_field,
    generate_healthy_id,
    generate_opaque_token,
    generate_otp_code,
    hash_secret,
    hmac_lookup_hash,
    verify_secret,
)
from app.db.models import HealthProfile, HealthyId, User, UserIdentity
from app.db.models.health_profile import Sex
from app.db.models.session import Session as SessionModel
from app.db.models.user_identity import IdentityType
from app.providers.otp_provider import OtpProvider
from app.providers.rate_limiter import RateLimiter
from app.repositories.audit_repository import AuditRepository
from app.repositories.otp_repository import OtpRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository
from app.schemas.user import EmergencyContact, UpdateProfileRequest, UserResponse

REFRESH_COOKIE_SEPARATOR = "."
OTP_RESEND_COOLDOWN_SECONDS = 30


def classify_identifier(identifier: str) -> IdentityType:
    return IdentityType.EMAIL if "@" in identifier else IdentityType.PHONE


class AuthService:
    def __init__(
        self, db: AsyncSession, *, otp_provider: OtpProvider, rate_limiter: RateLimiter
    ) -> None:
        self._db = db
        self._otp_provider = otp_provider
        self._rate_limiter = rate_limiter
        self._users = UserRepository(db)
        self._otps = OtpRepository(db)
        self._sessions = SessionRepository(db)
        self._audit = AuditRepository(db)

    async def request_otp(self, identifier: str) -> int:
        """Shared by /auth/register and /auth/login — which one applies is
        decided at verify time (see verify_otp), not here, so requesting a
        code behaves identically either way and can't be used to enumerate
        which identifiers already have an account.
        """
        settings = get_settings()
        identity_hash = hmac_lookup_hash(identifier)

        allowed = await self._rate_limiter.allow(
            f"otp_request:{identity_hash}", limit=5, window_seconds=3600
        )
        if not allowed:
            raise RateLimitedError("Too many code requests. Try again later.")

        code = generate_otp_code()
        self._otps.create(
            identity_value_hash=identity_hash,
            otp_code_hash=hash_secret(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=settings.otp_ttl_minutes),
            context="patient_auth",
        )
        await self._audit.record(
            actor_user_id=None,
            event_type=audit_events.OTP_REQUESTED,
            outcome="success",
            resource_type="identity",
            metadata={"identifier_hash": identity_hash},
        )
        await self._db.commit()

        await self._otp_provider.send(identifier=identifier, code=code)
        return OTP_RESEND_COOLDOWN_SECONDS

    async def verify_otp(self, identifier: str, code: str) -> tuple[User, str, str]:
        """Returns (user, access_token, refresh_cookie_value)."""
        settings = get_settings()
        identity_hash = hmac_lookup_hash(identifier)

        challenge = await self._otps.get_latest_active(identity_hash)
        if challenge is None:
            await self._audit.record(
                actor_user_id=None,
                event_type=audit_events.LOGIN_FAILURE,
                outcome="failure",
                metadata={"reason": "no_active_challenge"},
            )
            await self._db.commit()
            raise UnauthorizedError("That code has expired. Request a new one.")

        if challenge.attempt_count >= settings.otp_max_attempts:
            await self._db.commit()
            raise RateLimitedError("Too many attempts. Request a new code.")

        if not verify_secret(code, challenge.otp_code_hash):
            challenge.attempt_count += 1
            await self._audit.record(
                actor_user_id=None,
                event_type=audit_events.LOGIN_FAILURE,
                outcome="failure",
                metadata={"reason": "bad_code"},
            )
            await self._db.commit()
            raise UnauthorizedError("Incorrect code.")

        challenge.consumed_at = datetime.now(UTC)

        identity_type = classify_identifier(identifier)
        identity = await self._users.find_identity_by_hash(identity_type, identity_hash)

        if identity is not None:
            user = await self._users.get_by_id(identity.user_id)
            if user is None:  # pragma: no cover - defensive
                raise UnauthorizedError("Account no longer exists.")
        else:
            user = await self._create_account(identifier, identity_type, identity_hash)

        session, refresh_raw = await self._create_session(user.id)
        access_token = create_access_token(user_id=str(user.id), session_id=str(session.id))

        await self._audit.record(
            actor_user_id=user.id,
            event_type=audit_events.LOGIN_SUCCESS,
            outcome="success",
            resource_type="session",
            resource_id=str(session.id),
        )
        await self._db.commit()

        refresh_cookie_value = f"{session.id}{REFRESH_COOKIE_SEPARATOR}{refresh_raw}"
        return user, access_token, refresh_cookie_value

    async def _create_account(
        self, identifier: str, identity_type: IdentityType, identity_hash: str
    ) -> User:
        user = User()
        self._users.add(user)
        await self._db.flush()  # assigns user.id

        self._users.add(
            UserIdentity(
                user_id=user.id,
                identity_type=identity_type,
                identity_value_encrypted=encrypt_field(identifier),
                identity_value_hash=identity_hash,
                verified=True,
                verified_at=datetime.now(UTC),
            )
        )

        healthy_id = await self._unique_healthy_id()
        self._users.add(HealthyId(user_id=user.id, healthy_id=healthy_id))
        self._users.add(HealthProfile(user_id=user.id))

        await self._db.flush()
        return user

    async def _unique_healthy_id(self) -> str:
        for _ in range(10):
            candidate = generate_healthy_id()
            if not await self._users.healthy_id_exists(candidate):
                return candidate
        raise RuntimeError("Could not generate a unique Healthy ID.")  # pragma: no cover

    async def _create_session(self, user_id: uuid.UUID) -> tuple[SessionModel, str]:
        settings = get_settings()
        refresh_raw = generate_opaque_token()
        session = self._sessions.create(
            user_id=user_id,
            refresh_token_hash=hash_secret(refresh_raw),
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days),
        )
        await self._db.flush()
        return session, refresh_raw

    async def refresh(self, refresh_cookie_value: str) -> tuple[str, str]:
        """Returns (new_access_token, new_refresh_cookie_value)."""
        settings = get_settings()
        try:
            session_id_str, refresh_raw = refresh_cookie_value.split(REFRESH_COOKIE_SEPARATOR, 1)
            session_id = uuid.UUID(session_id_str)
        except ValueError as exc:
            raise UnauthorizedError("Invalid session.") from exc

        session = await self._sessions.get_active(session_id)
        if session is None or not verify_secret(refresh_raw, session.refresh_token_hash):
            if session is not None:
                # The presented token didn't match this session's stored
                # hash — treat as compromised and kill it rather than
                # silently ignoring the mismatch.
                await self._sessions.revoke(session_id)
                await self._db.commit()
            raise UnauthorizedError("Session expired. Please log in again.")

        new_refresh_raw = generate_opaque_token()
        session.refresh_token_hash = hash_secret(new_refresh_raw)
        session.expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_ttl_days)

        access_token = create_access_token(user_id=str(session.user_id), session_id=str(session.id))
        await self._db.commit()

        return access_token, f"{session.id}{REFRESH_COOKIE_SEPARATOR}{new_refresh_raw}"

    async def logout(self, session_id: uuid.UUID, user_id: uuid.UUID) -> None:
        await self._sessions.revoke(session_id)
        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.LOGOUT,
            outcome="success",
            resource_type="session",
            resource_id=str(session_id),
        )
        await self._db.commit()

    async def get_user_response(self, user_id: uuid.UUID) -> UserResponse:
        user = await self._users.get_by_id(user_id)
        if user is None:
            raise UnauthorizedError("Account no longer exists.")

        healthy_id = await self._users.get_healthy_id(user_id)
        profile = await self._users.get_health_profile(user_id)
        identities = await self._users.list_identities(user_id)

        phone = next(
            (
                decrypt_field(i.identity_value_encrypted)
                for i in identities
                if i.identity_type == IdentityType.PHONE
            ),
            None,
        )
        email = next(
            (
                decrypt_field(i.identity_value_encrypted)
                for i in identities
                if i.identity_type == IdentityType.EMAIL
            ),
            None,
        )

        return UserResponse(
            healthy_id=healthy_id.healthy_id if healthy_id else "",
            name=profile.display_name if profile else None,
            date_of_birth=profile.date_of_birth if profile else None,
            sex=profile.sex.value if profile and profile.sex else None,
            phone=phone,
            email=email,
            blood_group=profile.blood_group if profile else None,
            emergency_contact=(
                EmergencyContact(**profile.emergency_contact)
                if profile and profile.emergency_contact
                else None
            ),
            allergies=profile.allergies if profile else [],
            current_medications=profile.current_medications if profile else [],
            preferred_language=profile.preferred_language if profile else "en",
            created_at=user.created_at,
        )

    async def update_profile(self, user_id: uuid.UUID, data: UpdateProfileRequest) -> UserResponse:
        profile = await self._users.get_health_profile(user_id)
        if profile is None:  # pragma: no cover - every user gets one at registration
            raise UnauthorizedError("Account no longer exists.")

        fields = data.model_dump(exclude_unset=True)

        if "name" in fields:
            profile.display_name = fields["name"]
        if "date_of_birth" in fields:
            raw = fields["date_of_birth"]
            try:
                profile.date_of_birth = date.fromisoformat(raw) if raw else None
            except ValueError as exc:
                raise ValidationAppError("Invalid date of birth.") from exc
        if "sex" in fields:
            raw_sex = fields["sex"]
            try:
                profile.sex = Sex(raw_sex) if raw_sex else Sex.UNSPECIFIED
            except ValueError as exc:
                raise ValidationAppError("Invalid sex value.") from exc
        if "blood_group" in fields:
            profile.blood_group = fields["blood_group"]
        if "emergency_contact" in fields:
            profile.emergency_contact = fields["emergency_contact"]
        if "allergies" in fields:
            profile.allergies = fields["allergies"] or []
        if "current_medications" in fields:
            profile.current_medications = fields["current_medications"] or []

        profile.version += 1
        await self._db.commit()

        return await self.get_user_response(user_id)
