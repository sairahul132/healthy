import os
import uuid
from collections.abc import AsyncGenerator

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SIGNING_KEY", "test-signing-key-0000000000000000000000000000")
os.environ.setdefault("FIELD_ENCRYPTION_KEY", "test-field-key-00000000000000000000000000000")
os.environ["OTP_BYPASS_ENABLED"] = "false"

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.base import Base, get_db, get_session_factory  # noqa: E402
from app.db.models import *  # noqa: E402,F401,F403  (populate Base.metadata)
from app.main import app  # noqa: E402
from app.providers.ai_provider import get_ai_provider  # noqa: E402
from app.providers.notification_provider import get_notification_provider  # noqa: E402
from app.providers.otp_provider import get_otp_provider  # noqa: E402
from app.providers.rate_limiter import InMemoryRateLimiter, get_rate_limiter  # noqa: E402
from app.providers.storage_provider import (  # noqa: E402
    LocalFilesystemStorageProvider,
    get_storage_provider,
)


class RecordingOtpProvider:
    """Test double: captures the last code sent per identifier instead of
    logging it, so tests can read it directly rather than scraping stdout."""

    def __init__(self) -> None:
        self.sent: dict[str, str] = {}

    async def send(self, *, identifier: str, code: str) -> None:
        self.sent[identifier] = code


class RecordingNotificationProvider:
    """Test double: captures the last notification sent instead of logging
    it, so tests can assert on it directly."""

    def __init__(self) -> None:
        self.sent: list[dict[str, str]] = []

    async def send(self, *, identifier: str, subject: str, message: str) -> None:
        self.sent.append({"identifier": identifier, "subject": subject, "message": message})


class RecordingAiProvider:
    """Test double: captures the last system_prompt/messages it was called
    with (so tests can assert on prompt-injection wrapping) and returns a
    deterministic canned reply instead of calling a real model."""

    def __init__(self) -> None:
        self.last_system_prompt: str | None = None
        self.last_messages: list[dict[str, str]] | None = None
        self.call_count = 0

    async def generate(self, *, system_prompt: str, messages: list[dict[str, str]]) -> str:
        self.call_count += 1
        self.last_system_prompt = system_prompt
        self.last_messages = messages
        return "canned test reply"


@pytest_asyncio.fixture
async def test_engine():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield engine
    await engine.dispose()


@pytest_asyncio.fixture
async def otp_provider() -> RecordingOtpProvider:
    return RecordingOtpProvider()


@pytest_asyncio.fixture
async def ai_provider() -> RecordingAiProvider:
    return RecordingAiProvider()


@pytest_asyncio.fixture
async def notification_provider() -> RecordingNotificationProvider:
    return RecordingNotificationProvider()


@pytest_asyncio.fixture
async def client(
    test_engine, otp_provider, ai_provider, notification_provider, tmp_path
) -> AsyncGenerator[AsyncClient]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    rate_limiter = InMemoryRateLimiter()
    storage = LocalFilesystemStorageProvider(tmp_path / "storage")

    app.dependency_overrides[get_db] = override_get_db
    # BackgroundTasks (report processing) open their own session after the
    # request-scoped one has closed — must resolve to the same test engine,
    # not the real one, or the background task silently writes nowhere.
    app.dependency_overrides[get_session_factory] = lambda: session_factory
    app.dependency_overrides[get_otp_provider] = lambda: otp_provider
    app.dependency_overrides[get_ai_provider] = lambda: ai_provider
    app.dependency_overrides[get_notification_provider] = lambda: notification_provider
    app.dependency_overrides[get_rate_limiter] = lambda: rate_limiter
    app.dependency_overrides[get_storage_provider] = lambda: storage

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def register_and_verify(
    client: AsyncClient, otp_provider: RecordingOtpProvider, identifier: str
) -> dict:
    """Full OTP signup for a fresh identifier — returns the verify-otp JSON
    body. The client's cookie jar carries the resulting session forward for
    subsequent calls in the same test."""
    await client.post("/api/v1/auth/register", json={"identifier": identifier})
    code = otp_provider.sent[identifier]
    resp = await client.post(
        "/api/v1/auth/verify-otp", json={"identifier": identifier, "code": code}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


async def login_and_verify(
    client: AsyncClient, otp_provider: RecordingOtpProvider, identifier: str
) -> dict:
    """OTP login for an identifier that already has an account — pairs with
    register_and_verify for re-authenticating in a later part of a test."""
    await client.post("/api/v1/auth/login", json={"identifier": identifier})
    code = otp_provider.sent[identifier]
    resp = await client.post(
        "/api/v1/auth/verify-otp", json={"identifier": identifier, "code": code}
    )
    assert resp.status_code == 200, resp.text
    return resp.json()


def unique_identifier(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"
