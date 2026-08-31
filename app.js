'use strict';

import express, { json } from 'express';

import { metricsMiddleware } from './telemetry/metrics.js';
import { chaosMiddleware } from './telemetry/chaosMiddleware.js';

import healthRouter from './routes/health.js';
import ordersRouter from './routes/orders.js';
import adminRouter from './routes/admin.js';

const app = express();
const port = process.env.PORT || 3000;

app.use(json());
app.use(metricsMiddleware);

// Mounted before chaosMiddleware so the control plane is never affected by
// the faults it manages — you must always be able to check/reset chaos state,
// even during a 100% error-rate fault.
app.use('/admin', adminRouter);

app.use(chaosMiddleware);

app.use('/health', healthRouter);
app.use('/orders', ordersRouter);

app.listen(port, () => {
  console.log(`reliability-workshop-app listening on port ${port} (attendee: ${process.env.ATTENDEE_ID || 'unknown'})`);
});
