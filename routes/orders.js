'use strict';

import { Router } from 'express';
import { slowReport } from '../resources/exhaust.js';

const router = Router();

const SAMPLE_ORDERS = [
  { id: 1, item: 'widget', quantity: 3 },
  { id: 2, item: 'gadget', quantity: 1 },
  { id: 3, item: 'gizmo', quantity: 7 },
];

router.get('/', (req, res) => {
  res.status(200).json({ orders: SAMPLE_ORDERS });
});

// Registered before /:id so it isn't shadowed by the param route.
router.get('/slow-report', slowReport);

router.get('/:id', (req, res) => {
  const order = SAMPLE_ORDERS.find((o) => o.id === Number(req.params.id));
  if (!order) {
    res.status(404).json({ error: 'order not found' });
    return;
  }
  res.status(200).json({ order });
});

export default router;
