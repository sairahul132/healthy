"""Object storage provider abstraction (docs/SPEC.md §6/§58/§109). Three
interchangeable implementations, selected by STORAGE_PROVIDER: `local`
(filesystem — dev only, and not durable on hosts with an ephemeral disk),
`s3_compatible` (S3/R2/MinIO/etc — real production storage), and
`database` (Postgres — no separate object-storage account/credentials,
for deployments that want to run on nothing but the Postgres they already
have). All three implement the same interface, so nothing outside
`get_storage_provider` needs to change (§138 pattern, same shape as
app/providers/otp_provider.py).

Keys are randomized (never derived from filename/user-guessable data,
§109), storage is private (no public bucket, no direct URL is ever handed
to the frontend — §58), and callers only ever get bytes back through this
provider, never a raw storage URL.
"""

import uuid
from pathlib import Path
from typing import Protocol

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.db.base import get_session_factory
from app.db.models.stored_object import StoredObject


class StorageProvider(Protocol):
    async def put(self, key: str, data: bytes, *, content_type: str) -> None: ...
    async def get(self, key: str) -> bytes: ...


def build_object_key(user_id: uuid.UUID, filename: str) -> str:
    """A random key, not the filename or user id — see module docstring."""
    suffix = Path(filename).suffix[:10]
    return f"reports/{user_id}/{uuid.uuid4().hex}{suffix}"


class LocalFilesystemStorageProvider:
    """Real (not mocked) storage — private local directory, no HTTP exposure,
    no public URL. The intended local-dev stand-in for S3/MinIO when neither
    is running, same portability rationale as SQLite standing in for
    Postgres (see apps/api/README.md)."""

    def __init__(self, base_dir: Path) -> None:
        self._base_dir = base_dir
        self._base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve(self, key: str) -> Path:
        path = (self._base_dir / key).resolve()
        if not str(path).startswith(str(self._base_dir.resolve())):
            raise ValueError("Invalid storage key.")  # defense against path traversal
        return path

    async def put(self, key: str, data: bytes, *, content_type: str) -> None:
        path = self._resolve(key)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    async def get(self, key: str) -> bytes:
        return self._resolve(key).read_bytes()


class S3CompatibleStorageProvider:
    """Real S3/MinIO-backed storage via boto3 — used in staging/production
    (docker-compose.yml's minio service) and available locally too if
    STORAGE_PROVIDER=s3_compatible and MinIO is actually running."""

    def __init__(
        self,
        *,
        endpoint_url: str | None,
        bucket: str,
        access_key: str,
        secret_key: str,
        region: str,
    ) -> None:
        import boto3

        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint_url,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )

    async def put(self, key: str, data: bytes, *, content_type: str) -> None:
        self._client.put_object(Bucket=self._bucket, Key=key, Body=data, ContentType=content_type)

    async def get(self, key: str) -> bytes:
        response = self._client.get_object(Bucket=self._bucket, Key=key)
        return response["Body"].read()


class DatabaseStorageProvider:
    """Real storage backed by Postgres instead of a filesystem/S3 bucket —
    for a deployment that wants to use only the free/open-source Postgres
    it already has, with no separate object-storage account or
    credentials to manage. A provider instance is a long-lived singleton
    (not request-scoped), so — like `_run_processing` in
    app/api/v1/reports.py — it opens its own short-lived session per call
    rather than reusing one tied to a request."""

    def __init__(self, session_factory: async_sessionmaker[AsyncSession]) -> None:
        self._session_factory = session_factory

    async def put(self, key: str, data: bytes, *, content_type: str) -> None:
        async with self._session_factory() as db:
            db.add(
                StoredObject(key=key, data=data, content_type=content_type, size_bytes=len(data))
            )
            await db.commit()

    async def get(self, key: str) -> bytes:
        async with self._session_factory() as db:
            result = await db.execute(select(StoredObject.data).where(StoredObject.key == key))
            row = result.scalar_one_or_none()
            if row is None:
                raise FileNotFoundError(f"No stored object for key '{key}'.")
            return row


_local_instance: StorageProvider | None = None
_database_instance: StorageProvider | None = None


def get_storage_provider() -> StorageProvider:
    settings = get_settings()
    if settings.storage_provider == "local":
        global _local_instance
        if _local_instance is None:
            _local_instance = LocalFilesystemStorageProvider(Path(settings.storage_local_dir))
        return _local_instance
    if settings.storage_provider == "s3_compatible":
        return S3CompatibleStorageProvider(
            endpoint_url=settings.storage_endpoint_url,
            bucket=settings.storage_bucket,
            access_key=settings.storage_access_key,
            secret_key=settings.storage_secret_key,
            region=settings.storage_region,
        )
    if settings.storage_provider == "database":
        global _database_instance
        if _database_instance is None:
            _database_instance = DatabaseStorageProvider(get_session_factory())
        return _database_instance
    raise NotImplementedError(f"Storage provider '{settings.storage_provider}' is not implemented.")
