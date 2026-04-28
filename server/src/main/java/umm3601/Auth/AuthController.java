// Package declaration
package umm3601.Auth;

// IO Imports
import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.HttpStatus;
import io.javalin.http.SameSite;
import io.javalin.http.UnauthorizedResponse;
import io.javalin.http.BadRequestResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import umm3601.Users.Users;
import umm3601.Users.UsersService;

// Java Imports
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller responsible for handling authentication and authorization-related
 * routes, including login, signup, logout, and permissions management.
 *
 * Routes:
 * - POST /api/auth/login â†’ authenticate user and issue JWT cookie
 * - POST /api/auth/signup â†’ create new user, authenticate, and issue JWT cookie
 * - POST /api/auth/logout â†’ clear authentication cookie
 * - GET /api/auth/me â†’ return current user's access profile based on JWT cookie
 * - GET /api/auth/permissions â†’ return current user's access profile based on JWT cookie
 * - GET /api/auth/permissions/all â†’ (admin only) return all system and job roles with their permissions
 * - GET /api/auth/job-roles â†’ (admin only) return all job roles with their permissions
 * - PUT /api/auth/job-roles/{jobRole} â†’ (admin only) create or update a job role's permissions
 * - DELETE /api/auth/job-roles/{jobRole} â†’ (admin only) delete a job role
 * - PUT /api/auth/users/{username}/job-role â†’ (admin only) assign a job role to a volunteer user
 */

public class AuthController {
  private static final int MIN_PASSWORD_LENGTH = 8;
  private static final int AUTH_TOKEN_HOURS = 8;
  private static final int MINUTES_PER_HOUR = 60;
  private static final int SECONDS_PER_MINUTE = 60;
  private static final int AUTH_COOKIE_MAX_AGE_SECONDS = AUTH_TOKEN_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE;

  // userService is only used for looking up users during login/signup and for
  // updating job roles when normalizing identities
  private final UsersService userService;
  // jwtSecret is used for signing and verifying JWTs for authentication
  private final String jwtSecret;
  // permissionsService is used for looking up permissions when building access
  // profiles and for managing job role permissions in the admin routes
  private final PermissionsService permissionsService;

  public AuthController(UsersService userService,
      String jwtSecret,
      PermissionsService permissionsService) {
    this.userService = userService;
    this.jwtSecret = jwtSecret;
    this.permissionsService = permissionsService;
  }

  // =========================
  // AUTH ROUTES (PUBLIC)
  // =========================

  /**
   * POST /api/auth/login
   * Expects JSON body with "username" and "password" fields.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/login", method = HttpMethod.POST)
  public void login(Context ctx) {
    // Parse the request body into a LoginRequest object
    LoginRequest req = ctx.bodyAsClass(LoginRequest.class);

    // Validate that username and password are provided
    Users user = userService.findByUsername(req.username);
    if (user == null || !PasswordUtils.checkPassword(req.password, user.passwordHash)) {
      throw new UnauthorizedResponse("Invalid username or password");
    }

    // Normalize the user's access identity (ensuring job role is set for
    // volunteers) and build a JWT token
    AccessIdentity identity = normalizeAccessIdentity(user);
    // Create a JWT token with the user's ID, system role, and job role, and sign it
    // with the secret key
    String token = JwtUtils.createToken(user._id, user.systemRole, identity.jobRole, jwtSecret);
    // Set the JWT token as an HTTP-only cookie in the response and return the
    // user's access profile as JSON
    ctx.cookie(buildAuthCookie(token));
    ctx.json(buildAccessProfile(user.systemRole, identity.jobRole));
  }

  /**
   * POST /api/auth/signup
   * Expects JSON body with "username", "password", "fullName", and optional
   * "systemRole" fields. If systemRole is not provided or is not "guardian"
   * (case-insensitive), the user will be created with the default system role
   * of "volunteer". Volunteers will be assigned the default job role of "volunteer_base".
   *
   * @param ctx
   */
  @Route(path = "/api/auth/signup", method = HttpMethod.POST)
  public void signup(Context ctx) {
    // Parse the request body into a SignupRequest object
    SignupRequest req = ctx.bodyAsClass(SignupRequest.class);

    // Validate the request fields (username, password, fullName) and check for
    // existing username
    if (req.username == null || req.username.trim().isEmpty()) {
      throw new BadRequestResponse("Username is required");
    }

    if (req.password == null || req.password.length() < MIN_PASSWORD_LENGTH) {
      throw new BadRequestResponse("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
    }

    if (req.fullName == null || req.fullName.trim().isEmpty()) {
      throw new BadRequestResponse("Full name is required");
    }

    if (userService.findByUsername(req.username) != null) {
      throw new BadRequestResponse("Username already exists");
    }

    // Only guardian OR volunteer signup (default)
    // If systemRole is provided and is "guardian" (case-insensitive), set
    // system role to GUARDIAN. Otherwise, default to VOLUNTEER.
    // This prevents direct admin signup and treats invalid values as volunteer
    // accounts rather than failing signup.
    Role systemRole = (req.systemRole != null && req.systemRole == Role.GUARDIAN)
        ? Role.GUARDIAN
        : Role.VOLUNTEER;
    String email = normalizeSignupEmail(systemRole, req.email);

    // For volunteers, the job role will default to "volunteer_base" in
    // normalizeAccessIdentity if not set here,
    // but we need to set it here during signup to ensure the user record is created
    // with a valid job role.
    String jobRole = null;

    // If the system role is volunteer, set the default job role to "volunteer_base"
    if (systemRole == Role.VOLUNTEER) {
      jobRole = "volunteer_base"; // default
    }

    // Hash the password before storing it in the database for security
    String hashedPassword = PasswordUtils.hashPassword(req.password);

    // Create the user in the database with the provided username, hashed password,
    // full name, system role, and job role
    userService.createUser(
        req.username,
        hashedPassword,
        req.fullName,
        email,
        systemRole,
        jobRole);

    // After creating the user, look it up to get the full user record (including
    // the generated ID) for token creation
    Users user = userService.findByUsername(req.username);

    // Normalize the user's access identity (ensuring job role is set for
    // volunteers) and build a JWT token
    AccessIdentity identity = normalizeAccessIdentity(user);
    // Create a JWT token with the user's ID, system role, and job role, and sign it
    // with the secret key
    String token = JwtUtils.createToken(user._id, systemRole, identity.jobRole, jwtSecret);
    // Set the JWT token as an HTTP-only cookie in the response and return the
    // user's access profile as JSON
    ctx.cookie(buildAuthCookie(token));
    ctx.json(buildAccessProfile(systemRole, identity.jobRole));
  }

  /**
   * POST /api/auth/logout
   * Clears the authentication cookie by setting it with an empty value and max age of 0.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/logout", method = HttpMethod.POST)
  public void logout(Context ctx) {
    // Clear the authentication cookie by setting it with an empty value and max age of 0
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
   * GET /api/auth/me
   * Returns the current user's access profile based on the JWT token in the
   * authentication cookie. If the token is missing, invalid, or expired, returns
   * a 401 Unauthorized response.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/me", method = HttpMethod.GET)
  public void me(Context ctx) {
    // Extract the JWT token from the "auth_token" cookie
    String token = ctx.cookie("auth_token");

    // If the token is missing, throw an UnauthorizedResponse to indicate the user
    // is not authenticated
    if (token == null) {
      throw new UnauthorizedResponse("Not authenticated");
    }

    // Parse and validate the JWT token, and extract the claims (user ID, system
    // role, job role)
    try {
      // Claims is a JWT object that contains the claims (payload) of the token, such
      // as user ID, system role, and job role
      Claims claims = JwtUtils.parseToken(token, jwtSecret);
      String userId = claims.getSubject();
      Users user = userId == null ? null : userService.findById(userId);
      if (user == null) {
        throw new UnauthorizedResponse("User account no longer exists");
      }
      AccessIdentity identity = normalizeAccessIdentity(user);

      // Build and return the user's access profile based on the system role and job
      // role extracted from the token claims
      ctx.json(buildAccessProfile(user.systemRole, identity.jobRole));

    } catch (JwtException e) {
      // If there is an error parsing or validating the JWT (e.g., invalid signature,
      // expired token), throw an UnauthorizedResponse to indicate the token is
      // invalid or expired
      throw new UnauthorizedResponse("Invalid or expired token");
    }
  }

  // =========================
  // PERMISSIONS ROUTES
  // =========================

  /**
   * GET /api/auth/permissions
   * Returns the current user's access profile based on the system role and job
   * role set as attributes in the context by the AuthMiddleware.
   * This route is intended to be used by the frontend to fetch the user's
   * permissions after login or page refresh, without needing to parse the JWT on
   * the client side. If the system role attribute is missing, returns a 401 Unauthorized response.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/permissions", method = HttpMethod.GET)
  public void getUserPermissions(Context ctx) {
    // The AuthMiddleware should have already parsed the JWT token and set the
    // "systemRole" and "jobRole" attributes in the context for authenticated
    // requests.
    Role systemRole = ctx.attribute("systemRole");

    // If the system role attribute is missing, it means the user is not
    // authenticated, so throw an UnauthorizedResponse
    if (systemRole == null) {
      throw new UnauthorizedResponse("Not authenticated");
    }

    // Extract the job role attribute from the context. If the system role is
    // volunteer and the job role is missing or blank, default it to
    // "volunteer_base"
    String jobRole = ctx.attribute("jobRole");
    if (systemRole == Role.VOLUNTEER && (jobRole == null || jobRole.isBlank())) {
      jobRole = "volunteer_base";
    }

    // Build and return the user's access profile based on the system role and job
    // role extracted from the context attributes
    ctx.json(buildAccessProfile(systemRole, jobRole));
  }

  /**
   * GET /api/auth/permissions/all
   * Returns a JSON object containing all system and job roles with their
   * associated permissions. This route is intended for admin users to view
   * the current permissions configuration for all roles. The response includes
   * both system roles (admin, guardian, volunteer) and any custom job roles
   * defined in the PermissionsService.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/permissions/all", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getAllRolePermissions(Context ctx) {
    Map<String, Object> response = new HashMap<>();
    response.put("systemRoles", List.of(Role.ADMIN.name(), Role.VOLUNTEER.name(), Role.GUARDIAN.name()));
    response.put("jobRoles", permissionsService.getPermissions().roles);
    response.put("permissionCatalog", permissionsService.getPermissionCatalog());
    ctx.json(response);
  }

  /**
   * GET /api/auth/job-roles
   * Returns a JSON object containing all job roles with their associated
   * permissions. This route is intended for admin users to view the current
   * permissions configuration for all job roles, excluding system roles.
   * The response includes only custom job roles defined in the
   * PermissionsService, and excludes the system roles (admin, guardian,
   * volunteer).
   *
   * @param ctx
   */
  @Route(path = "/api/auth/job-roles", method = HttpMethod.GET)
  @RequireRole(Role.ADMIN)
  public void getJobRoles(Context ctx) {
    ctx.json(permissionsService.getPermissions().roles);
  }

  /**
   * PUT /api/auth/job-roles/{jobRole}
   * Creates or updates a job role with the specified name and permissions.
   * The request body should be a JSON object containing a "permissions" array and
   * an optional "inherits" array of parent roles to inherit permissions from.
   * The job role name is specified as a path parameter and must not be blank or
   * conflict with system role names (admin, guardian, volunteer).
   * This route is intended for admin users to manage custom job roles and their
   * permissions.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/job-roles/{jobRole}", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void upsertJobRole(Context ctx) {
    // Validate the job role name from the path parameter to ensure it is not blank
    // and does not conflict with system role names
    String jobRole = validateJobRoleName(ctx.pathParam("jobRole"));
    // Parse and normalize the role configuration from the request body, ensuring
    // permissions and inherits lists are not null
    RoleConfig config = normalizeRoleConfig(ctx.bodyAsClass(RoleConfig.class));
    // Update the job role's permissions in the PermissionsService with the provided
    // configuration
    permissionsService.updateRole(jobRole, config);
    ctx.status(HttpStatus.OK);
  }

  /**
   * DELETE /api/auth/job-roles/{jobRole}
   * Deletes the specified job role from the PermissionsService.
   * The job role name is specified as a path parameter and must not be blank or
   * conflict with system role names (admin, guardian, volunteer).
   * The "volunteer_base" job role is protected and cannot be deleted to ensure
   * volunteers always have a valid default job role.
   * This route is intended for admin users to manage custom job roles and their
   * permissions.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/job-roles/{jobRole}", method = HttpMethod.DELETE)
  @RequireRole(Role.ADMIN)
  public void deleteJobRole(Context ctx) {
    String jobRole = validateJobRoleName(ctx.pathParam("jobRole"));
    if ("volunteer_base".equals(jobRole)) {
      throw new BadRequestResponse("volunteer_base cannot be deleted");
    }
    permissionsService.deleteRole(jobRole);
    ctx.status(HttpStatus.OK);
  }

  /**
   * PUT /api/auth/users/{username}/job-role
   * Assigns a job role to a volunteer user.
   * The username is specified as a path parameter, and the request body should be
   * a JSON object containing a "jobRole" field with the name of the job role to
   * assign. The specified job role must exist in the PermissionsService, and the user
   * must have a system role of "volunteer" to be eligible for a job role
   * assignment. This route is intended for admin users to manage volunteer users'
   * job role assignments.
   *
   * @param ctx
   */
  @Route(path = "/api/auth/users/{username}/job-role", method = HttpMethod.PUT)
  @RequireRole(Role.ADMIN)
  public void assignVolunteerJobRole(Context ctx) {
    // Validate username from the path parameter and parse the job role name from
    // the request body
    String username = ctx.pathParam("username");
    AssignJobRoleRequest req = ctx.bodyAsClass(AssignJobRoleRequest.class);

    if (req == null || req.jobRole == null || req.jobRole.isBlank()) {
      throw new BadRequestResponse("jobRole is required");
    }
    String jobRole = validateJobRoleName(req.jobRole);

    // Look up the user by username and validate that the user exists, has a system
    // role
    Users user = userService.findByUsername(username);
    if (user == null) {
      throw new BadRequestResponse("User not found: " + username);
    }
    if (user.systemRole != Role.VOLUNTEER) {
      throw new BadRequestResponse("Only volunteers can have job roles");
    }
    if (!permissionsService.roleExists(jobRole)) {
      throw new BadRequestResponse("Unknown job role: " + jobRole);
    }

    // Update the user's job role in the database to the specified job role
    userService.updateUserJobRole(username, jobRole);
    ctx.status(HttpStatus.OK);
  }

  // =========================
  // HELPER METHODS
  // =========================

  // Normalizes a RoleConfig object by ensuring that the permissions and inherits
  // lists are not null.
  private RoleConfig normalizeRoleConfig(RoleConfig raw) {
    if (raw == null) {
      throw new BadRequestResponse("Role config body is required");
    }
    RoleConfig config = new RoleConfig();
    config.permissions = raw.permissions == null ? List.of() : raw.permissions;
    config.inherits = raw.inherits == null ? List.of("volunteer_base") : raw.inherits;
    return config;
  }

  // Validates a job role name to ensure it is not blank and does not conflict
  // with system role names.
  private String validateJobRoleName(String jobRole) {
    if (jobRole == null || jobRole.isBlank()) {
      throw new BadRequestResponse("Job role name is required");
    }
    if ("admin".equalsIgnoreCase(jobRole)
        || "guardian".equalsIgnoreCase(jobRole)
        || "volunteer".equalsIgnoreCase(jobRole)) {
      throw new BadRequestResponse("System roles cannot be used as job role names");
    }
    return jobRole;
  }

  // =========================
  // REQUEST DTOs
  // =========================

  // DTO for login request body
  @SuppressWarnings({ "VisibilityModifier" })
  public static class LoginRequest {
    public String username;
    public String password;
  }

  // DTO for signup request body
  @SuppressWarnings({ "VisibilityModifier" })
  public static class SignupRequest {
    public String username;
    public String password;
    public String fullName;
    public String email;
    public Role systemRole;
  }

  // DTO for assigning job role to a volunteer user
  @SuppressWarnings({ "VisibilityModifier" })
  public static class AssignJobRoleRequest {
    public String jobRole;
  }

  // =========================
  // COOKIE BUILDER
  // =========================

  // Helper method to build an HTTP-only cookie for the authentication token with
  // appropriate settings
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

  // Helper method to build an access profile response containing the system role,
  // job role (if applicable), and permissions based on the provided system role
  // and job role
  private Map<String, Object> buildAccessProfile(Role systemRole, String jobRole) {
    List<String> permissions;
    // Admins have all permissions, guardians have a fixed set of permissions, and
    // volunteers have permissions based on their job role
    if (Role.ADMIN.equals(systemRole)) {
      permissions = List.of("*");
    } else if (Role.GUARDIAN.equals(systemRole)) {
      permissions = List.of("family_portal_access");
    } else {
      permissions = new ArrayList<>(permissionsService.getEffectivePermissions(jobRole));
    }

    // Build the response as a map containing the system role, permissions, and job
    // role (if applicable)
    Map<String, Object> response = new HashMap<>();
    response.put("systemRole", systemRole.name());
    response.put("permissions", permissions);
    if (jobRole != null) {
      response.put("jobRole", jobRole);
    }
    return response;
  }

  // Helper method to normalize a user's access identity by ensuring that
  // volunteers have a valid job role (defaulting to "volunteer_base" if not set)
  // and returning an AccessIdentity object containing the system role and job role
  private AccessIdentity normalizeAccessIdentity(Users user) {
    Role systemRole = user.systemRole;

    if (systemRole == null || systemRole.name().isBlank()) {
      throw new UnauthorizedResponse("User account has no system role");
    }

    String jobRole = user.jobRole;
    if (Role.VOLUNTEER.equals(systemRole) && (jobRole == null || jobRole.isBlank())) {
      jobRole = "volunteer_base";
      userService.updateUserJobRole(user.username, jobRole);
    }

    if (!Role.VOLUNTEER.equals(systemRole)) {
      jobRole = null;
    }

    return new AccessIdentity(jobRole);
  }

  private String normalizeSignupEmail(Role systemRole, String email) {
    String normalized = email == null ? "" : email.trim();
    if (normalized.isBlank()) {
      if (systemRole == Role.GUARDIAN) {
        return null;
      }
      throw new BadRequestResponse("Email is required");
    }
    if (!normalized.matches(umm3601.Users.UsersValidator.EMAIL_REGEX)) {
      throw new BadRequestResponse("Email must be valid");
    }
    return normalized;
  }

  // Helper class to represent a user's access identity, containing the system
  // role and job role. This is used internally to manage and pass around the
  // user's access information after normalizing it from the user record.
  private static final class AccessIdentity {
    private final String jobRole;

    // Constructor to initialize the AccessIdentity with the provided job role
    private AccessIdentity(String jobRole) {
      this.jobRole = jobRole;
    }
  }
}
