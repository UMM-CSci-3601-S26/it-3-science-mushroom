package umm3601.Auth;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.UnauthorizedResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import umm3601.Users.Users;
import umm3601.Users.UsersService;

public class AuthService {
  private static final String DEFAULT_VOLUNTEER_JOB_ROLE = "volunteer_base";

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

  public AuthSession login(AuthRequests.LoginRequest req) {
    validator.validateLogin(req);
    Users user = usersService.findByUsername(req.username);
    if (user == null || !PasswordUtils.checkPassword(req.password, user.passwordHash)) {
      throw new UnauthorizedResponse("Invalid username or password");
    }
    return createSession(user, user.systemRole);
  }

  public AuthSession signup(AuthRequests.SignupRequest req) {
    validator.validateSignup(req);
    if (usersService.findByUsername(req.username) != null) {
      throw new BadRequestResponse("Username already exists");
    }

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

  public Map<String, Object> buildAccessProfile(Role systemRole, String jobRole) {
    List<String> permissions;
    if (Role.ADMIN.equals(systemRole)) {
      permissions = List.of("*");
    } else if (Role.GUARDIAN.equals(systemRole)) {
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

  public Map<String, Object> buildAccessProfile(Users user, String jobRole) {
    Map<String, Object> response = buildAccessProfile(user.systemRole, jobRole);
    response.put("username", user.username);
    response.put("fullName", user.fullName);
    response.put("email", user.email);
    return response;
  }

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

  private AuthSession createSession(Users user, Role systemRole) {
    AccessIdentity identity = normalizeAccessIdentity(user);
    String token = JwtUtils.createToken(user._id, systemRole, identity.jobRole, jwtSecret);
    return new AuthSession(token, buildAccessProfile(user, identity.jobRole));
  }

  private AccessIdentity normalizeAccessIdentity(Users user) {
    Role systemRole = user.systemRole;

    if (systemRole == null || systemRole.name().isBlank()) {
      throw new UnauthorizedResponse("User account has no system role");
    }

    String jobRole = user.jobRole;
    if (Role.VOLUNTEER.equals(systemRole) && (jobRole == null || jobRole.isBlank())) {
      jobRole = DEFAULT_VOLUNTEER_JOB_ROLE;
      usersService.updateUserJobRole(user.username, jobRole);
    }

    if (!Role.VOLUNTEER.equals(systemRole)) {
      jobRole = null;
    }

    return new AccessIdentity(jobRole);
  }

  private static final class AccessIdentity {
    private final String jobRole;

    private AccessIdentity(String jobRole) {
      this.jobRole = jobRole;
    }
  }
}
