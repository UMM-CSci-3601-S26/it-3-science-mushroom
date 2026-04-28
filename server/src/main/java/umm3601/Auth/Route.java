// Package declaration
package umm3601.Auth;

// Java Imports
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Annotation to specify the route path and HTTP method for a route handler.
 * This annotation can be applied to methods that handle HTTP requests to define
 * the endpoint and the type of request it handles (e.g., GET, POST).
 *
 * Example usage:
 * `@Route(path = "/api/data", method = HttpMethod.GET)
 * public void getData(Context ctx) { ... }
 *
 * Why use an annotation?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Using an annotation like @Route allows us to declaratively specify routing
 * information directly on the methods that handle those routes. This promotes
 * separation of concerns, as the routing logic can be handled separately from
 * the business logic of the route handlers. It also enhances readability and
 * maintainability, making it clear at a glance which endpoints are defined and
 * what HTTP methods they support without having to dig through the
 * implementation details.
 */

@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface Route {
  String path();

  HttpMethod method();
}
