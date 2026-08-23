# Adding a Module

Use the same sequence for every business feature.

## 1. Define the DTO

Create `src/models/order.dto.ts` with both a Zod schema and its inferred TypeScript type.

## 2. Define the business type

Create `src/types/order.ts`. Do not import Express, Prisma or an external SDK here.

## 3. Define the repository interface

Create `src/repositories/IOrderRepository.ts`. Services depend on this interface rather than a database client.

## 4. Implement the repository

Place the selected database implementation under `src/repositories/implementations/` or a provider-specific directory. Only this implementation should import Prisma, Drizzle or another database SDK.

## 5. Write the service

Create `src/services/order.service.ts` and keep the business rules there. Throw typed `AppError` subclasses for expected failures.

## 6. Add the controller and route

The controller should translate HTTP input and output only. Apply DTO validation in the route before calling the controller.

## 7. Register dependencies

Construct the repository and service in `src/bootstrap/container.ts`, then register the route through `createApp`.

## 8. Test behavior

Test DTO rejection, successful behavior, conflicts, missing resources and authorization boundaries. Prefer testing through the HTTP endpoint for integration coverage and testing the service separately for complex business rules.

## Dependency rule

Keep dependencies pointing inward:

```text
Controller → Service → Repository interface
                         ↑
                  Vendor implementation
```

Services must not import Express request objects, Prisma models, BullMQ jobs, Cloudinary responses or provider-specific errors.
