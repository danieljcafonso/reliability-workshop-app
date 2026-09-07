#!/usr/bin/env bash
# Every request this app supports. Copy/paste individual lines — this file
# is a reference, not meant to be run top to bottom (chaos state is shared,
# later commands would undo earlier ones).

BASE_URL="${BASE_URL:-http://localhost:3000}"

# --- Health ---------------------------------------------------------------

curl -s -o /dev/null -w "%{http_code}\n" "$BASE_URL/health"

# --- Orders (business logic) -----------------------------------------------

curl -s "$BASE_URL/orders"

curl -s "$BASE_URL/orders/1"

# Chaos-gated resource-pool route — see Fault 3 below.
curl -s "$BASE_URL/orders/slow-report"

# --- Admin: check current chaos state --------------------------------------

curl -s "$BASE_URL/admin/chaos"

# --- Admin: reset all faults -------------------------------------------------

curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{}'

# --- Fault 1: injected latency ----------------------------------------------

# Self-clearing blip (5 minutes)
curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 400, "durationMs": 300000}'

# Sustained until manually reset
curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{"latencyMs": 400}'

# --- Fault 2: injected error rate --------------------------------------------

# Self-clearing blip (5 minutes), 80% of requests fail
curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{"errorRate": 0.8, "durationMs": 300000}'

# Sustained, 100% of requests fail
curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{"errorRate": 1.0}'

# --- Fault 3: resource-pool exhaustion ---------------------------------------

# Enable, then overload the pool (RESOURCE_POOL_MAX concurrent slots) with
# concurrent hits to the exhaustion route so requests actually queue/timeout.
curl -s -X POST "$BASE_URL/admin/chaos" \
  -H 'Content-Type: application/json' \
  -d '{"exhaustPool": true}'

for i in $(seq 1 8); do
  curl -s -o /dev/null "$BASE_URL/orders/slow-report" &
done
wait
