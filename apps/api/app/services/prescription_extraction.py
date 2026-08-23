"""Deterministic prescription line parser (docs/SPEC.md §38). Prescriptions
are far less standardized than lab reports (no fixed test/unit/range
vocabulary to match against), so this is intentionally conservative: it
only extracts a medicine name plus whatever dosage/frequency/duration
tokens it can confidently recognize, and assigns lower confidence than the
lab parser (app/services/lab_extraction.py) — §96/§143 correction is the
expected path for anything it gets wrong, not a promise of accuracy.
"""

import re
from dataclasses import dataclass

_STRENGTH_RE = re.compile(r"\b\d+(?:\.\d+)?\s?(?:mg|mcg|ml|g|iu)\b", re.IGNORECASE)
_FREQUENCY_RE = re.compile(
    r"\b\d-\d-\d\b|\b(?:once|twice|thrice|\d+x)\s*(?:a|per)?\s*day\b", re.IGNORECASE
)
_DURATION_RE = re.compile(r"\b\d+\s*(?:day|days|week|weeks|month|months)\b", re.IGNORECASE)

_SKIP_PREFIXES = ("rx", "dr.", "dr ", "date", "patient", "prescription", "hospital", "clinic")


@dataclass(frozen=True)
class ExtractedPrescriptionItem:
    medicine_name: str
    dosage: str | None
    frequency: str | None
    duration: str | None
    confidence: float


def extract_prescription_items(text: str) -> list[ExtractedPrescriptionItem]:
    items: list[ExtractedPrescriptionItem] = []
    for raw_line in text.splitlines():
        line = raw_line.strip(" -•\t")
        if not line or len(line) < 3:
            continue
        if line.lower().startswith(_SKIP_PREFIXES):
            continue

        strength_match = _STRENGTH_RE.search(line)
        frequency_match = _FREQUENCY_RE.search(line)
        duration_match = _DURATION_RE.search(line)

        # A line needs at least a plausible medicine name (leading words,
        # before any recognized token) AND one recognized medical token —
        # otherwise it's almost certainly not a medicine line at all.
        cut = min(
            (m.start() for m in (strength_match, frequency_match, duration_match) if m),
            default=None,
        )
        name = (line[:cut] if cut is not None else line).strip(" -:,")
        if not name or not any((strength_match, frequency_match, duration_match)):
            continue

        confidence = 0.4
        if strength_match:
            confidence += 0.2
        if frequency_match:
            confidence += 0.2
        if duration_match:
            confidence += 0.15

        items.append(
            ExtractedPrescriptionItem(
                medicine_name=name,
                dosage=strength_match.group(0) if strength_match else None,
                frequency=frequency_match.group(0) if frequency_match else None,
                duration=duration_match.group(0) if duration_match else None,
                confidence=round(min(confidence, 0.9), 2),
            )
        )
    return items
