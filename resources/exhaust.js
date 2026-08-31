'use strict';

import pool from './pool.js';
import { getChaos } from '../chaos/chaosState.js';

// GET /orders/slow-report — chaos-gated only. Normal traffic always releases
// its slot; the leak only happens when exhaustPool is deliberately toggled on.
export async function slowReport(req, res) {
  try {
    await pool.acquire();
  } catch (err) {
    res.status(503).json({ error: 'resource pool exhausted, timed out waiting for a slot' });
    return;
  }

  const { exhaustPool } = getChaos();

  if (exhaustPool) {
    // Deliberately never released — simulates a leaked resource until
    // RESOURCE_POOL_MAX is exceeded and later requests queue/timeout.
    res.json({ report: [{ ok: 1 }], warning: 'slot deliberately held open (chaos: exhaustPool)' });
    return;
  }

  pool.release();
  res.json({ report: [{ ok: 1 }] });
}
