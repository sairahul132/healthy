import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-Id"
logger = logging.getLogger("healthy.http")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Every response carries a request id — the same one the client sent
    (apps/web's apiFetch always sets one), or a freshly generated one if it
    didn't. Used for correlating logs/errors without exposing anything
    sensitive (§126)."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())
        request.state.request_id = request_id
        started_at = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - started_at) * 1000
            logger.exception(
                "HTTP request failed method=%s path=%s duration_ms=%.2f request_id=%s",
                request.method,
                request.url.path,
                duration_ms,
                request_id,
            )
            raise

        response.headers[REQUEST_ID_HEADER] = request_id
        duration_ms = (time.perf_counter() - started_at) * 1000
        log_method = logger.warning if response.status_code >= 400 else logger.info
        log_method(
            "HTTP request method=%s path=%s status=%s duration_ms=%.2f request_id=%s",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            request_id,
        )
        return response
