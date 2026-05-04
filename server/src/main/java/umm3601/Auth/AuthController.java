// Package
package umm3601.Auth;

// Java Imports
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Javalin Imports
import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.HttpStatus;
import io.javalin.http.SameSite;
import io.javalin.http.UnauthorizedResponse;

// App Imports
import umm3601.Users.UsersService;

/**
 * Controller responsible for authentication routes and auth-admin routes.
 * Request validation and token/session work live in AuthValidator/AuthService
 * so these handlers stay focused on HTTP details: cookies, status codes, and
 * response bodies.
 */
public class AuthController {
  private static final int AUTH_TOKEN_HOURS = 8; // JWT tokens are valid for 8 hours, which means the auth cookie should also be valid for 8 hours.

  // 8 hours in seconds, since the cookie maxAge is in seconds. This means the cookie will expire at the same time as the JWT token,
  // so we won't have expired tokens sitting around in cookies if the server restarts while users are logged in.
  private static final int MINUTES_PER_HOUR = 60;
  private static final int SECONDS_PER_MINUTE = 60;
  private static final int AUTH_COOKIE_MAX_AGE_SECONDS = AUTH_TOKEN_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

  private final AuthService authService;
  private final AuthValidator authValidator;
  private final PermissionsService permissionsService;

  public AuthController(
      UsersService userService,
      String jwtSecret,
      PermissionsService permissionsService) {
    this.authValidator = new AuthValidator();
    this.authService = new AuthService(userService, jwtSecret, permissionsService, authValidator);
    this.permissionsService = permissionsService;
  }

  /**
   * Login creates a new session for a user and returns the access profile.
   * The JWT token gets sent in an HttpOnly cookie, and the access profile is the JSON body.
   * @param ctx
   */
  @Route(path = "/api/auth/login", method = HttpMethod.POST)
  public void login(Context ctx) {
    AuthSession session = authService.login(ctx.bodyAsClass(AuthRequests.LoginRequest.class));
    // The JWT goes into an HttpOnly cookie. The JSON body intentionally returns
    // only the access profile the Angular UI needs for guards and menus.
    ctx.cookie(buildAuthCookie(session.token()));
    ctx.json(session.accessProfile());
  }

  /**
   * Signup creates a new user and session. Like login, the JWT token gets sent
   * in an HttpOnly cookie and the access profile is the JSON body.
   * Signup is open to the public, but intentionally limited to guardian and volunteer roles.
   * Admin users should be created through seed data or an admin-only user management UI.
   * @param ctx
   */
  @Route(path = "/api/auth/signup", method = HttpMethod.POST)
  public void signup(Context ctx) {
    AuthSession session = authService.signup(ctx.bodyAsClass(AuthRequests.SignupRequest.class));
    ctx.cookie(buildAuthCookie(session.token()));
    ctx.json(session.accessProfile());
  }

  /**
   * Logout is handled client-side by deleting the cookie, but this endpoint is here in case we
   * want to do server-side session invalidation in the future. For now it just overwrites the
   * cookie with maxAge=0 so the browser deletes it immediately.
   * @param ctx
   */

  @Route(path = "/api/auth/logout", method = HttpMethod.POST)
  public void logout(Context ctx) {
    // Overwrite the cookie with maxAge=0 so the browser deletes it.
    ctx.cookie(new Cookie(
        "auth_token",
        "",
        "/",
        0,
        false,
        0,
        true,
        null,
        null,
        SameSite.STRICT));

    ctx.status(HttpStatus.OK);
  }

  /**
   * /me is a simple endpoint to return the current user's access profile based on the JWT token cookie.
   * This is useful for the Angular UI to get the current user's permissions on app startup, and it can
   * also be used as a lightweight token validation check since the AuthMiddleware will reject invalid or
   * expired tokens before this handler is called.
   * @param ctx
   */
  @Route(path = "/api/auth/me", method = HttpMethod.GET)
  public void me(Context ctx) {
    ctx.json(authService.getCurrentAccessProfile(ctx.cookie("auth_token")));
  }

  /**
   * getUserPermissions is a protected endpoint that returns the current user's access profile based on
   * the JWT token cookie, just like /me. The difference is that this one requires authentication and
   * also includes the user's username, full name, and email in the response. This is used by the
   * Angular UI to resync the user's permissions and profile info without needing to log out and back in again.
   * @param ctx
   * @throws UnauthorizedResponse if the user is not authenticated or if their account is in an invalid state (e.g. missing system role)
   */
  @Route(path = "/api/auth/permissions", method = HttpMethod.GET)
  public void getUserPermissions(Context ctx) {
    // AuthMiddleware refreshes these attributes on every protected request, so
    // this endpoint is the client's lightweight way to resync UI permissions.
    Role systemRole = ctx.attribute("systemRole");
    if (systemRole == null) {
      throw new UnauthorizedResponse("Not authenticated");
    }

    String jobRole = ctx.attribute("jobRole");
    String username = ctx.attribute("username");
    String fullName = ctx.attribute("fullName");
    String email = ctx.attribute("email");

    if (systemRole == Role.VOLUNTEER && (jobRole == null || jobRole.isBlank())) {
      jobRole = "volunteer_base";
    }

    Map<String, Object> profile = authService.buildAccessProfile(systemRole, jobRole);
    profile.put("username", username);
    profile.put("fullName", fullName);
    profile.put("email", email);
    ctx.json(profile);
  }

  /**
   * getAllRolePermissions is an admin-only endpoint that returns the full list of system roles, job roles, and permissions.
   * This is used by the Angular admin UI to manage users and roles in a single combined view without needing to make separate
   * round trips for each permission source.
   * @param ctx
   */
  @Route(path = "/api/auth/permissions/all", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getAllRolePermissions(Context ctx) {
    // Admin UI uses this combined payload to edit users and volunteer job roles
    // without making separate round trips for each permission source.
    Map<String, Object> response = new HashMap<>();
    response.put("systemRoles", List.of(Role.ADMIN.name(), Role.VOLUNTEER.name(), Role.GUARDIAN.name()));
    response.put("jobRoles", permissionsService.getPermissions().roles);
    response.put("permissionCatalog", permissionsService.getPermissionCatalog());
    ctx.json(response);
  }

  /**
   * getJobRoles is an admin-only endpoint that returns the list of job roles and their permissions.
   * This is used by the Angular admin UI to show which job roles exist and edit them.
   * @param ctx
   */
  @Route(path = "/api/auth/job-roles", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getJobRoles(Context ctx) {
    ctx.json(permissionsService.getPermissions().roles);
  }

  /**
   * upsertJobRole is an admin-only endpoint that creates or updates a job role and its permissions.
   * This is used by the Angular admin UI to create new volunteer job roles or edit existing ones.
   * @param ctx
   */
  @Route(path = "/api/auth/job-roles/{jobRole}", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void upsertJobRole(Context ctx) {
    String jobRole = authValidator.validateJobRoleName(ctx.pathParam("jobRole"));
    RoleConfig config = authValidator.normalizeRoleConfig(ctx.bodyAsClass(RoleConfig.class));
    permissionsService.updateRole(jobRole, config);
    ctx.status(HttpStatus.OK);
  }

  /**
   * deleteJobRole is an admin-only endpoint that deletes a job role.
   * This is used by the Angular admin UI to delete volunteer job roles.
   * volunteer_base is a special default job role that always exists and
   * can't be deleted, since it's used to give basic permissions to volunteers
   * without any assigned job role.
   * @param ctx
   * @throws BadRequestResponse if the client tries to delete the volunteer_base job role, since that role is required as a default for volunteers with no assigned job role
   */
  @Route(path = "/api/auth/job-roles/{jobRole}", method = HttpMethod.DELETE)
  @RequireRole(Role.ADMIN)
  public void deleteJobRole(Context ctx) {
    String jobRole = authValidator.validateJobRoleName(ctx.pathParam("jobRole"));
    if ("volunteer_base".equals(jobRole)) {
      throw new io.javalin.http.BadRequestResponse("volunteer_base cannot be deleted");
    }
    permissionsService.deleteRole(jobRole);
    ctx.status(HttpStatus.OK);
  }

  /**
   * assignVolunteerJobRole is an admin-only endpoint that assigns a job role to a volunteer user.
   * This is used by the Angular admin UI to assign or change a volunteer's job role.
   * @param ctx
   */
  @Route(path = "/api/auth/users/{username}/job-role", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void assignVolunteerJobRole(Context ctx) {
    String username = ctx.pathParam("username");
    AuthRequests.AssignJobRoleRequest req = ctx.bodyAsClass(AuthRequests.AssignJobRoleRequest.class);
    String jobRole = authValidator.requireAssignedJobRole(req);
    authService.assignVolunteerJobRole(username, jobRole);
    ctx.status(HttpStatus.OK);
  }

  /**
   * buildAuthCookie is a helper method to create the HttpOnly cookie that holds the JWT token.
   * @param token the JWT token string to put in the cookie
   * @return the HttpOnly cookie that holds the JWT token.
   */
  private Cookie buildAuthCookie(String token) {
    // Secure is false here so local HTTP development can still log in. In a
    // production HTTPS-only deployment this should be set to true.
    return new Cookie(
        "auth_token",
        token,
        "/",
        AUTH_COOKIE_MAX_AGE_SECONDS,
        false,
        0,
        true,
        null,
        null,
        SameSite.STRICT);
  }
}
