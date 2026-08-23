import uuid

from fastapi import APIRouter, Depends

from app.api.v1.deps import CurrentIdentity, get_current_identity, get_permissions_service
from app.schemas.permissions import (
    CreatePermissionRoleRequest,
    PermissionRoleResponse,
    UpdatePermissionRoleRequest,
)
from app.services.permissions_service import PermissionsService

router = APIRouter(prefix="/permissions", tags=["permissions"])


@router.post("/roles", response_model=PermissionRoleResponse, status_code=201)
async def create_role(
    body: CreatePermissionRoleRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PermissionsService = Depends(get_permissions_service),
) -> PermissionRoleResponse:
    return await service.create_role(identity.user_id, body)


@router.get("/roles", response_model=list[PermissionRoleResponse])
async def list_roles(
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PermissionsService = Depends(get_permissions_service),
) -> list[PermissionRoleResponse]:
    return await service.list_roles(identity.user_id)


@router.patch("/roles/{role_id}", response_model=PermissionRoleResponse)
async def update_role(
    role_id: uuid.UUID,
    body: UpdatePermissionRoleRequest,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PermissionsService = Depends(get_permissions_service),
) -> PermissionRoleResponse:
    return await service.update_role(identity.user_id, role_id, body)


@router.delete("/roles/{role_id}", status_code=204)
async def delete_role(
    role_id: uuid.UUID,
    identity: CurrentIdentity = Depends(get_current_identity),
    service: PermissionsService = Depends(get_permissions_service),
) -> None:
    await service.delete_role(identity.user_id, role_id)
