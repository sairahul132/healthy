"""Dialect-portable column types.

Production runs on Postgres (docker-compose.yml). Local development without
Docker — and this project's test suite — runs on SQLite instead, since
Postgres isn't always available. Postgres-only types like
`postgresql.UUID`/`JSONB` would break on SQLite, so every model uses these
instead: identical storage and behavior on Postgres, a portable fallback
elsewhere.
"""

import uuid
from typing import Any

from sqlalchemy import CHAR, JSON, TypeDecorator
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.engine.interfaces import Dialect
from sqlalchemy.types import TypeEngine


class GUID(TypeDecorator[uuid.UUID]):
    """Stores a UUID as a native Postgres UUID, or a CHAR(36) string elsewhere."""

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=True))
        return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value: uuid.UUID | str | None, dialect: Dialect) -> str | None:
        if value is None:
            return None
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            value = uuid.UUID(value)
        return str(value)

    def process_result_value(
        self, value: uuid.UUID | str | None, dialect: Dialect
    ) -> uuid.UUID | None:
        if value is None:
            return None
        if isinstance(value, uuid.UUID):
            return value
        return uuid.UUID(value)


class JSONEncodedDict(TypeDecorator[dict[str, Any]]):
    """Stores a dict as Postgres JSONB, or a JSON-encoded TEXT column elsewhere."""

    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> TypeEngine[Any]:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())
