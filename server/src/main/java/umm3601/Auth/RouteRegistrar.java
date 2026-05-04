// Package
package umm3601.Auth;

// Java imports
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.Comparator;

// Javalin imports
import io.javalin.Javalin;
import io.javalin.http.Handler;

/**
 * Registers all @Route methods on a controller with Javalin.
 *
 * Controllers no longer need an addRoutes method. Bootstrap creates controller
 * instances, then this registrar discovers each annotated method and wraps it in
 * SecuredHandler so role and permission annotations are enforced consistently.
 */
public class RouteRegistrar {
  private static final int DYNAMIC_SEGMENT_SCORE = 1; // Dynamic segments are less specific than static ones, so they get a lower score.
  private static final int STATIC_SEGMENT_SCORE = 10; // Static segments are more specific, so they get a higher score.

  /**
   * Scans the given controller for methods annotated with @Route and registers them with the provided Javalin app.
   * Methods are sorted by route specificity to ensure that more specific routes are registered before less specific ones,
   * preventing route conflicts.
   * @param app the Javalin app to register routes on
   * @param controller the controller instance containing the @Route methods
   * @param permissionsService the service used to enforce role and permission checks in the SecuredHandler
   * @throws IllegalArgumentException if an unsupported HTTP method is specified in a @Route annotation
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

  /**
   * routeSpecificity calculates a score for a method based on the specificity of its @Route path.
   * Static segments contribute more to the score than dynamic segments, ensuring that more specific routes
   * are registered before less specific ones.
   * @param method the method to calculate the route specificity for
   * @return an integer score representing the route specificity, with higher scores indicating more specific routes
   */
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

      // Register static routes before parameterized ones so /api/users/search
      // wins over patterns such as /api/users/{id}.
      if (segment.startsWith("{") && segment.endsWith("}")) {
        score += DYNAMIC_SEGMENT_SCORE;
      } else {
        score += STATIC_SEGMENT_SCORE;
      }
    }
    return score;
  }
}
