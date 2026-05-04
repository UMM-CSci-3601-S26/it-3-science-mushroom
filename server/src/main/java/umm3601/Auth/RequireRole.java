// Package
package umm3601.Auth;

// Java imports
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a route as requiring a minimum system role.
 *
 * This is separate from volunteer job-role permissions. Use it for coarse
 * system-level gates such as admin-only user management.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequireRole {
  Role value();
}
