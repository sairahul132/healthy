"""Canonical health category ids (docs/SPEC.md §21). Must stay in sync with
apps/web's lib/health/categories.ts — same ids, same order. In production
these belong in the database (§21: "do not hard-code all categories into
frontend code... store category definitions in the backend/database"); a
fixed Python tuple is the Phase 1 stand-in until a health_categories table
and admin UI exist.
"""

HEALTH_CATEGORY_IDS: tuple[str, ...] = (
    "blood",
    "heart",
    "liver",
    "kidney",
    "thyroid",
    "diabetes",
    "vitamins",
    "urine",
    "hormones",
    "infection",
    "allergy",
    "autoimmune",
    "imaging",
    "tumor_markers",
    "other",
)

HEALTH_CATEGORY_SET = frozenset(HEALTH_CATEGORY_IDS)


def is_valid_category(value: str) -> bool:
    return value in HEALTH_CATEGORY_SET
