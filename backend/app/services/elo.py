"""
ELO rating service for Clan Wars and Competitive User Rankings.
Standard K-factor = 32 with expected score logistics.
"""

from __future__ import annotations

K_FACTOR = 32
INITIAL_ELO = 1200


def expected_score(rating_a: float, rating_b: float) -> float:
    """Calculate expected probability of rating_a defeating rating_b."""
    return 1.0 / (1.0 + 10.0 ** ((rating_b - rating_a) / 400.0))


def calculate_elo_change(
    winner_elo: float,
    loser_elo: float,
    k: int = K_FACTOR,
) -> tuple[int, int]:
    """
    Calculate new integer ELO ratings after a decisive duel/war.
    Returns: (new_winner_elo, new_loser_elo)
    """
    ea = expected_score(winner_elo, loser_elo)
    eb = expected_score(loser_elo, winner_elo)

    new_winner = round(winner_elo + k * (1.0 - ea))
    new_loser = round(loser_elo + k * (0.0 - eb))
    return int(new_winner), int(new_loser)

