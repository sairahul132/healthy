"""Object storage provider abstraction (docs/SPEC.md §6/§58/§109). Swap
`LocalFilesystemStorageProvider` for the S3-compatible one by setting
STORAGE_PROVIDER=s3_compatible — both implement the same interface, so
nothing outside `get_storage_provider` needs to change (§138 pattern, same
shape as app/providers/otp_provider.py).

Keys are randomized (never derived from filename/user-guessable data,
§109), storage is private (no public bucket, no direct URL is ever handed
to the frontend — §58), and callers only ever get bytes back through this
provider, never a raw storage URL.
"""

import uuid
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


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


_local_instance: StorageProvider | None = None


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
    raise NotImplementedError(f"Storage provider '{settings.storage_provider}' is not implemented.")
