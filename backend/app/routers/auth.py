"""Authentication & Session Router."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import UserCreate, UserProfile
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db

router = APIRouter()


@router.post("/register", response_model=UserProfile)
async def register_user(
    payload: UserCreate,
    current_user: dict = Depends(get_current_user),
):
    """Register or sync a user profile in Firestore after Firebase Auth."""
    db = get_db()
    uid = current_user["uid"]

    # Security: ensure user only creates their own profile
    if payload.uid != uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot register profile for another user ID",
        )

    user_ref = db.collection("users").document(uid)
    doc = user_ref.get()

    if doc.exists:
        data = doc.to_dict()
        return UserProfile(**data)

    new_profile = {
        "uid": uid,
        "username": payload.username,
        "email": payload.email,
        "avatar_url": payload.avatar_url,
        "clan_id": None,
        "clan_role": None,
        "trophies": 0,
        "elo_rating": 1000,
        "wars_participated": 0,
        "wars_won": 0,
        "problems_solved": 0,
        "total_stars": 0,
    }
    user_ref.set(new_profile)
    return UserProfile(**new_profile)


@router.get("/me", response_model=UserProfile)
async def get_my_profile(current_user: dict = Depends(get_current_user)):
    """Get the authenticated user's profile."""
    db = get_db()
    uid = current_user["uid"]
    doc = db.collection("users").document(uid).get()

    if not doc.exists:
        # Create initial profile on the fly if needed
        default_profile = {
            "uid": uid,
            "username": current_user.get("name") or f"Warrior_{uid[:6]}",
            "email": current_user.get("email", ""),
            "avatar_url": "",
            "clan_id": None,
            "clan_role": None,
            "trophies": 0,
            "elo_rating": 1000,
            "wars_participated": 0,
            "wars_won": 0,
            "problems_solved": 0,
            "total_stars": 0,
        }
        db.collection("users").document(uid).set(default_profile)
        return UserProfile(**default_profile)

    return UserProfile(**doc.to_dict())

