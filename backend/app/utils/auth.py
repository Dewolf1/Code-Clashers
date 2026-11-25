"""Authentication dependencies for FastAPI endpoints."""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.utils.firebase_admin import verify_id_token

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
) -> dict:
    """
    Authenticate the current user via Firebase ID Token.
    Returns user dict with at least 'uid', 'email', 'name'.
    Supports dev bypass when DEBUG is True and a mock token is passed.
    """
    if credentials is None:
        if settings.DEBUG:
            # Fallback mock user for rapid dev and testing
            return {
                "uid": "dev_user_001",
                "email": "warrior@clashofcodes.dev",
                "name": "CodeWarrior",
            }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    # Allow dev tokens in debug mode
    if settings.DEBUG and token.startswith("dev_"):
        return {
            "uid": token,
            "email": f"{token}@clashofcodes.dev",
            "name": token.replace("dev_", "").capitalize(),
        }

    try:
        decoded_token = verify_id_token(token)
        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email", ""),
            "name": decoded_token.get("name", "Anonymous"),
        }
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

