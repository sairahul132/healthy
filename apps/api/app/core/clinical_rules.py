"""Deterministic clinical rules engine (docs/SPEC.md §29/§30/§139).

Pure arithmetic against the reference range printed on the patient's own
report — never an LLM. Port of apps/web's lib/health/status-engine.ts;
keep the two in exact sync (same thresholds, same boundary behavior) since
the frontend independently recomputes this for the mock-data path and both
must agree on what "LOW"/"HIGH"/"CRITICAL_*" mean.
"""

from dataclasses import dataclass

BORDERLINE_BAND_FRACTION = 0.1
CRITICAL_BAND_FRACTION = 0.5

_LABELS = {
    "LOW": "Below range",
    "NORMAL": "Within range",
    "HIGH": "Above range",
    "CRITICAL_LOW": "Critically low",
    "CRITICAL_HIGH": "Critically high",
    "UNKNOWN": "Reference range unavailable",
}


@dataclass(frozen=True)
class ClinicalStatus:
    direction: str  # LOW | NORMAL | HIGH | CRITICAL_LOW | CRITICAL_HIGH | UNKNOWN
    severity: str  # green | yellow | orange | red
    label: str


def compute_clinical_status(
    value: float,
    reference_low: float | None,
    reference_high: float | None,
) -> ClinicalStatus:
    if reference_low is None and reference_high is None:
        return ClinicalStatus("UNKNOWN", "yellow", _LABELS["UNKNOWN"])

    if reference_low is not None and reference_high is not None and reference_low > reference_high:
        # Malformed reference range from extraction — never guess, surface it.
        return ClinicalStatus("UNKNOWN", "yellow", _LABELS["UNKNOWN"])

    width = (
        reference_high - reference_low
        if reference_low is not None and reference_high is not None
        else None
    )

    if reference_low is not None and value < reference_low:
        deficit = reference_low - value
        band_width = width if width is not None else (abs(reference_low) or 1)
        is_critical = deficit >= band_width * CRITICAL_BAND_FRACTION
        if is_critical:
            return ClinicalStatus("CRITICAL_LOW", "red", _LABELS["CRITICAL_LOW"])
        severity = "orange" if deficit >= band_width * BORDERLINE_BAND_FRACTION else "yellow"
        return ClinicalStatus("LOW", severity, _LABELS["LOW"])

    if reference_high is not None and value > reference_high:
        excess = value - reference_high
        band_width = width if width is not None else (abs(reference_high) or 1)
        is_critical = excess >= band_width * CRITICAL_BAND_FRACTION
        if is_critical:
            return ClinicalStatus("CRITICAL_HIGH", "red", _LABELS["CRITICAL_HIGH"])
        severity = "orange" if excess >= band_width * BORDERLINE_BAND_FRACTION else "yellow"
        return ClinicalStatus("HIGH", severity, _LABELS["HIGH"])

    return ClinicalStatus("NORMAL", "green", _LABELS["NORMAL"])


@dataclass(frozen=True)
class TrendResult:
    absolute_change: float
    percent_change: float | None
    direction: str  # up | down | flat


def compute_trend(current: float, previous: float | None) -> TrendResult | None:
    if previous is None:
        return None
    absolute_change = current - previous
    percent_change = (absolute_change / previous) * 100 if previous != 0 else None
    direction = "up" if absolute_change > 0 else "down" if absolute_change < 0 else "flat"
    return TrendResult(absolute_change, percent_change, direction)
