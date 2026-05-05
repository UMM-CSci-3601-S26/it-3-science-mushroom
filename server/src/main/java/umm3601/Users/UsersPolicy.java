// Package
package umm3601.Users;

// Javalin imports
import io.javalin.http.ForbiddenResponse;

// App imports
import umm3601.Auth.Role;
import umm3601.Common.AuthContext;

/**
 * Policy checks for user management.
 *
 * The route annotation already requires ADMIN, but this explicit policy keeps
 * the business rule reusable and easy to unit test.
 */
public class UsersPolicy {
  public void authorizeManage(AuthContext auth) {
    if (auth.role() != Role.ADMIN) {
      throw new ForbiddenResponse("Only admins can manage users");
    }
  }
}
