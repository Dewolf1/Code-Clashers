"""Leaderboard & Competitive Standings Router."""

from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import LeaderboardEntry
from app.utils.firebase_admin import get_db

router = APIRouter()


@router.get("/users", response_model=list[LeaderboardEntry])
async def get_user_leaderboard(limit: int = 50):
    """Retrieve global user rankings ordered by trophies and ELO."""
    db = get_db()
    users_ref = db.collection("users").order_by("trophies", "DESCENDING").limit(limit)

    entries = []
    rank = 1
    for doc in users_ref.stream():
        data = doc.to_dict()
        entries.append(LeaderboardEntry(
            rank=rank,
            uid=data.get("uid"),
            name=data.get("username", "Anonymous"),
            avatar_url=data.get("avatar_url", ""),
            trophies=data.get("trophies", 0),
            elo_rating=data.get("elo_rating", 1000),
            wars_won=data.get("wars_won", 0),
        ))
        rank += 1

    return entries


@router.get("/clans", response_model=list[LeaderboardEntry])
async def get_clan_leaderboard(limit: int = 50):
    """Retrieve global clan rankings ordered by clan trophies and wins."""
    db = get_db()
    clans_ref = db.collection("clans").order_by("clan_trophies", "DESCENDING").limit(limit)

    entries = []
    rank = 1
    for doc in clans_ref.stream():
        data = doc.to_dict()
        entries.append(LeaderboardEntry(
            rank=rank,
            clan_id=data.get("clan_id"),
            name=data.get("name", "Clan"),
            avatar_url=data.get("badge_url", ""),
            trophies=data.get("clan_trophies", 0),
            elo_rating=data.get("clan_elo", 1000),
            wars_won=data.get("wars_won", 0),
        ))
        rank += 1

    return entries

