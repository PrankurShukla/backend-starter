# Beginner Guide: From CRUD to This Starter

This guide is for developers who already know how to build CRUD APIs but are new to layered or production-oriented backend projects.

The project contains more files than a basic Express application because it solves two different problems:

1. **Application code** implements features such as users, products and orders.
2. **Platform code** keeps those features secure, observable and stable in production.

You do not need to understand every platform component before adding your first CRUD feature.

## The five files to learn first

For normal CRUD work, follow this path:

```text
Route → DTO validation → Controller → Service → Repository
```

| Component | Example | What it does |
| --- | --- | --- |
| Route | `src/routes/user.routes.ts` | Defines the HTTP method, URL and middleware. |
| DTO/schema | `src/models/user.dto.ts` | Checks incoming data before business logic runs. |
| Controller | `src/controllers/user.controller.ts` | Reads the HTTP request and sends the HTTP response. |
| Service | `src/services/user.service.ts` | Contains business rules and use cases. |
| Repository | `src/repositories/IUserRepository.ts` | Defines how the service reads and writes data without choosing a database. |

If you are creating a Product CRUD module, start with these files:

```text
src/models/product.dto.ts
src/types/product.ts
src/repositories/IProductRepository.ts
src/repositories/ProductRepository.ts
src/services/product.service.ts
src/controllers/product.controller.ts
src/routes/product.routes.ts
```

Then connect them in `src/bootstrap/container.ts` and `src/app.ts`.

## Follow one request through the code

Consider this request:

```http
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer <admin-access-token>

{
  "email": "user@example.com",
  "firstName": "Example",
  "lastName": "User"
}
```

It moves through the application in this order:

1. `user.routes.ts` matches `POST /api/v1/users`.
2. Authentication verifies the access token and authorization requires the `ADMIN` role.
3. `validate(...)` checks the body using `createUserSchema`.
4. `user.controller.ts` calls `userService.create(...)`.
5. `user.service.ts` checks whether the email already exists.
6. `IUserRepository` describes the required database operations.
7. The configured repository performs those operations in memory or PostgreSQL.
8. The controller calls `res.success(...)` to return the standard response format.
9. If any layer throws an error, the global error handler produces the error response.

The production components around this flow automatically add request IDs, logs, metrics, security headers, rate limiting and error reporting.

## What each application component does

### Routes

Location: `src/routes/`

Routes answer: **Which URL calls which controller?**

Use routes to:

- Choose the HTTP method and URL.
- Apply validation.
- Apply authentication and authorization middleware when your application adds them.
- Call a controller.

Do not put database queries or business rules in routes.

### DTOs and Zod schemas

Location: `src/models/`

DTO means Data Transfer Object. It describes data entering or leaving the application. Zod validates that data at runtime; TypeScript alone cannot validate JSON received over HTTP.

Use DTOs to check:

- Required fields.
- String lengths and formats.
- Numbers and allowed ranges.
- Enum values.
- Query parameters and route parameters.

The inferred TypeScript type keeps validation rules and compile-time types together.

### Controllers

Location: `src/controllers/`

Controllers translate between HTTP and the service layer.

A controller should normally only:

- Read `req.body`, `req.params`, `req.query` or the authenticated user.
- Call one service method.
- Return a success response.
- Forward errors to the error handler.

If a controller contains business decisions or direct database calls, move them into a service or repository.

### Services

Location: `src/services/`

Services contain business rules. This is where most application thinking belongs.

Examples:

- Reject a duplicate email.
- Prevent an order from being paid twice.
- Check whether a user can cancel a booking.
- Calculate a fee or discount.
- Coordinate a repository and an email provider.

Services do not depend on Express request or response objects. That makes them easy to test and reuse from HTTP routes, workers or command-line scripts.

### Repository interfaces

Location: `src/repositories/`

A repository hides database technology from business logic.

`IUserRepository` says what the user service needs: find by ID, find by email and create. It does not say whether the data comes from PostgreSQL, MongoDB or memory.

This is useful because:

- Services can be tested with a small fake repository.
- Prisma can be replaced without rewriting controllers and business rules.
- Database-specific code stays in one layer.

`InMemoryUserRepository` is only a development adapter. It loses all data when the process restarts. Production configuration requires the included Prisma/PostgreSQL implementation (or another persistent implementation of the same repository contracts).

### Domain types

Location: `src/types/`

Domain types represent application concepts such as `User`, `Product` or `Order`.

Keep them independent of Express, Prisma and external vendors. A domain `User` should not become a Prisma-generated type just because Prisma is the current database tool.

### Errors

Location: `src/errors/`

Throw an `AppError` subtype for an expected failure, such as not found, conflict or invalid input. The global error handler converts it into the standard API response.

Do not return error responses independently from every service. Throw the error and let one global component format it consistently.

### Dependency container

Location: `src/bootstrap/container.ts`

The container is the application's assembly point. It creates concrete objects and connects them:

```text
Repository instance → Service instance → Route/controller
```

For a Product module, it would conceptually contain:

```ts
const productRepository = new ProductRepository(database);
const productService = new ProductService(productRepository);
```

The service depends on an interface, while the container decides which implementation to supply. This is dependency injection without requiring a dependency-injection framework.

### Application factory

Location: `src/app.ts`

`createApp()` constructs the Express application. It registers global middleware and routes in the correct order.

You usually edit this file only when registering a new top-level route or application-wide middleware. Do not place feature logic here.

### Process entry and server lifecycle

Locations: `src/index.ts` and `src/server.ts`

- `index.ts` starts telemetry before loading the HTTP server.
- `server.ts` starts listening and handles shutdown signals and fatal errors.

Most CRUD work never changes these files.

## What the production components do

These components mostly work automatically. Learn them when configuring deployment or integrating an external service.

| Component | Location | Why it exists | When you use it directly |
| --- | --- | --- | --- |
| Environment config | `src/config/environment.ts` | Validates configuration at startup so deployment fails clearly instead of later. | When adding a new environment variable. |
| Logger | `src/config/logger.ts` | Produces searchable structured JSON logs and redacts secrets. | When recording useful business or diagnostic context. |
| Request context | `src/middlewares/requestContext.ts` | Gives every request an ID that follows its logs and errors. | Usually automatic. |
| API response helper | `src/middlewares/apiResponse.ts` | Keeps every successful response in one predictable format. | Controllers call `res.success(...)`. |
| Error handler | `src/middlewares/errorHandler.ts` | Converts all failures into safe, consistent responses and reports server errors. | Usually automatic. |
| Validation middleware | `src/middlewares/validate.ts` | Runs Zod schemas before controllers. | Add it to new routes. |
| Security middleware | `src/app.ts`, `src/middlewares/rateLimiter.ts` | Adds secure headers, CORS, parameter protection, body limits and rate limiting. | Configure it when application requirements change. |
| Error monitor | `src/observability/error-monitoring/` | Sends unexpected production errors to a provider such as Sentry. | Supply `SENTRY_DSN`; application logic uses the interface only for special cases. |
| Metrics | `src/observability/metrics/` | Measures request count, duration, failures and runtime health. | Configure Prometheus or another collector. |
| Tracing | `src/observability/tracing.ts` | Follows work across API calls and services to locate latency and failures. | Supply an OTLP endpoint. |
| Audit logger | `src/audit/` | Records security- or business-sensitive actions such as user creation. | Call it after important actions succeed or fail. |
| Health checks | `src/providers/health/`, `src/services/health.service.ts` | Tells Railway/Kubernetes whether the process is alive and its dependencies are ready. | Add a check for the database, Redis or another required dependency. |
| Resilience utilities | `src/resilience/` | Adds safe timeouts, retries and circuit breaking to outbound calls. | When calling another API. |
| Shutdown registry | `src/shutdown/` | Stops accepting traffic and closes resources cleanly during deployment. | Register databases, queues or consumers that require cleanup. |
| Provider interfaces | `src/providers/` | Keeps email, storage, queues and auth replaceable. | Implement an interface when selecting a real vendor. |

## Files you can initially ignore

While learning or building a local CRUD module, it is safe to treat these as infrastructure:

```text
src/observability/
src/resilience/
src/shutdown/
src/server.ts
src/index.ts
.github/
Dockerfile
railway.json
```

Do not delete them; they provide production behavior. You simply do not need to edit them for ordinary CRUD features.

## Add a CRUD module step by step

Use this order for a new `Product` module.

### 1. Define the product

Create `src/types/product.ts`:

```ts
export interface Product {
  id: string;
  name: string;
  price: number;
  createdAt: Date;
}
```

### 2. Validate incoming data

Create `src/models/product.dto.ts`:

```ts
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(200),
  price: z.number().nonnegative(),
});

export const productIdSchema = z.object({
  id: z.string().uuid(),
});

export type CreateProductDto = z.infer<typeof createProductSchema>;
```

### 3. Define database operations

Create `src/repositories/IProductRepository.ts`:

```ts
import type { CreateProductDto } from '../models/product.dto';
import type { Product } from '../types/product';

export interface IProductRepository {
  create(input: CreateProductDto): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  list(): Promise<Product[]>;
  update(id: string, input: Partial<CreateProductDto>): Promise<Product | null>;
  delete(id: string): Promise<boolean>;
}
```

Implement that interface with your selected database. Keep Prisma, Drizzle or MongoDB imports inside the implementation.

### 4. Add business rules

Create `src/services/product.service.ts`. The service receives `IProductRepository` in its constructor and implements create, list, get, update and delete use cases. Throw `NotFoundError` when the requested product does not exist.

### 5. Add HTTP translation

Create `src/controllers/product.controller.ts`. Each handler reads request data, calls the service and returns `res.success(...)`.

### 6. Connect URLs

Create `src/routes/product.routes.ts` and apply `validate(...)` before controller handlers.

### 7. Construct and register it

Create the repository and service in `src/bootstrap/container.ts`. Register the route in `src/app.ts`, or use the `registerRoutes` extension supported by `createApp()`.

### 8. Test it

At minimum, test:

- Invalid input returns `400`.
- Create returns `201`.
- Get returns the correct product.
- Missing product returns `404`.
- Update changes only allowed fields.
- Delete removes the product.
- Authorization boundaries once authentication is added.

Run:

```bash
npm run quality
```

## How to add common integrations

### Add PostgreSQL or another database

1. Install the database client or ORM.
2. Create a concrete repository that implements the existing repository interface.
3. Instantiate it in `src/bootstrap/container.ts`.
4. Add a readiness check for database connectivity.
5. Register the database disconnect function with `ShutdownRegistry`.
6. Add migrations, indexes, backups and connection-pool configuration.

Do not import the ORM directly into controllers or services.

### Add email

1. Implement `IEmailProvider` with SMTP, Resend, SES or another provider.
2. Inject it into the service that needs email.
3. For important slow emails, enqueue a job instead of blocking the request.
4. Keep vendor responses and errors inside the provider adapter.

### Add file storage

Implement `IStorageProvider` for Cloudinary, S3, Supabase Storage or another provider. Services should work with your own storage contract rather than vendor-specific result types.

### Add a queue or worker

Implement `IQueueProvider`, enqueue slow work from the service and run consumers as separate processes. Examples include email, report generation, image processing and external synchronization.

### Call an external HTTP API

Use `resilientFetch` so the request has a timeout and appropriate retry behavior. Automatic retries are deliberately limited for unsafe methods unless an idempotency key is present.

## Local development versus production

| Concern | Local development | Production requirement |
| --- | --- | --- |
| User data | In-memory example is acceptable. | Use a persistent database repository. |
| Error monitoring | Can remain disabled. | Configure Sentry or another `IErrorMonitor`. |
| Metrics/tracing | Can remain disabled. | Connect them to monitoring and alerting systems if required. |
| Secrets | Local `.env`, never committed. | Use the hosting platform's secret manager. |
| Authentication | May be absent during a spike. | Add authentication and authorization before exposing protected data. |
| Logs | Read from the terminal. | Send stdout JSON logs to a searchable log destination. |
| Backups | Usually not applicable. | Define backup, retention and restore testing. |

The starter supplies the reusable infrastructure, but it cannot decide your application's users, roles, permissions, data-retention rules or backup policy.

## Rules that keep the code easy to maintain

1. Routes define endpoints; they do not contain business logic.
2. Controllers handle HTTP; they do not query the database.
3. Services contain business rules; they do not import Express or vendor SDKs.
4. Repositories contain persistence logic; they do not format HTTP responses.
5. Provider adapters contain vendor-specific code.
6. Expected failures use typed application errors.
7. Validate all external input at the boundary.
8. Add tests for behavior, not private implementation details.
9. Do not log passwords, tokens, document contents or unnecessary personal data.
10. Run `npm run quality` before committing.

## Recommended learning order

Read and experiment in this order:

1. `src/models/user.dto.ts`
2. `src/routes/user.routes.ts`
3. `src/controllers/user.controller.ts`
4. `src/services/user.service.ts`
5. `src/repositories/IUserRepository.ts`
6. `src/repositories/InMemoryUserRepository.ts`
7. `src/bootstrap/container.ts`
8. `src/app.ts`
9. `src/middlewares/errorHandler.ts`
10. The production components only when you need to configure them.

Start by copying the user module into a small Product module. Once that request flow feels natural, the rest of the repository becomes much easier to understand.
