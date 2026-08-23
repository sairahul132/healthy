from fastapi import APIRouter

from app.api.v1 import (
    ai,
    auth,
    doctors,
    health_categories,
    medicines,
    permissions,
    prescriptions,
    reports,
    search,
    share_public,
    sharing,
    timeline,
    users,
)

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(sharing.router)
router.include_router(share_public.router)
router.include_router(reports.router)
router.include_router(health_categories.router)
router.include_router(timeline.router)
router.include_router(search.router)
router.include_router(doctors.router)
router.include_router(prescriptions.router)
router.include_router(medicines.router)
router.include_router(ai.router)
router.include_router(permissions.router)
