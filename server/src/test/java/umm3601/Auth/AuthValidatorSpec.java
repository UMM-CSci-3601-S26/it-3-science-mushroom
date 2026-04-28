package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.javalin.http.BadRequestResponse;

@SuppressWarnings("MagicNumber")
public class AuthValidatorSpec {
  private AuthValidator validator;

  @BeforeEach
  void setupEach() {
    validator = new AuthValidator();
  }

  @Test
  void validateLoginRejectsMissingBody() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateLogin(null));

    assertEquals("Login body is required", exception.getMessage());
  }

  @Test
  void validateLoginRejectsMissingUsername() {
    AuthRequests.LoginRequest request = new AuthRequests.LoginRequest();
    request.username = null;
    request.password = "password123";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateLogin(request));

    assertEquals("Username is required", exception.getMessage());
  }

  @Test
  void validateLoginRejectsBlankUsername() {
    AuthRequests.LoginRequest request = new AuthRequests.LoginRequest();
    request.username = " ";
    request.password = "password123";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateLogin(request));

    assertEquals("Username is required", exception.getMessage());
  }

  @Test
  void validateLoginRejectsMissingPassword() {
    AuthRequests.LoginRequest request = new AuthRequests.LoginRequest();
    request.username = "guardian";
    request.password = null;

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateLogin(request));

    assertEquals("Password is required", exception.getMessage());
  }

  @Test
  void validateLoginRejectsEmptyPassword() {
    AuthRequests.LoginRequest request = new AuthRequests.LoginRequest();
    request.username = "guardian";
    request.password = "";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateLogin(request));

    assertEquals("Password is required", exception.getMessage());
  }

  @Test
  void validateLoginAllowsValidBody() {
    AuthRequests.LoginRequest request = new AuthRequests.LoginRequest();
    request.username = "guardian";
    request.password = "password123";

    validator.validateLogin(request);
  }

  @Test
  void validateSignupRejectsMissingBody() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(null));

    assertEquals("Signup body is required", exception.getMessage());
  }

  @Test
  void validateSignupRejectsMissingUsername() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.username = null;

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Username is required", exception.getMessage());
  }

  @Test
  void validateSignupRejectsBlankUsername() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.username = " ";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Username is required", exception.getMessage());
  }

  @Test
  void validateSignupRejectsMissingPassword() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.password = null;

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Password must be at least 8 characters", exception.getMessage());
  }

  @Test
  void validateSignupRejectsShortPassword() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.password = "short";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Password must be at least 8 characters", exception.getMessage());
  }

  @Test
  void validateSignupRejectsMissingFullName() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.fullName = null;

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Full name is required", exception.getMessage());
  }

  @Test
  void validateSignupRejectsBlankFullName() {
    AuthRequests.SignupRequest request = validSignupRequest();
    request.fullName = " ";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateSignup(request));

    assertEquals("Full name is required", exception.getMessage());
  }

  @Test
  void validateSignupAllowsValidBody() {
    validator.validateSignup(validSignupRequest());
  }

  @Test
  void normalizeSignupEmailAllowsBlankGuardianEmail() {
    assertNull(validator.normalizeSignupEmail(Role.GUARDIAN, " "));
  }

  @Test
  void normalizeSignupEmailRejectsBlankVolunteerEmail() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.normalizeSignupEmail(Role.VOLUNTEER, null));

    assertEquals("Email is required", exception.getMessage());
  }

  @Test
  void normalizeSignupEmailRejectsInvalidEmail() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.normalizeSignupEmail(Role.GUARDIAN, "invalid"));

    assertEquals("Email must be valid", exception.getMessage());
  }

  @Test
  void normalizeSignupEmailTrimsValidEmail() {
    assertEquals("guardian@example.com",
      validator.normalizeSignupEmail(Role.GUARDIAN, " guardian@example.com "));
  }

  @Test
  void signupSystemRoleOnlyPreservesGuardianRole() {
    assertEquals(Role.GUARDIAN, validator.signupSystemRole(Role.GUARDIAN));
    assertEquals(Role.VOLUNTEER, validator.signupSystemRole(Role.ADMIN));
    assertEquals(Role.VOLUNTEER, validator.signupSystemRole(null));
  }

  @Test
  void normalizeRoleConfigRejectsMissingBody() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.normalizeRoleConfig(null));

    assertEquals("Role config body is required", exception.getMessage());
  }

  @Test
  void normalizeRoleConfigDefaultsMissingLists() {
    RoleConfig config = validator.normalizeRoleConfig(new RoleConfig());

    assertEquals(List.of(), config.permissions);
    assertEquals(List.of("volunteer_base"), config.inherits);
  }

  @Test
  void normalizeRoleConfigKeepsProvidedLists() {
    RoleConfig raw = new RoleConfig();
    raw.permissions = List.of("view_families");
    raw.inherits = List.of("frontdesk");

    RoleConfig config = validator.normalizeRoleConfig(raw);

    assertEquals(raw.permissions, config.permissions);
    assertEquals(raw.inherits, config.inherits);
  }

  @Test
  void validateJobRoleNameRejectsMissingName() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateJobRoleName(null));

    assertEquals("Job role name is required", exception.getMessage());
  }

  @Test
  void validateJobRoleNameRejectsBlankName() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.validateJobRoleName(" "));

    assertEquals("Job role name is required", exception.getMessage());
  }

  @Test
  void validateJobRoleNameRejectsSystemRoleNames() {
    assertThrows(BadRequestResponse.class, () -> validator.validateJobRoleName("admin"));
    assertThrows(BadRequestResponse.class, () -> validator.validateJobRoleName("GUARDIAN"));
    assertThrows(BadRequestResponse.class, () -> validator.validateJobRoleName("Volunteer"));
  }

  @Test
  void validateJobRoleNameReturnsCustomName() {
    assertEquals("frontdesk", validator.validateJobRoleName("frontdesk"));
  }

  @Test
  void requireAssignedJobRoleRejectsMissingRequest() {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.requireAssignedJobRole(null));

    assertEquals("jobRole is required", exception.getMessage());
  }

  @Test
  void requireAssignedJobRoleRejectsMissingJobRole() {
    AuthRequests.AssignJobRoleRequest request = new AuthRequests.AssignJobRoleRequest();
    request.jobRole = null;

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.requireAssignedJobRole(request));

    assertEquals("jobRole is required", exception.getMessage());
  }

  @Test
  void requireAssignedJobRoleRejectsBlankJobRole() {
    AuthRequests.AssignJobRoleRequest request = new AuthRequests.AssignJobRoleRequest();
    request.jobRole = " ";

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> validator.requireAssignedJobRole(request));

    assertEquals("jobRole is required", exception.getMessage());
  }

  @Test
  void requireAssignedJobRoleReturnsValidatedRole() {
    AuthRequests.AssignJobRoleRequest request = new AuthRequests.AssignJobRoleRequest();
    request.jobRole = "frontdesk";

    assertEquals("frontdesk", validator.requireAssignedJobRole(request));
  }

  private AuthRequests.SignupRequest validSignupRequest() {
    AuthRequests.SignupRequest request = new AuthRequests.SignupRequest();
    request.username = "guardian";
    request.password = "password123";
    request.fullName = "Guardian User";
    request.email = "guardian@example.com";
    request.systemRole = Role.GUARDIAN;
    return request;
  }
}
