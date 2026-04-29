package umm3601.Auth;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.HttpStatus;
import io.javalin.http.SameSite;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Users.UsersService;

/**
 * Controller responsible for authentication routes and auth-admin routes.
 * Request validation and token/session work live in AuthValidator/AuthService.
 */
public class AuthController {
  private static final int AUTH_TOKEN_HOURS = 8;
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

  @Route(path = "/api/auth/login", method = HttpMethod.POST)
  public void login(Context ctx) {
    AuthSession session = authService.login(ctx.bodyAsClass(AuthRequests.LoginRequest.class));
    ctx.cookie(buildAuthCookie(session.token()));
    ctx.json(session.accessProfile());
  }

  @Route(path = "/api/auth/signup", method = HttpMethod.POST)
  public void signup(Context ctx) {
    AuthSession session = authService.signup(ctx.bodyAsClass(AuthRequests.SignupRequest.class));
    ctx.cookie(buildAuthCookie(session.token()));
    ctx.json(session.accessProfile());
  }

  @Route(path = "/api/auth/logout", method = HttpMethod.POST)
  public void logout(Context ctx) {
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

  @Route(path = "/api/auth/me", method = HttpMethod.GET)
  public void me(Context ctx) {
    ctx.json(authService.getCurrentAccessProfile(ctx.cookie("auth_token")));
  }

  @Route(path = "/api/auth/permissions", method = HttpMethod.GET)
  public void getUserPermissions(Context ctx) {
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

  @Route(path = "/api/auth/permissions/all", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getAllRolePermissions(Context ctx) {
    Map<String, Object> response = new HashMap<>();
    response.put("systemRoles", List.of(Role.ADMIN.name(), Role.VOLUNTEER.name(), Role.GUARDIAN.name()));
    response.put("jobRoles", permissionsService.getPermissions().roles);
    response.put("permissionCatalog", permissionsService.getPermissionCatalog());
    ctx.json(response);
  }

  @Route(path = "/api/auth/job-roles", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getJobRoles(Context ctx) {
    ctx.json(permissionsService.getPermissions().roles);
  }

  @Route(path = "/api/auth/job-roles/{jobRole}", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void upsertJobRole(Context ctx) {
    String jobRole = authValidator.validateJobRoleName(ctx.pathParam("jobRole"));
    RoleConfig config = authValidator.normalizeRoleConfig(ctx.bodyAsClass(RoleConfig.class));
    permissionsService.updateRole(jobRole, config);
    ctx.status(HttpStatus.OK);
  }

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

  @Route(path = "/api/auth/users/{username}/job-role", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void assignVolunteerJobRole(Context ctx) {
    String username = ctx.pathParam("username");
    AuthRequests.AssignJobRoleRequest req = ctx.bodyAsClass(AuthRequests.AssignJobRoleRequest.class);
    String jobRole = authValidator.requireAssignedJobRole(req);
    authService.assignVolunteerJobRole(username, jobRole);
    ctx.status(HttpStatus.OK);
  }

  private Cookie buildAuthCookie(String token) {
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
