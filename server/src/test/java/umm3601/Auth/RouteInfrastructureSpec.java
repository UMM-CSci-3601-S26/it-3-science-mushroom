package umm3601.Auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;

@SuppressWarnings("MagicNumber")
class RouteInfrastructureSpec {

  @Test
  void routeAnnotationsExposeConfiguredMetadata() throws NoSuchMethodException {
    Method method = AnnotatedController.class.getDeclaredMethod("adminOnly", Context.class);

    Route route = method.getAnnotation(Route.class);
    RequireRole requireRole = method.getAnnotation(RequireRole.class);
    RequirePermission requirePermission = method.getAnnotation(RequirePermission.class);

    assertNotNull(route);
    assertEquals(HttpMethod.PATCH, route.method());
    assertEquals("/api/example/admin", route.path());

    assertNotNull(requireRole);
    assertEquals(Role.ADMIN, requireRole.value());

    assertNotNull(requirePermission);
    assertEquals("edit_schools", requirePermission.value());
  }

  @Test
  void securedHandlerInvokesAnnotatedMethodAfterChecks() throws Exception {
    PermissionsService permissionsService = mock(PermissionsService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.ADMIN);

    AnnotatedController controller = new AnnotatedController();
    Method method = AnnotatedController.class.getDeclaredMethod("adminOnly", Context.class);

    new SecuredHandler(controller, method, permissionsService).handle(ctx);

    assertTrue(controller.adminOnlyCalled);
  }

  @Test
  void securedHandlerRejectsMissingRoleBeforeInvokingController() throws Exception {
    PermissionsService permissionsService = mock(PermissionsService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.GUARDIAN);

    AnnotatedController controller = new AnnotatedController();
    Method method = AnnotatedController.class.getDeclaredMethod("adminOnly", Context.class);

    assertThrows(ForbiddenResponse.class, () -> new SecuredHandler(controller, method, permissionsService).handle(ctx));
    assertFalse(controller.adminOnlyCalled);
  }

  @Test
  void securedHandlerAllowsVolunteerWithMatchingPermission() throws Exception {
    PermissionsService permissionsService = mock(PermissionsService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);
    when(ctx.attribute("jobRole")).thenReturn("inventory_manager");
    when(permissionsService.getEffectivePermissions("inventory_manager")).thenReturn(java.util.Set.of("view_settings"));

    AnnotatedController controller = new AnnotatedController();
    Method method = AnnotatedController.class.getDeclaredMethod("permissionOnly", Context.class);

    new SecuredHandler(controller, method, permissionsService).handle(ctx);

    assertTrue(controller.permissionOnlyCalled);
  }

  @Test
  void routeRegistrarRegistersStaticRouteBeforeParameterizedRoute() {
    Javalin app = mock(Javalin.class);
    PermissionsService permissionsService = mock(PermissionsService.class);

    RouteRegistrar.register(app, new RegistrarController(), permissionsService);

    InOrder inOrder = inOrder(app);
    inOrder.verify(app).get(eq("/api/example/static"), any());
    inOrder.verify(app).get(eq("/api/example/{id}"), any());
  }

  @Test
  void routeRegistrarSkipsMethodsWithoutRouteAnnotation() {
    Javalin app = mock(Javalin.class);

    RouteRegistrar.register(app, new RegistrarController(), mock(PermissionsService.class));

    verify(app).get(eq("/api/example/static"), any());
    verify(app).get(eq("/api/example/{id}"), any());
    verify(app).patch(eq("/api/example/admin"), any());
  }

  @Test
  void securedHandlerWithoutAnnotationsDirectlyInvokesMethod() throws Exception {
    PermissionsService permissionsService = mock(PermissionsService.class);
    Context ctx = mock(Context.class);
    PlainController controller = new PlainController();
    Method method = PlainController.class.getDeclaredMethod("plain", Context.class);

    new SecuredHandler(controller, method, permissionsService).handle(ctx);

    assertTrue(controller.plainCalled);
    verifyNoInteractions(permissionsService);
  }

  static class AnnotatedController {
    private boolean adminOnlyCalled;
    private boolean permissionOnlyCalled;

    @Route(method = HttpMethod.PATCH, path = "/api/example/admin")
    @RequireRole(Role.ADMIN)
    @RequirePermission("edit_schools")
    public void adminOnly(Context ctx) {
      adminOnlyCalled = true;
    }

    @RequirePermission("view_settings")
    public void permissionOnly(Context ctx) {
      permissionOnlyCalled = true;
    }
  }

  static class RegistrarController {
    @Route(method = HttpMethod.GET, path = "/api/example/{id}")
    public void byId(Context ctx) {
    }

    @Route(method = HttpMethod.GET, path = "/api/example/static")
    public void staticRoute(Context ctx) {
    }

    @Route(method = HttpMethod.PATCH, path = "/api/example/admin")
    public void patchRoute(Context ctx) {
    }

    public void helper(Context ctx) {
    }
  }

  static class PlainController {
    private boolean plainCalled;

    public void plain(Context ctx) {
      plainCalled = true;
    }
  }
}
