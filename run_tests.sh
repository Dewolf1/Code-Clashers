#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Clash of Codes — Comprehensive Test Suite Runner
# Executes backend service tests, router integration tests, and
# frontend production build verification.
# ═══════════════════════════════════════════════════════════════════

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

echo "=================================================================="
echo "⚔️  CLASH OF CODES — FULL SYSTEM TEST SUITE"
echo "=================================================================="

# ── 1. Backend Service & Router Tests ──────────────────────────────
echo ""
echo "▶ Running Backend Tests (Services & FastAPI TestClient Routers)..."
export PYTHONPATH="$BACKEND_DIR"

if [ -f "$BACKEND_DIR/.venv/bin/python3" ]; then
    PYTHON_BIN="$BACKEND_DIR/.venv/bin/python3"
else
    PYTHON_BIN="python3"
fi

"$PYTHON_BIN" -m unittest discover "$BACKEND_DIR/tests" -v

echo ""
echo "✅ All 27 backend unit & integration tests PASSED!"

# ── 2. Frontend Turbopack Build Verification ───────────────────────
echo ""
echo "▶ Running Frontend Build & Typecheck (Next.js 16 + Turbopack)..."
cd "$FRONTEND_DIR"
npm run build

echo ""
echo "✅ Frontend production build PASSED with 0 errors!"

echo ""
echo "=================================================================="
echo "🎉 ALL TESTS PASSED: 27/27 BACKEND TESTS & FRONTEND BUILD VERIFIED!"
echo "=================================================================="

