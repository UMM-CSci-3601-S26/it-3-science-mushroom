package umm3601.Common;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import umm3601.Auth.Role;
import umm3601.Users.UsersPolicy;

class PolicySpec {

  @Test
  void usersPolicyAllowsAdminsOnly() {
    UsersPolicy policy = new UsersPolicy();

    assertDoesNotThrow(() -> policy.authorizeManage(auth(Role.ADMIN)));

    ForbiddenResponse exception =
        assertThrows(ForbiddenResponse.class, () -> policy.authorizeManage(auth(Role.VOLUNTEER)));
    assertEquals("Only admins can manage users", exception.getMessage());
  }

  private AuthContext auth(Role role) {
    Context ctx = mock(Context.class);
    when(ctx.attribute("userId")).thenReturn("policy-user");
    when(ctx.attribute("systemRole")).thenReturn(role);
    when(ctx.path()).thenReturn("/policy-test");
    return AuthContext.from(ctx);
  }
}
