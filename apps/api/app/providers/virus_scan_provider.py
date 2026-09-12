"""Malware-scan provider abstraction (docs/SPEC.md §15/§109). No antivirus
engine (ClamAV or similar) is available in this environment, so the only
implementation is a clearly-labeled mock — same pattern, and same
production guard, as app/providers/otp_provider.py's MockOtpProvider.

The mock is not a no-op: it still recognizes the EICAR standard antivirus
test string (the industry-standard file used to test AV integrations
without a real virus) so the "infected file is rejected" path is real and
testable, not faked. A real engine plugs in behind the same `scan()`
interface later with no caller changes.
"""

from dataclasses import dataclass
from typing import Protocol

from app.core.config import get_settings

# https://www.eicar.org/download-anti-malware-testfile/ — the standard
# AV test signature, safe, not an actual virus.
EICAR_SIGNATURE = rb"X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*"


@dataclass(frozen=True)
class ScanResult:
    clean: bool
    reason: str | None


class VirusScanProvider(Protocol):
    async def scan(self, data: bytes) -> ScanResult: ...


class MockVirusScanProvider:
    """⚠️ MOCK — no real AV engine is wired up. Detects the EICAR test
    signature so the reject path is exercised for real; must never be
    selected when settings.environment == 'production'."""

    async def scan(self, data: bytes) -> ScanResult:
        if EICAR_SIGNATURE in data:
            return ScanResult(clean=False, reason="Matched the EICAR antivirus test signature.")
        return ScanResult(clean=True, reason=None)


def get_virus_scan_provider() -> VirusScanProvider:
    settings = get_settings()
    if settings.virus_scan_provider == "mock":
        if settings.is_production and not settings.allow_mock_providers:
            raise RuntimeError("VIRUS_SCAN_PROVIDER=mock must not be used in production.")
        return MockVirusScanProvider()
    raise NotImplementedError(
        f"Virus scan provider '{settings.virus_scan_provider}' is not implemented."
    )
