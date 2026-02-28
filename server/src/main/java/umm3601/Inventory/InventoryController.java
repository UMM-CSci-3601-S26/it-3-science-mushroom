package umm3601.Inventory;

import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Pattern;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Sorts;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Controller;

public class InventoryController implements Controller {

  private static final String API_INVENTORY = "/api/inventory";
  private static final String API_INVENTORY_BY_ID = "/api/inventory/{id}";

  static final String SCHOOL_KEY = "school";
  static final String GRADE_KEY = "grade";
  static final String ITEM_KEY = "item";
  static final String DESCRIPTION_KEY = "description";
  static final String QUANTITY_KEY = "quantity";
  static final String PROPERTIES_KEY = "properties";
  static final String SORT_ORDER_KEY = "sortorder";

  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public InventoryController(MongoDatabase database) {
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public void getInventory(Context ctx) {
    String id = ctx.pathParam("id");
    Inventory inv;

    try {
      inv = inventoryCollection.find(eq("_id", new ObjectId(id))).first();
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested inventory id wasn't a legal Mongo Object ID.");
    }

    if (inv == null) {
      throw new NotFoundResponse("The requested inventory item was not found");
    } else {
      ctx.json(inv);
      ctx.status(HttpStatus.OK);
    }
  }

  public void getInventories(Context ctx) {
    Bson filter = constructFilter(ctx);
    Bson sortingOrder = constructSortingOrder(ctx);

    FindIterable<Inventory> results = inventoryCollection.find(filter);

    if (sortingOrder != null) {
      results = results.sort(sortingOrder);
    }

    ArrayList<Inventory> matching = results.into(new ArrayList<>());

    ctx.json(matching);
    ctx.status(HttpStatus.OK);
  }

  private Bson constructFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    if (ctx.queryParamMap().containsKey(SCHOOL_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(SCHOOL_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(SCHOOL_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(GRADE_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(GRADE_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(GRADE_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(ITEM_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(ITEM_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(ITEM_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(DESCRIPTION_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(DESCRIPTION_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(DESCRIPTION_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(QUANTITY_KEY)) {
      String qParam = ctx.queryParam(QUANTITY_KEY);
      try {
        int q = Integer.parseInt(qParam);
        filters.add(Filters.eq(QUANTITY_KEY, q));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("quantity must be an integer.");
      }
    }
    if (ctx.queryParamMap().containsKey(PROPERTIES_KEY)) {
      String propsParam = ctx.queryParam(PROPERTIES_KEY);
      if (propsParam != null && !propsParam.trim().isEmpty()) {
        String[] props = propsParam.split(",");
        filters.add(Filters.in(PROPERTIES_KEY, (Object[]) props));
      }
    }

    return filters.isEmpty() ? new Document() : and(filters);
  }

  private Bson constructSortingOrder(Context ctx) {
    String sortBy = ctx.queryParam("sortby");
    if (sortBy == null || sortBy.trim().isEmpty()) {
      sortBy = SCHOOL_KEY;
    }

    List<String> allowed = Arrays.asList(
      SCHOOL_KEY, GRADE_KEY, ITEM_KEY, DESCRIPTION_KEY, QUANTITY_KEY, PROPERTIES_KEY
    );

    if (!allowed.contains(sortBy)) {
      throw new BadRequestResponse("Invalid sortby field.");
    }

    String sortOrder = ctx.queryParam(SORT_ORDER_KEY);
    if (sortOrder == null || sortOrder.trim().isEmpty()) {
      sortOrder = "asc";
    }

    if (sortOrder.equalsIgnoreCase("desc")) {
      return Sorts.descending(sortBy);
    } else if (sortOrder.equalsIgnoreCase("asc")) {
      return Sorts.ascending(sortBy);
    } else {
      throw new BadRequestResponse("sortorder must be 'asc' or 'desc'");
    }
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_INVENTORY, this::getInventories);
    server.get(API_INVENTORY_BY_ID, this::getInventory);
  }
}
