package umm3601.PurchaseList;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.lang.reflect.Method;
import java.util.List;

import org.junit.jupiter.api.Test;

import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.HttpStatus;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.RouteRegistrar;
import umm3601.Auth.Role;
import umm3601.Auth.SecuredHandler;

class PurchaseListControllerSpec {

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    PurchaseListController purchaseListController = new PurchaseListController(
      mock(PurchaseListService.class));

    RouteRegistrar.register(mockServer, purchaseListController, null);

    verify(mockServer).get(any(), any());
    verify(mockServer).post(any(), any());
    verify(mockServer).put(any(), any());
  }

  @Test
  void getCurrentPurchaseListReturnsSnapshot() {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.summary = new PurchaseListSummary();
    snapshot.items = List.of();

    when(purchaseListService.getCurrentPurchaseList()).thenReturn(snapshot);

    new PurchaseListController(purchaseListService).getCurrentPurchaseList(ctx);

    verify(ctx).json(snapshot);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void calculatePurchaseListReturnsNewSnapshot() {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.summary = new PurchaseListSummary();
    snapshot.items = List.of();

    when(purchaseListService.calculateNewPurchaseList()).thenReturn(snapshot);

    new PurchaseListController(purchaseListService).calculatePurchaseList(ctx);

    verify(ctx).json(snapshot);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void saveCurrentPurchaseListReturnsSavedSnapshot() {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.summary = new PurchaseListSummary();
    snapshot.items = List.of();

    when(ctx.bodyAsClass(PurchaseListSnapshot.class)).thenReturn(snapshot);
    when(purchaseListService.saveCurrentPurchaseList(snapshot)).thenReturn(snapshot);

    new PurchaseListController(purchaseListService).saveCurrentPurchaseList(ctx);

    verify(ctx).json(snapshot);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void rejectsNonAdminRequestsThroughSecuredRoute() throws Exception {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);

    Method method = PurchaseListController.class.getDeclaredMethod("getCurrentPurchaseList", Context.class);

    assertThrows(ForbiddenResponse.class, () ->
        new SecuredHandler(
            new PurchaseListController(purchaseListService),
            method,
            mock(PermissionsService.class))
        .handle(ctx));
    verifyNoInteractions(purchaseListService);
  }

  @Test
  void rejectsNonAdminCalculateRequestsThroughSecuredRoute() throws Exception {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);

    Method method = PurchaseListController.class.getDeclaredMethod("calculatePurchaseList", Context.class);

    assertThrows(ForbiddenResponse.class, () ->
        new SecuredHandler(
            new PurchaseListController(purchaseListService),
            method,
            mock(PermissionsService.class))
        .handle(ctx));
    verifyNoInteractions(purchaseListService);
  }

  @Test
  void rejectsNonAdminSaveRequestsThroughSecuredRoute() throws Exception {
    PurchaseListService purchaseListService = mock(PurchaseListService.class);
    Context ctx = mock(Context.class);
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);

    Method method = PurchaseListController.class.getDeclaredMethod("saveCurrentPurchaseList", Context.class);

    assertThrows(ForbiddenResponse.class, () ->
        new SecuredHandler(
            new PurchaseListController(purchaseListService),
            method,
            mock(PermissionsService.class))
        .handle(ctx));
    verifyNoInteractions(purchaseListService);
  }
}
