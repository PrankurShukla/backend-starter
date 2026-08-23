# Prankur Backend Starter

A standalone, vendor-neutral TypeScript backend foundation extracted from the production practices proven in EMS. It intentionally uses the familiar route → controller → service → repository flow.

## Included from day one

- Strict TypeScript and validated environment configuration
- Structured JSON logs with sensitive-field redaction
- Request and correlation IDs using `AsyncLocalStorage`
- Optional Sentry error reporting through a replaceable interface
- Vendor-neutral OpenTelemetry tracing and OTLP metric export
- Protected Prometheus-compatible runtime and HTTP metrics
- Standard success and error response envelopes
- Stable error-code constants
- DTO runtime validation with Zod
- Global 404 and error handling
- CORS policy interface, security headers, HPP protection and rate limiting
- Liveness and dependency-aware readiness endpoints
- Coordinated graceful shutdown for HTTP, telemetry and application resources
- Audit logging contract with a structured-log adapter
- Timeout, retry, backoff, circuit-breaker and idempotency-aware HTTP utilities
- Replaceable email, storage, queue, token and password interfaces
- Repository-driven example user module
- Coverage-enforced tests, strict linting, Docker and Railway configuration
- GitHub Actions quality gates and Dependabot updates

School, fee, attendance and other EMS business rules are deliberately excluded.

## Quick start

Node.js 20.19 or newer is required.

```bash
npm install
cp .env.example .env
npm run dev
```

To exercise the production-shaped stack locally (PostgreSQL, Redis, API and worker):

```bash
docker compose up --build
```

The default `.env.example` deliberately uses in-memory persistence, inline jobs, console email and local storage for a simple first run. Environment validation rejects those unsafe defaults when `NODE_ENV=production`.

Verify the service:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready
```

Metrics are available in development at `http://localhost:5000/metrics`. Production requires a bearer token when metrics are enabled.

Create an account:

```bash
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"user@example.com","password":"a-secure-development-password","firstName":"Example","lastName":"User"}'
```

## Request flow

```text
Route → Validation → Controller → Service → Repository → Database adapter
                                  ↓
                               Provider
```

- Routes define URLs and middleware.
- Controllers translate HTTP requests and responses.
- Services contain business rules.
- Repositories hide the selected database technology.
- Providers hide external services such as email, storage and queues.

## Project structure

```text
src/
├── audit/           Security-relevant audit event contract
├── bootstrap/       Dependency construction
├── config/          Environment and logging
├── constants/       Stable application constants
├── controllers/     HTTP controllers
├── errors/          Typed operational errors
├── middlewares/     HTTP and security middleware
├── models/          DTOs and runtime schemas
├── observability/   Error monitoring, metrics and tracing
├── providers/       Vendor-neutral external-service contracts
├── repositories/    Database contracts and adapters
├── routes/          Express routes
├── resilience/      Timeouts, retries and circuit breaking
├── services/        Business logic
├── shutdown/        Coordinated resource cleanup
├── types/           Shared TypeScript types
├── utils/           Small reusable helpers
├── app.ts           Application factory
├── server.ts        HTTP lifecycle and process failure handling
└── index.ts         Telemetry-first process bootstrap
```

## Dynamic CORS without coupling the core

Static origins come from `CORS_ORIGINS`. Applications that resolve customer domains dynamically can inject a policy:

```ts
import { createApp, type ICorsPolicy } from './src';

const tenantCorsPolicy: ICorsPolicy = {
  async isAllowed(origin) {
    return configuredOrigins.has(origin) || tenantDomainRepository.exists(origin);
  },
};

const app = createApp({ corsPolicy: tenantCorsPolicy });
```

The reusable core never needs to know about tenants or a particular database.

## Replacing the example repository

`InMemoryUserRepository` makes the starter runnable without infrastructure. Set `DATABASE_PROVIDER=prisma` and `DATABASE_URL` to use the included production PostgreSQL implementation. A Drizzle, MongoDB or other implementation can replace `IUserRepository`; `UserService` and the HTTP layer do not change.

## Adding application routes

Applications can register routes without editing the core setup:

```ts
const app = createApp({
  registerRoutes(app, container) {
    app.use('/api/v1/orders', createOrderRoutes(container.orderService));
  },
});
```

## Quality checks

```bash
npm run quality
npm run audit:production
```

`quality` runs type checking, strict linting, coverage-enforced tests and the production build. CI also builds the production container.

## Production operations

- [Beginner guide: from CRUD to this starter](docs/BEGINNER_GUIDE.md)
- [Adapters, local stack and deployment](docs/ADAPTERS_AND_DEPLOYMENT.md)
- [EMS migration strategy](docs/EMS_MIGRATION.md)
- [Operations and deployment runbook](docs/OPERATIONS.md)
- [Production architecture](docs/PRODUCTION_ARCHITECTURE.md)
- [Security policy](SECURITY.md)
- [Adding a module](docs/ADDING_A_MODULE.md)

All monitoring integrations are optional locally and configured through environment variables. Production applications must connect logs, errors, metrics and traces to destinations they operate and must replace the in-memory example repository.

## Future packaging roadmap

This repository is a complete, copyable starter with working default adapters. After those contracts have been proven across multiple applications, stable pieces may optionally be published as:

```text
@prankur/backend-core
@prankur/backend-prisma
@prankur/backend-auth
@prankur/backend-queue
create-prankur-backend
```

Keeping the template standalone first lets the contracts mature before they become versioned public APIs.
