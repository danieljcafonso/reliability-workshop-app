'use strict';

import { metrics } from '@opentelemetry/api';
import pool from '../resources/pool.js';

const meter = metrics.getMeter('reliability-workshop-app');

// RED-pattern instruments, layered explicitly on top of auto-instrumentation
// so the SLO math has exactly the labels it needs.
const httpRequestsTotal = meter.createCounter('http_requests_total', {
  description: 'Total number of HTTP requests',
});

const httpRequestDurationSeconds = meter.createHistogram('http_request_duration_seconds', {
  description: 'HTTP request duration in seconds',
  unit: 's',
  advice: {
    explicitBucketBoundaries: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5],
  },
});

meter.createObservableGauge('resource_pool_active', {
  description: 'Number of resource pool slots currently checked out',
}).addCallback((observableResult) => {
  observableResult.observe(pool.stats().active);
});

meter.createObservableGauge('resource_pool_idle', {
  description: 'Number of idle resource pool slots',
}).addCallback((observableResult) => {
  observableResult.observe(pool.stats().idle);
});

meter.createObservableGauge('resource_pool_waiting', {
  description: 'Number of requests waiting for a resource pool slot',
}).addCallback((observableResult) => {
  observableResult.observe(pool.stats().waiting);
});

// Express middleware — records the counter/histogram on response finish,
// using the matched route template (not the raw URL) to keep cardinality low.
export function metricsMiddleware(req, res, next) {
  const startTimeNs = process.hrtime.bigint();

  res.on('finish', () => {
    const durationSeconds = Number(process.hrtime.bigint() - startTimeNs) / 1e9;
    const route = req.route ? `${req.baseUrl}${req.route.path}` : req.path;
    const attributes = {
      method: req.method,
      route,
      status_code: res.statusCode,
    };

    httpRequestsTotal.add(1, attributes);
    httpRequestDurationSeconds.record(durationSeconds, attributes);
  });

  next();
}
