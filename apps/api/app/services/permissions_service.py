"""Permission roles (RBAC-style reusable access templates, §49) — a patient
defines a named bundle of category access + a default duration once, then
applies it when creating a share (app/services/sharing_service.py resolves
the actual grant separately; a role is only ever a template the frontend
reads from, never referenced by a SharingSession after creation).
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.core import audit_events
from app.core.errors import NotFoundError
from app.db.models import PermissionRole, PermissionRoleScope
from app.repositories.audit_repository import AuditRepository
from app.repositories.permissions_repository import PermissionsRepository
from app.schemas.permissions import (
    CreatePermissionRoleRequest,
    PermissionRoleResponse,
    UpdatePermissionRoleRequest,
)


class PermissionsService:
    def __init__(self, db: AsyncSession) -> None:
        self._db = db
        self._permissions = PermissionsRepository(db)
        self._audit = AuditRepository(db)

    async def _to_response(self, role: PermissionRole) -> PermissionRoleResponse:
        scopes = await self._permissions.list_scopes(role.id)
        return PermissionRoleResponse(
            id=str(role.id),
            name=role.name,
            category_ids=[s.category for s in scopes],
            default_duration_hours=role.default_duration_hours,
            created_at=role.created_at,
        )

    async def create_role(
        self, user_id: uuid.UUID, body: CreatePermissionRoleRequest
    ) -> PermissionRoleResponse:
        role = PermissionRole(
            patient_user_id=user_id,
            name=body.name,
            default_duration_hours=body.default_duration_hours,
        )
        self._permissions.add(role)
        await self._db.flush()

        for category in body.category_ids:
            self._permissions.add(PermissionRoleScope(role_id=role.id, category=category))

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.PERMISSION_ROLE_CREATED,
            outcome="success",
            resource_type="permission_role",
            resource_id=str(role.id),
            metadata={"name": body.name, "categories": body.category_ids},
        )
        await self._db.commit()
        return await self._to_response(role)

    async def list_roles(self, user_id: uuid.UUID) -> list[PermissionRoleResponse]:
        roles = await self._permissions.list_roles_for_user(user_id)
        return [await self._to_response(r) for r in roles]

    async def update_role(
        self, user_id: uuid.UUID, role_id: uuid.UUID, body: UpdatePermissionRoleRequest
    ) -> PermissionRoleResponse:
        role = await self._permissions.get_role_by_id(role_id)
        if role is None or role.patient_user_id != user_id:
            raise NotFoundError("Role not found.")

        updates = body.model_dump(exclude_unset=True, exclude={"category_ids"})
        for field, value in updates.items():
            setattr(role, field, value)

        if body.category_ids is not None:
            for scope in await self._permissions.list_scopes(role.id):
                await self._permissions.delete(scope)
            await self._db.flush()  # deletes must land before re-adding, or the
            # (role_id, category) unique constraint can collide on an unchanged category
            for category in body.category_ids:
                self._permissions.add(PermissionRoleScope(role_id=role.id, category=category))

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.PERMISSION_ROLE_UPDATED,
            outcome="success",
            resource_type="permission_role",
            resource_id=str(role.id),
            metadata={"fields": list(body.model_dump(exclude_unset=True).keys())},
        )
        await self._db.commit()
        return await self._to_response(role)

    async def delete_role(self, user_id: uuid.UUID, role_id: uuid.UUID) -> None:
        role = await self._permissions.get_role_by_id(role_id)
        if role is None or role.patient_user_id != user_id:
            raise NotFoundError("Role not found.")

        await self._audit.record(
            actor_user_id=user_id,
            event_type=audit_events.PERMISSION_ROLE_DELETED,
            outcome="success",
            resource_type="permission_role",
            resource_id=str(role.id),
        )
        await self._permissions.delete(role)
        await self._db.commit()
