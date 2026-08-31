'use strict';

import { getChaos } from '../chaos/chaosState.js';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Applied globally, before route handlers. exhaustPool is intentionally NOT
// handled here — it requires holding real resource-pool slots, which only the
// dedicated exhaustion route (resources/exhaust.js) can do.
export async function chaosMiddleware(req, res, next) {
  const { latencyMs, errorRate } = getChaos();

  if (errorRate > 0 && Math.random() < errorRate) {
    res.status(503).json({ error: 'chaos: injected failure' });
    return;
  }

  if (latencyMs > 0) {
    await delay(latencyMs);
  }

  next();
}
