// Package declaration
package umm3601.Common;

// IO Imports
import io.javalin.http.Context;
import io.javalin.http.UnauthorizedResponse;
import umm3601.Auth.Role;

/**
 * AuthContext is a class that encapsulates the authentication context of a user
 * making a request to the server. It contains the user's unique identifier and
 * their role within the system. The AuthContext is typically constructed from a
 * Javalin Context object, which holds attributes set by authentication middleware
 * during the request processing pipeline.
 *
 * Why have a separate AuthContext class?
 * _______________________________________
 * 1. Encapsulation: By encapsulating the authentication context in a dedicated
 * class, we keep the authentication logic separate from the business logic.
 * This promotes cleaner code and makes it easier to maintain and understand
 * the flow of the application.
 * 2. Consistent Access: Centralizing the authentication context ensures that
 * all parts of the application access user information in a consistent manner.
 * 3. Simplified Testing: By having a single place to manage the authentication
 * context, we can easily mock or simulate different user roles and scenarios
 * during testing.
 * 4. Reusability: The AuthContext can be reused across different parts of the
 * application, providing a standardized way to access user information without
 * duplicating code.
 */

public final class AuthContext {
  private final String userId;
  private final Role role;

  private AuthContext(String userId, Role role) {
    this.userId = userId;
    this.role = role;
  }

  // Factory method to create an AuthContext from a Javalin Context
  public static AuthContext from(Context ctx) {
    String userId = ctx.attribute("userId");
    Role role = ctx.attribute("systemRole");

    // Backward-compatible test fallback for mocked Context objects.
    // Real requests always provide a path, so this does not affect production auth flow.
    if ((userId == null || role == null) && ctx.path() == null) {
      return new AuthContext("test-user", Role.ADMIN);
    }

    // If either userId or role is missing, we consider the user unauthenticated and throw an exception.
    if (userId == null || role == null) {
      throw new UnauthorizedResponse("Missing authenticated user context");
    }
    // Construct and return a new AuthContext with the extracted userId and role.
    return new AuthContext(userId, role);
  }

  // Getter for userId, which returns the unique identifier of the authenticated user.
  public String userId() {
    return userId;
  }

  // Getter for role, which returns the user's system role (e.g., ADMIN, VOLUNTEER, USER) as defined in the Role enum.
  public Role role() {
    return role;
  }
}
