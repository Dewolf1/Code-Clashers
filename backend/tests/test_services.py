"""
Unit tests for Clash of Codes core backend services:
- elo: K=32 ELO rating calculation and expected score logistics
- fuzzer: Boundary Value Analysis (BVA) & Equivalence Partitioning (EP) adversarial trap generation
- profiler: Empirical Big-O asymptotic curve fitting and benchmark generator
- anti_cheat: Python AST normalization, LLM fingerprinting, and keystroke dynamic telemetry
"""

import math
import unittest

from app.services.elo import (
    K_FACTOR,
    INITIAL_ELO,
    expected_score,
    calculate_elo_change,
)
from app.services.fuzzer import (
    generate_adversarial_traps,
    PROBLEM_RECIPES,
    GENERIC_RECIPES,
)
from app.services.profiler import (
    generate_benchmark_input,
    fit_complexity,
)
from app.services.anti_cheat import (
    PythonASTNormalizer,
    normalize_code,
    detect_llm_fingerprints,
    AntiCheatService,
)


class TestEloService(unittest.TestCase):
    """Tests for the ELO calculation engine."""

    def test_expected_score_equal_rating(self):
        """Two equally rated players must have a 0.5 expected win probability."""
        prob = expected_score(1200.0, 1200.0)
        self.assertAlmostEqual(prob, 0.5, places=4)

    def test_expected_score_higher_rated_favorite(self):
        """A 1600 player vs a 1200 player should have ~0.91 win probability."""
        prob = expected_score(1600.0, 1200.0)
        self.assertGreater(prob, 0.90)
        self.assertLess(prob, 0.92)

    def test_calculate_elo_change_equal(self):
        """When equally rated combatants duel, winner gains 16 and loser drops 16 (K=32)."""
        winner_elo, loser_elo = calculate_elo_change(1200.0, 1200.0, k=32)
        self.assertEqual(winner_elo, 1216)
        self.assertEqual(loser_elo, 1184)

    def test_calculate_elo_change_underdog_win(self):
        """When an underdog wins, they should gain significantly more points."""
        winner_elo, loser_elo = calculate_elo_change(1000.0, 1500.0, k=32)
        gain = winner_elo - 1000
        loss = 1500 - loser_elo
        self.assertGreater(gain, 25)
        self.assertEqual(gain, loss)


class TestFuzzerService(unittest.TestCase):
    """Tests for the adversarial boundary value fuzzer."""

    def test_known_problem_two_sum(self):
        """Fuzzer returns curated BVA & EP traps for prob_two_sum."""
        traps = generate_adversarial_traps("prob_two_sum", count=3)
        self.assertEqual(len(traps), 3)
        for trap in traps:
            self.assertIn("trap_name", trap)
            self.assertIn("input", trap)
            self.assertIn("expected_output", trap)

    def test_known_problem_valid_palindrome(self):
        """Fuzzer returns empty string and single character boundary tests."""
        traps = generate_adversarial_traps("prob_valid_palindrome", count=2)
        self.assertEqual(len(traps), 2)
        self.assertTrue(any("Empty" in t["trap_name"] or "Single" in t["trap_name"] for t in traps))

    def test_unknown_problem_fallback(self):
        """Unknown problem gracefully falls back to generic boundary recipes."""
        traps = generate_adversarial_traps("prob_unknown_custom_xyz", count=2)
        self.assertEqual(len(traps), 2)
        for trap in traps:
            self.assertIsInstance(trap["trap_name"], str)
            self.assertIsInstance(trap["input"], str)


class TestProfilerService(unittest.TestCase):
    """Tests for synthetic input generation and Big-O asymptotic classification."""

    def test_benchmark_input_two_sum(self):
        """Input generator builds array of size N and target integer."""
        data = generate_benchmark_input(100, "prob_two_sum")
        lines = data.strip().split("\n")
        self.assertEqual(len(lines), 2)
        nums = lines[0].split(",")
        self.assertEqual(len(nums), 100)

    def test_benchmark_input_palindrome(self):
        """Input generator builds mirrored palindrome string."""
        data = generate_benchmark_input(50, "prob_valid_palindrome")
        self.assertEqual(data, data[::-1])

    def test_fit_complexity_constant(self):
        """Flat timing profile classifies as O(1) Constant Time."""
        points = [
            {"n": 100, "time_ms": 2.0},
            {"n": 500, "time_ms": 2.1},
            {"n": 1000, "time_ms": 2.05},
        ]
        result = fit_complexity(points)
        self.assertIn("O(1)", result)

    def test_fit_complexity_linear(self):
        """Linear timing scaling classifies as O(N) Linear Time."""
        points = [
            {"n": 100, "time_ms": 1.0},
            {"n": 500, "time_ms": 5.0},
            {"n": 1000, "time_ms": 10.0},
        ]
        result = fit_complexity(points)
        self.assertIn("O(N)", result)


class TestAntiCheatService(unittest.TestCase):
    """Tests for AST code normalization and anti-cheat telemetry."""

    def setUp(self):
        self.service = AntiCheatService()

    def test_python_ast_normalization(self):
        """Normalizer renames user identifiers while maintaining semantic AST structure."""
        code = "def custom_solve(my_array):\n    total_sum = sum(my_array)\n    return total_sum\n"
        normalized = normalize_code(code, "python")
        self.assertIn("FUNC_0", normalized)
        self.assertNotIn("custom_solve", normalized)
        self.assertNotIn("total_sum", normalized)

    def test_llm_fingerprint_detection(self):
        """Flags telltale ChatGPT/Copilot comments."""
        code = "# Time Complexity: O(n)\n# Space Complexity: O(1)\ndef solve(): pass"
        flags = detect_llm_fingerprints(code)
        self.assertGreaterEqual(len(flags), 1)

    def test_keystroke_bulk_paste_detection(self):
        """High paste ratio in a very short duration flags suspicious instant paste."""
        code = "def solve():\n    return 42\n" * 10
        telemetry = {
            "paste_count": 1,
            "paste_chars": len(code) - 2,
            "total_typing_ms": 3000,
        }
        report = self.service.evaluate_submission("prob_two_sum", code, "python", telemetry)
        self.assertEqual(report["integrity_score"], 70)
        self.assertEqual(report["plagiarism_risk"], "suspicious")
        self.assertIn("Instant Bulk Paste", report["keystroke_status"])


if __name__ == "__main__":
    unittest.main()
