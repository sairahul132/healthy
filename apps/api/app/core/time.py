from datetime import UTC, datetime


def utcnow() -> datetime:
    return datetime.now(UTC)


def ensure_utc(value: datetime) -> datetime:
    """SQLite drops tzinfo on read even for `DateTime(timezone=True)`
    columns (a dialect quirk, not a bug in our types — see app/db/types.py
    for the equivalent UUID/JSON portability shims). Every datetime this
    app stores is UTC by convention, so a naive value read back is treated
    as UTC rather than raising on comparison against an aware one.
    """
    return value if value.tzinfo is not None else value.replace(tzinfo=UTC)
