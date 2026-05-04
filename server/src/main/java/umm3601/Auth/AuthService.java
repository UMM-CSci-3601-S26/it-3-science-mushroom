// Package
package umm3601.Auth;

// Java imports
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Javalin imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.UnauthorizedResponse;

// JWT imports
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;

// App imports
import umm3601.Users.Users;
import umm3601.Users.UsersService;

/**
 * Business logic for creating authenticated sessions and access profiles.
 *
 * Controllers own HTTP details such as cookies. This service owns credential
 * checks, password hashing, token creation, and the role/permission shape sent
 * back to the client.
 */
public class AuthService {
  private static final String DEFAULT_VOLUNTEER_JOB_ROLE = "volunteer_base"; // Set a default job role for volunteers who don't have one assigned yet, so they still get basic permissions.

  private final UsersService usersService;
  private final String jwtSecret;
  private final PermissionsService permissionsService;
  private final AuthValidator validator;

  public AuthService(
      UsersService usersService,
      String jwtSecret,
      PermissionsService permissionsService,
      AuthValidator validator) {
    this.usersService = usersService;
    this.jwtSecret = jwtSecret;
    this.permissionsService = permissionsService;
    this.validator = validator;
  }

  /**
   * login checks the provided username and password, and if valid, creates and returns an authenticated session with a JWT token and access profile.
   * @param req the login request containing the username and password
   * @return an AuthSession containing the JWT token and access profile for the authenticated user
   * @throws UnauthorizedResponse if the username is not found or the password is incorrect
   */
  public AuthSession login(AuthRequests.LoginRequest req) {
    validator.validateLogin(req);
    Users user = usersService.findByUsername(req.username);
    if (user == null || !PasswordUtils.checkPassword(req.password, user.passwordHash)) {
      throw new UnauthorizedResponse("Invalid username or password");
    }
    return createSession(user, user.systemRole);
  }

  /**
   * signup creates a new user account with the provided information, and if successful, creates and returns an authenticated session for the new user.
   * @param req the signup request containing the username, password, full name, email, and system role for the new user
   * @return an AuthSession containing the JWT token and access profile for the newly created user
   * @throws BadRequestResponse if the username already exists or if the provided information is invalid
   */
  public AuthSession signup(AuthRequests.SignupRequest req) {
    validator.validateSignup(req);
    if (usersService.findByUsername(req.username) != null) {
      throw new BadRequestResponse("Username already exists");
    }

    // Public signup is intentionally limited to guardians and volunteers; admins
    // are created through seed data or admin-only user management.
    Role systemRole = validator.signupSystemRole(req.systemRole);
    String email = validator.normalizeSignupEmail(systemRole, req.email);
    String jobRole = systemRole == Role.VOLUNTEER ? DEFAULT_VOLUNTEER_JOB_ROLE : null;
    String hashedPassword = PasswordUtils.hashPassword(req.password);

    usersService.createUser(
        req.username,
        hashedPassword,
        req.fullName,
        email,
        systemRole,
        jobRole);

    Users user = usersService.findByUsername(req.username);
    return createSession(user, systemRole);
  }

  /**
   * getCurrentAccessProfile takes a JWT token string, validates it, and returns the access profile for the corresponding user.
   * This is used by the /me endpoint to return the current user's access profile based on the JWT token cookie.
   * @param token the JWT token string from the auth cookie
   * @return a map representing the access profile for the authenticated user
   * @throws UnauthorizedResponse if the token is missing, invalid, expired, or if the corresponding user account no longer exists or has no system role
   */
  public Map<String, Object> getCurrentAccessProfile(String token) {
    if (token == null) {
      throw new UnauthorizedResponse("Not authenticated");
    }

    try {
      Claims claims = JwtUtils.parseToken(token, jwtSecret);
      String userId = claims.getSubject();
      Users user = userId == null ? null : usersService.findById(userId);
      if (user == null) {
        throw new UnauthorizedResponse("User account no longer exists");
      }
      AccessIdentity identity = normalizeAccessIdentity(user);
      return buildAccessProfile(user, identity.jobRole);
    } catch (JwtException e) {
      throw new UnauthorizedResponse("Invalid or expired token");
    }
  }

  /**
   * buildAccessProfile takes a system role and an optional job role, and returns a map representing the access profile for the user.
   * @param systemRole the system role of the user
   * @param jobRole the job role of the user, if applicable
   * @return a map representing the access profile for the user
   */
  public Map<String, Object> buildAccessProfile(Role systemRole, String jobRole) {
    List<String> permissions;
    if (Role.ADMIN.equals(systemRole)) {
      // The server also treats admins as permission bypass users.
      permissions = List.of("*");
    } else if (Role.GUARDIAN.equals(systemRole)) {
      // Guardians should only see the family portal surface.
      permissions = List.of("family_portal_access");
    } else {
      permissions = new ArrayList<>(permissionsService.getEffectivePermissions(jobRole));
    }

    Map<String, Object> response = new HashMap<>();
    response.put("systemRole", systemRole.name());
    response.put("permissions", permissions);
    if (jobRole != null) {
      response.put("jobRole", jobRole);
    }
    return response;
  }

  /**
   * buildAccessProfile overload that takes a Users object and extracts the system role and job role to build the access profile.
   * @param user the Users object representing the authenticated user
   * @param jobRole the job role of the user, if applicable
   * @return a map representing the access profile for the user, including username, full name, and email
   */
  public Map<String, Object> buildAccessProfile(Users user, String jobRole) {
    Map<String, Object> response = buildAccessProfile(user.systemRole, jobRole);
    response.put("username", user.username);
    response.put("fullName", user.fullName);
    response.put("email", user.email);
    return response;
  }

  /**
   * assignVolunteerJobRole assigns a job role to a volunteer user.
   * This is used by the admin UI to manage volunteer job roles.
   * @param username the username of the volunteer user to update
   * @param jobRole the job role to assign to the volunteer user
   * @throws BadRequestResponse if the user is not found, if the user is not a volunteer, or if the job role does not exist
   */
  public void assignVolunteerJobRole(String username, String jobRole) {
    Users user = usersService.findByUsername(username);
    if (user == null) {
      throw new BadRequestResponse("User not found: " + username);
    }
    if (user.systemRole != Role.VOLUNTEER) {
      throw new BadRequestResponse("Only volunteers can have job roles");
    }
    if (!permissionsService.roleExists(jobRole)) {
      throw new BadRequestResponse("Unknown job role: " + jobRole);
    }
    usersService.updateUserJobRole(username, jobRole);
  }

  /**
   * createSession creates an AuthSession for a given user and system role, which includes generating a JWT token and building the access profile.
   * @param user the Users object representing the authenticated user
   * @param systemRole the system role of the user
   * @return an AuthSession for the user
   */
  private AuthSession createSession(Users user, Role systemRole) {
    AccessIdentity identity = normalizeAccessIdentity(user);
    String token = JwtUtils.createToken(user._id, systemRole, identity.jobRole, jwtSecret);
    return new AuthSession(token, buildAccessProfile(user, identity.jobRole));
  }

  /**
   * normalizeAccessIdentity takes a Users object and ensures it has a valid system role and job role (if applicable), and returns an AccessIdentity object that represents the user's identity for permission checks.
   * This method also performs lazy repair of old volunteer accounts that may not have a job role assigned yet by assigning them the default volunteer job role.
   * @param user the Users object representing the authenticated user
   * @return an AccessIdentity object containing the normalized identity information for permission checks
   * @throws UnauthorizedResponse if the user account has no system role or if a volunteer account has no job role and can't be repaired
   */
  private AccessIdentity normalizeAccessIdentity(Users user) {
    Role systemRole = user.systemRole;

    if (systemRole == null || systemRole.name().isBlank()) {
      throw new UnauthorizedResponse("User account has no system role");
    }

    String jobRole = user.jobRole;
    if (Role.VOLUNTEER.equals(systemRole) && (jobRole == null || jobRole.isBlank())) {
      // Old or manually inserted volunteer accounts may not have a job role yet.
      // Repair them lazily so permission checks have a stable baseline.
      jobRole = DEFAULT_VOLUNTEER_JOB_ROLE;
      usersService.updateUserJobRole(user.username, jobRole);
    }

    if (!Role.VOLUNTEER.equals(systemRole)) {
      jobRole = null;
    }

    return new AccessIdentity(jobRole);
  }

  // AccessIdentity is a simple value class to hold the relevant identity information extracted from the Users object for permission checks.
  private static final class AccessIdentity {
    private final String jobRole;

    private AccessIdentity(String jobRole) {
      this.jobRole = jobRole;
    }
  }
}
