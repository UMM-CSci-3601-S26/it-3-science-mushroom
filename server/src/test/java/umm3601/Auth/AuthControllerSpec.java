package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.Mockito.atLeast;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.Cookie;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Users.UsersService;

@SuppressWarnings({ "MagicNumber" })
class AuthControllerSpec {

  private AuthController authController;
  private UsersService usersService;
  private PermissionsService permissionsService;

  // Must be at least 32 bytes for HMAC-SHA256
  private static final String TEST_SECRET = "testSecretKeyThatIsLongEnoughForHS256Algorithm!!";

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<Cookie> cookieCaptor;

  @Captor
  private ArgumentCaptor<Map<String, Object>> responseCaptor;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");
    mongoClient = MongoClients.create(
        MongoClientSettings.builder()
            .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
            .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);
    db.getCollection("users").drop();
    db.getCollection("permissions").drop();
    usersService = new UsersService(db);
    permissionsService = new PermissionsService(db);
    authController = new AuthController(usersService, TEST_SECRET, permissionsService);
  }

  // ---- Login ----

  @Test
  void loginSucceedsWithValidCredentials() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("alice", hash, "Alice Smith", "alice@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "alice";
    req.password = "password123";
    when(ctx.bodyAsClass(AuthRequests.LoginRequest.class)).thenReturn(req);

    authController.login(ctx);

    verify(ctx).cookie(cookieCaptor.capture());
    Cookie cookie = cookieCaptor.getValue();
    assertEquals("auth_token", cookie.getName());
    assertNotNull(cookie.getValue());
    assertEquals(true, cookie.isHttpOnly());
  }

  @Test
  void loginReturnsRoleInResponseBody() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("alice", hash, "Alice Smith", "alice@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "alice";
    req.password = "password123";
    when(ctx.bodyAsClass(AuthRequests.LoginRequest.class)).thenReturn(req);

    authController.login(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("VOLUNTEER", payload.get("systemRole"));
    assertEquals("volunteer_base", payload.get("jobRole"));
  }

  @Test
  void loginSucceedsWhenVolunteerBaseHadSelfInheritanceSavedPreviously() {
    db.getCollection("permissions").insertOne(new org.bson.Document()
        .append("_id", "role-permissions")
        .append("roles", new org.bson.Document()
            .append("volunteer_base", new org.bson.Document()
                .append("permissions", List.of("view_inventory"))
                .append("inherits", List.of("volunteer_base")))));

    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("alice", hash, "Alice Smith", "alice@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "alice";
    req.password = "password123";
    when(ctx.bodyAsClass(AuthRequests.LoginRequest.class)).thenReturn(req);

    authController.login(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("VOLUNTEER", payload.get("systemRole"));
    assertEquals("volunteer_base", payload.get("jobRole"));
  }

  @Test
  void loginFailsWithWrongPassword() {
    String hash = PasswordUtils.hashPassword("correctPassword");
    usersService.createUser("bob", hash, "Bob Jones", "bob@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "bob";
    req.password = "wrongPassword";
    when(ctx.bodyAsClass(AuthRequests.LoginRequest.class)).thenReturn(req);

    assertThrows(UnauthorizedResponse.class, () -> authController.login(ctx));
  }

  @Test
  void loginFailsWithUnknownUser() {
    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "nobody";
    req.password = "password123";
    when(ctx.bodyAsClass(AuthRequests.LoginRequest.class)).thenReturn(req);

    assertThrows(UnauthorizedResponse.class, () -> authController.login(ctx));
  }

  // ---- Signup ----

  @Test
  void signupSucceedsWithValidInput() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "newuser";
    req.password = "password123";
    req.fullName = "New User";
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    authController.signup(ctx);

    verify(ctx).cookie(cookieCaptor.capture());
    Cookie cookie = cookieCaptor.getValue();
    assertEquals("auth_token", cookie.getName());
    assertNotNull(cookie.getValue());
    assertEquals(true, cookie.isHttpOnly());
  }

  @Test
  void signupNewUserGetsVolunteerRole() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "newuser";
    req.password = "password123";
    req.fullName = "New User";
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    authController.signup(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("VOLUNTEER", payload.get("systemRole"));
    assertEquals("volunteer_base", payload.get("jobRole"));
  }

  @Test
  void signupFailsWithPasswordShorterThan8Chars() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "newuser";
    req.password = "short";
    req.fullName = "New User";
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    assertThrows(BadRequestResponse.class, () -> authController.signup(ctx));
  }

  @Test
  void signupFailsWithMissingUsername() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "";
    req.password = "password123";
    req.fullName = "New User";
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    assertThrows(BadRequestResponse.class, () -> authController.signup(ctx));
  }

  @Test
  void signupFailsWithMissingFullName() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "newuser";
    req.password = "password123";
    req.fullName = null;
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    assertThrows(BadRequestResponse.class, () -> authController.signup(ctx));
  }

  @Test
  void signupFailsWithDuplicateUsername() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("taken", hash, "Existing User", "taken@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "taken";
    req.password = "password123";
    req.fullName = "New User";
    req.email = "newuser@example.com";
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    assertThrows(BadRequestResponse.class, () -> authController.signup(ctx));
  }

  @Test
  void signupWithGuardianRoleGetsGuardianRole() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "guardianuser";
    req.password = "password123";
    req.fullName = "Guardian User";
    req.systemRole = Role.GUARDIAN;
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    authController.signup(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("GUARDIAN", payload.get("systemRole"));
    assertEquals(List.of("family_portal_access"), payload.get("permissions"));
  }

  @Test
  void signupWithAdminRoleIsOverriddenToVolunteer() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "adminattempt";
    req.password = "password123";
    req.fullName = "Admin Attempt User";
    req.email = "adminattempt@example.com";
    req.systemRole = Role.ADMIN;
    when(ctx.bodyAsClass(AuthRequests.SignupRequest.class)).thenReturn(req);

    authController.signup(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("VOLUNTEER", payload.get("systemRole"));
    assertEquals("volunteer_base", payload.get("jobRole"));
  }

  // ---- Logout ----

  @Test
  void logoutClearsCookieWithMaxAgeZero() {
    authController.logout(ctx);

    verify(ctx).cookie(cookieCaptor.capture());
    Cookie cookie = cookieCaptor.getValue();
    assertEquals("auth_token", cookie.getName());
    assertEquals("", cookie.getValue());
    assertEquals(0, cookie.getMaxAge());
  }

  // ---- Me ----

  @Test
  void meReturnsRoleForValidCookie() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("adminuser", hash, "Admin User", "admin@example.com", Role.ADMIN, null);
    String token = JwtUtils.createToken(usersService.findByUsername("adminuser")._id, "volunteer", TEST_SECRET);
    when(ctx.cookie("auth_token")).thenReturn(token);

    authController.me(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("ADMIN", payload.get("systemRole"));
    assertEquals(List.of("*"), payload.get("permissions"));
  }

  @Test
  void meReturnsUpdatedVolunteerRoleFromDatabaseInsteadOfTokenClaims() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser(
      "volunteer1",
      hash,
      "Volunteer One",
      "volunteer1@example.com",
      Role.VOLUNTEER,
      "volunteer_base");
    String userId = usersService.findByUsername("volunteer1")._id;
    String token = JwtUtils.createToken(userId, Role.VOLUNTEER, "volunteer_base", TEST_SECRET);
    usersService.updateUserSystemRole("volunteer1", Role.ADMIN);
    when(ctx.cookie("auth_token")).thenReturn(token);

    authController.me(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("ADMIN", payload.get("systemRole"));
    assertEquals(List.of("*"), payload.get("permissions"));
  }

  @Test
  void meThrowsUnauthorizedWhenNoCookie() {
    when(ctx.cookie("auth_token")).thenReturn(null);

    assertThrows(UnauthorizedResponse.class, () -> authController.me(ctx));
  }

  @Test
  void meThrowsUnauthorizedWithInvalidToken() {
    when(ctx.cookie("auth_token")).thenReturn("invalid.token.value");

    assertThrows(UnauthorizedResponse.class, () -> authController.me(ctx));
  }

  // ---- Permissions ----

  @Test
  void getUserPermissionsReturnsWildcardForAdmin() {
    when(ctx.attribute("systemRole")).thenReturn(Role.ADMIN);
    when(ctx.attribute("jobRole")).thenReturn(null);

    authController.getUserPermissions(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("ADMIN", payload.get("systemRole"));
    assertEquals(List.of("*"), payload.get("permissions"));
  }

  @Test
  void getUserPermissionsReturnsFamilyPortalForGuardian() {
    when(ctx.attribute("systemRole")).thenReturn(Role.GUARDIAN);
    when(ctx.attribute("jobRole")).thenReturn(null);

    authController.getUserPermissions(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    assertEquals("GUARDIAN", payload.get("systemRole"));
    assertEquals(List.of("family_portal_access"), payload.get("permissions"));
  }

  @Test
  void getUserPermissionsReturnsEffectivePermissionsForVolunteer() {
    RoleConfig customRole = new RoleConfig();
    customRole.permissions = List.of("edit_inventory_item");
    customRole.inherits = List.of("volunteer_base");
    permissionsService.updateRole("inventory_manager", customRole);

    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    when(ctx.attribute("jobRole")).thenReturn("inventory_manager");

    authController.getUserPermissions(ctx);

    verify(ctx).json(responseCaptor.capture());
    Map<String, Object> payload = responseCaptor.getValue();
    @SuppressWarnings("unchecked")
    List<String> permissions = (List<String>) payload.get("permissions");
    assertTrue(permissions.contains("edit_inventory_item"));
    assertTrue(permissions.contains("view_inventory"));
  }

  @Test
  void upsertAndDeleteJobRoleWork() {
    RoleConfig config = new RoleConfig();
    config.permissions = List.of("view_settings");
    config.inherits = List.of("volunteer_base");

    when(ctx.pathParam("jobRole")).thenReturn("frontdesk");
    // Accept any RoleConfig instance, since controller normalizes it
    when(ctx.bodyAsClass(RoleConfig.class)).thenReturn(config);

    authController.upsertJobRole(ctx);
    // Only verify status and effect, not exact argument
    verify(ctx, atLeast(1)).status(200);
    assertTrue(permissionsService.roleExists("frontdesk"));

    authController.deleteJobRole(ctx);
    verify(ctx, atLeast(2)).status(200);
    assertFalse(permissionsService.roleExists("frontdesk"));
  }

  @Test
  void deleteJobRoleRejectsVolunteerBase() {
    when(ctx.pathParam("jobRole")).thenReturn("volunteer_base");

    assertThrows(BadRequestResponse.class, () -> authController.deleteJobRole(ctx));
  }

  @Test
  void assignVolunteerJobRoleUpdatesVolunteerUser() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("vol1", hash, "Volunteer One", "vol1@example.com", Role.VOLUNTEER, "volunteer_base");

    RoleConfig config = new RoleConfig();
    config.permissions = List.of("view_settings");
    config.inherits = List.of("volunteer_base");
    permissionsService.updateRole("frontdesk", config);

    AuthRequests.AssignJobRoleRequest req = new AuthRequests.AssignJobRoleRequest();
    req.jobRole = "frontdesk";
    when(ctx.pathParam("username")).thenReturn("vol1");
    when(ctx.bodyAsClass(AuthRequests.AssignJobRoleRequest.class)).thenReturn(req);

    authController.assignVolunteerJobRole(ctx);

    // Only verify status and effect, not exact argument
    verify(ctx).status(200);
    assertEquals("frontdesk", usersService.findByUsername("vol1").jobRole);
  }

  @Test
  void assignVolunteerJobRoleRejectsUnknownRole() {
    String hash = PasswordUtils.hashPassword("password123");
    usersService.createUser("vol2", hash, "Volunteer Two", "vol2@example.com", Role.VOLUNTEER, "volunteer_base");

    AuthRequests.AssignJobRoleRequest req = new AuthRequests.AssignJobRoleRequest();
    req.jobRole = "does_not_exist";
    when(ctx.pathParam("username")).thenReturn("vol2");
    when(ctx.bodyAsClass(AuthRequests.AssignJobRoleRequest.class)).thenReturn(req);

    assertThrows(BadRequestResponse.class, () -> authController.assignVolunteerJobRole(ctx));
  }
}

