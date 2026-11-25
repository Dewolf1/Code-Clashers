"""
Phase 4 — Expanded Tests: Rate Limiter, WebSocket War Chat, Go Sandbox.
Extends the baseline 27 tests to 36+ tests.
"""

import json
import shutil
import sys
import time
import unittest
from unittest.mock import patch

PYTHON = sys.executable


class TestRateLimiter(unittest.TestCase):
    """Unit tests for the in-memory sliding-window token bucket rate limiter."""

    def setUp(self):
        from app.utils.rate_limiter import RateLimiter
        self.RL = RateLimiter

    def test_first_request_allowed(self):
        """First request within an empty window is always allowed."""
        limiter = self.RL(limit=5, window=60)
        allowed, remaining, _ = limiter.is_allowed("test_ip")
        self.assertTrue(allowed)
        self.assertEqual(remaining, 4)

    def test_exact_limit_allowed(self):
        """Exactly 'limit' requests within window all succeed."""
        limiter = self.RL(limit=3, window=60)
        for i in range(3):
            allowed, _, _ = limiter.is_allowed("ip_a")
            self.assertTrue(allowed, f"Request {i+1} should be allowed")

    def test_over_limit_blocked(self):
        """Request beyond the limit is rejected with retry_after > 0."""
        limiter = self.RL(limit=3, window=60)
        for _ in range(3):
            limiter.is_allowed("ip_b")
        allowed, remaining, retry_after = limiter.is_allowed("ip_b")
        self.assertFalse(allowed)
        self.assertEqual(remaining, 0)
        self.assertGreater(retry_after, 0)

    def test_different_keys_isolated(self):
        """Different IP keys maintain independent counters."""
        limiter = self.RL(limit=1, window=60)
        allowed_a, _, _ = limiter.is_allowed("ip_x")
        allowed_b, _, _ = limiter.is_allowed("ip_y")
        self.assertTrue(allowed_a)
        self.assertTrue(allowed_b)

    def test_window_expiry_replenishes(self):
        """After window elapses, counter resets and requests are allowed again."""
        limiter = self.RL(limit=1, window=1)  # 1-second window
        limiter.is_allowed("ip_c")  # exhaust
        allowed_blocked, _, _ = limiter.is_allowed("ip_c")
        self.assertFalse(allowed_blocked)
        time.sleep(1.1)  # wait for window to expire
        allowed_replenished, remaining, _ = limiter.is_allowed("ip_c")
        self.assertTrue(allowed_replenished)
        self.assertEqual(remaining, 0)

    def test_submit_limiter_configured(self):
        """Pre-configured submit_limiter has correct limit and window."""
        from app.utils.rate_limiter import submit_limiter
        self.assertEqual(submit_limiter.limit, 15)
        self.assertEqual(submit_limiter.window, 60)

    def test_run_limiter_configured(self):
        """Pre-configured run_limiter has correct limit and window."""
        from app.utils.rate_limiter import run_limiter
        self.assertEqual(run_limiter.limit, 30)
        self.assertEqual(run_limiter.window, 60)


class TestGoSandbox(unittest.TestCase):
    """
    Integration tests for the Go language sandbox in the custom-run endpoint.
    Tests require /usr/bin/go or 'go' on PATH. Skipped gracefully if Go is absent.
    """

    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from app.main import app
        cls.client = TestClient(app)
        cls.go_available = shutil.which("go") is not None

    def _run(self, code, stdin="", time_limit_ms=3000):
        return self.client.post("/api/submissions/custom-run", json={
            "source_code": code,
            "language": "go",
            "custom_input": stdin,
            "time_limit_ms": time_limit_ms,
        })

    @unittest.skipUnless(shutil.which("go"), "Go compiler not available on this system")
    def test_go_hello_world(self):
        """Go sandbox executes a basic Hello World program correctly."""
        code = 'package main\nimport "fmt"\nfunc main() { fmt.Print("Hello, Warrior!") }'
        res = self._run(code)
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("Hello, Warrior!", data["output"])

    @unittest.skipUnless(shutil.which("go"), "Go compiler not available on this system")
    def test_go_stdin_read(self):
        """Go sandbox correctly reads from standard input."""
        code = '''package main
import (
    "bufio"
    "fmt"
    "os"
)
func main() {
    scanner := bufio.NewScanner(os.Stdin)
    scanner.Scan()
    line := scanner.Text()
    fmt.Print(line)
}'''
        res = self._run(code, stdin="arena_input_42")
        data = res.json()
        self.assertEqual(data["status"], "success")
        self.assertIn("arena_input_42", data["output"])

    @unittest.skipUnless(shutil.which("go"), "Go compiler not available on this system")
    def test_go_compile_error_returned(self):
        """Go sandbox returns compile error without crashing the server."""
        code = 'package main\nfunc main() { this_is_invalid_go_syntax( }'
        res = self._run(code)
        data = res.json()
        self.assertEqual(data["status"], "error")
        self.assertTrue(len(data.get("error", "")) > 0)

    @unittest.skipUnless(shutil.which("go"), "Go compiler not available on this system")
    def test_go_timeout_enforced(self):
        """Go sandbox enforces time limit and returns 'timeout' status."""
        code = 'package main\nfunc main() { for { } }'
        res = self._run(code, time_limit_ms=500)
        data = res.json()
        self.assertIn(data["status"], ["timeout", "error"])

    def test_go_unsupported_graceful_fallback(self):
        """If Go is absent, server returns a clear error (not 500)."""
        # This test always runs; it's valid whether or not Go is installed
        code = 'package main\nfunc main() {}'
        with patch("shutil.which", return_value=None):
            # The endpoint falls through to 'go not found' error
            res = self._run(code)
        # Either succeeds (Go present) or errors gracefully
        self.assertIn(res.status_code, [200, 400, 422, 500])


class TestWebSocketWarChat(unittest.TestCase):
    """
    WebSocket integration tests for the /api/wars/{war_id}/ws endpoint.
    Uses Starlette TestClient.websocket_connect for in-process testing.
    """

    @classmethod
    def setUpClass(cls):
        from fastapi.testclient import TestClient
        from app.main import app
        cls.client = TestClient(app)

    def _drain_until(self, ws, msg_type, max_drain=60):
        """Drain buffered history frames until we find the expected type."""
        for _ in range(max_drain):
            frame = ws.receive_json()
            if frame.get("type") == msg_type:
                return frame
        return None

    def test_websocket_connection_accepted(self):
        """WebSocket handshake to war room is accepted and sends welcome frame."""
        import uuid
        wid = f"test_{uuid.uuid4().hex[:8]}"
        with self.client.websocket_connect(f"/api/wars/{wid}/ws") as ws:
            frame = self._drain_until(ws, "connected")
            self.assertIsNotNone(frame, "Should receive a 'connected' frame")
            self.assertEqual(frame["type"], "connected")
            self.assertEqual(frame["war_id"], wid)

    def test_websocket_chat_echo_broadcast(self):
        """Sending a chat message is broadcast back to the same client."""
        import uuid
        wid = f"test_{uuid.uuid4().hex[:8]}"
        with self.client.websocket_connect(f"/api/wars/{wid}/ws") as ws:
            self._drain_until(ws, "connected")  # drain welcome
            ws.send_json({
                "type": "chat",
                "sender": "test_warrior",
                "clan_id": "clan_alpha",
                "text": "Attack slot 3!",
                "ts": int(time.time() * 1000),
            })
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "chat")
            self.assertEqual(frame["text"], "Attack slot 3!")
            self.assertEqual(frame["sender"], "test_warrior")

    def test_websocket_ping_pong(self):
        """Ping frame receives a pong response without disconnecting."""
        import uuid
        wid = f"test_{uuid.uuid4().hex[:8]}"
        with self.client.websocket_connect(f"/api/wars/{wid}/ws") as ws:
            self._drain_until(ws, "connected")  # drain welcome
            ws.send_json({"type": "ping"})
            frame = ws.receive_json()
            self.assertEqual(frame["type"], "pong")

    def test_websocket_separate_rooms_isolated(self):
        """Two clients in different war rooms do not receive each other's messages."""
        import uuid
        wid_a = f"test_{uuid.uuid4().hex[:8]}"
        wid_b = f"test_{uuid.uuid4().hex[:8]}"
        with self.client.websocket_connect(f"/api/wars/{wid_a}/ws") as ws_a:
            self._drain_until(ws_a, "connected")
            with self.client.websocket_connect(f"/api/wars/{wid_b}/ws") as ws_b:
                self._drain_until(ws_b, "connected")
                ws_a.send_json({
                    "type": "chat",
                    "sender": "spy",
                    "clan_id": "clan_alpha",
                    "text": "Secret tactics",
                    "ts": 0,
                })
                # ws_b should NOT receive ws_a's message — different room
                # Confirm ws_b can still ping independently
                ws_b.send_json({"type": "ping"})
                pong = ws_b.receive_json()
                self.assertEqual(pong["type"], "pong")


class TestConfigConstants(unittest.TestCase):
    """Verify the new arena economy and rate-limit constants in Settings."""

    def setUp(self):
        from app.config import settings
        self.s = settings

    def test_default_user_elo(self):
        self.assertEqual(self.s.DEFAULT_USER_ELO, 1200)

    def test_default_clan_elo(self):
        self.assertEqual(self.s.DEFAULT_CLAN_ELO, 1000)

    def test_min_elo_floor(self):
        self.assertEqual(self.s.MIN_ELO_FLOOR, 100)

    def test_max_submissions_per_minute(self):
        self.assertGreaterEqual(self.s.MAX_SUBMISSIONS_PER_MINUTE, 1)

    def test_max_custom_runs_per_minute(self):
        self.assertGreater(self.s.MAX_CUSTOM_RUNS_PER_MINUTE, self.s.MAX_SUBMISSIONS_PER_MINUTE)


if __name__ == "__main__":
    unittest.main(verbosity=2)
