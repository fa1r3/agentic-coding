# Security of a NestJS application

The Transport security subsection of the Stack section wins: it says how exposed the application is (`none`, `private`, `public`), how it is authenticated and what sits in front of it. This reference says how to do it with NestJS. The checks below are those of the application. Business permissions (may this account read this invoice?) are decisions of the domain (rule 2), never of a guard.

## Bootstrap

In `configureApp(app)`:

- Security headers: `helmet` on Express (`app.use(helmet())`), `@fastify/helmet` on Fastify (`app.register(helmet)`). An API that serves only JSON keeps the default Content-Security-Policy. An application that renders HTML sets its own, without `'unsafe-inline'` for scripts.
- CORS: off by default. When a browser on another origin calls the API, `app.enableCors({ origin: [<the origins listed in the configuration>], credentials })`. Never `origin: true` or `'*'` with credentials.
- Listening address: the `HOST` of the configuration, `127.0.0.1` by default.
- Behind a reverse proxy: trust only the proxy (`app.set('trust proxy', <address>)` on Express, `trustProxy` of `FastifyAdapter` on Fastify). Otherwise `request.ip` is the proxy, or a value the client chose.
- Body size limited (main skill, Validation of input).

## Authentication

- One global guard, `{ provide: APP_GUARD, useClass: AuthenticationGuard }`: every route requires an authenticated caller, unless it carries `@Public()`. Deny by default.
- A token is verified with its algorithm pinned, its issuer, its audience and its expiry:

```ts
const claims = await this.jwt.verifyAsync<Claims>(token, {
  algorithms: ['HS256'],          // or the asymmetric algorithm of the Stack section
  issuer: this.issuer,
  audience: this.audience,
});
request.principal = { accountId: claims.sub, roles: claims.roles ?? [] };
```

- The payload carries the domain identity of the account (`sub`) and its roles, nothing else: no email, no personal data. Access tokens last minutes (15 by default), not days.
- The signing key comes from the validated configuration: at least 32 random bytes for HMAC, and a missing key stops the start. It is never logged, and never committed.
- Refresh tokens: 32 random bytes (`randomBytes(32)`), stored as a SHA-256 hash with their account and expiry, used once (each use issues a new one and revokes the old one), all revoked on logout and on password change. Reusing a revoked token revokes the whole family.
- Passwords are hashed with argon2id (or bcrypt) by an adapter behind a port of the core. They are never compared or stored in clear.
- Whether the account still exists and is active is a business question: the use case answers it from `accountId`, not the guard.
- Cookies, when the Stack section uses them: `HttpOnly`, `Secure` outside test mode, `SameSite=Lax` or `Strict`, and a CSRF token on every state-changing request.

## Authorization by role

The role guard runs after the authentication guard and denies when anything is missing:

```ts
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES, [context.getHandler(), context.getClass()]);
    if (!required?.length) return true;
    const principal = context.switchToHttp().getRequest().principal;
    return !!principal && required.some((role) => principal.roles.includes(role));
  }
}
```

- `@Public()` and `@Roles()` are never combined on a route, even through its class: put a public route in a controller without roles.
- Roles answer "which kind of caller may call this route". Ownership and permissions on a business object are checked by the use case.

## Rate limiting

With `@nestjs/throttler` (milliseconds for `ttl`), registered as a global guard:

```ts
ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }])
// on the routes that receive a secret or send a message
@Throttle({ default: { ttl: 60_000, limit: 5 } })
```

- Login, password reset, account creation and every route that sends an email or a message have a strict limit.
- Several instances share the counters through a shared storage (Redis); the default storage is in memory, per instance.
- A login is limited per address and per account identifier: the per-account limit, or the lock after failures, is a rule of the use case.
- To limit per account instead of per address, override `getTracker(request)` and return the `accountId` of the principal when there is one.

## Input and output

- Validation as in the main skill. Never `@Body() body: any`.
- Queries are parameterized. No `eval`, no `new Function`, no `child_process` with a string built from input.
- A file upload has a maximum size and a type checked from its content. It is stored by an adapter under a name that the application generates, and found again by its domain identity (rule 12).
- Output is encoded where it is rendered: JSON through the response mapping, HTML by the escaping template engine. Input is not "sanitized for XSS" before storage: that corrupts the data and protects nothing the rendering does not already protect.
- Error responses carry no stack, SQL, path or library message (main skill, Errors).

## Checklist

- [ ] The new route is public on purpose (`@Public()`), or protected by default and, if needed, by `@Roles()`.
- [ ] Business permissions checked by the use case, with a test for the refused case.
- [ ] Tokens verified with pinned algorithm, issuer, audience and expiry; no personal data in a payload.
- [ ] Routes that receive a secret or send a message have a strict throttle.
- [ ] No secret, token or password in the code, the logs or an error response.
- [ ] CORS, trusted proxy and listening address match the Transport security subsection.
