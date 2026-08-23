# Production Architecture

```text
Client
  ↓
Load balancer / reverse proxy
  ↓
Express application
  ├── request context and structured logs
  ├── security and rate limiting
  ├── validation and stable responses
  ├── controllers → services → repository interfaces
  └── provider interfaces → external adapters

Operational signals
  ├── stdout JSON → centralized logs
  ├── exceptions → IErrorMonitor → Sentry adapter
  ├── traces/metrics → OpenTelemetry → OTLP collector
  ├── /metrics → Prometheus scraper
  └── audit events → IAuditLogger → durable audit destination
```

## Dependency direction

Business services depend on repository and provider interfaces. Implementations import Prisma, Redis, BullMQ, cloud storage or external SDKs. This keeps business logic testable and allows providers to be replaced without rewriting use cases.

## Scaling model

API instances must remain stateless. Sessions, idempotency keys, distributed locks, queues and cached data belong in shared external systems. Local in-memory repositories are examples for development and tests only and must be replaced before production.

Workers should run as separate deployable processes and consume durable queues. HTTP requests should enqueue slow email, file-processing and integration work rather than waiting synchronously.

## What applications must supply

The starter supplies PostgreSQL/Prisma persistence, token authentication, BullMQ jobs, SMTP email and S3-compatible storage defaults. It cannot choose application-specific security or data rules. Every generated application must still supply:

- Domain models and migrations beyond the included user/auth example
- Application-specific roles and authorization policy
- Secret management
- Domain-specific DTOs and business rules
- Data retention, backup and recovery
- Provider credentials, email templates and alert destinations
- Load objectives and capacity testing
