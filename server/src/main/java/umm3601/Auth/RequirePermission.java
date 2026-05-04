// Package
package umm3601.Auth;

// Java imports
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks a route as requiring a named permission.
 *
 * SecuredHandler passes the permission string to AuthMiddleware, where admins
 * bypass checks, guardians are limited to the family portal permission, and
 * volunteers are checked against their effective job-role permissions.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface RequirePermission {
  String value();
}
