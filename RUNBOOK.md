# Runbook — Reliability Workshop Demo App

Three fault types, toggled via `POST /admin/chaos`, inspectable via `GET /admin/chaos`. Each fires either as a self-clearing blip (`durationMs` set) or a sustained breach (`durationMs` omitted).

## Fault 1 — Injected latency

**Symptom:** `http_request_duration_seconds` histogram shifts toward higher buckets. `http_requests_total` error rate stays normal.

**Likely cause:** `latencyMs` is active in chaos state — an artificial delay is being added to every request.

**Diagnostic check:** `GET /admin/chaos` — if `latencyMs > 0`, confirmed. Not something else.

**Remediation:** `POST /admin/chaos` with an empty body clears all active faults immediately. If `durationMs` was set, it self-clears — check whether it's already resolved before acting.

## Fault 2 — Injected error rate

**Symptom:** `http_requests_total` shows a rising proportion of `status_code=503` responses. Latency stays roughly normal. `resource_pool_waiting` and `resource_pool_active` stay flat — this is the key distinguishing signal from Fault 3.

**Likely cause:** `errorRate` is active in chaos state — requests are being randomly failed at that probability, independent of any real resource constraint.

**Diagnostic check:** `GET /admin/chaos` — confirm `errorRate > 0`. Cross-check that pool gauges are not climbing, to rule out Fault 3.

**Remediation:** `POST /admin/chaos` with an empty body, or wait out `durationMs` if set.

## Fault 3 — Simulated resource-pool exhaustion

**Symptom:** `resource_pool_active` pinned at `RESOURCE_POOL_MAX`. `resource_pool_waiting` climbing over time. `503`s only begin appearing after `RESOURCE_POOL_TIMEOUT_MS` has elapsed for queued requests — the pool signal is the leading indicator, and it precedes the errors, unlike Fault 2 where errors appear immediately with no pool signal at all.

**Likely cause:** `exhaustPool` is active in chaos state — the exhaustion route is holding pool slots without releasing them.

**Diagnostic check:** `GET /admin/chaos` — confirm `exhaustPool: true`. Confirm the climbing-then-erroring pattern in the metrics, not just the presence of `503`s alone.

**Remediation:** `POST /admin/chaos` with an empty body immediately releases the held state; new requests should succeed again within one `RESOURCE_POOL_TIMEOUT_MS` cycle as the queue drains.

## How to tell these three apart fast

Fault 2 and Fault 3 both eventually produce `503`s and can look identical if you only check the error rate.

| Signal | Fault 2 (error rate) | Fault 3 (pool exhaustion) |
|---|---|---|
| `resource_pool_waiting` | flat | climbing before errors start |
| Time to first error | immediate | delayed by `RESOURCE_POOL_TIMEOUT_MS` |
| Latency pattern | unaffected | rising, then failing |
