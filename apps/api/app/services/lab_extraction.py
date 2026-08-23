"""Deterministic lab-result line parser (docs/SPEC.md §138 LabResultExtractor,
§97 AI extraction safety: "LLMs must not be the sole source of truth for
numerical extraction... structured parsers... deterministic validation").

Given raw OCR/text-extracted document text, finds lines that look like a lab
result and matches the test name against the canonical registry
(app/core/canonical_tests.py). Real lab report PDFs (validated against
actual `pypdf` output on real multi-lab reports, not just clean synthetic
fixtures) lay a single result out several different ways:

    Haemoglobin     15.6  g/dl   13.5 - 17.5            # name+value, same line
    PCV(Hematocrit)     44.2  %  37-53                  # label text between name and value
    RDW (CV)
    (Method :Calculated )
        12.6  %   11.6-14.0                              # name, method, then value 2 lines down

so a match looks for the value within a short character window of its own
line first (not anchored at position 0 — real labels often have trailing
annotation text like "(Hematocrit)" before the number), and falls back to
scanning a short lookahead window (skipping any "(Method: ...)" line) for
a line whose value falls within that same window. The window is
deliberately short — this is what stops "LDL cholesterol cannot be
calculated if triglyceride is >400 mg/dL..." (an interpretation sentence,
40+ characters before its number) from being misread as a result of 400.
Numbers are also often thousand-separated ("8,300"), which a plain digits-
and-decimal-point pattern silently truncates at the comma — handled
explicitly.
"""

import re
from dataclasses import dataclass

from app.core.canonical_tests import CanonicalTest, match_canonical_test

_LOOKAHEAD_LINES = 4
_VALUE_SEARCH_WINDOW = 30  # chars — see module docstring

# Comma-grouped ("8,300") or plain ("22.9") — comma form must be tried first,
# or the plain alternative would match just "8" and stop at the comma.
_NUMBER = r"-?\d{1,3}(?:,\d{3})+(?:\.\d+)?|-?\d+(?:\.\d+)?"
_VALUE_RE = re.compile(_NUMBER)
_RANGE_RE = re.compile(rf"({_NUMBER})\s*(?:-|to|–|—)\s*({_NUMBER})")
_UPPER_ONLY_RE = re.compile(rf"(?:up\s*to|<=?)\s*({_NUMBER})", re.IGNORECASE)
_LOWER_ONLY_RE = re.compile(rf"(?:>=?|above|greater than)\s*({_NUMBER})", re.IGNORECASE)
_UNIT_RE = re.compile(r"[A-Za-zµ%^./0-9]{1,15}")
_METHOD_LINE_RE = re.compile(r"^\(?\s*method\b", re.IGNORECASE)
_COLUMN_HEADER_RE = re.compile(r"investigation.*result.*range", re.IGNORECASE)


def _to_float(number_text: str) -> float:
    return float(number_text.replace(",", ""))


@dataclass(frozen=True)
class ExtractedResult:
    test_name: str
    canonical: CanonicalTest
    value: float
    unit: str
    reference_low: float | None
    reference_high: float | None
    reference_text: str
    confidence: float


def extract_results(text: str) -> list[ExtractedResult]:
    lines = [line.strip() for line in text.splitlines()]
    results: list[ExtractedResult] = []
    seen_codes: set[str] = set()

    for index, line in enumerate(lines):
        if not line:
            continue
        canonical = match_canonical_test(line)
        if canonical is None or canonical.code in seen_codes:
            continue
        # A section title ("Iron -Profile") immediately followed by the
        # column-header row is not itself a data row — the real one is
        # further down and would otherwise get shadowed by this match.
        if index + 1 < len(lines) and _COLUMN_HEADER_RE.search(lines[index + 1]):
            continue

        match_len = _match_prefix_len(line, canonical)
        parsed = _parse_value_line(line[match_len:], canonical)
        if parsed is None:
            parsed = _parse_lookahead(lines, index, canonical)
        if parsed is None:
            continue

        value, unit, reference_low, reference_high, reference_text, confidence = parsed
        seen_codes.add(canonical.code)
        results.append(
            ExtractedResult(
                test_name=line[:match_len].strip(),
                canonical=canonical,
                value=value,
                unit=unit,
                reference_low=reference_low,
                reference_high=reference_high,
                reference_text=reference_text,
                confidence=confidence,
            )
        )
    return results


def _parse_lookahead(
    lines: list[str], index: int, canonical: CanonicalTest
) -> tuple[float, str, float | None, float | None, str, float] | None:
    """The test name and its value are on separate lines when a "(Method:
    ...)" annotation — or even a second, near-duplicate name line (e.g. a
    section header "Aldosterone" immediately followed by an investigation
    row "Aldosterone,Serum") — sits between them in the source PDF. Tries
    every line in a short bounded window rather than stopping at the first
    non-blank one, but the window itself (a handful of lines, each only
    searched in its own leading `_VALUE_SEARCH_WINDOW` characters) is what
    keeps this from ever wandering into an unrelated paragraph further
    down the document."""
    for offset in range(1, _LOOKAHEAD_LINES + 1):
        if index + offset >= len(lines):
            break
        candidate = lines[index + offset]
        if not candidate or _METHOD_LINE_RE.match(candidate):
            continue
        parsed = _parse_value_line(candidate, canonical)
        if parsed is not None:
            return parsed
    return None


def _parse_value_line(
    text: str, canonical: CanonicalTest
) -> tuple[float, str, float | None, float | None, str, float] | None:
    """Finds a value within a short window of `text`'s start — not anchored
    at position 0 (labels often have trailing text like "(Hematocrit)"
    before the number), but bounded enough that a value found deep inside
    an unrelated sentence is rejected rather than misread as a result."""
    window = text[:_VALUE_SEARCH_WINDOW]
    value_match = _VALUE_RE.search(window)
    if value_match is None:
        return None

    value = _to_float(value_match.group(0))
    confidence = 0.55

    after_value = text[value_match.end() :].lstrip(" \t*")
    unit = canonical.unit
    unit_match = _UNIT_RE.match(after_value)
    if unit_match:
        candidate_unit = unit_match.group(0).strip("().")
        if candidate_unit and not candidate_unit.replace(".", "").replace(",", "").isdigit():
            unit = candidate_unit
            confidence += 0.2

    # The registry's reference_low/high assume canonical.unit — falling
    # back to them when the document reports in a different unit (e.g.
    # "lakhs/cu mm" for a platelet count the registry expects in 10^3/µL)
    # would compare numbers on two different scales and manufacture a
    # nonsensical LOW/HIGH status. Only trust the registry fallback when
    # the extracted unit actually matches it.
    trust_registry_fallback = unit.strip().lower() == canonical.unit.strip().lower()
    reference_low, reference_high, reference_text, range_confidence = _parse_reference_range(
        after_value, canonical, trust_registry_fallback=trust_registry_fallback
    )
    confidence += range_confidence

    return (
        value,
        unit,
        reference_low,
        reference_high,
        reference_text,
        round(min(confidence, 0.98), 2),
    )


def _count_range_like_patterns(text: str) -> int:
    return (
        len(_RANGE_RE.findall(text))
        + len(_UPPER_ONLY_RE.findall(text))
        + len(_LOWER_ONLY_RE.findall(text))
    )


def _parse_reference_range(
    text: str, canonical: CanonicalTest, *, trust_registry_fallback: bool
) -> tuple[float | None, float | None, str, float]:
    if _count_range_like_patterns(text) >= 2 and trust_registry_fallback:
        # A real single reference range shows up as exactly one range-like
        # pattern. Two or more means this is a multi-tier table instead —
        # an age bracket ("1 - 5 Yrs: 105-269, 6 - 15 Yrs: ...") or a
        # risk-tier table ("Desirable :<200 / Borderline: 200-240 /
        # Undesirable: >240"). Picking the first pattern found would often
        # grab a bracket's own bounds or the *wrong* tier — e.g. reading
        # lipid panel's "Borderline: 200-240" as the reference range would
        # misclassify a healthy LDL of 95 (Optimal, <100) as LOW, a wrong
        # clinical status, not just a cosmetic mislabel. There's no
        # reliable way to tell which bracket/tier applies from text alone,
        # so the registry default (a standard adult reference range) is
        # trusted instead of guessing — but only when the document's unit
        # actually matches what that default was defined in (see call
        # site): a mismatched unit makes the document's own first-found
        # tier the safer bet, imperfect as it may be, over comparing the
        # value against a range meant for a different unit entirely.
        return (
            canonical.reference_low,
            canonical.reference_high,
            _format_range(canonical.reference_low, canonical.reference_high),
            0.05,
        )

    range_match = _RANGE_RE.search(text)
    if range_match:
        low = _to_float(range_match.group(1))
        high = _to_float(range_match.group(2))
        return low, high, f"{range_match.group(1)} - {range_match.group(2)}", 0.2

    upper_match = _UPPER_ONLY_RE.search(text)
    if upper_match:
        high = _to_float(upper_match.group(1))
        return None, high, f"<= {upper_match.group(1)}", 0.15

    lower_match = _LOWER_ONLY_RE.search(text)
    if lower_match:
        low = _to_float(lower_match.group(1))
        return low, None, f">= {lower_match.group(1)}", 0.15

    # Fell back to the canonical registry's known range — the document's own
    # printed range wasn't in a recognized format.
    return (
        canonical.reference_low,
        canonical.reference_high,
        _format_range(canonical.reference_low, canonical.reference_high),
        0.05,
    )


def _match_prefix_len(line: str, canonical: CanonicalTest) -> int:
    lowered = line.lower()
    for alias in (canonical.name.lower(), *canonical.aliases):
        if lowered.startswith(alias):
            return len(alias)
    return 0


def _format_range(low: float | None, high: float | None) -> str:
    if low is not None and high is not None:
        return f"{low} - {high}"
    if low is not None:
        return f">= {low}"
    if high is not None:
        return f"<= {high}"
    return "Not provided"
