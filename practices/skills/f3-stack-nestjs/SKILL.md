---
id: f3-stack-nestjs
kind: skill
name: f3-stack-nestjs
description: "NestJS know-how of the project: where NestJS may appear, Nest modules as the composition root, controllers as entry points, validation pipes, error translation, configuration, lifecycle, persistence adapters and the tests of the application. Load before writing, changing or reviewing a Nest module, a controller, a provider, a pipe, a guard, a filter, an interceptor, a DTO or the bootstrap of a NestJS application."
version: 1.0.0
status: stable
summary: NestJS kept in the application, with Nest modules as the composition root, controllers as entry points, validation, error translation, configuration, persistence adapters, tests, and a security reference.
applies-when:
  languages: [typescript]
  frameworks: [nestjs]
loaded-by: [architect, developer]
---

# NestJS in this project

This skill says how NestJS is used within the architecture of `AGENTS.md`. The rules of `AGENTS.md` win over it: the invariant part, the Adopted practices section and the Stack section, which gives the versions, the HTTP platform (Express or Fastify), the ORM, the test runner and the layout of the folders. Security is in `references/security.md`: read it before touching authentication, authorization, the bootstrap or an endpoint open to the outside.

## Where NestJS may appear

| Module | NestJS |
|---|---|
| Core module, shared kernel, orchestration module | never: no `@nestjs/*`, no decorator, no class-validator, no class-transformer, no `HttpException` (rule 1) |
| Adapter module, technical library | no `@nestjs/*` either: plain classes that receive their technical objects (a `DataSource`, a client) through their constructor. ORM decorators (`@Entity`) are allowed: they belong to the technology of the adapter |
| Application | everything: Nest modules, controllers, DTOs, pipes, guards, filters, interceptors, bootstrap |

Reason: an adapter stays testable against its technology without starting Nest, and only the composition root instantiates adapters and use cases (rule 11).

## Nest modules are the composition root

- One Nest module per bounded context in the application, with its controllers and the providers of its use cases and adapters. A module per technical layer (all controllers, all services) is forbidden.
- A port is an interface: its injection token is a `Symbol` declared in the application, next to the Nest module of its bounded context. A use case is a class: the class itself is its token.
- Every use case and every adapter is a `useFactory` provider with `inject`. No `@Injectable()` on them, no `@Inject()` in a core.
- A technology (database, cache, message broker, HTTP client of a neighbour) has one Nest module of the application that provides its technical objects and closes them at shutdown. The modules of the bounded contexts import it.
- A Nest module exports only its use cases. The Nest module of the orchestration imports the modules of the bounded contexts it needs. A bounded context module never imports another bounded context module (rule 6).
- `forwardRef()` is forbidden: a cycle between Nest modules shows a boundary in the wrong place. Report it.
- `ModuleRef.get()` and `ModuleRef.resolve()` are forbidden outside the bootstrap: they hide dependencies (service locator).
- Providers are singletons. `Scope.REQUEST` and `Scope.TRANSIENT` need a decision in `arch/decisions.md`: a request-scoped provider makes every provider that depends on it request-scoped. The data of a request (current account, correlation id) goes to the use case as part of its input.
- `@Global()` only for the configuration and the logger.
- Import the classes of the use cases as values, never with `import type`: Nest resolves a constructor parameter by its emitted type, which a type-only import erases.

The folders follow the Stack section; the shape is this one, with one Nest module per bounded context:

```
apps/api/src/
├── main.ts                        NestFactory.create, then configureApp
├── configure-app.ts               configureApp(app)
├── app.module.ts                  imports the modules below, nothing else
├── config/                        config.module.ts, the configuration schema
├── platform/<technology>.module.ts    one Nest module per technology: PostgresModule…
├── <bounded-context>/
│   ├── <bounded-context>.module.ts    the Nest module of the bounded context: its use cases, adapters, controllers
│   ├── tokens.ts                  the Symbol tokens of its ports
│   └── endpoints/                 its controllers, DTOs and error translation
├── orchestration/orchestration.module.ts   once a workflow needs it
└── test-mode/test-mode.module.ts  imported only in test mode
```

Creating a bounded context creates its Nest module and adds it to `AppModule`, in the same task.

```ts
// apps/api/src/app.module.ts
@Module({})
export class AppModule {
  static register(options: { mode: 'production' | 'test' }): DynamicModule {
    return {
      module: AppModule,
      imports: [
        ConfigModule,
        BillingModule,
        OrderingModule,
        OrchestrationModule,
        ...(options.mode === 'test' ? [TestModeModule] : []),
      ],
    };
  }
}
```

```ts
// apps/api/src/billing/billing.module.ts
import { IssueInvoice, type Invoices } from '@app/billing-core';
import { SqlInvoices } from '@app/billing-adapters-postgres';
import { INVOICES } from './tokens'; // export const INVOICES = Symbol('Invoices');

@Module({
  imports: [PostgresModule],
  controllers: [InvoicesController],
  providers: [
    { provide: INVOICES, useFactory: (db: DataSource) => new SqlInvoices(db), inject: [DataSource] },
    { provide: IssueInvoice, useFactory: (invoices: Invoices) => new IssueInvoice(invoices), inject: [INVOICES] },
  ],
  exports: [IssueInvoice],
})
export class BillingModule {}
```

## Controllers are entry points

A handler does three things, in this order (rule 10): it translates its DTO into domain types, calls exactly one use case received through the constructor of the controller, and translates the result or the error into its response.

```ts
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly issueInvoice: IssueInvoice) {}

  @Post(':invoiceId/issue')
  @HttpCode(200)
  async issue(@Param('invoiceId') invoiceId: string): Promise<InvoiceResponse> {
    try {
      const invoice = await this.issueInvoice.execute(InvoiceId.from(invoiceId));
      return toInvoiceResponse(invoice);
    } catch (error) {
      throw billingProblem(error); // a domain error becomes a problem response; anything else is rethrown
    }
  }
}
```

- No business condition in a controller, guard, pipe or interceptor (rule 9).
- A response is a plain object built by a mapping function of the application, never a domain object. `ClassSerializerInterceptor` and `@Exclude()` are not used: a domain object carries no decorator, and an explicit mapping does not leak a new field.
- Path and query parameters carry domain identities, never database keys (rule 12).
- Set the status code explicitly with `@HttpCode` when it is not `201` for a `POST`.
- When the project publishes an OpenAPI contract, the DTOs and the routes follow `contract/openapi.yaml`, as the `f3-stack-openapi` skill says. `@nestjs/swagger` never produces the published contract.

## Validation of input

The bootstrap installs one global `ValidationPipe`:

```ts
new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
```

- No `enableImplicitConversion`: it turns the string `"false"` into `true`. A query or path parameter that is not a string carries `@Type(() => Number)` (or `Boolean`, `Date`) explicitly, or goes through a built-in pipe (`ParseIntPipe`, `ParseUUIDPipe`).
- A DTO is a class of the application with class-validator decorators. Every string has `@MaxLength`, every array `@ArrayMaxSize`, every nested object or array of objects `@ValidateNested()` with `@Type(() => …)`, every optional field `@IsOptional()`.
- The pipe checks the shape of the input; the business validity belongs to the value objects (rule 4). A value object that refuses a value raises a domain error, which the handler translates into a `400` or `422` response.
- The body size is limited in the bootstrap (`app.useBodyParser('json', { limit: '100kb' })`, or the option of the Stack section).

## Errors

- A core and an adapter never throw an `HttpException`. They raise their own errors, or return the result type of the shared kernel when the project has one.
- The handler translates the errors of its use case (rule 10), with one translation function per bounded context in the application (`billingProblem` above). It maps each domain error to a status and a problem document (RFC 9457, `application/problem+json`).
- One global catch-all filter, registered in the bootstrap, turns an `HttpException` into a problem document with its status, and any other exception into a `500` with a generic title. It logs the stack, never sends it, and never echoes the message of an unknown error.
- Every promise is awaited or returned: `@typescript-eslint/no-floating-promises` is on. Work done after the response goes through a queue or an event adapter, never through an unawaited call.

## The bootstrap

One function, `configureApp(app)`, in the application, installs everything global: the validation pipe, the catch-all filter, the global guards, the security headers, CORS, the body limit and the shutdown hooks. `main.ts` and the integration tests both call it, so a test runs what production runs.

- `NestFactory.create(AppModule, { bufferLogs: true })`, then the logger of the Stack section.
- `app.enableShutdownHooks()`. The Nest module of each technology closes what it opened in `onApplicationShutdown` (pool, connection, consumer), so a stop finishes the requests in progress.
- Long work never runs in a constructor: use `onModuleInit`, or a factory provider that returns a promise.
- The test mode of the end-to-end tests (`e2e-practice` skill) is a Nest module, imported only when the application starts in test mode (`AppModule.register({ mode })`). It holds the test entry points, such as `POST /__test/reset`.

## Configuration

- `@nestjs/config` loads the configuration once and validates it at startup with a schema (the library of the Stack section). A missing or invalid value stops the start.
- `process.env` is read only in the configuration file. `ConfigService` is read only in the composition root: an adapter receives values (a URL, a timeout), never `ConfigService`.
- No secret has a default value. `.env` is never committed; `.env.example` lists the keys without values.

## Logging

- Structured logs (JSON in production) through the logger of the Stack section, with a correlation id per request.
- A core never logs (rule 1): the application logs at its edges (entry points, interceptors, the catch-all filter), and an adapter logs its technical failures.
- Never log a body, a token, a password, a cookie or the `Authorization` header. The logger redacts them.

## Persistence

When the Stack section names an ORM:

- The persistence model (TypeORM `@Entity`, MikroORM entity, Prisma model) lives in the adapter module. The adapter maps it to and from the domain entity. A domain entity is never an ORM entity.
- The adapter receives the `DataSource` (or the client) from the composition root. `TypeOrmModule.forFeature` and `@InjectRepository` are not used in an adapter.
- Schema changes go through migrations, in test mode too. `synchronize: true` is forbidden.
- Queries are parameterized. A string built from input never reaches SQL.
- A list loads its relations in the same query (no query per row) and is paginated with a maximum page size.
- Transactions belong to the technical library of the database (rule 8). How a use case spanning several aggregates runs in one transaction is decided in `arch/decisions.md`.

## Tests

Placement and suffix follow rule 13 and the Stack section.

- Core, shared kernel, orchestration: plain tests, without `@nestjs/testing`.
- Adapters: against their technology (a real database in a container, for example), without Nest.
- Application: integration tests with `Test.createTestingModule({ imports: [AppModule] })`, then `configureApp(app)` and `await app.init()`. Ports are replaced with `overrideProvider(INVOICES).useValue(fakeInvoices)`. To test a controller alone, replace its use case. They check the routes, the validation (`400`), the translation of each domain error, the guards (`401`, `403`) and the shape of the responses. Requests go through `supertest`, or `app.inject` on Fastify.
- With Vitest, decorator metadata needs the SWC plugin (`unplugin-swc`): esbuild does not emit it, and dependency injection then fails.
- End-to-end tests follow the `e2e-practice` skill: they start the built application in test mode and import nothing from it (rule 14).

## Anti-patterns

- `@Injectable()`, `@Inject()` or `HttpException` in a core module.
- A "service" class in the application that holds business conditions next to the controller.
- Returning an entity, or an ORM row, from a handler.
- A Nest module that imports the module of another bounded context to reach its providers.
- `forwardRef`, `ModuleRef.get` in business code, request-scoped providers without a decision.
- `enableImplicitConversion`, a DTO without length limits, `synchronize: true`.
- A test that builds the application without `configureApp`.

## Checklist before a commit

- [ ] No `@nestjs/*`, decorator or `HttpException` outside the application (except ORM decorators in an adapter).
- [ ] Each handler: DTO to domain types, one use case, explicit mapping of the result and of each domain error.
- [ ] New use cases and adapters declared as `useFactory` providers of the module of their bounded context.
- [ ] Every new DTO field validated, with limits on strings and arrays.
- [ ] Integration tests for the new routes: success, validation, each domain error, access refused.
- [ ] `references/security.md` checklist done if the change touches authentication, authorization or an open endpoint.
