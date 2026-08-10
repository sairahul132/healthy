"""Rate limiting provider abstraction (§104/§137). §104 calls for Redis-backed
limiting; no Redis instance is reachable in this environment, so
`InMemoryRateLimiter` is the default. It's process-local and per-worker —
correct for a single dev/test process, not sufficient once the API runs
with multiple workers/instances. Swap for a Redis-backed implementation
behind the same `RateLimiter` protocol before that happens; nothing outside
`get_rate_limiter` should need to change.
"""

import time
from collections import defaultdict
from typing import Protocol


class RateLimiter(Protocol):
    async def allow(self, key: str, *, limit: int, window_seconds: int) -> bool:
        """Returns True if the action is allowed, False if the caller is over
        `limit` attempts within the trailing `window_seconds`."""
        ...


class InMemoryRateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    async def allow(self, key: str, *, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        hits = self._hits[key]
        while hits and hits[0] < cutoff:
            hits.pop(0)
        if len(hits) >= limit:
            return False
        hits.append(now)
        return True


_rate_limiter = InMemoryRateLimiter()


def get_rate_limiter() -> RateLimiter:
    return _rate_limiter
