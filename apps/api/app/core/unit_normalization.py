"""Unit normalization layer (docs/SPEC.md §20).

Different labs report the same analyte in different units (mg/dL vs
mmol/L, mg/dL vs µmol/L). This never *replaces* the original value/unit —
callers must keep both (§20: "never convert units silently") — it only
computes a second, canonical value alongside it, tagged with the method
version used, so a chart/comparison can line up results reported in either
unit.

Only well-established, textbook conversion factors are included. A test
code with no entry here is left unconverted (normalized == original) rather
than guessed at.
"""

from dataclasses import dataclass

CONVERSION_VERSION = "unit-norm-v1"

# canonical_code -> {source_unit_lower: (factor, target_unit)}
# normalized_value = original_value * factor
_CONVERSIONS: dict[str, dict[str, tuple[float, str]]] = {
    "FBG": {"mg/dl": (0.055_08, "mmol/L")},
    "TCHOL": {"mg/dl": (0.025_86, "mmol/L")},
    "LDL": {"mg/dl": (0.025_86, "mmol/L")},
    "HDL": {"mg/dl": (0.025_86, "mmol/L")},
    "TRIG": {"mg/dl": (0.011_29, "mmol/L")},
    "CREAT": {"mg/dl": (88.4, "µmol/L")},
    "UREA": {"mg/dl": (0.357, "mmol/L")},
    "BILI": {"mg/dl": (17.1, "µmol/L")},
    "HGB": {"g/dl": (10.0, "g/L")},
}


@dataclass(frozen=True)
class NormalizedValue:
    value: float
    unit: str
    method_version: str


def normalize(canonical_code: str, value: float, unit: str) -> NormalizedValue:
    table = _CONVERSIONS.get(canonical_code)
    if table:
        entry = table.get(unit.strip().lower())
        if entry is not None:
            factor, target_unit = entry
            return NormalizedValue(round(value * factor, 4), target_unit, CONVERSION_VERSION)
    # No known conversion for this unit — pass through unchanged rather than guess.
    return NormalizedValue(value, unit, CONVERSION_VERSION)
