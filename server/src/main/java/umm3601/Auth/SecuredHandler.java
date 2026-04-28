// Package declaration
package umm3601.Auth;

// Java Imports
import java.lang.reflect.Method;

// IO Imports
import io.javalin.http.Context;
import io.javalin.http.Handler;
import umm3601.Middleware.AuthMiddleware;

/**
 * SecuredHandler is a custom Javalin Handler that wraps route handler methods
 * and incorporates permission checks based on annotations.
 * It uses reflection to inspect the annotations on the route handler method and
 * applies the necessary authorization logic before invoking the original
 * method.
 *
 * The constructor takes three parameters: controller, method,
 * permissionsService
 *
 * In the handle method, we first check for the presence of @RequireRole
 * and @RequirePermission annotations on the method. If either annotation is
 * present, we call the corresponding AuthMiddleware methods to enforce the
 * required role or permission. If the checks pass, we then invoke the original
 * route handler method using reflection, passing in the Javalin Context object.
 *
 * This design allows us to centralize authorization logic in this handler while
 * keeping our route handlers clean and focused on their primary
 * responsibilities.
 */

public class SecuredHandler implements Handler {
  private final Object controller;
  private final Method method;
  private final PermissionsService permissionsService;

  /**
   * Constructs a new SecuredHandler.
   *
   * @param controller         The instance of the controller containing the route handler method.
   * @param method             The Method object representing the route handler method to be invoked.
   * @param permissionsService The PermissionsService instance used for permission checks.
   */
  public SecuredHandler(Object controller, Method method, PermissionsService permissionsService) {
    this.controller = controller;
    this.method = method;
    this.permissionsService = permissionsService;
  }

  /**
   * Handles the incoming HTTP request by performing authorization checks
   * based on annotations and then invoking the original route handler method.
   *
   * @param ctx The Javalin Context object representing the HTTP request and response.
   * @throws Exception If an error occurs during method invocation or authorization checks.
   */
  @Override
  public void handle(Context ctx) throws Exception {

    if (method.isAnnotationPresent(RequireRole.class)) {
      Role role = method.getAnnotation(RequireRole.class).value();
      AuthMiddleware.requireRole(ctx, role);
    }

    if (method.isAnnotationPresent(RequirePermission.class)) {
      String permission = method.getAnnotation(RequirePermission.class).value();
      AuthMiddleware.requirePermission(ctx, permissionsService, permission);
    }
    method.invoke(controller, ctx);
  }
}
