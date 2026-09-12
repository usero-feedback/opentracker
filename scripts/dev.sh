#!/bin/bash
# Will's workflow: local dev behind a named cloudflared tunnel. Plain local dev is `npm run dev`.
set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TUNNEL_URL="https://dev.tracker.usero.io"

echo -e "${YELLOW}Starting local dev environment...${NC}"

# Kill any processes using our ports from previous runs
cleanup_stale_ports() {
  for port in 8787 8788 9229 9230; do
    pids=$(lsof -ti :$port 2>/dev/null || true)
    if [ -n "$pids" ]; then
      echo "Killing stale process(es) on port $port"
      echo "$pids" | xargs kill -9 2>/dev/null || true
    fi
  done
  sleep 1
}

echo "Cleaning up stale processes..."
cleanup_stale_ports

# Start cloudflared named tunnel
echo "Starting Cloudflare tunnel -> $TUNNEL_URL"
cloudflared tunnel run --url http://localhost:8787 leantracker-dev &
TUNNEL_PID=$!
sleep 2

# Start main app on 8787
echo "Starting main app on port 8787..."
npm run dev &
MAIN_PID=$!

echo -e "${GREEN}Dev environment ready!${NC}"
echo -e "  Local:  http://localhost:8787"
echo -e "  Public: $TUNNEL_URL"

cleanup() {
  echo "Shutting down..."
  kill $TUNNEL_PID $MAIN_PID 2>/dev/null
}
trap cleanup EXIT

wait
