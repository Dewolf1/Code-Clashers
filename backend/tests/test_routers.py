"""
Integration tests for Clash of Codes FastAPI router endpoints:
- health: system status
- wars: demo war, demo reset, tactical spells (5 spells), auto-traps, target tagging, history, tournaments
- clans: clan creation, invite links, joining via invite codes
- users: ELO ratings and history trajectories
- problems: listing and details
- submissions: custom execution and full evaluation against test cases
"""

import unittest
from fastapi.testclient import TestClient

from app.main import app


class TestApiRouters(unittest.TestCase):
    """End-to-end integration tests using FastAPI TestClient."""

    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        """Health check returns status ok and version."""
        res = self.client.get("/api/health")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("status"), "ok")
        self.assertIn("version", data)

    def test_get_demo_war(self):
        """Demo war returns complete arena state including clans, problems, and status."""
        res = self.client.get("/api/wars/demo_war")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("war_id"), "demo_war")
        self.assertIn("clan_a_name", data)
        self.assertIn("clan_b_name", data)
        self.assertIn("problems", data)
        self.assertGreaterEqual(len(data["problems"]), 1)

    def test_reset_demo_war(self):
        """Demo reset resets slots to clean baseline and seeds realistic rehearsal attacks."""
        res = self.client.post("/api/wars/demo_war/reset-demo")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("war_id"), "demo_war")
        self.assertIn("reset", data.get("message", "").lower())
        self.assertGreater(data.get("slots_reset", 0), 0)

    def test_cast_tactical_spell(self):
        """Casting tactical spells (e.g., recon, time_warp, rage) succeeds and returns effect summary."""
        payload = {"spell_type": "recon", "target_slot": 1}
        res = self.client.post("/api/wars/demo_war/spells", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("spell_type"), "recon")
        self.assertEqual(data.get("target_slot"), 1)
        self.assertIn("effect_summary", data)

    def test_synthesize_auto_traps(self):
        """AI Fuzzer synthesizes adversarial traps on a defense base slot."""
        res = self.client.post("/api/wars/demo_war/auto-traps?slot_position=1")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("slot_position"), 1)
        self.assertEqual(len(data.get("traps_added", [])), 3)

    def test_tag_target(self):
        """Clan coordination assigns target slot to a warrior handle."""
        payload = {"slot_position": 2, "assigned_to": "warrior_sniper"}
        res = self.client.post("/api/wars/demo_war/tag-target", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("slot_position"), 2)
        self.assertEqual(data.get("assigned_to"), "warrior_sniper")

    def test_war_history(self):
        """War chronicle endpoint returns past wars."""
        res = self.client.get("/api/wars/history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)

    def test_create_tournament_bracket(self):
        """Single-elimination bracket generator creates bracket slots for clans."""
        clans = ["clan_alpha", "clan_omega", "clan_cyber", "clan_valkyrie"]
        res = self.client.post("/api/wars/tournaments/create", json=clans)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("tournament_id", data)
        self.assertEqual(data.get("name"), "Grand Clan Championship")
        self.assertGreaterEqual(len(data.get("rounds", [])), 1)

    def test_clan_invite_link_and_join(self):
        """Creates clan, generates 8-character invite code, and validates join endpoint."""
        # 1. Create a clan
        create_payload = {
            "name": "Valkyrie Knights",
            "description": "Elite competitive test clan",
            "badge_url": "/badges/valkyrie.png",
        }
        create_res = self.client.post("/api/clans", json=create_payload)
        self.assertIn(create_res.status_code, [200, 201])
        clan_id = create_res.json()["clan_id"]

        # 2. Generate invite code
        invite_res = self.client.post(f"/api/clans/{clan_id}/invite-link")
        self.assertEqual(invite_res.status_code, 200)
        code = invite_res.json().get("invite_code")
        self.assertTrue(code)
        self.assertEqual(len(code), 8)

        # 3. Join via invite code
        join_res = self.client.get(f"/api/clans/join?code={code}")
        self.assertEqual(join_res.status_code, 200)
        join_data = join_res.json()
        self.assertEqual(join_data.get("status"), "success")
        self.assertEqual(join_data.get("joined_clan"), clan_id)

    def test_user_elo_history(self):
        """User profile ELO endpoint returns current rating and history trajectory."""
        res = self.client.get("/api/users/dev_warrior_01/elo-history")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("uid"), "dev_warrior_01")
        self.assertIn("current_elo", data)
        self.assertIn("history", data)

    def test_problems_list_and_detail(self):
        """Problems endpoint returns catalog and problem specifics."""
        res = self.client.get("/api/problems")
        self.assertEqual(res.status_code, 200)
        problems = res.json()
        self.assertIsInstance(problems, list)
        self.assertGreaterEqual(len(problems), 1)

        detail_res = self.client.get(f"/api/problems/{problems[0]['problem_id']}")
        self.assertEqual(detail_res.status_code, 200)
        detail = detail_res.json()
        self.assertEqual(detail["problem_id"], problems[0]["problem_id"])
        self.assertIn("title", detail)

    def test_custom_run_python_solution(self):
        """Executes Python code against custom input via isolated subprocess sandbox."""
        code = (
            "import sys\n"
            "lines = sys.stdin.read().strip().split('\\n')\n"
            "nums = [int(x) for x in lines[0].split(',')]\n"
            "target = int(lines[1])\n"
            "for i in range(len(nums)):\n"
            "    for j in range(i + 1, len(nums)):\n"
            "        if nums[i] + nums[j] == target:\n"
            "            print(f'{i},{j}')\n"
            "            sys.exit(0)\n"
        )
        payload = {
            "source_code": code,
            "language": "python",
            "custom_input": "2,7,11,15\n9",
            "time_limit_ms": 2000,
        }
        res = self.client.post("/api/submissions/custom-run", json=payload)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data.get("output", "").strip(), "0,1")
        self.assertEqual(data.get("status"), "success")
        self.assertGreater(data.get("duration_ms", 0), 0)

    def test_submit_python_solution(self):
        """Evaluates a complete solution against all problem test cases."""
        code = (
            "import sys\n"
            "lines = sys.stdin.read().strip().split('\\n')\n"
            "if len(lines) >= 2:\n"
            "    nums = [int(x) for x in lines[0].split(',')]\n"
            "    target = int(lines[1])\n"
            "    seen = {}\n"
            "    for i, num in enumerate(nums):\n"
            "        diff = target - num\n"
            "        if diff in seen:\n"
            "            print(f'{seen[diff]},{i}')\n"
            "            break\n"
            "        seen[num] = i\n"
        )
        payload = {
            "problem_id": "prob_two_sum",
            "language": "python",
            "source_code": code,
            "war_id": "demo_war",
        }
        res = self.client.post("/api/submissions", json=payload)
        self.assertEqual(res.status_code, 201)
        data = res.json()
        self.assertEqual(data.get("problem_id"), "prob_two_sum")
        self.assertEqual(data.get("status"), "accepted")
        self.assertEqual(data.get("stars_earned"), 3)
        self.assertIn("test_results", data)
        self.assertIn("integrity", data)


if __name__ == "__main__":
    unittest.main()
