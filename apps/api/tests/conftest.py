import os
import uuid
from collections.abc import AsyncGenerator

os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/0")
os.environ.setdefault("JWT_SIGNING_KEY", "test-signing-key-0000000000000000000000000000")
os.environ.setdefault("FIELD_ENCRYPTION_KEY", "test-field-key-00000000000000000000000000000")

import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.db.base import Base, get_db  # noqa: E402
from app.db.models import *  # noqa: E402,F401,F403  (populate Base.metadata)
from app.main import app  # noqa: E402
from app.providers.otp_provider import get_otp_provider  # noqa: E402
from app.providers.rate_limiter import InMemoryRateLimiter, get_rate_limiter  # noqa: E402


class RecordingOtpProvider:
    """Test double: captures the last code sent per identifier instead of
    logging it, so tests can read it directly rather than scraping stdout."""

    def __init__(self) -> None:
        self.sent: dict[str, str] = {}

    async def send(self, *, identifier: str, code: str) -> None:
        self.sent[identifier] = code


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
async def client(test_engine, otp_provider) -> AsyncGenerator[AsyncClient]:
    session_factory = async_sessionmaker(test_engine, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            yield session

    rate_limiter = InMemoryRateLimiter()

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_otp_provider] = lambda: otp_provider
    app.dependency_overrides[get_rate_limiter] = lambda: rate_limiter

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


def unique_identifier(prefix: str = "user") -> str:
    return f"{prefix}-{uuid.uuid4().hex[:10]}@example.com"
