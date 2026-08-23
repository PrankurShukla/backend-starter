import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { config } from '../config/environment';
import { logger } from '../config/logger';

let sdk: NodeSDK | undefined;

export function startTelemetry(): Promise<void> {
  if (!config.OTEL_ENABLED || sdk) return Promise.resolve();

  const endpoint = config.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '');
  sdk = new NodeSDK({
    serviceName: config.SERVICE_NAME,
    traceExporter: new OTLPTraceExporter({ url: `${endpoint}/v1/traces` }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({ url: `${endpoint}/v1/metrics` }),
      exportIntervalMillis: config.OTEL_EXPORT_INTERVAL_MS,
    }),
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
      new PinoInstrumentation(),
      new UndiciInstrumentation(),
    ],
  });

  sdk.start();
  logger.info({ endpoint }, 'OpenTelemetry initialized');
  return Promise.resolve();
}

export async function stopTelemetry(): Promise<void> {
  if (!sdk) return;
  await sdk.shutdown();
  sdk = undefined;
}
