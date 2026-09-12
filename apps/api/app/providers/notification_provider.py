"""Patient notification provider abstraction (§137/§138). Swap
`MockNotificationProvider` for a real email/SMS/push provider once
credentials exist — nothing outside `get_notification_provider` should need
to change.
"""

import logging
from datetime import UTC, datetime
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings

logger = logging.getLogger("healthy.notifications")

NOTIFICATION_LOG_FILE = Path(__file__).resolve().parents[2] / "notifications_log.txt"


class NotificationProvider(Protocol):
    async def send(self, *, identifier: str, subject: str, message: str) -> None: ...


class MockNotificationProvider:
    """⚠️ MOCK — logs the notification to the API console and to
    `notifications_log.txt` (repo-relative: apps/api/notifications_log.txt)
    instead of sending email/SMS/push (NOTIFICATION_PROVIDER=mock). This is
    the only notification provider implemented so far; it must never be
    selected when `settings.environment == "production"`.
    """

    async def send(self, *, identifier: str, subject: str, message: str) -> None:
        logger.info("MOCK notification for %s: %s", identifier, subject)
        timestamp = datetime.now(UTC).isoformat()
        with NOTIFICATION_LOG_FILE.open("a") as f:
            f.write(f"{timestamp}\t{identifier}\t{subject}\t{message}\n")


def get_notification_provider() -> NotificationProvider:
    settings = get_settings()
    if settings.notification_provider == "mock":
        if settings.is_production and not settings.allow_mock_providers:
            raise RuntimeError("NOTIFICATION_PROVIDER=mock must not be used in production.")
        return MockNotificationProvider()
    raise NotImplementedError(
        f"Notification provider '{settings.notification_provider}' is not implemented."
    )
