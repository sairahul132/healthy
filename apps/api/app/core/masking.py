def mask_identifier(identifier: str) -> str:
    """Partially obscure a phone/email for display in lists the patient
    didn't just type themselves (e.g. active shares) — not a security
    control, just avoids echoing the full value back unnecessarily."""
    if "@" in identifier:
        local, _, domain = identifier.partition("@")
        return f"{_mask_middle(local)}@{domain}"
    return _mask_middle(identifier)


def _mask_middle(value: str) -> str:
    if len(value) <= 4:
        return value[0] + "*" * max(len(value) - 1, 0) if value else value
    return value[:2] + "*" * (len(value) - 4) + value[-2:]
