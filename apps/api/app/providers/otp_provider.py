"""OTP delivery provider abstraction (§137/§138). Swap `MockOtpProvider` for
a real SMS/email provider once credentials exist — nothing outside
`get_otp_provider` should need to change.
"""

import logging
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("healthify.otp")


class OtpProvider(Protocol):
    async def send(self, *, identifier: str, code: str) -> None: ...


class MockOtpProvider:
    """⚠️ MOCK — logs the code to the API console instead of sending SMS/email
    (OTP_PROVIDER=mock, §137). This is the only OTP provider implemented so far;
    it must never be selected when `settings.environment == "production"`.
    """

    async def send(self, *, identifier: str, code: str) -> None:
        logger.info("MOCK OTP for %s: %s", identifier, code)


def get_otp_provider() -> OtpProvider:
    settings = get_settings()
    if settings.otp_provider == "mock":
        if settings.is_production:
            raise RuntimeError("OTP_PROVIDER=mock must not be used in production.")
        return MockOtpProvider()
    raise NotImplementedError(f"OTP provider '{settings.otp_provider}' is not implemented.")
