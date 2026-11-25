"""Pydantic schemas for request/response validation."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


# ── Enums ──────────────────────────────────────────────


class ClanRole(str, Enum):
    LEADER = "leader"
    ELDER = "elder"
    MEMBER = "member"


class WarStatus(str, Enum):
    SEARCHING = "searching"
    PREPARATION = "preparation"
    BATTLE = "battle"
    ENDED = "ended"


class Difficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"


class SubmissionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    ACCEPTED = "accepted"
    WRONG_ANSWER = "wrong_answer"
    TLE = "time_limit_exceeded"
    MLE = "memory_limit_exceeded"
    RUNTIME_ERROR = "runtime_error"
    COMPILATION_ERROR = "compilation_error"


# ── User ───────────────────────────────────────────────


class UserCreate(BaseModel):
    uid: str
    username: str
    email: str
    avatar_url: str = ""


class UserProfile(BaseModel):
    uid: str
    username: str
    email: str
    avatar_url: str
    clan_id: str | None = None
    clan_role: ClanRole | None = None
    trophies: int = 0
    elo_rating: int = 1000
    wars_participated: int = 0
    wars_won: int = 0
    problems_solved: int = 0
    total_stars: int = 0


class UserUpdate(BaseModel):
    username: str | None = None
    avatar_url: str | None = None


# ── Clan ───────────────────────────────────────────────


class ClanCreate(BaseModel):
    name: str = Field(..., min_length=3, max_length=30)
    description: str = Field("", max_length=200)
    badge_url: str = ""


class ClanResponse(BaseModel):
    clan_id: str
    name: str
    tag: str
    description: str
    badge_url: str
    leader_uid: str
    member_uids: list[str]
    member_count: int
    max_members: int = 15
    clan_trophies: int = 0
    clan_elo: int = 1000
    wars_won: int = 0
    wars_lost: int = 0
    wars_drawn: int = 0
    war_win_streak: int = 0
    is_war_searching: bool = False


# ── War ────────────────────────────────────────────────


class DefenseTrap(BaseModel):
    trap_id: str
    trap_name: str
    input: str
    expected_output: str
    slot_position: int
    created_by: str = ""
    is_hidden: bool = True


class DefenseTrapCreate(BaseModel):
    trap_name: str
    slot_position: int
    input: str
    expected_output: str


class WarProblem(BaseModel):
    problem_id: str
    title: str = ""
    difficulty: Difficulty
    max_stars: int = 3
    assigned_to_clan: str
    slot_position: int = 1
    stars_earned: int = 0
    tag: str | None = None
    defense_traps: list[DefenseTrap] = []


class WarAttack(BaseModel):
    attacker_uid: str
    attacker_clan_id: str
    problem_id: str
    target_position: int
    stars_earned: int = 0
    time_taken_ms: int = 0
    submission_id: str = ""
    submitted_at: datetime | None = None


class WarSpell(BaseModel):
    spell_id: str
    spell_type: str  # "recon", "time_warp", "defensive_wall"
    cast_by_clan: str
    target_slot: int = 1
    effect_summary: str = ""
    revealed_data: dict[str, Any] | None = None
    created_at: datetime | None = None


class CastSpellRequest(BaseModel):
    spell_type: str
    target_slot: int = 1


class WarResponse(BaseModel):
    war_id: str
    clan_a_id: str
    clan_b_id: str
    clan_a_name: str
    clan_b_name: str
    status: WarStatus
    war_size: int
    preparation_start: datetime | None = None
    preparation_end: datetime | None = None
    battle_start: datetime | None = None
    battle_end: datetime | None = None
    clan_a_stars: int = 0
    clan_b_stars: int = 0
    clan_a_destruction: float = 0.0
    clan_b_destruction: float = 0.0
    winner_clan_id: str | None = None
    problems: list[WarProblem] = []
    attacks: list[WarAttack] = []
    spells: list[WarSpell] = []


class WarSearchRequest(BaseModel):
    war_size: int = Field(5, description="War size: 5, 10, or 15")


# ── Problem ────────────────────────────────────────────


class TestCase(BaseModel):
    input: str
    expected_output: str
    is_hidden: bool = False


class Example(BaseModel):
    input: str
    output: str
    explanation: str = ""


class ProblemCreate(BaseModel):
    title: str = Field(..., min_length=3, max_length=100)
    description: str
    difficulty: Difficulty
    category: str = ""
    constraints: str = ""
    examples: list[Example] = []
    test_cases: list[TestCase] = []
    time_limit_ms: int = 2000
    memory_limit_kb: int = 262144
    solution_code: str = ""
    tags: list[str] = []


class ProblemResponse(BaseModel):
    problem_id: str
    title: str
    description: str
    difficulty: Difficulty
    category: str
    constraints: str
    examples: list[Example]
    time_limit_ms: int
    memory_limit_kb: int
    tags: list[str]


# ── Submission ─────────────────────────────────────────


class KeystrokeTelemetry(BaseModel):
    paste_count: int = 0
    paste_chars: int = 0
    total_typing_ms: int = 0
    total_chars: int = 0


class IntegrityReport(BaseModel):
    integrity_score: int = 100
    plagiarism_risk: str = "clean"  # "clean", "suspicious", "flagged"
    highest_similarity_pct: float = 0.0
    matched_source: str = "Authentic Original"
    keystroke_status: str = "Natural Typing Cadence"
    detected_fingerprints: list[str] = []
    paste_ratio: float = 0.0


class CustomRunRequest(BaseModel):
    source_code: str
    language: str = "python"
    custom_input: str = ""
    time_limit_ms: int = 2000


class CustomRunResponse(BaseModel):
    output: str = ""
    error: str = ""
    duration_ms: int = 0
    status: str = "success"  # "success", "error", "timeout"


class ProfileRequest(BaseModel):
    problem_id: str
    source_code: str
    language: str = "python"


class SubmissionCreate(BaseModel):
    problem_id: str
    language: str = "python"
    source_code: str
    war_id: str | None = None
    telemetry: KeystrokeTelemetry | None = None


class TestResult(BaseModel):
    test_case_index: int
    passed: bool
    actual_output: str = ""
    time_ms: int = 0
    memory_kb: int = 0


class SubmissionResponse(BaseModel):
    submission_id: str
    user_uid: str
    problem_id: str
    war_id: str | None
    language: str
    status: SubmissionStatus
    test_results: list[TestResult] = []
    stars_earned: int = 0
    destruction_pct: float = 0.0
    total_time_ms: int = 0
    total_memory_kb: int = 0
    submitted_at: datetime | None = None
    integrity: IntegrityReport | None = None


# ── Leaderboard ────────────────────────────────────────


class LeaderboardEntry(BaseModel):
    rank: int
    uid: str | None = None
    clan_id: str | None = None
    name: str
    avatar_url: str = ""
    trophies: int = 0
    elo_rating: int = 1000
    wars_won: int = 0


# ── Demo & Clan Coordination ───────────────────────────


class DemoResetResponse(BaseModel):
    war_id: str
    message: str
    slots_reset: int


class TargetTagRequest(BaseModel):
    slot_position: int = 1
    assigned_to: str


# ── Big-O Profiler ─────────────────────────────────────


class BenchmarkPoint(BaseModel):
    n: int
    time_ms: float


class ProfileResponse(BaseModel):
    benchmarks: list[BenchmarkPoint]
    estimated_complexity: str
    status: str
    baseline_quadratic: list[BenchmarkPoint] = []
    baseline_linear: list[BenchmarkPoint] = []
    error: str | None = None


# ── Tournaments ────────────────────────────────────────


class TournamentBracketSlot(BaseModel):
    round_number: int
    clan_a: str
    clan_b: str
    war_id: str | None = None
    winner: str | None = None


class Tournament(BaseModel):
    tournament_id: str
    name: str
    rounds: list[list[TournamentBracketSlot]]
    status: str = "pending"

