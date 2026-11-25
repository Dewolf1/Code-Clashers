"""Clan Wars State & Matchmaking Router."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import json
import math
import random
import time
import uuid
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse

from app.models.schemas import (
    CastSpellRequest,
    DefenseTrap,
    DefenseTrapCreate,
    DemoResetResponse,
    TargetTagRequest,
    Tournament,
    TournamentBracketSlot,
    WarResponse,
    WarSearchRequest,
    WarSpell,
    WarStatus,
)
from app.services.fuzzer import generate_adversarial_traps
from app.services.war_engine import war_engine
from app.utils.auth import get_current_user
from app.utils.firebase_admin import get_db

router = APIRouter()

# ── Real-Time SSE Broadcaster ──────────────────────────
_war_event_queues: dict[str, list[asyncio.Queue]] = {}


def publish_war_event(war_id: str, event: dict):
    """Broadcast an event to all connected spectators of a war via SSE."""
    queues = _war_event_queues.get(war_id, [])
    payload = f"data: {json.dumps(event)}\n\n"
    for q in list(queues):
        try:
            q.put_nowait(payload)
        except Exception:
            pass


# ── WebSocket Bidirectional War Chat Manager ──────────────────────────
class WarConnectionManager:
    """
    Manages active WebSocket connections grouped by war_id.
    Supports bidirectional clan chat + live event push.
    Ring buffer of last 50 messages per war for reconnecting clients.
    """

    def __init__(self):
        self._rooms: dict[str, list[WebSocket]] = {}
        self._history: dict[str, list[dict]] = {}

    async def connect(self, war_id: str, ws: WebSocket):
        await ws.accept()
        self._rooms.setdefault(war_id, []).append(ws)
        self._history.setdefault(war_id, [])
        # Replay last 50 messages on connect
        for msg in self._history[war_id][-50:]:
            try:
                await ws.send_json(msg)
            except Exception:
                break

    def disconnect(self, war_id: str, ws: WebSocket):
        room = self._rooms.get(war_id, [])
        if ws in room:
            room.remove(ws)

    async def broadcast(self, war_id: str, message: dict):
        """Broadcast to all connected WebSocket clients in a war room."""
        # Store in ring buffer
        history = self._history.setdefault(war_id, [])
        history.append(message)
        if len(history) > 50:
            self._history[war_id] = history[-50:]

        dead = []
        for ws in list(self._rooms.get(war_id, [])):
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(war_id, ws)

    async def push_event(self, war_id: str, event: dict):
        """Also push SSE-originating events to WebSocket clients."""
        await self.broadcast(war_id, event)


ws_manager = WarConnectionManager()


@router.post("/search", response_model=dict)
async def start_war_search(
    payload: WarSearchRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Initiate war search for the caller's clan.
    If another compatible clan is searching with similar ELO, matches them immediately.
    """
    db = get_db()
    uid = current_user["uid"]

    user_doc = db.collection("users").document(uid).get()
    if not user_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user_data = user_doc.to_dict()
    clan_id = user_data.get("clan_id")
    clan_role = user_data.get("clan_role")

    if not clan_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You are not in a clan")

    if clan_role not in ["leader", "elder"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Clan Leaders and Elders can initiate War Search",
        )

    clan_ref = db.collection("clans").document(clan_id)
    clan_doc = clan_ref.get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")

    clan_data = clan_doc.to_dict()
    if clan_data.get("current_war_id"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clan is already in a war")

    # Matchmaking search: look for searching clans
    war_size = payload.war_size
    candidates = (
        db.collection("clans")
        .where("is_war_searching", "==", True)
        .stream()
    )

    opponent = None
    for cand in candidates:
        c_data = cand.to_dict()
        if c_data.get("clan_id") != clan_id and c_data.get("search_war_size") == war_size:
            opponent = c_data
            break

    if opponent:
        # Match found! Fetch problems pool
        problems_pool = [
            doc.to_dict() for doc in db.collection("problems").limit(war_size * 2).stream()
        ]

        war_data = war_engine.create_war_instance(
            clan_a=clan_data,
            clan_b=opponent,
            war_size=war_size,
            problems_pool=problems_pool,
        )

        # Save war in Firestore
        db.collection("wars").document(war_data["war_id"]).set(war_data)

        # Update Clan A
        clan_ref.update({
            "is_war_searching": False,
            "current_war_id": war_data["war_id"],
        })

        # Update Clan B
        db.collection("clans").document(opponent["clan_id"]).update({
            "is_war_searching": False,
            "current_war_id": war_data["war_id"],
        })

        return {
            "status": "matched",
            "war_id": war_data["war_id"],
            "opponent": opponent.get("name"),
            "war": war_data,
        }

    # No match yet -> enqueue
    clan_ref.update({
        "is_war_searching": True,
        "search_war_size": war_size,
    })

    return {
        "status": "searching",
        "clan_id": clan_id,
        "war_size": war_size,
        "message": "Searching for opposing clan...",
    }


@router.post("/cancel-search")
async def cancel_war_search(current_user: dict = Depends(get_current_user)):
    """Cancel clan war search."""
    db = get_db()
    uid = current_user["uid"]

    user_doc = db.collection("users").document(uid).get()
    clan_id = user_doc.to_dict().get("clan_id") if user_doc.exists else None

    if not clan_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Not in a clan")

    clan_ref = db.collection("clans").document(clan_id)
    clan_ref.update({"is_war_searching": False})
    return {"status": "search_cancelled"}


DEMO_WAR_BASELINE = {
    "war_id": "demo_war",
    "clan_a_id": "clan_alpha",
    "clan_b_id": "clan_omega",
    "clan_a_name": "ByteKnights",
    "clan_b_name": "Algorithmic Titans",
    "status": WarStatus.BATTLE.value,
    "war_size": 5,
    "preparation_start": datetime.now(timezone.utc).isoformat(),
    "preparation_end": datetime.now(timezone.utc).isoformat(),
    "battle_start": datetime.now(timezone.utc).isoformat(),
    "battle_end": (datetime.now(timezone.utc) + timedelta(hours=3)).isoformat(),
    "clan_a_stars": 11,
    "clan_b_stars": 9,
    "clan_a_destruction": 88.5,
    "clan_b_destruction": 74.2,
    "problems": [
        {"problem_id": "prob_two_sum", "title": "Two Sum Arena", "difficulty": "easy", "max_stars": 3, "assigned_to_clan": "clan_alpha", "slot_position": 1, "stars_earned": 3, "tag": None, "defense_traps": []},
        {"problem_id": "prob_valid_palindrome", "title": "Palindrome Fortress", "difficulty": "easy", "max_stars": 3, "assigned_to_clan": "clan_alpha", "slot_position": 2, "stars_earned": 2, "tag": None, "defense_traps": []},
        {"problem_id": "prob_longest_substring", "title": "Unbroken Sequence Tower", "difficulty": "medium", "max_stars": 3, "assigned_to_clan": "clan_alpha", "slot_position": 3, "stars_earned": 2, "tag": None, "defense_traps": []},
        {"problem_id": "prob_max_subarray", "title": "Clan Siege: Max Power", "difficulty": "medium", "max_stars": 3, "assigned_to_clan": "clan_alpha", "slot_position": 4, "stars_earned": 1, "tag": None, "defense_traps": []},
        {"problem_id": "prob_two_sum", "title": "Hardened Vault", "difficulty": "hard", "max_stars": 3, "assigned_to_clan": "clan_alpha", "slot_position": 5, "stars_earned": 1, "tag": None, "defense_traps": []},
        {"problem_id": "prob_two_sum", "title": "Two Sum Outpost", "difficulty": "easy", "max_stars": 3, "assigned_to_clan": "clan_omega", "slot_position": 1, "stars_earned": 3, "tag": None, "defense_traps": []},
        {"problem_id": "prob_valid_palindrome", "title": "Citadel of Strings", "difficulty": "easy", "max_stars": 3, "assigned_to_clan": "clan_omega", "slot_position": 2, "stars_earned": 3, "tag": None, "defense_traps": []},
        {"problem_id": "prob_longest_substring", "title": "Dynamic Stronghold", "difficulty": "medium", "max_stars": 3, "assigned_to_clan": "clan_omega", "slot_position": 3, "stars_earned": 3, "tag": None, "defense_traps": []},
        {"problem_id": "prob_max_subarray", "title": "Subarray Redoubt", "difficulty": "medium", "max_stars": 3, "assigned_to_clan": "clan_omega", "slot_position": 4, "stars_earned": 2, "tag": None, "defense_traps": []},
        {"problem_id": "prob_two_sum", "title": "Apex Bastion", "difficulty": "hard", "max_stars": 3, "assigned_to_clan": "clan_omega", "slot_position": 5, "stars_earned": 0, "tag": None, "defense_traps": []},
    ],
    "attacks": [
        {
            "attacker_uid": "warrior_alex",
            "attacker_clan_id": "clan_alpha",
            "problem_id": "prob_two_sum",
            "target_position": 1,
            "stars_earned": 3,
            "destruction_pct": 100.0,
            "time_taken_ms": 420,
            "submission_id": "sub_demo_seed_1",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "attacker_uid": "warrior_valkyrie",
            "attacker_clan_id": "clan_omega",
            "problem_id": "prob_valid_palindrome",
            "target_position": 2,
            "stars_earned": 2,
            "destruction_pct": 66.7,
            "time_taken_ms": 980,
            "submission_id": "sub_demo_seed_2",
            "submitted_at": datetime.now(timezone.utc).isoformat(),
        },
    ],
    "spells": [],
}


def ensure_seeded_wars():
    """Ensure baseline demo war exists in DB for instant evaluation."""
    db = get_db()
    w_ref = db.collection("wars").document("demo_war")
    if not w_ref.get().exists:
        w_ref.set(DEMO_WAR_BASELINE)


# ── War History & Tournaments (placed before /{war_id}) ──────


@router.get("/history")
async def get_war_history():
    """Returns recorded clan wars with star totals and destruction averages."""
    ensure_seeded_wars()
    db = get_db()
    wars_stream = db.collection("wars").stream()
    history = []
    for doc in wars_stream:
        w = doc.to_dict()
        attacks = w.get("attacks", [])
        attackers = list({a.get("attacker_uid") for a in attacks if a.get("attacker_uid")})
        history.append({
            "war_id": w.get("war_id"),
            "clan_a_name": w.get("clan_a_name", "Clan Alpha"),
            "clan_b_name": w.get("clan_b_name", "Clan Beta"),
            "clan_a_stars": w.get("clan_a_stars", 0),
            "clan_b_stars": w.get("clan_b_stars", 0),
            "clan_a_destruction": w.get("clan_a_destruction", 0.0),
            "clan_b_destruction": w.get("clan_b_destruction", 0.0),
            "status": w.get("status", "battle"),
            "slot_count": len(w.get("problems", [])),
            "attack_count": len(attacks),
            "attackers": attackers,
            "created_at": w.get("battle_start", datetime.now(timezone.utc).isoformat()),
        })
    return sorted(history, key=lambda x: (x["clan_a_stars"] + x["clan_b_stars"]), reverse=True)


@router.post("/tournaments/create", response_model=Tournament)
async def create_tournament(clans: list[str], name: str = "Grand Clan Championship"):
    """Generates a single-elimination tournament bracket for participating clans."""
    if len(clans) < 2:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="At least 2 clans required")

    n = 2 ** math.ceil(math.log2(len(clans)))
    padded = list(clans) + ["BYE"] * (n - len(clans))
    random.shuffle(padded)

    rounds: list[list[TournamentBracketSlot]] = []
    current = padded
    round_num = 1

    while len(current) > 1:
        pairs = [(current[i], current[i + 1]) for i in range(0, len(current), 2)]
        round_slots = [
            TournamentBracketSlot(
                round_number=round_num,
                clan_a=a,
                clan_b=b,
                war_id=f"war_r{round_num}_m{idx+1}",
                winner=a if b == "BYE" else (b if a == "BYE" else None),
            )
            for idx, (a, b) in enumerate(pairs)
        ]
        rounds.append(round_slots)
        current = [slot.winner or f"Winner R{round_num} M{i+1}" for i, slot in enumerate(round_slots)]
        round_num += 1

    tourney_id = f"tourney_{uuid.uuid4().hex[:8]}"
    return Tournament(
        tournament_id=tourney_id,
        name=name,
        rounds=rounds,
        status="pending",
    )


# ── Active War for Clan ─────────────────────────────────


@router.get("/active/{clan_id}", response_model=WarResponse | None)
async def get_active_war_for_clan(clan_id: str):
    """Retrieve the current active war for a clan."""
    db = get_db()
    clan_doc = db.collection("clans").document(clan_id).get()
    if not clan_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clan not found")

    war_id = clan_doc.to_dict().get("current_war_id")
    if not war_id:
        return None

    return await get_war(war_id)


# ── War Details by ID ───────────────────────────────────


@router.get("/{war_id}", response_model=WarResponse)
async def get_war(war_id: str):
    """Get war status and detail, automatically transitioning state if time expired."""
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()

    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()

    # Recheck lifecycle transitions
    updated_data, changed = war_engine.update_war_lifecycle(war_data)
    if changed:
        war_ref.set(updated_data)

        # If war just ended, update clan records & ELO
        if updated_data.get("status") == WarStatus.ENDED.value:
            clan_a_ref = db.collection("clans").document(updated_data["clan_a_id"])
            clan_b_ref = db.collection("clans").document(updated_data["clan_b_id"])

            clan_a_doc = clan_a_ref.get()
            clan_b_doc = clan_b_ref.get()

            if clan_a_doc.exists and clan_b_doc.exists:
                c_a = clan_a_doc.to_dict()
                c_b = clan_b_doc.to_dict()

                winner_id = updated_data.get("winner_clan_id")
                new_a_elo, new_b_elo = war_engine.calculate_elo_change(
                    c_a.get("clan_elo", 1000),
                    c_b.get("clan_elo", 1000),
                    winner_id,
                    c_a["clan_id"],
                )

                clan_a_ref.update({
                    "clan_elo": new_a_elo,
                    "current_war_id": None,
                    "wars_won": c_a.get("wars_won", 0) + (1 if winner_id == c_a["clan_id"] else 0),
                    "wars_lost": c_a.get("wars_lost", 0) + (1 if winner_id == c_b["clan_id"] else 0),
                })
                clan_b_ref.update({
                    "clan_elo": new_b_elo,
                    "current_war_id": None,
                    "wars_won": c_b.get("wars_won", 0) + (1 if winner_id == c_b["clan_id"] else 0),
                    "wars_lost": c_b.get("wars_lost", 0) + (1 if winner_id == c_a["clan_id"] else 0),
                })

    return WarResponse(**updated_data)


# ── Demo Reset Endpoint (Phase 0) ───────────────────────


@router.post("/{war_id}/reset-demo", response_model=DemoResetResponse)
async def reset_demo_war(war_id: str):
    """
    Resets all slots of a war back to clean baseline state.
    Re-seeds sample attacks for rehearsal.
    """
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()
    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()
    problems = war_data.get("problems", [])

    for p in problems:
        p["stars_earned"] = 0
        p["tag"] = None
        p["defense_traps"] = []

    sample_attacks = []
    if len(problems) >= 2:
        problems[0]["stars_earned"] = 2
        problems[1]["stars_earned"] = 3
        now_iso = datetime.now(timezone.utc).isoformat()
        sample_attacks = [
            {
                "attacker_uid": "warrior_alex",
                "attacker_clan_id": war_data.get("clan_a_id", "clan_alpha"),
                "problem_id": problems[0].get("problem_id", "prob_two_sum"),
                "target_position": problems[0].get("slot_position", 1),
                "stars_earned": 2,
                "destruction_pct": 66.7,
                "time_taken_ms": 1150,
                "submission_id": "sub_demo_sample_1",
                "submitted_at": now_iso,
            },
            {
                "attacker_uid": "warrior_valkyrie",
                "attacker_clan_id": war_data.get("clan_a_id", "clan_alpha"),
                "problem_id": problems[1].get("problem_id", "prob_valid_palindrome"),
                "target_position": problems[1].get("slot_position", 2),
                "stars_earned": 3,
                "destruction_pct": 100.0,
                "time_taken_ms": 780,
                "submission_id": "sub_demo_sample_2",
                "submitted_at": now_iso,
            },
        ]

    war_data["problems"] = problems
    war_data["attacks"] = sample_attacks
    war_data["spells"] = []

    scores = war_engine.compute_war_stars_and_destruction(war_data)
    war_data.update(scores)
    war_ref.set(war_data)

    publish_war_event(war_id, {"type": "demo_reset", "war_id": war_id, "timestamp": time.time()})

    return DemoResetResponse(
        war_id=war_id,
        message="Demo war reset successfully. 2 sample attacks seeded.",
        slots_reset=len(problems),
    )


# ── AI Fuzzer Auto-Traps (Phase 2) ──────────────────────


@router.post("/{war_id}/auto-traps")
async def synthesize_auto_traps(war_id: str, slot_position: int = 1):
    """
    AI Fuzzer: generates 3 adversarial traps using BVA + EP principles
    and arms them onto the specified base slot.
    """
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()
    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()
    problems = war_data.get("problems", [])
    target_prob = next((p for p in problems if p.get("slot_position") == slot_position), None)
    if not target_prob and problems:
        target_prob = problems[0]

    problem_id = target_prob.get("problem_id", "prob_two_sum") if target_prob else "prob_two_sum"
    traps = generate_adversarial_traps(problem_id, count=3)

    added = []
    current_traps = target_prob.get("defense_traps", [])
    for t in traps:
        trap_obj = {
            "trap_id": f"fuzz_{uuid.uuid4().hex[:6]}",
            "trap_name": t["trap_name"],
            "input": t["input"],
            "expected_output": t["expected_output"],
            "slot_position": slot_position,
            "created_by": "AI Fuzzer (BVA+EP)",
            "is_hidden": True,
        }
        current_traps.append(trap_obj)
        added.append(trap_obj)

    target_prob["defense_traps"] = current_traps
    war_ref.set(war_data)

    publish_war_event(war_id, {
        "type": "traps_synthesized",
        "slot_position": slot_position,
        "count": len(added),
        "timestamp": time.time(),
    })

    return {"war_id": war_id, "slot_position": slot_position, "traps_added": added}


# ── Target Tagging (Phase 6) ────────────────────────────


@router.post("/{war_id}/tag-target")
async def tag_target_slot(war_id: str, payload: TargetTagRequest):
    """Clan coordination: tag a target slot to assign it to a specific warrior."""
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()
    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()
    problems = war_data.get("problems", [])
    tagged = False
    for p in problems:
        if p.get("slot_position") == payload.slot_position:
            p["tag"] = payload.assigned_to
            tagged = True
            break

    war_ref.set(war_data)
    publish_war_event(war_id, {
        "type": "target_tagged",
        "slot_position": payload.slot_position,
        "assigned_to": payload.assigned_to,
        "timestamp": time.time(),
    })
    return {
        "war_id": war_id,
        "slot_position": payload.slot_position,
        "assigned_to": payload.assigned_to,
        "success": tagged,
    }


# ── Live War SSE Stream (Phase 7) ───────────────────────


@router.get("/{war_id}/events")
async def stream_war_events(war_id: str):
    """Server-Sent Events (SSE) endpoint: streams live battle events in real-time."""
    queue: asyncio.Queue = asyncio.Queue()
    _war_event_queues.setdefault(war_id, []).append(queue)

    async def event_generator():
        try:
            yield f"data: {json.dumps({'type': 'connected', 'war_id': war_id})}\n\n"
            while True:
                try:
                    msg = await asyncio.wait_for(queue.get(), timeout=20.0)
                    yield msg
                except asyncio.TimeoutError:
                    yield f"data: {json.dumps({'type': 'heartbeat', 'war_id': war_id})}\n\n"
        finally:
            if war_id in _war_event_queues and queue in _war_event_queues[war_id]:
                _war_event_queues[war_id].remove(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Defense Traps (Custom Edge Cases) ──────────────────


@router.post("/{war_id}/defense-traps", response_model=DefenseTrap)
async def add_defense_trap(
    war_id: str,
    payload: DefenseTrapCreate,
    current_user: dict = Depends(get_current_user),
):
    """
    Author a custom defense trap test case for a clan's war slot.
    Defending clan leaders/elders design edge cases to break attacker solutions.
    """
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()
    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()
    trap_id = f"trap_{uuid.uuid4().hex[:8]}"

    new_trap = DefenseTrap(
        trap_id=trap_id,
        trap_name=payload.trap_name,
        input=payload.input,
        expected_output=payload.expected_output,
        slot_position=payload.slot_position,
        created_by=current_user.get("uid", "warrior"),
        is_hidden=True,
    )

    problems = war_data.get("problems", [])
    matched = False
    for p in problems:
        if p.get("slot_position") == payload.slot_position:
            traps = p.get("defense_traps", [])
            traps.append(new_trap.model_dump())
            p["defense_traps"] = traps
            matched = True
            break

    if not matched and problems:
        traps = problems[0].get("defense_traps", [])
        traps.append(new_trap.model_dump())
        problems[0]["defense_traps"] = traps

    war_data["problems"] = problems
    war_ref.set(war_data)

    publish_war_event(war_id, {
        "type": "trap_armed",
        "slot_position": payload.slot_position,
        "trap_name": payload.trap_name,
        "timestamp": time.time(),
    })

    return new_trap


# ── Clan Castle Tactical Spells (Phase 4: 5 Spells) ─────


@router.post("/{war_id}/spells", response_model=WarSpell)
async def cast_war_spell(
    war_id: str,
    payload: CastSpellRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Cast Clan Castle Tactical Spell during a Clan War:
    - "recon": Reveals 1 hidden defense trap on target enemy slot.
    - "time_warp": Grants +500ms execution timeout buffer during attack.
    - "defensive_wall": Fortifies friendly base, raising 1st star requirement to 60%.
    - "rage": Relaxes 3-star optimal execution time threshold by +25%.
    - "freeze": Neutralizes 1 defending trap on target slot for clan attacks.
    """
    ensure_seeded_wars()
    db = get_db()
    war_ref = db.collection("wars").document(war_id)
    war_doc = war_ref.get()
    if not war_doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="War not found")

    war_data = war_doc.to_dict()
    uid = current_user.get("uid", "warrior")
    u_doc = db.collection("users").document(uid).get()
    caller_clan_id = u_doc.to_dict().get("clan_id") if u_doc.exists else war_data.get("clan_a_id")

    spell_id = f"spell_{uuid.uuid4().hex[:8]}"
    spell_type = payload.spell_type.lower().strip()
    target_slot = payload.target_slot

    effect_summary = ""
    revealed_data = None

    if spell_type == "recon":
        for prob in war_data.get("problems", []):
            if prob.get("slot_position") == target_slot and prob.get("assigned_to_clan") != caller_clan_id:
                traps = prob.get("defense_traps", [])
                if traps:
                    trap = traps[0]
                    trap["is_hidden"] = False
                    effect_summary = f"Recon Spell Unveiled: Enemy has armed '{trap.get('trap_name', 'Trap')}'! Input: '{trap.get('input')}' -> Expected: '{trap.get('expected_output')}'."
                    revealed_data = {
                        "trap_name": trap.get("trap_name"),
                        "input": trap.get("input"),
                        "expected_output": trap.get("expected_output"),
                    }
                else:
                    effect_summary = "Recon Spell Completed: Target base has no defense traps armed."
                break
        if not effect_summary:
            effect_summary = "Recon Spell Scanned base: No enemy traps detected on this slot."

    elif spell_type == "time_warp":
        effect_summary = "Time Warp Activated: Sandboxed compiler execution limit extended by +500ms for your clan's attacks on this slot!"
        revealed_data = {"extra_time_ms": 500}

    elif spell_type == "defensive_wall":
        effect_summary = "Defensive Wall Fortified: Enemy attackers now require 60% test case pass rate to earn the first star on this base!"
        revealed_data = {"required_star_pct": 0.60}

    elif spell_type == "rage":
        effect_summary = "Rage Spell Unleashed: Compiler evaluation speed threshold relaxed by +25% on this slot!"
        revealed_data = {"speed_boost_pct": 25}

    elif spell_type == "freeze":
        effect_summary = "Freeze Spell Cast: Defending base's secret trap is neutralized for your clan's attacks on this slot!"
        revealed_data = {"traps_neutralized": 1}

    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown spell type '{payload.spell_type}'. Supported: recon, time_warp, defensive_wall, rage, freeze",
        )

    new_spell = WarSpell(
        spell_id=spell_id,
        spell_type=spell_type,
        cast_by_clan=caller_clan_id or "clan_alpha",
        target_slot=target_slot,
        effect_summary=effect_summary,
        revealed_data=revealed_data,
        created_at=datetime.now(timezone.utc),
    )

    spells = war_data.get("spells", [])
    spells.append(new_spell.model_dump())
    war_data["spells"] = spells
    war_ref.set(war_data)

    publish_war_event(war_id, {
        "type": "spell_cast",
        "spell_type": spell_type,
        "target_slot": target_slot,
        "effect": effect_summary,
        "timestamp": time.time(),
    })

    return new_spell


# ── WebSocket Bidirectional War Chat ───────────────────────────────────

@router.websocket("/{war_id}/ws")
async def war_websocket(war_id: str, websocket: WebSocket):
    """
    Bidirectional WebSocket endpoint for real-time war chat and event push.
    Supports message types: 'chat' (clan tactical comms) and 'war_event' (attack/spell).
    Replays last 50 messages on reconnect.
    """
    await ws_manager.connect(war_id, websocket)
    try:
        await websocket.send_json({
            "type": "connected",
            "war_id": war_id,
            "message": "Connected to war room",
        })
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type", "chat")
            if msg_type == "chat":
                await ws_manager.broadcast(war_id, {
                    "type": "chat",
                    "sender": data.get("sender", "Warrior"),
                    "clan_id": data.get("clan_id", ""),
                    "text": data.get("text", ""),
                    "ts": data.get("ts", 0),
                })
            elif msg_type == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        ws_manager.disconnect(war_id, websocket)
    except Exception:
        ws_manager.disconnect(war_id, websocket)
