"""Clan War State Machine & Matchmaking Engine."""

from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.config import settings
from app.models.schemas import WarStatus


class WarEngine:
    """Manages War matchmaking, state transitions, star mechanics, and ELO ratings."""

    def __init__(self):
        pass

    def calculate_stars_and_destruction(
        self,
        passed_count: int,
        total_count: int,
        total_time_ms: int,
        time_limit_ms: int = 2000,
        min_star_pct: float = 0.50,
        rage_active: bool = False,
    ) -> tuple[int, float]:
        """
        Calculate stars (0-3) and destruction percentage for an attack.

        Clash of Codes Rules:
        - 1 Star: >= min_star_pct (default 50%, or 60% under Defensive Wall perk) test cases passed.
        - 2 Stars: 100% test cases passed.
        - 3 Stars: 100% passed AND execution time within optimal threshold (<= 40% of time limit, or +25% under Rage).
        Destruction % is directly proportional to test cases passed.
        """
        if total_count == 0:
            return 0, 0.0

        destruction_pct = round((passed_count / total_count) * 100.0, 2)

        if passed_count == 0:
            return 0, destruction_pct

        if passed_count == total_count:
            # Check optimal speed for 3rd star
            optimal_mult = 0.40 * (1.25 if rage_active else 1.0)
            optimal_threshold = time_limit_ms * optimal_mult
            if total_time_ms <= optimal_threshold:
                return 3, destruction_pct
            return 2, destruction_pct
        elif passed_count >= math.ceil(total_count * min_star_pct):
            return 1, destruction_pct

        return 0, destruction_pct

    def compute_war_stars_and_destruction(
        self,
        war_data: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Recompute total stars and destruction for both clans based on best attacks per defense slot.
        Just like Clash of Clans: only the highest star and destruction attack on each slot counts.
        """
        attacks = war_data.get("attacks", [])
        war_size = war_data.get("war_size", 5)
        clan_a_id = war_data.get("clan_a_id")
        clan_b_id = war_data.get("clan_b_id")

        # Track best stars and destruction achieved on each enemy defense position (1 to war_size)
        # Clan A attacks Clan B's defense slots
        clan_b_defenses: dict[int, dict[str, Any]] = {
            pos: {"stars": 0, "destruction": 0.0} for pos in range(1, war_size + 1)
        }
        # Clan B attacks Clan A's defense slots
        clan_a_defenses: dict[int, dict[str, Any]] = {
            pos: {"stars": 0, "destruction": 0.0} for pos in range(1, war_size + 1)
        }

        for attack in attacks:
            attacker_clan_id = attack.get("attacker_clan_id")
            target_pos = attack.get("target_position", 1)
            stars = attack.get("stars_earned", 0)
            destruction = attack.get("destruction_pct", 0.0)

            if attacker_clan_id == clan_a_id:
                curr = clan_b_defenses.get(target_pos, {"stars": 0, "destruction": 0.0})
                if stars > curr["stars"] or (stars == curr["stars"] and destruction > curr["destruction"]):
                    clan_b_defenses[target_pos] = {"stars": stars, "destruction": destruction}
            elif attacker_clan_id == clan_b_id:
                curr = clan_a_defenses.get(target_pos, {"stars": 0, "destruction": 0.0})
                if stars > curr["stars"] or (stars == curr["stars"] and destruction > curr["destruction"]):
                    clan_a_defenses[target_pos] = {"stars": stars, "destruction": destruction}

        clan_a_stars = sum(slot["stars"] for slot in clan_b_defenses.values())
        clan_b_stars = sum(slot["stars"] for slot in clan_a_defenses.values())

        clan_a_destruction = round(
            sum(slot["destruction"] for slot in clan_b_defenses.values()) / war_size, 2
        ) if war_size else 0.0

        clan_b_destruction = round(
            sum(slot["destruction"] for slot in clan_a_defenses.values()) / war_size, 2
        ) if war_size else 0.0

        return {
            "clan_a_stars": clan_a_stars,
            "clan_b_stars": clan_b_stars,
            "clan_a_destruction": clan_a_destruction,
            "clan_b_destruction": clan_b_destruction,
            "clan_a_defenses": clan_a_defenses,
            "clan_b_defenses": clan_b_defenses,
        }

    def update_war_lifecycle(self, war_data: dict[str, Any]) -> tuple[dict[str, Any], bool]:
        """
        Check timing and transition war state:
        PREPARATION -> BATTLE -> ENDED
        Returns (updated_war_data, changed_flag).
        """
        now = datetime.now(timezone.utc)
        status = war_data.get("status")
        changed = False

        prep_end = war_data.get("preparation_end")
        battle_end = war_data.get("battle_end")

        if isinstance(prep_end, str):
            prep_end = datetime.fromisoformat(prep_end)
        if isinstance(battle_end, str):
            battle_end = datetime.fromisoformat(battle_end)

        if status == WarStatus.PREPARATION.value:
            if prep_end and now >= prep_end:
                war_data["status"] = WarStatus.BATTLE.value
                war_data["battle_start"] = now.isoformat()
                changed = True

        elif status == WarStatus.BATTLE.value:
            if battle_end and now >= battle_end:
                war_data["status"] = WarStatus.ENDED.value
                changed = True

                # Determine winner
                scores = self.compute_war_stars_and_destruction(war_data)
                war_data.update(scores)

                a_stars = scores["clan_a_stars"]
                b_stars = scores["clan_b_stars"]
                a_dest = scores["clan_a_destruction"]
                b_dest = scores["clan_b_destruction"]

                if a_stars > b_stars:
                    war_data["winner_clan_id"] = war_data["clan_a_id"]
                elif b_stars > a_stars:
                    war_data["winner_clan_id"] = war_data["clan_b_id"]
                else:
                    # Tie-break by destruction percentage
                    if a_dest > b_dest:
                        war_data["winner_clan_id"] = war_data["clan_a_id"]
                    elif b_dest > a_dest:
                        war_data["winner_clan_id"] = war_data["clan_b_id"]
                    else:
                        war_data["winner_clan_id"] = None  # Draw

        return war_data, changed

    def calculate_elo_change(
        self,
        clan_a_elo: int,
        clan_b_elo: int,
        winner_clan_id: str | None,
        clan_a_id: str,
        k_factor: int | None = None,
    ) -> tuple[int, int]:
        """
        Calculate standard ELO rating delta for Clan A and Clan B.
        Returns (new_clan_a_elo, new_clan_b_elo).
        """
        k = k_factor or settings.ELO_K_FACTOR
        expected_a = 1.0 / (1.0 + 10.0 ** ((clan_b_elo - clan_a_elo) / 400.0))
        expected_b = 1.0 - expected_a

        if winner_clan_id == clan_a_id:
            actual_a, actual_b = 1.0, 0.0
        elif winner_clan_id is None:
            actual_a, actual_b = 0.5, 0.5
        else:
            actual_a, actual_b = 0.0, 1.0

        new_a = round(clan_a_elo + k * (actual_a - expected_a))
        new_b = round(clan_b_elo + k * (actual_b - expected_b))

        return max(100, new_a), max(100, new_b)

    def create_war_instance(
        self,
        clan_a: dict[str, Any],
        clan_b: dict[str, Any],
        war_size: int = 5,
        problems_pool: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Initialize a new War between Clan A and Clan B."""
        now = datetime.now(timezone.utc)
        prep_duration = timedelta(minutes=settings.PREPARATION_DURATION_MINUTES)
        battle_duration = timedelta(minutes=settings.BATTLE_DURATION_MINUTES)

        prep_start = now
        prep_end = prep_start + prep_duration
        battle_start = prep_end
        battle_end = battle_start + battle_duration

        war_id = f"war_{uuid.uuid4().hex[:12]}"

        # Distribute problems or defense slots
        problems = []
        if problems_pool:
            # Assign problems for each slot
            for idx, prob in enumerate(problems_pool[: war_size * 2]):
                clan_assigned = clan_a["clan_id"] if idx < war_size else clan_b["clan_id"]
                problems.append({
                    "problem_id": prob.get("problem_id", f"prob_{idx}"),
                    "title": prob.get("title", f"Challenge {idx + 1}"),
                    "difficulty": prob.get("difficulty", "medium"),
                    "max_stars": 3,
                    "assigned_to_clan": clan_assigned,
                    "slot_position": (idx % war_size) + 1,
                })

        return {
            "war_id": war_id,
            "clan_a_id": clan_a["clan_id"],
            "clan_a_name": clan_a.get("name", "Clan Alpha"),
            "clan_b_id": clan_b["clan_id"],
            "clan_b_name": clan_b.get("name", "Clan Omega"),
            "status": WarStatus.PREPARATION.value,
            "war_size": war_size,
            "preparation_start": prep_start.isoformat(),
            "preparation_end": prep_end.isoformat(),
            "battle_start": battle_start.isoformat(),
            "battle_end": battle_end.isoformat(),
            "clan_a_stars": 0,
            "clan_b_stars": 0,
            "clan_a_destruction": 0.0,
            "clan_b_destruction": 0.0,
            "winner_clan_id": None,
            "problems": problems,
            "attacks": [],
            "created_at": now.isoformat(),
        }


war_engine = WarEngine()

