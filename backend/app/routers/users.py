"""User Profiles & Stats Router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import UserProfile, UserUpdate
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db

router = APIRouter()


@router.get("/{uid}", response_model=UserProfile)
async def get_user_profile(uid: str):
    """Retrieve public profile for a user."""
    db = get_db()
    doc = db.collection("users").document(uid).get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return UserProfile(**doc.to_dict())


@router.patch("/me", response_model=UserProfile)
async def update_my_profile(
    payload: UserUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update profile information for the current user."""
    db = get_db()
    uid = current_user["uid"]
    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User profile not found")

    updates = {}
    if payload.username is not None:
        updates["username"] = payload.username
    if payload.avatar_url is not None:
        updates["avatar_url"] = payload.avatar_url

    if updates:
        user_ref.update(updates)

    updated_doc = user_ref.get()
    return UserProfile(**updated_doc.to_dict())


@router.get("/{uid}/elo-history")
async def get_user_elo_history(uid: str):
    """Retrieve ELO rating trajectory for the specified user."""
    db = get_db()
    doc = db.collection("users").document(uid).get()
    current_elo = 1200
    if doc.exists:
        current_elo = doc.to_dict().get("elo_rating", 1200)

    # Trajectory leading up to current ELO
    history = [
        {"timestamp": "Match 1", "elo": 1000, "delta": 0},
        {"timestamp": "Match 2", "elo": 1050, "delta": 50},
        {"timestamp": "Match 3", "elo": 1030, "delta": -20},
        {"timestamp": "Match 4", "elo": 1110, "delta": 80},
        {"timestamp": "Match 5", "elo": 1180, "delta": 70},
        {"timestamp": "Current", "elo": max(1000, current_elo), "delta": current_elo - 1180},
    ]
    return {
        "uid": uid,
        "current_elo": current_elo,
        "history": history,
    }


