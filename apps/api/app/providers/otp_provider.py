"""OTP delivery provider abstraction (§137/§138). Swap `MockOtpProvider` for
a real SMS/email provider once credentials exist — nothing outside
`get_otp_provider` should need to change.
"""

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("healthy.otp")

OTP_LOG_FILE = Path(__file__).resolve().parents[2] / "otp_log.txt"


class OtpProvider(Protocol):
    async def send(self, *, identifier: str, code: str) -> None: ...


class MockOtpProvider:
    """⚠️ MOCK — logs the code to the API console and to `otp_log.txt`
    (repo-relative: apps/api/otp_log.txt) instead of sending SMS/email
    (OTP_PROVIDER=mock, §137). The file is test-only scaffolding for local
    dev — see OTP_LOG_FILE. This is the only OTP provider implemented so
    far; it must never be selected when `settings.environment == "production"`.
    """

    async def send(self, *, identifier: str, code: str) -> None:
        logger.info("MOCK OTP for %s: %s", identifier, code)
        timestamp = datetime.now(UTC).isoformat()
        with OTP_LOG_FILE.open("a") as f:
            f.write(f"{timestamp}\t{identifier}\t{code}\n")


def get_otp_provider() -> OtpProvider:
    settings = get_settings()
    if settings.otp_provider == "mock":
        if settings.is_production:
            raise RuntimeError("OTP_PROVIDER=mock must not be used in production.")
        return MockOtpProvider()
    raise NotImplementedError(f"OTP provider '{settings.otp_provider}' is not implemented.")
