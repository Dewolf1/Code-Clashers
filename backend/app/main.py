"""Clash of Codes — FastAPI Application Entry Point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, clans, wars, problems, submissions, leaderboard


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed baseline problems & demo war automatically on startup
    problems.ensure_seeded_problems()
    wars.ensure_seeded_wars()
    yield


app = FastAPI(
    title="Clash of Codes API",
    description="Competitive coding platform with Clan Wars — backend API",
    version="0.1.0",
    docs_url="/api/docs" if settings.DEBUG else None,
    redoc_url="/api/redoc" if settings.DEBUG else None,
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(users.router, prefix="/api/users", tags=["Users"])
app.include_router(clans.router, prefix="/api/clans", tags=["Clans"])
app.include_router(wars.router, prefix="/api/wars", tags=["Wars"])
app.include_router(problems.router, prefix="/api/problems", tags=["Problems"])
app.include_router(submissions.router, prefix="/api/submissions", tags=["Submissions"])
app.include_router(leaderboard.router, prefix="/api/leaderboard", tags=["Leaderboard"])


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "0.1.0"}
