'use strict';

// Continuous low-volume traffic against the app's normal routes, so the
// SLO's error ratio and latency histograms have a steady stream to compute
// against — a fired fault should produce a visible burn-rate curve, not a
// single noisy data point.

const BASE_URL = process.env.LOAD_BASE_URL || 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.LOAD_INTERVAL_MS) || 500;

const ROUTES = ['/health', '/orders', '/orders/1', '/orders/slow-report'];

async function hitOnce() {
  const route = ROUTES[Math.floor(Math.random() * ROUTES.length)];
  const start = Date.now();
  try {
    const res = await fetch(`${BASE_URL}${route}`);
    console.log(`${res.status} ${route} (${Date.now() - start}ms)`);
  } catch (err) {
    console.error(`ERR ${route}: ${err.message}`);
  }
}

console.log(`load generator hitting ${BASE_URL} every ${INTERVAL_MS}ms — Ctrl+C to stop`);
setInterval(hitOnce, INTERVAL_MS);
