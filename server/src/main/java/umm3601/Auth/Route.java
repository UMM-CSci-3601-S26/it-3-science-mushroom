// Package
package umm3601.Auth;

// Java imports
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Declares the path and HTTP method for a controller method.
 *
 * RouteRegistrar reads this annotation at startup and registers the method with
 * Javalin. Keeping route metadata beside the handler makes the controller easy
 * to scan while still centralizing the reflection-based registration logic.
 */
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Route {
  String path();

  HttpMethod method();
}
