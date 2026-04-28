// Package declaration
package umm3601.Auth;

// Java Imports
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to specify required permissions for accessing a route. This
 * annotation can be applied to route handler methods to indicate the specific
 * permission required for access. The value of the annotation should correspond
 * to a permission defined in the RolePermissions configuration.
 *
 * Example usage:
 * `@RequirePermission("view_reports")
 * public void getReports(Context ctx) { ... }
 *
 * Why use an annotation?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Using an annotation like @RequirePermission allows us to declaratively
 * specify access control requirements directly on route handler methods. This
 * promotes separation of concerns, as the authorization logic can be handled
 * separately from the business logic of the route handlers. It also enhances
 * readability and maintainability, making it clear at a glance which
 * permissions are required for each route without having to dig through the
 * implementation details.
 */

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequirePermission {
  String value();
}
