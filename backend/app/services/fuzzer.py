"""
Adversarial test-case synthesizer service (AI Fuzzer).
Uses Boundary Value Analysis (BVA) + Equivalence Partitioning (EP).
Pure Python stdlib implementation — zero heavy ML dependencies.
"""

from __future__ import annotations

import random
from typing import Any

# Curated adversarial recipes for benchmark platform problems
PROBLEM_RECIPES: dict[str, list[dict[str, Any]]] = {
    "prob_two_sum": [
        {
            "trap_name": "🔥 Extremal Int Bounds (BVA)",
            "input": "-1000000000,1000000000\n0",
            "expected_output": "0,1",
        },
        {
            "trap_name": "💀 All-Duplicate Homogeneous (EP Hash Collision)",
            "input": "7,7,7,7,7\n14",
            "expected_output": "0,1",
        },
        {
            "trap_name": "⚡ Minimal Length Sequence (N=2 Edge)",
            "input": "3,5\n8",
            "expected_output": "0,1",
        },
    ],
    "prob_valid_palindrome": [
        {
            "trap_name": "🕳️ Empty Boundary String (BVA)",
            "input": "",
            "expected_output": "true",
        },
        {
            "trap_name": "1️⃣ Single Character Unit (EP)",
            "input": "x",
            "expected_output": "true",
        },
        {
            "trap_name": "🧪 Mixed Case & Non-Alphanumeric Punctuation",
            "input": "A man, a plan, a canal: Panama",
            "expected_output": "true",
        },
    ],
    "prob_longest_substring": [
        {
            "trap_name": "💀 Single Repeating Character Stream",
            "input": "bbbbbbbb",
            "expected_output": "1",
        },
        {
            "trap_name": "🕳️ Empty String Length",
            "input": "",
            "expected_output": "0",
        },
        {
            "trap_name": "⚡ Distinct Alternating Window Hurdle",
            "input": "pwwkew",
            "expected_output": "3",
        },
    ],
    "prob_max_subarray": [
        {
            "trap_name": "🧊 All-Negative Array Trap (Kadane Edge)",
            "input": "-5,-2,-8,-1,-4",
            "expected_output": "-1",
        },
        {
            "trap_name": "1️⃣ Single Negative Element",
            "input": "-10",
            "expected_output": "-10",
        },
        {
            "trap_name": "🔥 Mixed Zeroes & Peak Transitions",
            "input": "-2,1,-3,4,-1,2,1,-5,4",
            "expected_output": "6",
        },
    ],
}

GENERIC_RECIPES: list[dict[str, Any]] = [
    {
        "trap_name": "🔥 Large N Boundary Probe",
        "input": "1000\n" + " ".join(str(random.randint(-1000, 1000)) for _ in range(20)),
        "expected_output": "0",
    },
    {
        "trap_name": "💀 Zeroed Degenerate Stream",
        "input": "0,0,0,0,0\n0",
        "expected_output": "0,1",
    },
    {
        "trap_name": "⚡ Inverted Order Adversarial Hurdle",
        "input": "9,8,7,6,5,4,3,2,1\n10",
        "expected_output": "0,8",
    },
]


def generate_adversarial_traps(problem_id: str, count: int = 3) -> list[dict[str, Any]]:
    """
    Synthesize adversarial edge-case trap tests for a given problem.
    Applies BVA (extremal bounds, null/empty) and EP (homogeneous, degenerate classes).
    """
    recipes = PROBLEM_RECIPES.get(problem_id, GENERIC_RECIPES)
    selected = list(recipes[:count])
    while len(selected) < count:
        selected.append(random.choice(GENERIC_RECIPES))
    return selected[:count]

