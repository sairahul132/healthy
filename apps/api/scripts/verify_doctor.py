#!/usr/bin/env python3
"""Operator-run doctor verification (docs/SPEC.md §131/§40).

There is no admin console yet (Phase 5 scope stops at the doctor-facing
side), so this script is the real verification workflow for now: a human
operator runs it after actually checking the doctor's registration
number/organization — never an API endpoint a doctor could call on
themselves (that would be exactly the "auto-trust a doctor account" §131
forbids).

Usage:
    python3 scripts/verify_doctor.py doctor@example.com
    python3 scripts/verify_doctor.py doctor@example.com --reject
"""

import argparse
import asyncio
import sys
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import hmac_lookup_hash  # noqa: E402
from app.db.base import async_session_factory  # noqa: E402
from app.db.models.doctor_profile import DoctorVerificationStatus  # noqa: E402
from app.db.models.user_identity import IdentityType  # noqa: E402
from app.repositories.doctor_repository import DoctorRepository  # noqa: E402
from app.repositories.user_repository import UserRepository  # noqa: E402


def classify_identifier(identifier: str) -> IdentityType:
    return IdentityType.EMAIL if "@" in identifier else IdentityType.PHONE


async def main(identifier: str, *, reject: bool) -> None:
    async with async_session_factory() as db:
        users = UserRepository(db)
        doctors = DoctorRepository(db)

        identity_hash = hmac_lookup_hash(identifier)
        identity_type = classify_identifier(identifier)
        identity = await users.find_identity_by_hash(identity_type, identity_hash)
        if identity is None:
            print(f"No account found for identifier: {identifier}")
            return

        profile = await doctors.get_by_user_id(identity.user_id)
        if profile is None:
            print(f"That account hasn't registered a doctor profile yet: {identifier}")
            return

        profile.verification_status = (
            DoctorVerificationStatus.REJECTED if reject else DoctorVerificationStatus.VERIFIED
        )
        profile.verified_at = datetime.now(UTC) if not reject else None
        await db.commit()

        action = "Rejected" if reject else "Verified"
        print(
            f"{action}: {profile.full_name} ({profile.registration_number}, {profile.organization})"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("identifier", help="The doctor's login identifier (phone or email)")
    parser.add_argument("--reject", action="store_true", help="Reject instead of verify")
    args = parser.parse_args()
    asyncio.run(main(args.identifier, reject=args.reject))
