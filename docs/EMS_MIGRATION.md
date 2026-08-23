# EMS Migration Strategy

Do not rewrite EMS in one release. Prove the starter with a small independent application, then migrate EMS capability by capability behind stable interfaces.

## Recommended order

1. **Operational foundation:** response envelopes, request IDs, logging, error monitoring, metrics and graceful shutdown.
2. **Provider adapters:** email, storage and queue contracts while retaining the currently working vendors.
3. **Authentication boundary:** token and password contracts without changing tenant authorization behavior.
4. **Database ownership:** introduce repositories around existing Prisma queries one module at a time.
5. **Background processing:** move email and long-running operations to stable job contracts.
6. **Business modules:** users, classes, attendance, fees and notifications individually.

## Module migration pattern

For each EMS module:

1. Capture current endpoint behavior with integration tests.
2. Define domain types, DTOs and repository/provider interfaces.
3. Wrap existing Prisma or vendor code in an adapter.
4. Move business decisions into a service.
5. Keep the existing endpoint contract while changing internals.
6. Compare old and new behavior in staging.
7. Release one module and observe errors, latency and job failures.
8. Remove legacy code only after the new path is proven.

## Tenant safety

Every tenant-owned repository method must receive tenant context explicitly or be created in a tenant-scoped context. Never rely on a controller remembering to append `tenantId` to an unrestricted query.

During migration, add tests proving that a user from tenant A cannot read, update or delete tenant B data. Session year and school scope are business rules and belong in EMS services/repositories, not in this generic starter.

## Definition of done for each migrated module

- Existing functional behavior is covered by tests.
- Authorization and tenant isolation are tested.
- Queries are bounded, paginated and indexed.
- Slow side effects use durable jobs.
- Logs and metrics contain useful context without personal data.
- Provider failures are retried only when safe.
- Deployment and rollback steps are documented.
- No old and new code paths write the same record without an explicit consistency strategy.
