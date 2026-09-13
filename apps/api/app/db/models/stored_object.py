from sqlalchemy import Integer, LargeBinary, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin


class StoredObject(TimestampMixin, Base):
    """Object bytes for StorageProvider when STORAGE_PROVIDER=database —
    plain Postgres standing in for a filesystem/S3 bucket, for deployments
    that don't want a separate object-storage account (§138 pattern, see
    app/providers/storage_provider.py). Keyed by the same randomized key
    build_object_key() already generates; fine for the <=20MB files
    reports/prescriptions use, not meant for large media at scale.
    """

    __tablename__ = "stored_objects"

    key: Mapped[str] = mapped_column(String(500), primary_key=True)
    data: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    content_type: Mapped[str] = mapped_column(String(100), nullable=False)
    size_bytes: Mapped[int] = mapped_column(Integer, nullable=False)
