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

const resource = new Resource({
  [ATTR_SERVICE_NAME]: serviceName,
  'attendee.id': process.env.ATTENDEE_ID || 'unknown',
});

// Endpoint/headers are read automatically from the standard
// OTEL_EXPORTER_OTLP_* env vars by the exporters below.
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

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});

export default sdk;
