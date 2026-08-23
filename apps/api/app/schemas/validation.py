"""Validators shared across request schemas that grant category-level access —
currently sharing sessions (`schemas/sharing.py`) and permission roles
(`schemas/permissions.py`). Kept in one place so both stay in sync on what
counts as a valid category list / duration.
"""

from app.core.health_categories import is_valid_category

MIN_DURATION_HOURS = 1
MAX_DURATION_HOURS = 24 * 30  # 30 days


def validate_category_ids(value: list[str]) -> list[str]:
    if not value:
        raise ValueError("Select at least one category.")
    invalid = [c for c in value if not is_valid_category(c)]
    if invalid:
        raise ValueError(f"Unknown category: {', '.join(invalid)}")
    return list(dict.fromkeys(value))  # de-dupe, preserve order


def validate_duration_hours(value: int) -> int:
    if not (MIN_DURATION_HOURS <= value <= MAX_DURATION_HOURS):
        raise ValueError(
            f"Duration must be between {MIN_DURATION_HOURS} and {MAX_DURATION_HOURS} hours."
        )
    return value
