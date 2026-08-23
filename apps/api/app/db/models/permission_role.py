import uuid

from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin
from app.db.types import GUID


class PermissionRole(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A patient-defined, reusable bundle of category access + a default
    duration (RBAC-style role, §49) — a template a patient can apply when
    creating a share (app/services/sharing_service.py), not a grant itself.
    Deleting a role never touches shares already created from it: those
    stored their own category list at creation time (SharingSessionScope),
    so this table has no downstream audit/consent significance of its own.
    """

    __tablename__ = "permission_roles"

    patient_user_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    default_duration_hours: Mapped[int] = mapped_column(Integer, nullable=False)


class PermissionRoleScope(UUIDPrimaryKeyMixin, Base):
    """One row per health category a PermissionRole bundles — same
    category-level granularity as SharingSessionScope (§50)."""

    __tablename__ = "permission_role_scopes"
    __table_args__ = (UniqueConstraint("role_id", "category", name="uq_role_scope_category"),)

    role_id: Mapped[uuid.UUID] = mapped_column(
        GUID(), ForeignKey("permission_roles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    category: Mapped[str] = mapped_column(String(32), nullable=False)
