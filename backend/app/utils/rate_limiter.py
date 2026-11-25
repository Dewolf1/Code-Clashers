"""
Clash of Codes — In-Memory Token Bucket Rate Limiter.
Zero external dependencies — uses only the Python standard library.
Keyed by IP address (or user UID when available).

Usage:
    limiter = RateLimiter(limit=15, window=60)
    dep = limiter.dependency()
    @router.post("/submit")
    async def submit(request: Request, _=Depends(dep)):
        ...
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from fastapi import Depends, HTTPException, Request, status


class RateLimiter:
    """Sliding-window token bucket rate limiter with no external state."""

    def __init__(self, limit: int, window: int):
        """
        Args:
            limit:  Maximum requests allowed within the window.
            window: Sliding window size in seconds.
        """
        self.limit = limit
        self.window = window
        # Maps key -> deque of timestamps (oldest first)
        self._windows: dict[str, deque[float]] = defaultdict(deque)

    def _key(self, request: Request) -> str:
        """Derive rate-limit key from client IP."""
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def is_allowed(self, key: str) -> tuple[bool, int, int]:
        """
        Check whether a request with the given key is within rate limits.

        Returns:
            (allowed: bool, remaining: int, retry_after: int)
        """
        now = time.monotonic()
        cutoff = now - self.window
        window = self._windows[key]

        # Evict expired timestamps
        while window and window[0] <= cutoff:
            window.popleft()

        remaining = self.limit - len(window)
        if remaining <= 0:
            # Seconds until the oldest request expires
            retry_after = max(1, int(self.window - (now - window[0])))
            return False, 0, retry_after

        window.append(now)
        return True, remaining - 1, 0

    def dependency(self):
        """Return a FastAPI dependency callable for use with Depends()."""
        limiter = self

        async def _check(request: Request):
            key = limiter._key(request)
            allowed, remaining, retry_after = limiter.is_allowed(key)
            if not allowed:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Retry after {retry_after}s.",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limiter.limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Window": str(limiter.window),
                    },
                )
            return remaining

        return _check


# Pre-configured limiters — import and use directly in routers
submit_limiter = RateLimiter(limit=15, window=60)   # 15 submissions / minute
run_limiter = RateLimiter(limit=30, window=60)       # 30 custom runs / minute

