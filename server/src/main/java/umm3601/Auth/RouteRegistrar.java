// Package declaration
package umm3601.Auth;

// Java Imports
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.Handler;

/**
 * RouteRegistrar is a utility class responsible for registering route handlers
 * with the Javalin application.
 * It uses reflection to scan the provided controller object for methods
 * annotated with @Route and registers them as handlers for the specified HTTP
 * methods and paths.
 *
 * The register method takes three parameters:
 * - app
 * - controller
 * - permissionsService
 *
 * For each method in the controller that is annotated with @Route, a new
 * SecuredHandler is created, which wraps the original method and incorporates
 * permission checks using the provided PermissionsService. The route is then
 * registered with the appropriate HTTP method and path as specified in
 * the @Route annotation.
 *
 * This approach allows for a clean separation of route definitions in
 * controller classes while centralizing the registration logic in this utility
 * class, making it easier to manage and maintain routes across the application.
 */

public class RouteRegistrar {
  private static final int DYNAMIC_SEGMENT_SCORE = 1;
  private static final int STATIC_SEGMENT_SCORE = 10;

  /**
   * Registers route handlers from the provided controller with the Javalin
   * application. It scans the controller for methods annotated with @Route,
   * creates a SecuredHandler for each route, and registers it with the
   * appropriate HTTP method and path. The permissionsService is passed to the
   * SecuredHandler to enable permission checks based on annotations
   * like @RequireRole and @RequirePermission.
   *
   * @param app                The Javalin application instance to which the
   *                           routes will be registered.
   * @param controller         An instance of a controller class that contains
   *                           methods annotated with @Route.
   * @param permissionsService The PermissionsService instance used to check
   *                           permissions for secured routes.
   */
  public static void register(Javalin app, Object controller, PermissionsService permissionsService) {
    Method[] methods = controller.getClass().getDeclaredMethods();
    Arrays.sort(methods, Comparator.comparingInt(RouteRegistrar::routeSpecificity).reversed());

    for (Method method : methods) {

      if (!method.isAnnotationPresent(Route.class)) {
        continue;
      }

      Route route = method.getAnnotation(Route.class);
      Handler handler = new SecuredHandler(controller, method, permissionsService);

      switch (route.method()) {
        case GET -> app.get(route.path(), handler);
        case POST -> app.post(route.path(), handler);
        case PUT -> app.put(route.path(), handler);
        case DELETE -> app.delete(route.path(), handler);
        case PATCH -> app.patch(route.path(), handler);
        default -> throw new IllegalArgumentException("Unsupported HTTP method: " + route.method());
      }
    }
  }

  private static int routeSpecificity(Method method) {
    Route route = method.getAnnotation(Route.class);
    if (route == null) {
      return Integer.MIN_VALUE;
    }

    String[] segments = route.path().split("/");
    int score = 0;
    for (String segment : segments) {
      if (segment == null || segment.isBlank()) {
        continue;
      }
      if (segment.startsWith("{") && segment.endsWith("}")) {
        score += DYNAMIC_SEGMENT_SCORE;
      } else {
        score += STATIC_SEGMENT_SCORE;
      }
    }
    return score;
  }
}
