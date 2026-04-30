package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Users.Users;
import umm3601.Users.UsersService;


public class AuthServiceSpec {
  private static final String TEST_JWT_SECRET = "test-secret-for-auth-service-spec-which-is-long-enough";
  private AuthService authService;

  private static AuthValidator validator;

  @BeforeAll
  static void setup() {
    validator = new AuthValidator();
  }

  @AfterAll
  static void teardown() {
    validator = null;
  }

  @BeforeEach
  void beforeEach() {
    authService = new AuthService(null, null, null, validator);
  }

  @Test
  void validateLoginRejectsInvalidUsernames() {
    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "invalid username";
    req.password = "password";

    assertThrows(NullPointerException.class, () -> authService.login(req));
  }

  @Test
  void validateLoginRejectsInvalidPasswords() {
    AuthRequests.LoginRequest req = new AuthRequests.LoginRequest();
    req.username = "validusername";
    req.password = "short";

    assertThrows(NullPointerException.class, () -> authService.login(req));
  }

  @Test
  void validateSignupRejectsInvalidUsernames() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "invalid username";
    req.password = "validpassword";
    req.fullName = "Valid Name";
    req.email = "valid@email.com";
    req.systemRole = Role.ADMIN;

    assertThrows(NullPointerException.class, () -> authService.signup(req));
  }

  @Test
  void validateSignupRejectsInvalidPasswords() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "validusername";
    req.password = "short";
    req.fullName = "Valid Name";
    req.email = "valid@email.com";
    req.systemRole = Role.ADMIN;

    assertThrows(BadRequestResponse.class, () -> authService.signup(req));
  }

  @Test
  void validateSignupRejectsInvalidFullNames() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "validusername";
    req.password = "validpassword";
    req.fullName = "   ";
    req.email = "valid@email.com";
    req.systemRole = Role.ADMIN;

    assertThrows(BadRequestResponse.class, () -> authService.signup(req));
  }

  @Test
  void validateSignupRejectsInvalidEmails() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "validusername";
    req.password = "validpassword";
    req.fullName = "Valid Name";
    req.email = "invalidemail";
    req.systemRole = Role.ADMIN;

    assertThrows(NullPointerException.class, () -> authService.signup(req));
  }

  @Test
  void validateSignupRejectsMissingEmailsForNonGuardians() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "validusername";
    req.password = "validpassword";
    req.fullName = "Valid Name";
    req.email = "   ";
    req.systemRole = Role.ADMIN;

    assertThrows(NullPointerException.class, () -> authService.signup(req));
  }

  @Test
  void validateSignupAllowsMissingEmailsForGuardians() {
    AuthRequests.SignupRequest req = new AuthRequests.SignupRequest();
    req.username = "validusername";
    req.password = "validpassword";
    req.fullName = "Valid Name";
    req.email = "   ";
    req.systemRole = Role.GUARDIAN;

    assertThrows(NullPointerException.class, () -> authService.signup(req));
  }

  @Test
  void buildAccessProfileReturnsRoleSpecificPermissions() {
    PermissionsService permissionsService = mock(PermissionsService.class);
    when(permissionsService.getEffectivePermissions("frontdesk")).thenReturn(Set.of("view_inventory"));
    AuthService service = new AuthService(null, "secret", permissionsService, validator);

    Map<String, Object> adminProfile = service.buildAccessProfile(Role.ADMIN, null);
    Map<String, Object> guardianProfile = service.buildAccessProfile(Role.GUARDIAN, null);
    Map<String, Object> volunteerProfile = service.buildAccessProfile(Role.VOLUNTEER, "frontdesk");

    assertEquals(Role.ADMIN.name(), adminProfile.get("systemRole"));
    assertEquals(java.util.List.of("*"), adminProfile.get("permissions"));
    assertFalse(adminProfile.containsKey("jobRole"));

    assertEquals(java.util.List.of("family_portal_access"), guardianProfile.get("permissions"));

    assertEquals("frontdesk", volunteerProfile.get("jobRole"));
    assertTrue(((java.util.List<?>) volunteerProfile.get("permissions")).contains("view_inventory"));
  }

  @Test
  void assignVolunteerJobRoleValidatesUserRoleAndJobRole() {
    UsersService usersService = mock(UsersService.class);
    PermissionsService permissionsService = mock(PermissionsService.class);
    AuthService service = new AuthService(usersService, "secret", permissionsService, validator);

    assertThrows(BadRequestResponse.class, () -> service.assignVolunteerJobRole("missing", "frontdesk"));

    Users admin = new Users();
    admin.username = "admin";
    admin.systemRole = Role.ADMIN;
    when(usersService.findByUsername("admin")).thenReturn(admin);
    assertThrows(BadRequestResponse.class, () -> service.assignVolunteerJobRole("admin", "frontdesk"));

    Users volunteer = new Users();
    volunteer.username = "volunteer";
    volunteer.systemRole = Role.VOLUNTEER;
    when(usersService.findByUsername("volunteer")).thenReturn(volunteer);
    when(permissionsService.roleExists("missing")).thenReturn(false);
    assertThrows(BadRequestResponse.class, () -> service.assignVolunteerJobRole("volunteer", "missing"));

    when(permissionsService.roleExists("frontdesk")).thenReturn(true);
    service.assignVolunteerJobRole("volunteer", "frontdesk");
    verify(usersService).updateUserJobRole("volunteer", "frontdesk");
  }

  @Test
  void getCurrentAccessProfileRejectsMissingToken() {
    AuthService service = new AuthService(null, "secret", null, validator);

    assertThrows(UnauthorizedResponse.class, () -> service.getCurrentAccessProfile(null));
  }

  @Test
  void getCurrentAccessProfileRejectsInvalidTokensAndMissingUsers() {
    UsersService usersService = mock(UsersService.class);
    PermissionsService permissionsService = mock(PermissionsService.class);
    AuthService service = new AuthService(usersService, TEST_JWT_SECRET, permissionsService, validator);
    String token = JwtUtils.createToken("missing-id", Role.VOLUNTEER, "frontdesk", TEST_JWT_SECRET);

    assertThrows(UnauthorizedResponse.class, () -> service.getCurrentAccessProfile("not-a-token"));
    assertThrows(UnauthorizedResponse.class, () -> service.getCurrentAccessProfile(token));
  }

  @Test
  void getCurrentAccessProfileRejectsUsersWithoutSystemRole() {
    UsersService usersService = mock(UsersService.class);
    AuthService service = new AuthService(usersService, TEST_JWT_SECRET, mock(PermissionsService.class), validator);

    Users user = new Users();
    user._id = "no-role-id";
    user.username = "no-role";
    user.systemRole = null;
    when(usersService.findById("no-role-id")).thenReturn(user);

    String token = JwtUtils.createToken("no-role-id", Role.VOLUNTEER, null, TEST_JWT_SECRET);

    assertThrows(UnauthorizedResponse.class, () -> service.getCurrentAccessProfile(token));
  }

  @Test
  void getCurrentAccessProfileNormalizesVolunteerAndAdminIdentities() {
    UsersService usersService = mock(UsersService.class);
    PermissionsService permissionsService = mock(PermissionsService.class);
    when(permissionsService.getEffectivePermissions("volunteer_base")).thenReturn(Set.of("view_inventory"));
    AuthService service = new AuthService(usersService, TEST_JWT_SECRET, permissionsService, validator);

    Users volunteer = new Users();
    volunteer._id = "volunteer-id";
    volunteer.username = "volunteer";
    volunteer.fullName = "Volunteer User";
    volunteer.email = "volunteer@example.com";
    volunteer.systemRole = Role.VOLUNTEER;
    volunteer.jobRole = " ";
    when(usersService.findById("volunteer-id")).thenReturn(volunteer);

    String volunteerToken = JwtUtils.createToken("volunteer-id", Role.VOLUNTEER, null, TEST_JWT_SECRET);
    Map<String, Object> volunteerProfile = service.getCurrentAccessProfile(volunteerToken);

    assertEquals("volunteer_base", volunteerProfile.get("jobRole"));
    verify(usersService).updateUserJobRole("volunteer", "volunteer_base");

    Users admin = new Users();
    admin._id = "admin-id";
    admin.username = "admin";
    admin.fullName = "Admin User";
    admin.email = "admin@example.com";
    admin.systemRole = Role.ADMIN;
    admin.jobRole = "frontdesk";
    when(usersService.findById("admin-id")).thenReturn(admin);

    String adminToken = JwtUtils.createToken("admin-id", Role.ADMIN, "frontdesk", TEST_JWT_SECRET);
    Map<String, Object> adminProfile = service.getCurrentAccessProfile(adminToken);

    assertEquals(Role.ADMIN.name(), adminProfile.get("systemRole"));
    assertFalse(adminProfile.containsKey("jobRole"));
  }
}
