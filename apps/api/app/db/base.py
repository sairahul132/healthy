from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.database_url, pool_pre_ping=True)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession]:
    async with async_session_factory() as session:
        yield session


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """For code that needs to open its own session outside a request's
    lifetime — e.g. a FastAPI BackgroundTask, which runs after get_db's
    request-scoped session has already closed. Exposed as an overridable
    dependency (not a bare import of async_session_factory) so tests can
    point it at the same in-memory test engine as get_db (see
    tests/conftest.py's client fixture)."""
    return async_session_factory
