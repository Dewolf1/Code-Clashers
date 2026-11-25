"""Algorithmic Problems & Challenges Router."""

from __future__ import annotations

import uuid
from fastapi import APIRouter, HTTPException, status

from app.models.schemas import Difficulty, Example, ProblemCreate, ProblemResponse, TestCase
from app.utils.firebase_admin import get_db

router = APIRouter()

# Default starter problems seeded automatically if database is fresh
INITIAL_PROBLEMS = [
    {
        "problem_id": "prob_two_sum",
        "title": "Two Sum Arena",
        "description": "Given an array of integers `nums` and an integer `target`, return the indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nInput format: line 1 has comma-separated integers, line 2 has the target integer.",
        "difficulty": Difficulty.EASY.value,
        "category": "Arrays & Hashing",
        "constraints": "2 <= nums.length <= 10^4\n-10^9 <= nums[i] <= 10^9\nOnly one valid answer exists.",
        "examples": [
            Example(input="2,7,11,15\n9", output="0,1", explanation="nums[0] + nums[1] == 9").model_dump(),
            Example(input="3,2,4\n6", output="1,2", explanation="nums[1] + nums[2] == 6").model_dump(),
        ],
        "test_cases": [
            {"input": "2,7,11,15\n9", "expected_output": "0,1", "is_hidden": False},
            {"input": "3,2,4\n6", "expected_output": "1,2", "is_hidden": False},
            {"input": "3,3\n6", "expected_output": "0,1", "is_hidden": True},
            {"input": "1,5,8,12,20\n20", "expected_output": "2,3", "is_hidden": True},
        ],
        "time_limit_ms": 2000,
        "memory_limit_kb": 262144,
        "tags": ["Array", "Hash Table"],
    },
    {
        "problem_id": "prob_valid_palindrome",
        "title": "Palindrome Fortress",
        "description": "A phrase is a palindrome if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nReturn 'true' if the given string `s` is a palindrome, or 'false' otherwise.",
        "difficulty": Difficulty.EASY.value,
        "category": "Two Pointers",
        "constraints": "1 <= s.length <= 2 * 10^5",
        "examples": [
            Example(input="A man, a plan, a canal: Panama", output="true", explanation="amanaplanacanalpanama is a palindrome").model_dump(),
            Example(input="race a car", output="false", explanation="raceacar is not a palindrome").model_dump(),
        ],
        "test_cases": [
            {"input": "A man, a plan, a canal: Panama", "expected_output": "true", "is_hidden": False},
            {"input": "race a car", "expected_output": "false", "is_hidden": False},
            {"input": " ", "expected_output": "true", "is_hidden": True},
            {"input": "0P", "expected_output": "false", "is_hidden": True},
        ],
        "time_limit_ms": 1500,
        "memory_limit_kb": 262144,
        "tags": ["Two Pointers", "String"],
    },
    {
        "problem_id": "prob_longest_substring",
        "title": "Unbroken Sequence Tower",
        "description": "Given a string `s`, find the length of the longest substring without repeating characters.",
        "difficulty": Difficulty.MEDIUM.value,
        "category": "Sliding Window",
        "constraints": "0 <= s.length <= 5 * 10^4",
        "examples": [
            Example(input="abcabcbb", output="3", explanation="The answer is 'abc', with the length of 3.").model_dump(),
            Example(input="bbbbb", output="1", explanation="The answer is 'b', with the length of 1.").model_dump(),
        ],
        "test_cases": [
            {"input": "abcabcbb", "expected_output": "3", "is_hidden": False},
            {"input": "bbbbb", "expected_output": "1", "is_hidden": False},
            {"input": "pwwkew", "expected_output": "3", "is_hidden": True},
            {"input": "", "expected_output": "0", "is_hidden": True},
        ],
        "time_limit_ms": 2000,
        "memory_limit_kb": 262144,
        "tags": ["Hash Table", "Sliding Window"],
    },
    {
        "problem_id": "prob_max_subarray",
        "title": "Clan Siege: Maximum Power",
        "description": "Given an integer array `nums`, find the subarray with the largest sum, and return its sum.\n\nInput format: comma-separated integers.",
        "difficulty": Difficulty.MEDIUM.value,
        "category": "Dynamic Programming",
        "constraints": "1 <= nums.length <= 10^5\n-10^4 <= nums[i] <= 10^4",
        "examples": [
            Example(input="-2,1,-3,4,-1,2,1,-5,4", output="6", explanation="[4,-1,2,1] has the largest sum = 6.").model_dump(),
            Example(input="1", output="1", explanation="Single element").model_dump(),
        ],
        "test_cases": [
            {"input": "-2,1,-3,4,-1,2,1,-5,4", "expected_output": "6", "is_hidden": False},
            {"input": "1", "expected_output": "1", "is_hidden": False},
            {"input": "5,4,-1,7,8", "expected_output": "23", "is_hidden": True},
            {"input": "-1,-2,-3", "expected_output": "-1", "is_hidden": True},
        ],
        "time_limit_ms": 2000,
        "memory_limit_kb": 262144,
        "tags": ["Array", "Divide and Conquer", "Dynamic Programming"],
    },
]


def ensure_seeded_problems():
    """Ensure baseline problems exist in the database."""
    db = get_db()
    for prob in INITIAL_PROBLEMS:
        p_ref = db.collection("problems").document(prob["problem_id"])
        if not p_ref.get().exists:
            p_ref.set(prob)


@router.get("", response_model=list[ProblemResponse])
async def list_problems(difficulty: str | None = None, category: str | None = None):
    """List problems with optional difficulty or category filter."""
    ensure_seeded_problems()
    db = get_db()

    problems_ref = db.collection("problems")
    if difficulty:
        problems_ref = problems_ref.where("difficulty", "==", difficulty)

    results = []
    for doc in problems_ref.stream():
        data = doc.to_dict()
        results.append(ProblemResponse(
            problem_id=data["problem_id"],
            title=data["title"],
            description=data["description"],
            difficulty=Difficulty(data["difficulty"]),
            category=data.get("category", ""),
            constraints=data.get("constraints", ""),
            examples=data.get("examples", []),
            time_limit_ms=data.get("time_limit_ms", 2000),
            memory_limit_kb=data.get("memory_limit_kb", 262144),
            tags=data.get("tags", []),
        ))
    return results


@router.get("/{problem_id}", response_model=ProblemResponse)
async def get_problem(problem_id: str):
    """Get single problem detail."""
    ensure_seeded_problems()
    db = get_db()
    doc = db.collection("problems").document(problem_id).get()
    if not doc.exists:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Problem not found")

    data = doc.to_dict()
    return ProblemResponse(
        problem_id=data["problem_id"],
        title=data["title"],
        description=data["description"],
        difficulty=Difficulty(data["difficulty"]),
        category=data.get("category", ""),
        constraints=data.get("constraints", ""),
        examples=data.get("examples", []),
        time_limit_ms=data.get("time_limit_ms", 2000),
        memory_limit_kb=data.get("memory_limit_kb", 262144),
        tags=data.get("tags", []),
    )


@router.post("", response_model=ProblemResponse, status_code=status.HTTP_201_CREATED)
async def create_problem(payload: ProblemCreate):
    """Create a new problem (admin or defense builder)."""
    db = get_db()
    problem_id = f"prob_{uuid.uuid4().hex[:8]}"

    data = payload.model_dump()
    data["problem_id"] = problem_id

    db.collection("problems").document(problem_id).set(data)
    return ProblemResponse(**data)

