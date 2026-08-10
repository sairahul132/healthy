"""Crypto primitives used across the app. No business logic here — just the mechanics
of hashing, encrypting, and generating identifiers/tokens.
"""

import hashlib
import hmac
import secrets
import string
from datetime import UTC, datetime, timedelta

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError
from cryptography.fernet import Fernet

from app.core.config import get_settings

_hasher = PasswordHasher()

# Excludes 0/O/1/I to avoid transcription ambiguity when a Healthy ID is read aloud
# or copied from a printed card.
_HEALTHY_ID_ALPHABET = "".join(
    c for c in (string.ascii_uppercase + string.digits) if c not in "01OI"
)


def generate_otp_code() -> str:
    """6-digit numeric OTP using a CSPRNG (not `random`)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def hash_secret(value: str) -> str:
    """Argon2id hash for OTP codes and refresh tokens — never store either in plaintext."""
    return _hasher.hash(value)


def verify_secret(value: str, hashed: str) -> bool:
    try:
        return _hasher.verify(hashed, value)
    except VerifyMismatchError:
        return False


def hmac_lookup_hash(value: str) -> str:
    """Deterministic keyed hash used ONLY for equality lookups (e.g. 'does this phone
    number already have an account'). Never used as the encryption of the value itself —
    see `encrypt_field` for that. Reusing the same key for both would let an attacker
    correlate encrypted values, so this uses a distinct derived key.
    """
    settings = get_settings()
    key = hashlib.sha256(f"lookup:{settings.field_encryption_key}".encode()).digest()
    return hmac.new(key, value.encode(), hashlib.sha256).hexdigest()


def _fernet() -> Fernet:
    settings = get_settings()
    # Fernet requires a 32-byte urlsafe-base64 key; derive one deterministically from
    # the configured secret so operators only manage one value per environment.
    key = hashlib.sha256(settings.field_encryption_key.encode()).digest()
    import base64

    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_field(plaintext: str) -> str:
    """AES-128-CBC+HMAC (Fernet) authenticated encryption for PII fields at rest.
    Phase-later: swap for KMS-backed envelope encryption in production per §8.
    """
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt_field(ciphertext: str) -> str:
    return _fernet().decrypt(ciphertext.encode()).decode()


def _random_id_segment() -> str:
    return "".join(secrets.choice(_HEALTHY_ID_ALPHABET) for _ in range(4))


def generate_healthy_id() -> str:
    """HLT-XXXX-XXXX — random, not sequential, not derived from any PII or DB id (§11)."""
    return f"HLT-{_random_id_segment()}-{_random_id_segment()}"


def generate_opaque_token() -> str:
    """High-entropy opaque token for refresh tokens / future sharing sessions (§134)."""
    return secrets.token_urlsafe(32)


def create_access_token(*, user_id: str, session_id: str) -> str:
    """Short-lived JWT holding only identity/session metadata — never health data (§136)."""
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": user_id,
        "sid": session_id,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
        "type": "access",
    }
    return jwt.encode(payload, settings.jwt_signing_key, algorithm="HS256")


def decode_access_token(token: str) -> dict:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_signing_key, algorithms=["HS256"])
    if payload.get("type") != "access":
        raise jwt.InvalidTokenError("Not an access token.")
    return payload


def create_share_access_token(*, sharing_session_id: str, recipient_identifier_hash: str) -> str:
    """Short-lived JWT proving a recipient completed OTP verification for one
    specific sharing session (§43/§44). Distinct token type from patient
    access tokens so one can never be presented as the other; scoped to a
    single session id so it can't be replayed against a different share.
    """
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "ssid": sharing_session_id,
        "rih": recipient_identifier_hash,
        "iat": now,
        "exp": now + timedelta(minutes=settings.share_access_token_ttl_minutes),
        "type": "share_access",
    }
    return jwt.encode(payload, settings.jwt_signing_key, algorithm="HS256")


def decode_share_access_token(token: str) -> dict:
    settings = get_settings()
    payload = jwt.decode(token, settings.jwt_signing_key, algorithms=["HS256"])
    if payload.get("type") != "share_access":
        raise jwt.InvalidTokenError("Not a share access token.")
    return payload
