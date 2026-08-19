package umm3601.PurchaseList;

import com.mongodb.client.MongoDatabase;

import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.RequireRole;
import umm3601.Auth.Role;
import umm3601.Auth.Route;

public class PurchaseListController {
  private static final String API_CURRENT_PURCHASE_LIST = "/api/purchase-list/current";
  private static final String API_CALCULATE_PURCHASE_LIST = "/api/purchase-list/calculate";

  private final PurchaseListService purchaseListService;

  public PurchaseListController(MongoDatabase database) {
    this(new PurchaseListService(database));
  }

  public PurchaseListController(PurchaseListService purchaseListService) {
    this.purchaseListService = purchaseListService;
  }

  @Route(method = HttpMethod.GET, path = API_CURRENT_PURCHASE_LIST)
  @RequireRole(Role.ADMIN)
  @RequirePermission("view_inventory")
  public void getCurrentPurchaseList(Context ctx) {
    ctx.json(purchaseListService.getCurrentPurchaseList());
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.POST, path = API_CALCULATE_PURCHASE_LIST)
  @RequireRole(Role.ADMIN)
  @RequirePermission("view_inventory")
  public void calculatePurchaseList(Context ctx) {
    ctx.json(purchaseListService.calculateNewPurchaseList());
    ctx.status(HttpStatus.OK);
  }

}
