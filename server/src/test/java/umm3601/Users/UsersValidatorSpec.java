package umm3601.Users;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.bson.types.ObjectId;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.javalin.http.BadRequestResponse;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.Role;

class UsersValidatorSpec {
  private PermissionsService permissionsService;
  private UsersValidator validator;

  @BeforeEach
  void setup() {
    permissionsService = mock(PermissionsService.class);
    validator = new UsersValidator(permissionsService);
  }

  @Test
  void validateIdAcceptsObjectIdsAndRejectsBadIds() {
    String id = new ObjectId().toHexString();

    assertEquals(id, validator.validateId(id));
    assertThrows(BadRequestResponse.class, () -> validator.validateId("not-an-object-id"));
  }

  @Test
  void requiresNamesAndTrimsValidValues() {
    assertEquals("volunteer", validator.requireUsername(" volunteer "));
    assertEquals("Ada Lovelace", validator.requireFullName(" Ada Lovelace "));

    assertThrows(BadRequestResponse.class, () -> validator.requireUsername(null));
    assertThrows(BadRequestResponse.class, () -> validator.requireUsername(" "));
    assertThrows(BadRequestResponse.class, () -> validator.requireFullName(null));
    assertThrows(BadRequestResponse.class, () -> validator.requireFullName(" "));
  }

  @Test
  void normalizeEmailHandlesGuardianBlankVolunteerBlankInvalidAndValid() {
    assertNull(validator.normalizeEmail(Role.GUARDIAN, " "));
    assertThrows(BadRequestResponse.class, () -> validator.normalizeEmail(Role.VOLUNTEER, " "));
    assertThrows(BadRequestResponse.class, () -> validator.normalizeEmail(Role.ADMIN, "not-email"));
    assertEquals("user@example.com", validator.normalizeEmail(Role.ADMIN, " user@example.com "));
  }

  @Test
  void passwordsAreValidated() {
    assertEquals("password1", validator.requirePassword("password1"));
    assertThrows(BadRequestResponse.class, () -> validator.requirePassword(null));
    assertThrows(BadRequestResponse.class, () -> validator.requirePassword("short"));

    assertNull(validator.optionalPassword(null));
    assertNull(validator.optionalPassword(" "));
    assertThrows(BadRequestResponse.class, () -> validator.optionalPassword("short"));
    assertEquals("new-password", validator.optionalPassword("new-password"));
  }

  @Test
  void systemAndJobRolesAreValidated() {
    assertEquals(Role.ADMIN, validator.requireSystemRole(Role.ADMIN));
    assertThrows(BadRequestResponse.class, () -> validator.requireSystemRole(null));

    assertNull(validator.normalizeJobRole(Role.ADMIN, "inventory"));

    when(permissionsService.roleExists("volunteer_base")).thenReturn(true);
    when(permissionsService.roleExists("inventory")).thenReturn(true);
    when(permissionsService.roleExists("missing")).thenReturn(false);

    assertEquals("volunteer_base", validator.normalizeJobRole(Role.VOLUNTEER, null));
    assertEquals("volunteer_base", validator.normalizeJobRole(Role.VOLUNTEER, " "));
    assertEquals("inventory", validator.normalizeJobRole(Role.VOLUNTEER, " inventory "));
    assertThrows(BadRequestResponse.class, () -> validator.normalizeJobRole(Role.VOLUNTEER, "missing"));
  }
}
