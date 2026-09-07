"""OTP delivery provider abstraction (§137/§138). Swap `MockOtpProvider` for
a real SMS/email provider once credentials exist — nothing outside
`get_otp_provider` should need to change.
"""

import logging
import re
from base64 import b64encode
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

import httpx

from app.core.config import get_settings
from app.core.errors import ValidationAppError

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


class TwilioSmsOtpProvider:
    """Send one-time codes through Twilio's SMS API."""

    def __init__(self, *, account_sid: str, auth_token: str, from_number: str) -> None:
        self._account_sid = account_sid
        self._from_number = from_number
        credentials = b64encode(f"{account_sid}:{auth_token}".encode()).decode()
        self._headers = {"Authorization": f"Basic {credentials}"}

    async def send(self, *, identifier: str, code: str) -> None:
        if not re.fullmatch(r"\+\d{8,15}", identifier):
            raise ValidationAppError("Real SMS OTP requires an E.164 phone number.")

        url = f"https://api.twilio.com/2010-04-01/Accounts/{self._account_sid}/Messages.json"
        data = {
            "From": self._from_number,
            "To": identifier,
            "Body": f"Your Healthy verification code is {code}. It expires in 5 minutes.",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, data=data, headers=self._headers)
        if response.is_error:
            logger.error("Twilio rejected OTP delivery with status %s", response.status_code)
            raise RuntimeError("Could not send verification code.")


def get_otp_provider() -> OtpProvider:
    settings = get_settings()
    if settings.otp_provider == "mock":
        if settings.is_production:
            raise RuntimeError("OTP_PROVIDER=mock must not be used in production.")
        return MockOtpProvider()
    if settings.otp_provider == "twilio":
        missing = [
            name
            for name, value in {
                "TWILIO_ACCOUNT_SID": settings.twilio_account_sid,
                "TWILIO_AUTH_TOKEN": settings.twilio_auth_token,
                "TWILIO_FROM_NUMBER": settings.twilio_from_number,
            }.items()
            if not value
        ]
        if missing:
            raise RuntimeError(f"Missing Twilio configuration: {', '.join(missing)}")
        return TwilioSmsOtpProvider(
            account_sid=settings.twilio_account_sid,
            auth_token=settings.twilio_auth_token,
            from_number=settings.twilio_from_number,
        )
    raise NotImplementedError(f"OTP provider '{settings.otp_provider}' is not implemented.")
