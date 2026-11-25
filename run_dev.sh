#!/usr/bin/env bash
# ═══════════════════════════════════════════════
# Clash of Codes — Local Development Launcher
# Starts Backend (FastAPI :8000) and Frontend (Next.js :3000)
# ═══════════════════════════════════════════════

set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"

echo "⚔️ Starting Clash of Codes..."

# Cleanup child processes on exit
trap 'kill $(jobs -p) 2>/dev/null || true' EXIT

# 1. Start FastAPI Backend
echo "🚀 Starting Backend on http://localhost:8000 (Docs: http://localhost:8000/api/docs)..."
cd "$DIR/backend"
"$DIR/backend/.venv/bin/uvicorn" app.main:app --host 0.0.0.0 --port 8000 --reload &

# 2. Start Next.js Frontend
echo "⚡ Starting Next.js Frontend on http://localhost:3000..."
cd "$DIR/frontend"
npm run dev &

wait

