import 'dotenv/config';

import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// Surface instrumentation problems in the console during development —
// silent misconfiguration ("set it up but see nothing in Grafana") is the
// single most common failure mode with this setup.
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

const serviceName = process.env.OTEL_SERVICE_NAME || `my-app`;

// TODO: configure the NodeSDK here. Four pieces: a Resource (the identity
// tag stamped on every span/metric — service name + attendee id, so Grafana
// can tell your traffic apart from everyone else's), a traceExporter (ships
// finished spans over the network), a metricReader (metrics aren't pushed
// one-by-one like spans — this collects and flushes them on a timer), and
// the NodeSDK itself (wires all of it together with auto-instrumentation
// and turns the whole pipeline on).
//
//   1. Build a Resource: ATTR_SERVICE_NAME set to `serviceName` above,
//      plus an 'attendee.id' attribute from process.env.ATTENDEE_ID.
//   2. Create an OTLPTraceExporter() and a PeriodicExportingMetricReader
//      wrapping an OTLPMetricExporter() — both read the OTEL_EXPORTER_OTLP_*
//      env vars automatically; you do not need to pass endpoint/headers in.
//   3. Construct `const sdk = new NodeSDK({ resource, traceExporter,
//      metricReader, instrumentations: [getNodeAutoInstrumentations()] })`
//      and call sdk.start().
//
// Until this is filled in, the app boots and serves traffic normally, but
// nothing is exported to Grafana — the diag logger above is how you'll know.
const sdk = undefined;

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export default sdk;
