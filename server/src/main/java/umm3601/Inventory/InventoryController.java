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
import java.util.stream.Collectors;

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
import com.mongodb.client.model.Sorts;
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
  static final String PACKAGE_KEY = "packageSize";
  static final String SIZE_KEY = "size";
  static final String COLOR_KEY = "color";
  static final String DESCRIPTION_KEY = "description";
  static final String QUANTITY_KEY = "quantity";
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

  private int extractNumber(String value) {
    if (value == null) {
      return 0;
    }

    String digits = value.replaceAll("\\D", "");
    if (digits.isBlank()) {
      return 0;
    }

    try {
      return Integer.parseInt(digits);
    } catch (NumberFormatException e) {
      // If the numeric value is too large or otherwise unparsable, fall back to 0.
      return 0;
    }
  }

  private String formatInternalID(int n) {
    return String.format("ID-%05d", n);
  }
  private String formatInternalBarcode(int n) {
    return String.format("ITEM-%05d", n);
  }


  private int getNextSequence() {
    Inventory maxIdItem = inventoryCollection
    .find(Filters.and(
      Filters.exists("internalID", true), Filters.ne("internalID", null)))
      .sort(Sorts.descending("internalID")).first();

    Inventory maxBarcodeItem = inventoryCollection
    .find(Filters.and(
      Filters.exists("internalBarcode", true), Filters.ne("internalBarcode", null)))
      .sort(Sorts.descending("internalBarcode")).first();

    int idNum = extractNumber(maxIdItem != null ? maxIdItem.internalID : null);
    int barcodeNum = extractNumber(maxBarcodeItem != null ? maxBarcodeItem.internalBarcode : null);
    return Math.max(idNum, barcodeNum) + 1;
  }
  private String generateNextID() { // generates the next available internal ID
      Inventory last = inventoryCollection.find(new Document("internalID", new Document("$exists", true)))
      .sort(Sorts.descending("internalID"))
      .first();
      String prefix = "ID-";
      int next = 1;
      if (last != null && last.internalID != null && last.internalID.startsWith(prefix)) {
        try {
          next = Integer.parseInt(last.internalID.substring(prefix.length())) + 1;
        } catch (NumberFormatException e) {
          // return 1 if not right format
        }
      }
      return String.format("ID-%05d", next);
  }

  public void generateNextID(Context ctx) {
    ctx.json(generateNextID());
    ctx.status(HttpStatus.OK);
  }

  public void addInventory(Context ctx) {
    Inventory newInv = ctx.bodyAsClass(Inventory.class);

    Bson filter;
    if (newInv.internalBarcode != null && !newInv.internalBarcode.isBlank()) {
      filter = eq("internalBarcode", newInv.internalBarcode);
    } else if (newInv.externalBarcode != null && !newInv.externalBarcode.isEmpty()) {
      filter = Filters.in("externalBarcode", newInv.externalBarcode);
    } else {
      filter = eq("_id", new ObjectId());
    }

    Inventory exists = inventoryCollection.find(filter).first();

    if (exists != null) {
      int existingQuantity = (exists.quantity > 0) ? exists.quantity : 0;
      int newInvQuantity = (newInv.quantity > 0) ? newInv.quantity : 1;
      int newQuantity = existingQuantity + newInvQuantity;

      inventoryCollection.updateOne(
        eq("_id", exists._id),
        new Document("$set", new Document(QUANTITY_KEY, newQuantity))
      );

      exists.quantity = newQuantity;
      ctx.json(exists);
      ctx.status(HttpStatus.CREATED);
      return;
    }

    int next = getNextSequence();

    newInv.internalID = formatInternalID(next);
    newInv.internalBarcode = formatInternalBarcode(next);
    if (newInv.externalBarcode == null) {
      newInv.externalBarcode = new ArrayList<>();
    }
    if (newInv.externalBarcode != null) {
      newInv.externalBarcode = newInv.externalBarcode.stream()
        .filter(code -> code != null && !code.isBlank() && !code.matches("^ITEM-\\d+$"))
        .distinct()
        .collect(Collectors.toList());
    }

    if (newInv.quantity <= 0) {
    newInv.quantity = 1;
    }

    boolean idExists = inventoryCollection.find(eq("internalID", newInv.internalID)).first() != null;
    boolean barcodeExists = inventoryCollection.find(eq("internalBarcode", newInv.internalBarcode)).first() != null;

    if (idExists || barcodeExists) {
      ctx.status(HttpStatus.CONFLICT);
      ctx.result("Duplicate internalID or internalBarcode detected");
    return;
    }

    inventoryCollection.insertOne(newInv);
    ctx.json(newInv);
    ctx.status(HttpStatus.CREATED);
  }

  public void removeInventory(Context ctx) {
    RemoveInventoryRequest req = ctx.bodyAsClass(RemoveInventoryRequest.class);

    if (req.internalID == null || req.internalID.isBlank()) {
      throw new BadRequestResponse("internalID is required to remove inventory");
    }

    if (req.amount <= 0) {
      throw new BadRequestResponse("amount must be greater than 0");
    }

    Inventory exists = inventoryCollection.find(eq("internalID", req.internalID)).first();

    if (exists == null) {
      throw new NotFoundResponse("No item found for internalID: " + req.internalID);
    }

    int newQuantity = exists.quantity - req.amount;

    if (newQuantity < 0) {
      throw new BadRequestResponse("Cannot remove more than current quantity");
    }

    if (newQuantity == 0) {
      inventoryCollection.deleteOne(eq("_id", exists._id));
      ctx.json(new Document("deleted", true).append("quantity", 0));
      ctx.status(HttpStatus.OK);
      return;
    }

    inventoryCollection.updateOne(
      eq("_id", exists._id),
      new Document("$set", new Document(QUANTITY_KEY, newQuantity))
    );

    exists.quantity = newQuantity;
    ctx.json(exists);
    ctx.status(HttpStatus.OK);
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

    if (ctx.queryParamMap().containsKey(PACKAGE_KEY)) {
      String packageParam = ctx.queryParam(PACKAGE_KEY);
      try {
        int p = Integer.parseInt(packageParam);
        filters.add(Filters.eq(PACKAGE_KEY, p));
        } catch (NumberFormatException e) {
        throw new BadRequestResponse("packageSize must be an integer.");
        }
    }

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
    server.post(API_INVENTORY, this::addInventory);
    server.post(API_INVENTORY + "/remove", this::removeInventory);
    server.get("/api/inventory/nextid", this::generateNextID);
  }
}
