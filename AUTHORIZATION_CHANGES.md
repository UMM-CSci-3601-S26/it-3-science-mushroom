# Security, Authentication, Routing, Bootstrap, and User Management Changes

This document summarizes the authorization work merged in PR #61, `begin-implementing-authorization`. It is meant to help future contributors understand why the server startup changed, how routes are registered now, how authentication is enforced, and how the new user management pieces fit together.

## Table of Contents

- [Big Picture](#big-picture)
- [Server Startup and Database Configuration](#server-startup-and-database-configuration)
- [Server Route Registration](#server-route-registration)
- [Server Authentication and Authorization](#server-authentication-and-authorization)
- [Angular Authentication Changes](#angular-authentication-changes)
- [Angular Route Changes](#angular-route-changes)
- [User Management](#user-management)
- [Seed Data](#seed-data)
- [Family Portal and Guardian Flow](#family-portal-and-guardian-flow)
- [Family Delete Requests](#family-delete-requests)
- [How to Add a New Secured Server Route](#how-to-add-a-new-secured-server-route)
- [How to Protect a New Angular Route](#how-to-protect-a-new-angular-route)
- [Testing Added or Updated](#testing-added-or-updated)
- [Important Security Notes](#important-security-notes)

## Big Picture

The app moved from mostly open controller routes to a role- and permission-aware system.

The main changes are:

- Added JWT-based authentication with an HttpOnly `auth_token` cookie.
- Added server-side role and permission enforcement.
- Added Angular route guards and an auth interceptor.
- Replaced manual controller route wiring with annotation-based route registration.
- Split server startup into `Bootstrap.java` and database connection setup into `DatabaseConfig.java`.
- Removed the old `Server.java` lifecycle class and the old `Controller.java` interface.
- Added admin-facing user and volunteer job-role management.
- Added database seed files for users and permissions.

## Server Startup and Database Configuration

### `Main.java`

`server/src/main/java/umm3601/Main.java` is now intentionally small. It only delegates to:

```java
Bootstrap.start();
```

This keeps the entry point separate from application wiring.

### `Bootstrap.java`

`server/src/main/java/umm3601/Bootstrap.java` now owns server startup.

Its responsibilities are:

- Read required environment variables, especially `JWT_SECRET`.
- Connect to Mongo using `DatabaseConfig`.
- Create shared services such as `UsersService` and `PermissionsService`.
- Create `AuthMiddleware`.
- Create the Javalin app.
- Register global exception handling.
- Add `/api/health`.
- Add auth middleware as a Javalin `before` handler.
- Build all controller instances.
- Register controller routes through `RouteRegistrar`.
- Start the app on `PORT`, defaulting to `4567`.

This replaced the old `Server.java`, which previously mixed database lifecycle, Javalin setup, shutdown hooks, and manual controller route setup.

### `DatabaseConfig.java`

`server/src/main/java/umm3601/DatabaseConfig.java` now holds database connection setup.

The old `Server.configureDatabase(...)` behavior was moved here so the server lifecycle class no longer owns database configuration. `DatabaseConfig.configureDatabase(String host)` normalizes the Mongo host string and creates a `MongoClient`.

### Removed `Server.java`

`server/src/main/java/umm3601/Server.java` was deleted.

The old `Server` class used to:

- Hold the `MongoClient`.
- Configure Javalin.
- Register controller routes.
- Manage shutdown behavior.
- Start the app.

Those responsibilities are now handled by `Bootstrap.java`, `DatabaseConfig.java`, `ApiExceptionHandler.java`, `AuthMiddleware.java`, and `RouteRegistrar.java`.

### Removed `Controller.java`

`server/src/main/java/umm3601/Controller.java` was deleted.

Controllers no longer implement an `addRoutes(Javalin server)` method. Instead, each route handler method is annotated with route metadata, and `RouteRegistrar` discovers those methods with reflection.

## Server Route Registration

Route registration is now annotation-based.

### `@Route`

Defined in `server/src/main/java/umm3601/Auth/Route.java`.

Each endpoint method declares its path and HTTP method:

```java
@Route(path = "/api/users", method = HttpMethod.GET)
public void getUsers(Context ctx) {
  ...
}
```

### `HttpMethod`

Defined in `server/src/main/java/umm3601/Auth/HttpMethod.java`.

This enum gives route annotations a type-safe way to say `GET`, `POST`, `PUT`, `DELETE`, or `PATCH`.

### `RouteRegistrar`

Defined in `server/src/main/java/umm3601/Auth/RouteRegistrar.java`.

`RouteRegistrar.register(app, controller, permissionsService)` scans each controller for methods with `@Route`, wraps each method in a `SecuredHandler`, and registers the method with Javalin.

It also sorts routes by specificity so more specific routes are registered before more dynamic routes. This matters for routes where static and parameterized paths could otherwise conflict.

### `SecuredHandler`

Defined in `server/src/main/java/umm3601/Auth/SecuredHandler.java`.

`SecuredHandler` wraps a route method and checks for authorization annotations before invoking the controller method.

It enforces:

- `@RequireRole(...)`
- `@RequirePermission(...)`

This lets controller methods stay focused on request handling while security rules remain close to the route declaration.

## Server Authentication and Authorization

### Roles

Defined in `server/src/main/java/umm3601/Auth/Role.java`.

The system roles are:

- `GUARDIAN`
- `VOLUNTEER`
- `ADMIN`

The roles have a hierarchy using `Role.atLeast(...)`:

- `ADMIN` is highest.
- `VOLUNTEER` is above `GUARDIAN`.
- `GUARDIAN` is lowest.

### Login, Signup, Logout, and Current User

Handled by `server/src/main/java/umm3601/Auth/AuthController.java`.

Important auth endpoints:

- `POST /api/auth/login`
- `POST /api/auth/signup`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/auth/permissions`

Admin-only auth management endpoints:

- `GET /api/auth/permissions/all`
- `GET /api/auth/job-roles`
- `PUT /api/auth/job-roles/{jobRole}`
- `DELETE /api/auth/job-roles/{jobRole}`
- `PUT /api/auth/users/{username}/job-role`

Login and signup return an access profile and set an HttpOnly cookie named `auth_token`.

### JWT and Password Utilities

The auth package includes:

- `JwtUtils.java` for creating and parsing JWTs.
- `PasswordUtils.java` for hashing and checking passwords.
- `AuthValidator.java` for validating auth request bodies.
- `AuthService.java` for login, signup, session creation, access profile building, and volunteer job-role assignment.

The token is not stored in browser-accessible JavaScript state. It is stored in an HttpOnly cookie to reduce token theft risk from XSS.

### `AuthMiddleware`

Defined in `server/src/main/java/umm3601/Middleware/AuthMiddleware.java`.

`AuthMiddleware` runs before protected requests and:

- Skips public routes like `/`, `/public`, `/api/health`, `/api/auth/login`, `/api/auth/signup`, and `/api/auth/logout`.
- Reads the JWT from the `auth_token` cookie.
- Falls back to an `Authorization: Bearer <token>` header for non-browser clients.
- Validates the token.
- Looks up the user in the database.
- Stores request attributes such as `userId`, `systemRole`, `jobRole`, `username`, `fullName`, and `email`.

Those attributes are later used by route authorization and policy code.

### `@RequireRole`

Defined in `server/src/main/java/umm3601/Auth/RequireRole.java`.

Use this when an endpoint should be restricted by system role:

```java
@RequireRole(Role.ADMIN)
```

Admins can access admin routes. Volunteers and guardians are blocked when they do not meet the required role level.

### `@RequirePermission`

Defined in `server/src/main/java/umm3601/Auth/RequirePermission.java`.

Use this when an endpoint should be controlled by a permission string:

```java
@RequirePermission("view_inventory")
```

Permission checks work differently by system role:

- `ADMIN` bypasses permission checks.
- `GUARDIAN` can only access `family_portal_access`.
- `VOLUNTEER` gets effective permissions from their assigned volunteer job role.

### `PermissionsService`

Defined in `server/src/main/java/umm3601/Auth/PermissionsService.java`.

This service stores volunteer job-role permissions in MongoDB in the `permissions` collection. It manages:

- Loading the permission document.
- Creating baseline permissions if missing.
- Resolving inherited permissions.
- Updating job roles.
- Deleting job roles.
- Validating inheritance rules.
- Building a permission catalog for the admin UI.

The baseline role is `volunteer_base`. Volunteer users default to this job role if no other job role is assigned.

### `RolePermissions` and `RoleConfig`

`RolePermissions.java` models the whole permissions document.

`RoleConfig.java` models one volunteer job role:

- `permissions`: direct permissions assigned to the role.
- `inherits`: parent job roles whose permissions should also apply.

Only volunteer job roles live in this permission configuration. `ADMIN`, `VOLUNTEER`, and `GUARDIAN` are system roles.

### `AuthContext`

Defined in `server/src/main/java/umm3601/Common/AuthContext.java`.

`AuthContext.from(ctx)` creates a small object containing the authenticated `userId` and system `role`. This gives policy code a cleaner way to read auth information from the Javalin context.

### `ApiExceptionHandler`

Defined in `server/src/main/java/umm3601/Common/ApiExceptionHandler.java`.

This centralizes API error responses. It preserves Javalin `HttpResponseException` status codes, logs unexpected failures, and returns JSON error bodies consistently.

## Angular Authentication Changes

### `AuthService`

Defined in `client/src/app/auth/auth-service.ts`.

`AuthService` is the client-side source of truth for auth state. It:

- Calls login, signup, logout, current-user, and permissions endpoints.
- Stores the returned access profile in `sessionStorage`.
- Tracks `systemRole`, `jobRole`, permissions, username, full name, and email.
- Restores a session by calling `GET /api/auth/me`.
- Refreshes permissions by calling `GET /api/auth/permissions`.
- Provides helper methods such as `isAdmin()`, `isVolunteer()`, `isGuardian()`, `hasPermission(...)`, and `hasAllPermissions(...)`.

The JWT itself is not stored in `sessionStorage`; only the access profile is.

### `AuthInterceptor`

Defined in `client/src/app/auth/auth.interceptor.ts`.

The interceptor sets `withCredentials: true` on HTTP requests so the browser includes the HttpOnly auth cookie on API calls.

It is registered in `client/src/main.ts` using:

```ts
provideHttpClient(withInterceptorsFromDi())
{ provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
```

### `AuthGuard`

Defined in `client/src/app/auth/auth.guard.ts`.

`AuthGuard` blocks unauthenticated users from protected Angular routes. If a session is not already loaded, it tries to sync the access profile from the server. If that fails, it redirects to `/login`.

This is a client-side navigation guard only. The server still enforces authorization for every API request.

### `RoleGuard`

Defined in `client/src/app/auth/role.guard.ts`.

`RoleGuard` reads route metadata from `app-routing.module.ts`:

```ts
data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_inventory'] }
```

It checks:

- Whether the user has one of the allowed system roles.
- Whether the user has all required permissions.

If the user lacks access, it redirects to `/`.

## Angular Route Changes

Routes in `client/src/app/app-routing.module.ts` now include auth metadata.

Public routes include:

- `/`
- `/login`
- `/sign-up`
- `/guardian-sign-up`

Protected guardian routes include:

- `/family-portal`
- `/family-portal/form`

Protected admin and volunteer routes include:

- `/family`
- `/family/new`
- `/family/:id`
- `/inventory`
- `/supplylist`
- `/supplylist/new`
- `/pdf-generator`
- `/stock-report`
- `/settings`
- `/point-of-sale`

Admin-only routes include:

- `/users`

The route guards hide UI routes from users who do not have the right role or permissions. Server annotations remain the real enforcement layer.

## User Management

### Server User Model

Defined in `server/src/main/java/umm3601/Users/Users.java`.

User records now include:

- `_id`
- `username`
- `passwordHash`
- `fullName`
- `email`
- `systemRole`
- `jobRole`

`systemRole` is one of `ADMIN`, `VOLUNTEER`, or `GUARDIAN`. `jobRole` is only meaningful for volunteers.

### Users Repository and Service

The user backend is split into:

- `UsersRepository.java`: database access.
- `UsersService.java`: user business logic.
- `UsersValidator.java`: validation and normalization.
- `UsersPolicy.java`: policy checks.
- `UsersController.java`: HTTP routes.

This keeps database access, validation, policy, and route handling separate.

### Admin User API

Defined in `server/src/main/java/umm3601/Users/UsersController.java`.

Admin-only endpoints:

- `GET /api/users`
- `POST /api/users`
- `PUT /api/users/{id}`
- `DELETE /api/users/{id}`

These routes use `@RequireRole(Role.ADMIN)`.

The user service also prevents deleting or demoting the last remaining admin.

### Client User Service

Defined in `client/src/app/users/user.service.ts`.

The Angular `UserService` calls:

- `/api/users`
- `/api/auth/job-roles`
- `/api/auth/permissions/all`

It provides methods for:

- Listing users.
- Adding users.
- Updating users.
- Deleting users.
- Loading job roles.
- Saving job roles.
- Deleting job roles.
- Loading the full permission overview.

### User Management UI

The new admin UI lives in:

- `client/src/app/users/users.component.ts`
- `client/src/app/users/user-management.component.ts`
- Their corresponding HTML, SCSS, and spec files.

The `/users` page now includes:

- Pending family delete requests.
- Staff user role management.
- Volunteer job-role and permission management.

Guardians are intentionally excluded from the staff user list so the page focuses on internal admin and volunteer accounts.

## Seed Data

New seed files were added under `database/seed`.

### `users.json`

Seeds example users:

- Admin user.
- Volunteer user.
- Guardian user.

Seeded passwords are already hashed. The comment in `Users.java` notes that seeded users use `password123`.

### `permissions.json`

Seeds the initial `permissions` collection.

It includes:

- `volunteer_base`
- `inventory_manager`

The server can also repair or create the baseline permissions document through `PermissionsService.getPermissions()` if needed.

## Family Portal and Guardian Flow

The auth work also added a guardian-facing family portal.

Client files include:

- `client/src/app/family/family-portal-home.component.*`
- `client/src/app/family/family-portal-form.component.*`
- `client/src/app/family/family-portal.service.ts`

Server files include:

- `server/src/main/java/umm3601/Family/FamilyPortalController.java`

Guardian routes are protected with the `GUARDIAN` role and `family_portal_access` permission. Guardians are intentionally limited to this surface by `AuthMiddleware.requirePermission(...)`.

## Family Delete Requests

The user/admin work also added support for family delete requests.

Client files include:

- `client/src/app/family/delete-family-request-dialog.component.ts`
- `client/src/app/family/delete-request-notification.service.ts`

The admin `/users` page shows pending delete requests and lets admins approve or restore them.

When a family with a linked guardian account is deleted, the linked guardian login can also be removed through the user service path.

## How to Add a New Secured Server Route

1. Add a method to the relevant controller.
2. Annotate it with `@Route`.
3. Add `@RequireRole(...)` or `@RequirePermission(...)` if it needs protection beyond being logged in.
4. Make sure the controller is included in `Bootstrap.buildControllers(...)`.
5. If adding a new permission, add it to `PermissionsService` so it appears in the permission catalog.
6. Add or update tests.

Example:

```java
@Route(path = "/api/example", method = HttpMethod.GET)
@RequirePermission("view_example")
public void getExample(Context ctx) {
  ctx.json(...);
}
```

## How to Protect a New Angular Route

Add `AuthGuard` and `RoleGuard` in `client/src/app/app-routing.module.ts`:

```ts
{
  path: 'example',
  loadComponent: () => import('./example/example.component').then(m => m.ExampleComponent),
  title: 'Example',
  canActivate: [AuthGuard, RoleGuard],
  data: { roles: ['ADMIN', 'VOLUNTEER'], permissions: ['view_example'] }
}
```

The Angular guard controls navigation. The server route must still use `@RequireRole` or `@RequirePermission`.

## Testing Added or Updated

Server test coverage was added for:

- Auth controller behavior.
- Auth service behavior.
- Auth validator behavior.
- JWT utilities.
- Password utilities.
- Permissions service behavior.
- Route registration infrastructure.
- Auth middleware.
- API exception handling.
- Auth context.
- User model, service, validator, and controller behavior.

Client test coverage was added or updated for:

- Auth service.
- Auth guard.
- Role guard.
- Login and signup components.
- User management components.
- Routes and guarded UI behavior.
- Cypress login helpers and role-based flows.

## Important Security Notes

- The JWT secret must be set with `JWT_SECRET`; startup fails if it is missing.
- The auth cookie is HttpOnly and SameSite Strict.
- The client stores only the access profile in `sessionStorage`, not the JWT.
- Client guards are for navigation and UI behavior only.
- Server middleware and route annotations are the source of truth for access control.
- Admin users bypass permission checks, but admin-only routes still require `Role.ADMIN`.
- Guardian users are intentionally limited to the family portal permission.
- Volunteer permissions come from their volunteer job role and inherited job roles.
- The system prevents removing the final admin account.
