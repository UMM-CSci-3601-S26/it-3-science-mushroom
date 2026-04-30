package umm3601.Common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;

import io.javalin.http.Context;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Auth.Role;

class AuthContextSpec {
  @Test
  void fromUsesAuthenticatedAttributes() {
    Context ctx = mock(Context.class);
    when(ctx.attribute("userId")).thenReturn("user-1");
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    when(ctx.path()).thenReturn("/api/family");

    AuthContext auth = AuthContext.from(ctx);

    assertEquals("user-1", auth.userId());
    assertEquals(Role.VOLUNTEER, auth.role());
  }

  @Test
  void fromSupportsMockContextFallbackWhenPathIsNull() {
    Context ctx = mock(Context.class);
    when(ctx.path()).thenReturn(null);

    AuthContext auth = AuthContext.from(ctx);

    assertEquals("test-user", auth.userId());
    assertEquals(Role.ADMIN, auth.role());
  }

  @Test
  void fromRejectsMissingUserOrRoleOnRealRequests() {
    Context missingUser = mock(Context.class);
    when(missingUser.attribute("userId")).thenReturn(null);
    when(missingUser.attribute("systemRole")).thenReturn(Role.ADMIN);
    when(missingUser.path()).thenReturn("/api/users");

    Context missingRole = mock(Context.class);
    when(missingRole.attribute("userId")).thenReturn("user-1");
    when(missingRole.attribute("systemRole")).thenReturn(null);
    when(missingRole.path()).thenReturn("/api/users");

    assertThrows(UnauthorizedResponse.class, () -> AuthContext.from(missingUser));
    assertThrows(UnauthorizedResponse.class, () -> AuthContext.from(missingRole));
  }
}
