package umm3601.Middleware;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Users.Users;
import umm3601.Users.UsersService;
import umm3601.Auth.JwtUtils;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.Role;

@SuppressWarnings({ "MagicNumber" })
public class AuthMiddlewareSpec {

  private static final String TEST_SECRET = "testSecretKeyThatIsLongEnoughForHS256Algorithm!!";

  private AuthMiddleware middleware;
  private UsersService usersService;

  @Mock
  private Context ctx;

  @BeforeEach
  void setup() {
    MockitoAnnotations.openMocks(this);
    usersService = org.mockito.Mockito.mock(UsersService.class);
    middleware = new AuthMiddleware(TEST_SECRET, usersService);
  }

  // ---- Public / whitelisted paths ----

  @Test
  void handleAllowsRootPath() {
    when(ctx.path()).thenReturn("/");
    assertDoesNotThrow(() -> middleware.handle(ctx));
  }

  @Test
  void handleAllowsPublicPath() {
    when(ctx.path()).thenReturn("/public/logo.png");
    assertDoesNotThrow(() -> middleware.handle(ctx));
  }

  @Test
  void handleAllowsAuthLoginPath() {
    when(ctx.path()).thenReturn("/api/auth/login");
    assertDoesNotThrow(() -> middleware.handle(ctx));
  }

  @Test
  void handleAllowsAuthSignupPath() {
    when(ctx.path()).thenReturn("/api/auth/signup");
    assertDoesNotThrow(() -> middleware.handle(ctx));
  }

  @Test
  void handleAllowsAuthLogoutPath() {
    when(ctx.path()).thenReturn("/api/auth/logout");
    assertDoesNotThrow(() -> middleware.handle(ctx));
  }

  // ---- Protected paths with valid tokens ----

  @Test
  void handleSetsAttributesFromValidCookieToken() {
    String token = JwtUtils.createToken("user123", "volunteer", TEST_SECRET);
    Users user = new Users();
    user._id = "user123";
    user.systemRole = Role.VOLUNTEER;
    user.jobRole = null;
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(token);
    when(usersService.findById("user123")).thenReturn(user);

    assertDoesNotThrow(() -> middleware.handle(ctx));

    verify(ctx).attribute("userId", "user123");
    verify(ctx).attribute("systemRole", Role.VOLUNTEER);
    verify(ctx).attribute("jobRole", "volunteer_base");
  }

  @Test
  void handleSetsAttributesFromBearerHeader() {
    String token = JwtUtils.createToken("user456", "admin", TEST_SECRET);
    Users user = new Users();
    user._id = "user456";
    user.systemRole = Role.ADMIN;
    user.jobRole = "frontdesk";
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(null);
    when(ctx.header("Authorization")).thenReturn("Bearer " + token);
    when(usersService.findById("user456")).thenReturn(user);

    assertDoesNotThrow(() -> middleware.handle(ctx));

    verify(ctx).attribute("userId", "user456");
    verify(ctx).attribute("systemRole", Role.ADMIN);
  }

  @Test
  void handlePrefersCookieOverBearerHeader() {
    String cookieToken = JwtUtils.createToken("cookieUser", "volunteer", TEST_SECRET);
    Users user = new Users();
    user._id = "cookieUser";
    user.systemRole = Role.VOLUNTEER;
    user.jobRole = null;
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(cookieToken);
    when(usersService.findById("cookieUser")).thenReturn(user);

    assertDoesNotThrow(() -> middleware.handle(ctx));

    verify(ctx).attribute("userId", "cookieUser");
    verify(ctx).attribute("systemRole", Role.VOLUNTEER);
    verify(ctx).attribute("jobRole", "volunteer_base");
  }

  // ---- Missing or invalid tokens ----

  @Test
  void handleThrowsUnauthorizedWhenNoToken() {
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(null);
    when(ctx.header("Authorization")).thenReturn(null);

    UnauthorizedResponse ex = assertThrows(UnauthorizedResponse.class, () -> middleware.handle(ctx));
    assert ex.getMessage().contains("Missing token");
  }

  @Test
  void handleThrowsUnauthorizedWhenAuthHeaderHasNoBearer() {
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(null);
    when(ctx.header("Authorization")).thenReturn("Token somevalue");

    assertThrows(UnauthorizedResponse.class, () -> middleware.handle(ctx));
  }

  @Test
  void handleThrowsUnauthorizedWithInvalidJwt() {
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn("this.is.notvalid");

    UnauthorizedResponse ex = assertThrows(UnauthorizedResponse.class, () -> middleware.handle(ctx));
    assert ex.getMessage().contains("Invalid or expired token");
  }

  @Test
  void handleThrowsUnauthorizedWithTokenSignedByWrongSecret() {
    String wrongSecretToken = JwtUtils.createToken("user789", "admin", "aCompletelyDifferentSecretKeyForTesting!!");
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(wrongSecretToken);

    assertThrows(UnauthorizedResponse.class, () -> middleware.handle(ctx));
  }

  @Test
  void handleUsesCurrentRoleFromDatabaseInsteadOfTokenClaims() {
    String token = JwtUtils.createToken("user999", "volunteer", TEST_SECRET);
    Users user = new Users();
    user._id = "user999";
    user.systemRole = Role.ADMIN;
    user.jobRole = null;
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(token);
    when(usersService.findById("user999")).thenReturn(user);

    assertDoesNotThrow(() -> middleware.handle(ctx));

    verify(ctx).attribute("systemRole", Role.ADMIN);
    verify(ctx).attribute("jobRole", null);
  }

  @Test
  void handleThrowsUnauthorizedWhenUserNoLongerExists() {
    String token = JwtUtils.createToken("missing-user", "volunteer", TEST_SECRET);
    when(ctx.path()).thenReturn("/api/families");
    when(ctx.cookie("auth_token")).thenReturn(token);
    when(usersService.findById("missing-user")).thenReturn(null);

    assertThrows(UnauthorizedResponse.class, () -> middleware.handle(ctx));
  }

  // ---- requireRole() ----

  @Test
  void requireRolePassesWhenRoleMatches() {
    when(ctx.attribute("systemRole")).thenReturn(Role.ADMIN);
    assertDoesNotThrow(() -> AuthMiddleware.requireRole(ctx, Role.ADMIN));
  }

  @Test
  void requireRolePassesWhenRoleAtLeastRequired() {
    when(ctx.attribute("systemRole")).thenReturn(Role.ADMIN);
    assertDoesNotThrow(() -> AuthMiddleware.requireRole(ctx, Role.VOLUNTEER));
  }

  @Test
  void requireRoleThrowsForbiddenWhenRoleNotInList() {
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    assertThrows(ForbiddenResponse.class, () -> AuthMiddleware.requireRole(ctx, Role.ADMIN));
  }

  @Test
  void requireRoleThrowsForbiddenWhenRoleIsNull() {
    when(ctx.attribute("systemRole")).thenReturn(null);
    assertThrows(ForbiddenResponse.class, () -> AuthMiddleware.requireRole(ctx, Role.ADMIN));
  }

  // ---- requirePermission() ----

  @Test
  void requirePermissionPassesForAdminBypass() {
    PermissionsService permissionsService = org.mockito.Mockito.mock(PermissionsService.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.ADMIN);
    assertDoesNotThrow(() -> AuthMiddleware.requirePermission(ctx, permissionsService, "view_families"));
  }

  @Test
  void requirePermissionPassesForGuardianPortalPermission() {
    PermissionsService permissionsService = org.mockito.Mockito.mock(PermissionsService.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.GUARDIAN);
    assertDoesNotThrow(() -> AuthMiddleware.requirePermission(ctx, permissionsService, "family_portal_access"));
  }

  @Test
  void requirePermissionThrowsForGuardianNonPortalPermission() {
    PermissionsService permissionsService = org.mockito.Mockito.mock(PermissionsService.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.GUARDIAN);
    assertThrows(ForbiddenResponse.class,
      () -> AuthMiddleware.requirePermission(ctx, permissionsService, "delete_family"));
  }

  @Test
  void requirePermissionPassesWhenVolunteerRoleHasPermission() {
    PermissionsService permissionsService = org.mockito.Mockito.mock(PermissionsService.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    when(ctx.attribute("jobRole")).thenReturn("frontdesk");
    when(permissionsService.getEffectivePermissions("frontdesk"))
      .thenReturn(java.util.Set.of("view_families", "edit_families"));
    assertDoesNotThrow(() -> AuthMiddleware.requirePermission(ctx, permissionsService, "view_families"));
  }

  @Test
  void requirePermissionThrowsForbiddenWhenVolunteerPermissionMissing() {
    PermissionsService permissionsService = org.mockito.Mockito.mock(PermissionsService.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    when(ctx.attribute("jobRole")).thenReturn("frontdesk");
    when(permissionsService.getEffectivePermissions("frontdesk")).thenReturn(java.util.Set.of("view_supply"));
    assertThrows(ForbiddenResponse.class,
      () -> AuthMiddleware.requirePermission(ctx, permissionsService, "delete_families"));
  }
}
