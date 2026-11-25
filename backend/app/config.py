"""Clash of Codes — FastAPI Backend Configuration."""

import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """Application settings loaded from environment variables."""

    # Firebase
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "")
    FIREBASE_SERVICE_ACCOUNT_KEY_PATH: str = os.getenv(
        "FIREBASE_SERVICE_ACCOUNT_KEY_PATH", ""
    )

    # Judge0
    JUDGE0_API_URL: str = os.getenv("JUDGE0_API_URL", "http://localhost:2358")
    JUDGE0_AUTH_TOKEN: str = os.getenv("JUDGE0_AUTH_TOKEN", "")

    # FastAPI
    SECRET_KEY: str = os.getenv("FASTAPI_SECRET_KEY", "dev-secret-change-me")
    DEBUG: bool = os.getenv("FASTAPI_DEBUG", "true").lower() == "true"
    PORT: int = int(os.getenv("FASTAPI_PORT", "8000"))
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:3000"
    ).split(",")

    # War Settings
    PREPARATION_DURATION_MINUTES: int = int(
        os.getenv("PREPARATION_DURATION_MINUTES", "60")
    )
    BATTLE_DURATION_MINUTES: int = int(
        os.getenv("BATTLE_DURATION_MINUTES", "60")
    )
    MAX_ATTACKS_PER_MEMBER: int = 2
    ELO_K_FACTOR: int = 32
    ELO_MATCH_RANGE: int = 200

    # ── Arena Economy Constants ──────────────────────────────────────────
    # Starting ELO for every new user and clan
    DEFAULT_USER_ELO: int = 1200
    DEFAULT_CLAN_ELO: int = 1000
    # Absolute minimum; no combatant may fall below this floor
    MIN_ELO_FLOOR: int = 100

    # ── Rate Limiting ────────────────────────────────────────────────────
    # Requests per minute (per IP) for the code-execution sandboxes
    MAX_SUBMISSIONS_PER_MINUTE: int = int(
        os.getenv("MAX_SUBMISSIONS_PER_MINUTE", "15")
    )
    MAX_CUSTOM_RUNS_PER_MINUTE: int = int(
        os.getenv("MAX_CUSTOM_RUNS_PER_MINUTE", "30")
    )


settings = Settings()
