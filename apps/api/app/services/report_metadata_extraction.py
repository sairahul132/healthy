"""Extracts report-level metadata (currently: collection date) from raw
document text — same "real lab report text, not just clean fixtures"
grounding as app/services/lab_extraction.py. Different labs print this
under different labels ("Sample Collection:", "Collected On :"), so this
matches on either.
"""

import re
from datetime import date, datetime

_COLLECTION_DATE_RE = re.compile(
    r"(?:sample\s*collection|collected\s*on)\s*:?\s*(\d{1,2}[-\s][A-Za-z]{3}[-\s]\d{4})",
    re.IGNORECASE,
)


def extract_collection_date(text: str) -> date | None:
    match = _COLLECTION_DATE_RE.search(text)
    if match is None:
        return None
    raw = re.sub(r"\s+", "-", match.group(1).strip())
    try:
        return datetime.strptime(raw, "%d-%b-%Y").date()
    except ValueError:
        return None
