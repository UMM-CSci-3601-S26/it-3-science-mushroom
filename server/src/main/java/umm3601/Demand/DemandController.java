package umm3601.Demand;

import com.mongodb.client.MongoDatabase;

import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;

public class DemandController {
  private static final String API_CURRENT_DEMAND = "/api/demand/current";

  private final DemandService demandService;

  public DemandController(MongoDatabase database) {
    this(new DemandService(database));
  }

  public DemandController(DemandService demandService) {
    this.demandService = demandService;
  }

  @Route(method = HttpMethod.GET, path = API_CURRENT_DEMAND)
  @RequirePermission("view_inventory")
  public void getCurrentDemand(Context ctx) {
    ctx.json(demandService.calculateCurrentDemand());
    ctx.status(HttpStatus.OK);
  }
}
