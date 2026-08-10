from fastapi import APIRouter

from app.api.v1 import auth, share_public, sharing, users

router = APIRouter(prefix="/api/v1")
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(sharing.router)
router.include_router(share_public.router)
