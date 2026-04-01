// Packages
package umm3601.Inventory;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.Updates;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// Misc Imports
import umm3601.Controller;

// Controller
public class InventoryController implements Controller {

  private static final String API_INVENTORY = "/api/inventory";
  private static final String API_INVENTORY_BY_ID = "/api/inventory/{id}";

  static final String ITEM_KEY = "item";
  static final String BRAND_KEY = "brand";
  static final String COUNT_KEY = "count";
  static final String SIZE_KEY = "size";
  static final String COLOR_KEY = "color";
  static final String DESCRIPTION_KEY = "description";
  static final String QUANTITY_KEY = "quantity";
  static final String MAX_QUANTITY_KEY = "maxQuantity";
  static final String MIN_QUANTITY_KEY = "minQuantity";
  static final String STOCK_STATE_KEY = "stockState";
  static final String NOTES_KEY = "notes";
  static final String MATERIAL_KEY = "material";
  static final String TYPE_KEY = "type";
  static final String SORT_ORDER_KEY = "sortorder";
  private static final int EXACT_MATCH_SCORE = 3;
  private static final int STARTS_WITH_SCORE = 2;
  private static final int CONTAINS_SCORE = 1;
  private static final int NO_MATCH_SCORE = 0;

  private final JacksonMongoCollection<Inventory> inventoryCollection;

  public InventoryController(MongoDatabase database) {
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  private int getRelevanceScore(String value, String search) {
    String v = value.toLowerCase();
    String s = search.toLowerCase();

    if (v.equals(s)) {
      return EXACT_MATCH_SCORE;
    }  // exact match
    if (v.startsWith(s)) {
      return STARTS_WITH_SCORE;
    }    // starts with
    if (v.contains(s)) {
      return CONTAINS_SCORE;
    }      // partial match

    return NO_MATCH_SCORE;
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
      updateStockState(inv);
      ctx.json(inv);
      ctx.status(HttpStatus.OK);
    }
  }

  public void getInventories(Context ctx) {
    Bson filter = constructFilter(ctx);

    FindIterable<Inventory> results = inventoryCollection.find(filter);

    ArrayList<Inventory> matching = results.into(new ArrayList<>());

    String itemSearch = ctx.queryParam(ITEM_KEY);
    if (itemSearch != null) {
      matching.sort((a, b) -> {
        int scoreA = getRelevanceScore(a.item, itemSearch);
        int scoreB = getRelevanceScore(b.item, itemSearch);

        // Higher score first
        if (scoreA != scoreB) {
          return Integer.compare(scoreB, scoreA);
        }

        // Tie-breaker: shorter string first
        return Integer.compare(a.item.length(), b.item.length());
      });
    }

    for (Inventory inv : matching) {
      updateStockState(inv);
    }
    ctx.json(matching);
    ctx.status(HttpStatus.OK);
  }

  private Bson constructFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    if (ctx.queryParamMap().containsKey(ITEM_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(ITEM_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(ITEM_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(BRAND_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(BRAND_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(BRAND_KEY, pattern));
    }

    if (ctx.queryParamMap().containsKey(COLOR_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(COLOR_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(COLOR_KEY, pattern));
    }
    if (ctx.queryParamMap().containsKey(SIZE_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(SIZE_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(SIZE_KEY, pattern));
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
    /* // Commented out for now as these fields may not get filters in the inventory page
    if (ctx.queryParamMap().containsKey(MAX_QUANTITY_KEY)) {
      String qParam = ctx.queryParam(MAX_QUANTITY_KEY);
      try {
        int q = Integer.parseInt(qParam);
        filters.add(Filters.eq(MAX_QUANTITY_KEY, q));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("max quantity must be an integer.");
      }
    }

    if (ctx.queryParamMap().containsKey(MIN_QUANTITY_KEY)) {
      String qParam = ctx.queryParam(MIN_QUANTITY_KEY);
      try {
        int q = Integer.parseInt(qParam);
        filters.add(Filters.eq(MIN_QUANTITY_KEY, q));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("min quantity must be an integer.");
      }
    }

    if (ctx.queryParamMap().containsKey(STOCK_STATE_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(STOCK_STATE_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(STOCK_STATE_KEY, pattern));
    }
    */

    if (ctx.queryParamMap().containsKey(NOTES_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(NOTES_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(NOTES_KEY, pattern));
    }
    if (ctx.queryParamMap().containsKey(MATERIAL_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(MATERIAL_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(MATERIAL_KEY, pattern));
    }
    if (ctx.queryParamMap().containsKey(TYPE_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(TYPE_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(TYPE_KEY, pattern));
    }

    return filters.isEmpty() ? new Document() : and(filters);
  }

  /**
   * Updates the stockState of the given inventory item based on quantity, minQuantity, and maxQuantity.
   * Use this method to update the stockState of an inventory item whenever its
   * quantity, minQuantity, or maxQuantity changes.
   * Also use this method when adding new items to ensure the stockState is correctly initialized.
   *
   * @param inv The inventory item to update the stockState for
   * @throws NotFoundResponse if the item was not found
   * @throws IllegalArgumentException if quantity/minQuantity/maxQuantity are negative
   * @throws IllegalStateException if minQuantity is greater than maxQuantity
  */
  private void updateStockState(Inventory inv) {
    // Make sure item exists
    if (inv == null) {
      throw new NotFoundResponse("The requested inventory item was not found");
    } else {
      // Validate quantity, minQuantity, and maxQuantity
      if (inv.quantity < 0 || inv.minQuantity < 0 || inv.maxQuantity < 0) {
        throw new IllegalArgumentException("Quantity, minQuantity, and maxQuantity must be non-negative integers.");
      }

      // Validate that minQuantity is not greater than maxQuantity
      if (inv.minQuantity > inv.maxQuantity) {
        throw new IllegalStateException("minQuantity cannot be greater than maxQuantity.");
      }

      // Update stockState based on quantity, minQuantity, and maxQuantity
      if (inv.quantity == 0) {
        inv.stockState = "Out of Stock";
      } else if (inv.quantity < inv.minQuantity) {
        inv.stockState = "Under-Stocked";
      } else if (inv.quantity > inv.maxQuantity) {
        inv.stockState = "Over-Stocked";
      } else {
        inv.stockState = "Stocked";
      }
      inventoryCollection.updateOne(eq("_id", new ObjectId(inv._id)), Updates.set("stockState", inv.stockState));
    }
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_INVENTORY, this::getInventories);
    server.get(API_INVENTORY_BY_ID, this::getInventory);
  }
}
