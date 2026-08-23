# Production Operations Guide

This starter supplies instrumentation and operational contracts. A deployed application must connect them to destinations owned by the operator.

## Signals

### Logs

Logs are structured JSON written to stdout through Pino. They include the service, version, environment, request ID, route, status and duration. Authorization, cookie, password and token fields are redacted.

Send stdout to a centralized destination through the platform rather than adding a blocking network transport to request handlers. Railway log drains, Better Stack, Loki, Datadog, Elastic and CloudWatch are suitable destinations.

Recommended alerts:

- Error log rate exceeds the normal baseline.
- Repeated `uncaughtException` or bootstrap failures.
- Slow requests exceed the latency objective.
- Audit-log delivery stops.

### Error monitoring

Set `SENTRY_DSN` to enable the Sentry adapter. Without it, a no-op adapter is used. `SENTRY_TRACES_SAMPLE_RATE` must be intentionally selected per environment; do not use 100% tracing in a high-volume production service without understanding cost and privacy impact.

### Metrics

`GET /metrics` exposes Prometheus-compatible Node.js and HTTP metrics. Production startup fails if metrics are enabled without `METRICS_TOKEN`.

Scrape with:

```http
Authorization: Bearer <METRICS_TOKEN>
```

Core alerts:

- 5xx ratio over 1% for five minutes.
- p95 latency over the service objective.
- Sustained event-loop delay or memory growth.
- Readiness failures.
- Instance restart loops.

### Tracing

Set `OTEL_ENABLED=true` and configure `OTEL_EXPORTER_OTLP_ENDPOINT` with the base HTTP endpoint of an OTLP collector. The starter exports to `/v1/traces` and `/v1/metrics` and uses OpenTelemetry auto-instrumentation.

OpenTelemetry is vendor-neutral. The collector may forward data to Grafana, Datadog, New Relic, Honeycomb, Better Stack or another compatible backend.

## Health endpoints

- `/health` is liveness. It answers while the process is running and must not call external dependencies.
- `/ready` is readiness. Register database, cache and queue checks through `IHealthCheck`. A failed required dependency returns HTTP 503.

Do not put email delivery or other expensive side effects in readiness checks.

## Graceful shutdown

Register every long-lived resource with `ShutdownRegistry`:

```ts
container.shutdown.register({
  name: 'database',
  priority: 100,
  close: () => database.disconnect(),
});
```

Recommended order is to stop inbound/background work, close database and queue connections, then flush monitoring and telemetry. The process enforces `SHUTDOWN_TIMEOUT_MS` as an upper bound.

## Audit records

`StructuredAuditLogger` emits distinct `audit: true` JSON records. It is suitable only when the logging platform provides durable ingestion, restricted access and retention guarantees. Regulated applications should implement `IAuditLogger` with an append-only database or dedicated audit store.

Never write passwords, tokens, raw payment data, medical records or full before/after personal records into audit metadata.

## Outbound resilience

Use `resilientFetch` for calls to external services. It provides explicit timeouts, retry classification, exponential backoff with jitter and optional circuit breaking.

Automatic retries are limited to idempotent methods. A POST is retried only when the application supplies an `Idempotency-Key` header. Payment and mutation workflows still require application-level idempotency storage.

## Deployment checklist

- [ ] All required environment values are injected through the platform.
- [ ] No `.env` file or real credential is committed.
- [ ] CORS contains exact trusted origins or an application policy.
- [ ] Authentication, authorization and CSRF policy are implemented and tested.
- [ ] Database migrations run as a controlled release step, not from every replica.
- [ ] `/ready` includes required database and queue dependencies.
- [ ] Central logs, error monitoring, metrics and alerts are connected.
- [ ] `METRICS_TOKEN` is set or metrics are disabled.
- [ ] Backup and restore have been tested.
- [ ] `npm run quality` and `npm run audit:production` pass.
- [ ] The container runs as a non-root user.
- [ ] Shutdown duration is shorter than the platform termination grace period.
- [ ] A rollback procedure and on-call owner are documented.

## Incident response

1. Confirm impact using error rate, latency and readiness.
2. Use request IDs to correlate logs, errors and traces.
3. Roll back or disable the failing integration if customer impact is active.
4. Preserve audit and diagnostic evidence without copying sensitive data into chat or tickets.
5. Document the timeline, contributing factors and corrective actions.
