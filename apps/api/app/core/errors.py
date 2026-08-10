"""Typed application errors → clean HTTP responses (§103: never leak stack
traces, SQL errors, or internal paths to the client). Raise these from
services; app/main.py's exception handler converts them to the
{"error": {"code","message","requestId"}} shape the frontend expects.
"""


class AppError(Exception):
    status_code = 400
    code = "APP_ERROR"

    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class ValidationAppError(AppError):
    status_code = 422
    code = "VALIDATION_ERROR"


class UnauthorizedError(AppError):
    status_code = 401
    code = "UNAUTHORIZED"


class ForbiddenError(AppError):
    status_code = 403
    code = "FORBIDDEN"


class NotFoundError(AppError):
    status_code = 404
    code = "NOT_FOUND"


class ConflictError(AppError):
    status_code = 409
    code = "CONFLICT"


class RateLimitedError(AppError):
    status_code = 429
    code = "RATE_LIMITED"
