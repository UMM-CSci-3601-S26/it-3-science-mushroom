// Package
package umm3601.Auth;

// Java imports
import java.lang.reflect.Method;

// Javalin imports
import io.javalin.http.Context;
import io.javalin.http.Handler;

// App imports
import umm3601.Middleware.AuthMiddleware;

/**
 * Javalin handler wrapper for annotation-based authorization.
 *
 * AuthMiddleware has already populated the request's auth attributes. This
 * wrapper reads the route method's annotations and applies any route-specific
 * role or permission checks before invoking the controller method.
 */
public class SecuredHandler implements Handler {
  private final Object controller;
  private final Method method;
  private final PermissionsService permissionsService;

  public SecuredHandler(Object controller, Method method, PermissionsService permissionsService) {
    this.controller = controller;
    this.method = method;
    this.permissionsService = permissionsService;
  }

  /**
   * The handle method is called by Javalin when a request matches the route associated with this handler.
   * It checks for the presence of @RequireRole and @RequirePermission annotations on the controller method,
   * and enforces the specified role and permission requirements using AuthMiddleware before invoking the
   * controller method.
   * If the user does not meet the role or permission requirements, an appropriate error response is
   * sent and the controller method is not invoked.
   * @param ctx the Javalin Context object representing the HTTP request and response
   * @throws Exception if an error occurs while invoking the controller method
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
