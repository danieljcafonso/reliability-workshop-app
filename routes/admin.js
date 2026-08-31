'use strict';

import { Router } from 'express';
import { setChaos, getChaos, resetChaos } from '../chaos/chaosState.js';

const router = Router();

router.get('/chaos', (req, res) => {
  res.status(200).json(getChaos());
});

router.post('/chaos', (req, res) => {
  const { latencyMs, errorRate, exhaustPool, durationMs } = req.body || {};

  if (latencyMs === undefined && errorRate === undefined && exhaustPool === undefined && durationMs === undefined) {
    resetChaos();
  } else {
    setChaos({ latencyMs, errorRate, exhaustPool, durationMs });
  }

  res.status(200).json(getChaos());
});

export default router;
