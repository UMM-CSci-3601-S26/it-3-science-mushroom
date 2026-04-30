/**
 * AuthMiddleware â€” validates JWTs and enforces role-based access control (RBAC)
 * on every protected API route.
 *
 * How it fits into a request
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Each protected route handler calls authMiddleware.handle(ctx) at the top of
 * the method.  This keeps the middleware opt-in per-route rather than being a
 * blanket Javalin before() hook, which makes it easy to see exactly which
 * endpoints are protected.
 *
 * Token extraction order
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * 1. HttpOnly cookie "auth_token"  â€” used by the Angular browser client.
 *    The cookie is set by AuthController on login/signup and is never readable
 *    by JavaScript, making it safe against XSS attacks.
 * 2. Authorization: Bearer <token> header â€” fallback for non-browser clients
 *    such as curl or automated test scripts.
 *
 * After a valid token is found, handle() stores userId and systemRole as Javalin
 * context attributes so downstream handler code can read them with:
 *   String userId = ctx.attribute("userId");
 *   Role systemRole = ctx.attribute("systemRole");
 *
 * requireRole() is a static helper that reads the systemRole attribute and throws
 * 403 Forbidden if it is not among the allowed values.
 */
package umm3601.Middleware;

import java.util.Set;

import io.javalin.http.Context;
import io.javalin.http.UnauthorizedResponse;
import io.javalin.http.ForbiddenResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import umm3601.Auth.JwtUtils;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.Role;
import umm3601.Users.Users;
import umm3601.Users.UsersService;

public class AuthMiddleware {
  private static final String GUARDIAN_PORTAL_PERMISSION = "family_portal_access";
  private static final int BEARER_PREFIX_LENGTH = 7;

  private final String jwtSecret;
  private final UsersService usersService;

  public AuthMiddleware(String jwtSecret, UsersService usersService) {
    this.jwtSecret = jwtSecret;
    this.usersService = usersService;
  }

  public void handle(Context ctx) {
    String path = ctx.path();
    if (path != null && (path.equals("/")
        || path.startsWith("/public")
        || path.equals("/api/health")
        || path.equals("/api/auth/login")
        || path.equals("/api/auth/signup")
        || path.equals("/api/auth/logout"))) {
      return;
    }

    String token = ctx.cookie("auth_token");

    if (token == null) {
      String header = ctx.header("Authorization");
      if (header != null && header.startsWith("Bearer ")) {
        token = header.substring(BEARER_PREFIX_LENGTH);
      }
    }

    if (token == null) {
      throw new UnauthorizedResponse("Missing token");
    }

    try {
      Claims claims = JwtUtils.parseToken(token, jwtSecret);
      String userId = claims.getSubject();
      Users user = userId == null ? null : usersService.findById(userId);
      if (user == null) {
        throw new UnauthorizedResponse("User account no longer exists");
      }

      Role systemRole = user.systemRole;
      if (systemRole == null) {
        throw new UnauthorizedResponse("User account has no system role");
      }
      String jobRole = user.jobRole;
      if (systemRole == Role.VOLUNTEER && (jobRole == null || jobRole.isBlank())) {
        jobRole = "volunteer_base";
      }
      if (systemRole != Role.VOLUNTEER) {
        jobRole = null;
      }

      ctx.attribute("userId", userId);
      ctx.attribute("systemRole", systemRole);
      ctx.attribute("jobRole", jobRole);
      ctx.attribute("username", user.username);
      ctx.attribute("fullName", user.fullName);
      ctx.attribute("email", user.email);
    } catch (JwtException e) {
      throw new UnauthorizedResponse("Invalid or expired token");
    }
  }

  public static void requireRole(Context ctx, Role required) {
    Role role = ctx.attribute("systemRole");

    if (role == null || !role.atLeast(required)) {
      throw new ForbiddenResponse("Insufficient role");
    }
  }

  public static void requirePermission(Context ctx, PermissionsService permissionsService, String permission) {
    Role systemRole = ctx.attribute("systemRole");

    // ADMIN bypass
    if (systemRole == Role.ADMIN) {
      return;
    }

    // GUARDIAN can only access the family portal surface.
    if (systemRole == Role.GUARDIAN) {
      if (GUARDIAN_PORTAL_PERMISSION.equals(permission)) {
        return;
      }
      throw new ForbiddenResponse("Guardians can only access the family portal");
    }

    String jobRole = ctx.attribute("jobRole");
    Set<String> perms = permissionsService.getEffectivePermissions(jobRole);

    if (!perms.contains(permission)) {
      throw new ForbiddenResponse("Missing permission: " + permission);
    }
  }
}
