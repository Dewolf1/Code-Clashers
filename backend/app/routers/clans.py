"""Clan Management Router."""

from __future__ import annotations

import secrets
import uuid
from fastapi import APIRouter, Depends, HTTPException, status

from app.models.schemas import ClanCreate, ClanResponse, ClanRole
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db

router = APIRouter()

# In-memory invite code registry: code -> clan_id
_clan_invite_codes: dict[str, str] = {}


@router.get("/join", response_model=dict)
async def join_via_invite(
    code: str,
    current_user: dict = Depends(get_current_user),
):
    """Join a clan using an 8-character secure invite code."""
    clan_id = _clan_invite_codes.get(code)
    if not clan_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invalid or expired invite code")

    db = get_db()
    uid = current_user["uid"]

    user_ref = db.collection("users").document(uid)
    clan_ref = db.collection("clans").document(clan_id)
    clan_doc = clan_ref.get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan no longer exists")

    clan_data = clan_doc.to_dict()
    member_uids = clan_data.get("member_uids", [])
    if uid not in member_uids:
        member_uids.append(uid)
        clan_ref.update({"member_uids": member_uids, "member_count": len(member_uids)})
        user_ref.update({"clan_id": clan_id, "clan_role": ClanRole.MEMBER.value})

    return {
        "status": "success",
        "joined_clan": clan_id,
        "clan_name": clan_data.get("name"),
        "user_uid": uid,
    }


@router.post("/{clan_id}/invite-link")
async def generate_clan_invite_link(
    clan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate a shareable 8-character invite code for the clan."""
    db = get_db()
    clan_doc = db.collection("clans").document(clan_id).get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")

    code = secrets.token_urlsafe(6)[:8]
    _clan_invite_codes[code] = clan_id

    return {
        "clan_id": clan_id,
        "invite_code": code,
        "invite_url": f"/clans/join?code={code}",
        "expires_in": "24h (demo: permanent)",
    }



@router.post("", response_model=ClanResponse, status_code=status.HTTP_201_CREATED)
async def create_clan(
    payload: ClanCreate,
    current_user: dict = Depends(get_current_user),
):
    """Create a new clan. The creator becomes the Clan Leader."""
    db = get_db()
    uid = current_user["uid"]

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if user_doc.exists and user_doc.to_dict().get("clan_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in a clan. Leave your current clan first.",
        )

    clan_id = f"clan_{uuid.uuid4().hex[:10]}"
    tag = f"#{uuid.uuid4().hex[:6].upper()}"

    clan_data = {
        "clan_id": clan_id,
        "name": payload.name,
        "tag": tag,
        "description": payload.description,
        "badge_url": payload.badge_url,
        "leader_uid": uid,
        "member_uids": [uid],
        "member_count": 1,
        "max_members": 15,
        "clan_trophies": 0,
        "clan_elo": 1000,
        "wars_won": 0,
        "wars_lost": 0,
        "wars_drawn": 0,
        "war_win_streak": 0,
        "is_war_searching": False,
        "current_war_id": None,
    }

    db.collection("clans").document(clan_id).set(clan_data)

    # Update user's clan membership
    user_ref.update({
        "clan_id": clan_id,
        "clan_role": ClanRole.LEADER.value,
    })

    return ClanResponse(**clan_data)


@router.get("/{clan_id}", response_model=ClanResponse)
async def get_clan(clan_id: str):
    """Get details of a specific clan."""
    db = get_db()
    doc = db.collection("clans").document(clan_id).get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")
    return ClanResponse(**doc.to_dict())


@router.get("", response_model=list[ClanResponse])
async def list_clans(limit: int = 20):
    """List or discover clans ordered by trophies."""
    db = get_db()
    clans_ref = db.collection("clans").order_by("clan_trophies", "DESCENDING").limit(limit)
    results = [ClanResponse(**doc.to_dict()) for doc in clans_ref.stream() if doc.exists]
    return results


@router.post("/{clan_id}/join", response_model=ClanResponse)
async def join_clan(
    clan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Join an open clan."""
    db = get_db()
    uid = current_user["uid"]

    user_ref = db.collection("users").document(uid)
    user_doc = user_ref.get()
    if user_doc.exists and user_doc.to_dict().get("clan_id"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You are already in a clan.",
        )

    clan_ref = db.collection("clans").document(clan_id)
    clan_doc = clan_ref.get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")

    clan_data = clan_doc.to_dict()
    member_uids = clan_data.get("member_uids", [])

    if len(member_uids) >= clan_data.get("max_members", 15):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clan is full")

    if uid in member_uids:
        return ClanResponse(**clan_data)

    member_uids.append(uid)
    clan_ref.update({
        "member_uids": member_uids,
        "member_count": len(member_uids),
    })

    user_ref.update({
        "clan_id": clan_id,
        "clan_role": ClanRole.MEMBER.value,
    })

    clan_data["member_uids"] = member_uids
    clan_data["member_count"] = len(member_uids)
    return ClanResponse(**clan_data)


@router.post("/{clan_id}/leave")
async def leave_clan(
    clan_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Leave a clan."""
    db = get_db()
    uid = current_user["uid"]

    clan_ref = db.collection("clans").document(clan_id)
    clan_doc = clan_ref.get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")

    clan_data = clan_doc.to_dict()
    member_uids = clan_data.get("member_uids", [])

    if uid not in member_uids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not a member of this clan")

    if clan_data.get("leader_uid") == uid and len(member_uids) > 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Leader must transfer leadership before leaving",
        )

    member_uids.remove(uid)
    if len(member_uids) == 0:
        clan_ref.delete()
    else:
        clan_ref.update({
            "member_uids": member_uids,
            "member_count": len(member_uids),
        })

    user_ref = db.collection("users").document(uid)
    user_ref.update({"clan_id": None, "clan_role": None})

    return {"status": "left", "clan_id": clan_id}

