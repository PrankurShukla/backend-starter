# Adapters, Local Stack and Deployment

The starter is batteries-included but not vendor-locked. Business services depend on repository and provider interfaces; concrete technology lives under `src/infrastructure/` and is selected in `src/bootstrap/container.ts`.

## Included defaults

| Capability | Development default | Production adapter | Stable boundary |
| --- | --- | --- | --- |
| Persistence | In-memory repositories | PostgreSQL through Prisma | `IUserRepository`, `IRefreshSessionRepository` |
| Passwords | Node.js scrypt | Node.js scrypt | `IPasswordHasher` |
| Tokens | Signed JWT access and rotating refresh tokens | Same implementation with production secrets | `ITokenProvider` |
| Jobs | Inline execution | Redis and BullMQ | `IQueueProvider`, `JobHandlerRegistry` |
| Email | Structured console record | Pooled SMTP | `IEmailProvider` |
| Storage | Local filesystem | S3-compatible object storage | `IStorageProvider` |

The container is the only place that chooses implementations. Controllers and business services must not inspect provider names or import Prisma, BullMQ, Nodemailer or AWS SDK types.

## Run the complete stack locally

Docker Compose starts PostgreSQL, Redis, the API and the independent worker:

```bash
docker compose up --build
```

Verify it:

```bash
curl http://localhost:5000/health
curl http://localhost:5000/ready

curl -X POST http://localhost:5000/api/v1/auth/register \
  -H 'content-type: application/json' \
  -d '{"email":"owner@example.com","password":"a-secure-development-password","firstName":"Example","lastName":"Owner"}'
```

The API container applies committed migrations before starting. The worker waits until the API and Redis are healthy.

## Run PostgreSQL without Dockerizing the API

Start PostgreSQL, update `.env`, and run:

```bash
npm run generate
npm run db:deploy
npm run dev
```

Start the worker in another terminal when using BullMQ:

```bash
npm run dev:worker
```

Use `npm run db:migrate -- --name describe_change` while developing a new schema migration. Commit both `prisma/schema.prisma` and the generated migration SQL. Deployments use `npm run db:deploy`; they must never run `migrate dev`.

## Authentication behavior

The example authentication module includes:

- Registration with normalized email and password validation.
- Scrypt password hashing with a random salt.
- Short-lived access tokens.
- Persistent, rotating refresh sessions.
- Refresh-token replay rejection through atomic session consumption.
- Logout revocation.
- A bearer-token middleware and protected `/api/v1/auth/me` example.
- Audit events without passwords or full tokens.
- Admin-only user creation and self-or-admin user reads.

Public registration creates the `USER` role. To create or promote the first administrator, set the temporary bootstrap variables, build, and run the explicit one-off command:

```bash
npm run build
npm run seed:admin
```

Remove `BOOTSTRAP_ADMIN_PASSWORD` from the environment immediately afterward. The command is idempotent and promotes an existing account when the email already exists; it never runs automatically during API startup.

Generate independent production secrets:

```bash
openssl rand -base64 48
openssl rand -base64 48
```

Do not reuse one value for both token secrets. For browser applications, prefer sending refresh tokens in secure, HTTP-only, same-site cookies rather than exposing them to browser JavaScript. Cookie behavior is application-specific and therefore not forced by this starter.

## Switch the database

To replace Prisma with Drizzle, MongoDB or another database:

1. Implement `IUserRepository` and `IRefreshSessionRepository`.
2. Translate vendor records into the starter's domain types.
3. Construct the implementations in `src/bootstrap/container.ts`.
4. Add a readiness check.
5. Register connection cleanup with `ShutdownRegistry`.
6. Remove Prisma only after no adapter imports it.

Routes, controllers, `UserService` and `AuthService` remain unchanged.

## Switch email providers

Implement `IEmailProvider` for Resend, SES, Gmail API or another vendor. The API queues a provider-neutral `EmailMessage`; the worker performs delivery. Only the worker's email construction needs to change.

Do not put Resend IDs, Nodemailer response objects or Gmail API errors into business services. Convert them into your own result or error at the adapter boundary.

## Switch queue providers

Implement `IQueueProvider` for SQS, RabbitMQ, Google Cloud Tasks or another durable queue. Preserve these behaviors:

- Stable job types and JSON-safe payloads.
- Idempotency keys for actions that must not execute twice.
- Delayed execution when supported.
- Bounded retry with backoff.
- Failed-job retention or a dead-letter destination.
- Graceful consumer shutdown.

Handlers registered in `JobHandlerRegistry` contain application processing and can be reused by another queue runtime.

## Switch storage providers

`S3StorageProvider` works with AWS S3 and S3-compatible platforms such as Cloudflare R2 and MinIO by changing endpoint, region and path-style configuration. For a non-S3 vendor, implement `IStorageProvider`.

Business code stores provider-neutral keys. Database records should keep the key and metadata—not temporary signed download URLs.

## Production environment requirements

When `NODE_ENV=production`, startup fails unless these safe choices are configured:

- `DATABASE_PROVIDER=prisma` with `DATABASE_URL`.
- Unique access and refresh token secrets.
- `QUEUE_PROVIDER=bullmq` with `REDIS_URL`.
- `EMAIL_PROVIDER=smtp` with an SMTP host.
- `STORAGE_PROVIDER=s3` with bucket credentials.
- `METRICS_TOKEN` when metrics are enabled.

This fail-fast behavior prevents a deployment that silently loses users, jobs or files.

## Railway deployment

Create these services from the same repository:

1. PostgreSQL or an external managed PostgreSQL database.
2. Redis.
3. API using `railway.json`.
4. Worker using `railway.worker.json`.

Give the API and worker the same provider configuration. Only the API configuration runs `npm run db:deploy` before a release. The worker starts with `node dist/workers/background.worker.js` and does not expose an HTTP port.

Configure at least:

```text
NODE_ENV=production
DATABASE_PROVIDER=prisma
DATABASE_URL=...
QUEUE_PROVIDER=bullmq
REDIS_URL=...
EMAIL_PROVIDER=smtp
EMAIL_FROM=...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASSWORD=...
STORAGE_PROVIDER=s3
S3_REGION=...
S3_BUCKET=...
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
METRICS_TOKEN=...
```

Use an internal/private Redis URL when the platform provides one. Use a pooled database URL for API traffic when appropriate, while ensuring the migration command uses a connection supported by the selected database platform.

## Adding a new adapter cleanly

1. Start from the application-owned interface.
2. Keep the vendor SDK inside `src/infrastructure/<capability>/`.
3. Validate its environment configuration at startup.
4. Add a readiness check only when the dependency is required for serving traffic.
5. Add shutdown cleanup.
6. Translate vendor errors and results at the boundary.
7. Test the adapter contract and failure behavior.
8. Document its deployment variables.

This structure permits gradual migrations: old and new implementations can both satisfy the same interface while modules move one at a time.
