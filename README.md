# Reliability Workshop — OTel Setup Exercises

Here we have a small Express app used to practice reliability engineering patterns we might encounter day to day: OpenTelemetry instrumentation, custom RED-pattern metrics, chaos injection, SLOs, and burn-rate alerting.

The app already does the following, fully working, chaos and all:

1. Serves business-logic routes (`routes/orders.js`, `routes/health.js`)
2. Injects controllable faults — latency, error rate, resource-pool exhaustion (`routes/admin.js`, `chaos/chaosState.js`, `telemetry/chaosMiddleware.js`)
3. Simulates a bounded resource pool (e.g. a DB connection pool) — a fixed number of slots (`RESOURCE_POOL_MAX`, default 5) that requests must acquire before doing work. When all slots are busy, new requests queue and time out after `RESOURCE_POOL_TIMEOUT_MS` if none frees up. The chaos `exhaustPool` flag simulates a leak: a request holds its slot forever, so slots fill up and later requests queue, then time out with `503`s (`resources/pool.js`, `resources/exhaust.js`)

What it does **not** do yet, on this branch: report anything to Grafana Cloud. That's the exercise.

## Getting started

Check out this branch (`exercise/otel-setup`) and install dependencies:

```bash
npm install
```

Copy the env template and fill in your own values:

```bash
cp .env.example .env
```

At minimum, set `ATTENDEE_ID` to something unique to you, and set `OTEL_EXPORTER_OTLP_ENDPOINT` / `OTEL_EXPORTER_OTLP_HEADERS` to your Grafana Cloud stack's OTLP gateway URL and API token (from the Grafana Cloud portal's OpenTelemetry setup page).

Run the app:

```bash
npm start
```

Hit a route:

```bash
curl http://localhost:3000/orders
```

It'll return `200` — the app works fine right now. Nothing shows up in Grafana yet. That's expected; it's what you're about to fix.

## Exercise 1 — Wire up the NodeSDK

Open `instrumentation.js`. It's loaded before anything else in the app (`node --import ./instrumentation.js app.js`), which matters: OpenTelemetry's auto-instrumentation only patches libraries (`express`, `http`) that haven't been `import`d yet, so this file has to run first.

Read the `TODO` block. Build, in order:

1. A `Resource` — the identity tag stamped on every span/metric so Grafana can tell your traffic apart from every other attendee's.
2. An `OTLPTraceExporter` and a `PeriodicExportingMetricReader` (wrapping an `OTLPMetricExporter`) — both read their destination/credentials automatically from the `OTEL_EXPORTER_OTLP_*` env vars you just set.
3. A `NodeSDK`, wiring the above together with `getNodeAutoInstrumentations()`, then call `.start()` on it.

**Goal check:** run the app, hit `/orders` a few times, then check **Explore** in Grafana Cloud (Tempo data source) for a trace from your service name. If you see nothing and no errors in your console either, something didn't get wired — check the `diag` logger output first; it's there specifically to surface silent misconfiguration.

<details>
<summary>See solution</summary>

<p>

```js
const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  'attendee.id': process.env.ATTENDEE_ID || 'unknown',
});

const traceExporter = new OTLPTraceExporter();

const metricReader = new PeriodicExportingMetricReader({
  exporter: new OTLPMetricExporter(),
});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  metricReader,
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();
```

</p>

</details>

## Exercise 2 — Custom RED metrics

Auto-instrumentation alone gives you HTTP spans and some built-in metrics, but the exact metric names and labels an SLO needs shouldn't depend on which version of an instrumentation library happens to be installed. This exercise builds that guarantee by hand.

### What are RED metrics?

RED is the minimal set of signals needed to tell if a service is healthy:

- **Rate** — requests per second (`http_requests_total`)
- **Errors** — failed requests per second (`http_requests_total` filtered to error `status_code` values)
- **Duration** — how long requests take (`http_request_duration_seconds`)

### Instrument types

- **Counter**: a value that only goes up — total requests, total errors
- **Histogram**: buckets samples into ranges — request duration, payload size
- **ObservableGauge**: a value read on demand that can go up or down — pool active/idle/waiting connections

### Part 1 — define the instruments

Open `telemetry/metrics.js`. Read the `TODO` block above `metricsMiddleware`. Define, on `meter`:

1. A `Counter` named `http_requests_total`
2. A `Histogram` named `http_request_duration_seconds`, unit `'s'`, with `explicitBucketBoundaries: [0.05, 0.1, 0.2, 0.3, 0.5, 1, 2, 5]`
3. Three `ObservableGauge`s reading live off `pool.stats()`: `resource_pool_active`, `resource_pool_idle`, `resource_pool_waiting`

<details>
<summary>See solution</summary>

<p>

```js
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
```

</p>

</details>

### Part 2 — record them

Still in `telemetry/metrics.js`, inside `metricsMiddleware`. The `attributes` object (`method`, `route`, `status_code`) is already built for you. Use it.

<details>
<summary>See solution</summary>

<p>

```js
httpRequestsTotal.add(1, attributes);
httpRequestDurationSeconds.record(durationSeconds, attributes);
```

</p>

</details>

**Goal check:** hit a few routes, then in Grafana Cloud Explore (Prometheus/Mimir data source), query `http_requests_total{service_name="<your OTEL_SERVICE_NAME>"}`. You should see a real series. Trigger a fault (`POST /admin/chaos` with `{"errorRate": 1}`) and confirm `status_code="503"` shows up as its own label value.
