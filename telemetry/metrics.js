'use strict';

import { metrics } from '@opentelemetry/api';
import pool from '../resources/pool.js';

const meter = metrics.getMeter('reliability-workshop-app');

// RED-pattern instruments, layered explicitly on top of auto-instrumentation
// so the SLO math has exactly the labels it needs.
// TODO: define the RED-pattern instruments on `meter`. Two kinds here: a
// Counter/Histogram you update yourself per request (below, in the
// middleware), and ObservableGauges that report their value on-demand
// whenever the SDK asks — good for numbers that already live somewhere
// else (here, the resource pool's own live counters) instead of being
// tracked twice.
//
//   - a Counter named 'http_requests_total'
//   - a Histogram named 'http_request_duration_seconds' (unit: 's', with
//     explicitBucketBoundaries: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5] — chosen
//     to land exactly on the 300ms SLO threshold, no interpolation needed)
//   - three ObservableGauges reading from pool.stats(): 'resource_pool_active',
//     'resource_pool_idle', 'resource_pool_waiting' — each takes a callback
//     that calls observableResult.observe(...) with the current value
//
// Name your Counter/Histogram variables `httpRequestsTotal` and
// `httpRequestDurationSeconds` — you'll reference them below in the middleware.

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

    // TODO: record this request — a Counter takes a plain increment amount,
    // a Histogram takes the value being measured. Both take `attributes` as
    // their second argument so Grafana can filter/group by method, route,
    // and status code.
    // httpRequestsTotal.add(1, attributes);
    // httpRequestDurationSeconds.record(durationSeconds, attributes);
  });

  next();
}
