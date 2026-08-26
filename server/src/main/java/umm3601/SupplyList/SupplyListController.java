// Packages
package umm3601.SupplyList;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.ArrayList;
import java.util.Arrays;
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
import com.mongodb.client.model.Sorts;

// IO Imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// App Imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;

// Misc Imports
//import umm3601.Inventory.Inventory;

/**
 * API controller for school supply-list items.
 *
 * Supply list filters are server-side so large lists do not have to be
 * downloaded before the Angular UI narrows them by school, grade, item, or
 * attribute options.
 */
public class SupplyListController {

  private static final String API_SUPPLYLIST = "/api/supplylist";
  private static final String API_SUPPLYLIST_BY_ID = "/api/supplylist/{id}";

  static final String ACADEMIC_YEAR_KEY = "academicYear";
  static final String SCHOOL_KEY = "school";
  static final String GRADE_KEY = "grade";
  static final String TEACHER_KEY = "teacher";
  static final String ITEM_KEY = "item";
  static final String BRAND_KEY = "brand";
  static final String COUNT_KEY = "packageSize";
  static final String SIZE_KEY = "size";
  static final String COLOR_KEY = "color";
  static final String QUANTITY_KEY = "quantity";
  static final String NOTES_KEY = "notes";
  static final String MATERIAL_KEY = "material";
  static final String TYPE_KEY = "type";
  static final String SORT_ORDER_KEY = "sortorder";
  static final String ID_KEY = "supplyID";

  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  //private final JacksonMongoCollection<Inventory> inventoryCollection;

  public SupplyListController(MongoDatabase database) {
    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
      "supplylist",
      SupplyList.class,
      UuidRepresentation.STANDARD
    );

    // inventoryCollection = JacksonMongoCollection.builder().build(
    //   database,
    //   "inventory",
    //   Inventory.class,
    //   UuidRepresentation.STANDARD
    // );
  }

  /**
   * Get a single Supply List by ID.
   * @param ctx
   * @throws BadRequestResponse if the ID was not a legal Mongo Object ID
   * @throws NotFoundResponse if no Supply List with the requested ID was found
   * @return The Supply List with the requested ID
   */
  @Route(method = HttpMethod.GET, path = API_SUPPLYLIST_BY_ID)
  @RequirePermission("view_supply_lists")
  public void getList(Context ctx) {
    String id = ctx.pathParam("id");
    SupplyList supplylistinv;

    try {
      supplylistinv = supplyListCollection.find(eq("_id", new ObjectId(id))).first();
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested supply list id wasn't a legal Mongo Object ID.");
    }

    if (supplylistinv == null) {
      throw new NotFoundResponse("The requested supply list item was not found");
    } else {
      ctx.json(supplylistinv);
      ctx.status(HttpStatus.OK);
    }
  }

  /**
   * Get a list of all Supply Lists, filtered by any combination of fields and sorted by any field
   * @param ctx
   */
  @Route(method = HttpMethod.GET, path = API_SUPPLYLIST)
  @RequirePermission("view_supply_lists")
  public void getSupplyLists(Context ctx) {
    Bson filter = constructFilter(ctx);

    FindIterable<SupplyList> results = supplyListCollection.find(filter);

    ArrayList<SupplyList> matching = results.into(new ArrayList<>());

    ctx.json(matching);
    ctx.status(HttpStatus.OK);
  }

  // Converts comma-separated query values such as "Crayons,,pencils" into
  // case-insensitive exact-value patterns, ignoring empty tokens.
  private Bson multipleIntakeFilter(String field, String raw) {
    List<Pattern> patterns = Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(s -> Pattern.compile(Pattern.quote(s), Pattern.CASE_INSENSITIVE))
        .toList();

    return Filters.in(field, patterns);
  }

  // AttributeOptions fields can express required values in exactly and acceptable
  // alternatives in anyOf, so a query should match either side.
  private Bson attributeOptionsFilter(String field, String raw) {
    return Filters.or(
      multipleIntakeFilter(field + ".exactly", raw),
      multipleIntakeFilter(field + ".anyOf", raw)
    );
  }

  /**
   * Construct a MongoDB filter based on query parameters in the HTTP request
   * @return A MongoDB filter
   */
  private Bson constructFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    // Text filters accept comma-separated values and are case-insensitive so the
    // UI can pass labels directly from dropdowns or search fields.
    if (ctx.queryParamMap().containsKey(SCHOOL_KEY)) {
      filters.add(multipleIntakeFilter(SCHOOL_KEY, ctx.queryParam(SCHOOL_KEY)));
    }

    if (ctx.queryParamMap().containsKey(GRADE_KEY)) {
      filters.add(multipleIntakeFilter(GRADE_KEY, ctx.queryParam(GRADE_KEY)));
    }

    if (ctx.queryParamMap().containsKey(TEACHER_KEY)) {
      filters.add(multipleIntakeFilter(TEACHER_KEY, ctx.queryParam(TEACHER_KEY)));
    }

    if (ctx.queryParamMap().containsKey(ACADEMIC_YEAR_KEY)) {
      filters.add(multipleIntakeFilter(ACADEMIC_YEAR_KEY, ctx.queryParam(ACADEMIC_YEAR_KEY)));
    }

    // item is an array field, so matching any requested item is enough.
    if (ctx.queryParamMap().containsKey(ITEM_KEY)) {
      filters.add(multipleIntakeFilter(ITEM_KEY, ctx.queryParam(ITEM_KEY)));
    }

    // For brand (searches exactly and anyOf)
    if (ctx.queryParamMap().containsKey(BRAND_KEY)) {
      filters.add(attributeOptionsFilter(BRAND_KEY, ctx.queryParam(BRAND_KEY)));
    }

    // For color (searches exactly and anyOf)
    if (ctx.queryParamMap().containsKey(COLOR_KEY)) {
      filters.add(attributeOptionsFilter(COLOR_KEY, ctx.queryParam(COLOR_KEY)));
    }

    // For size
    if (ctx.queryParamMap().containsKey(SIZE_KEY)) {
      filters.add(attributeOptionsFilter(SIZE_KEY, ctx.queryParam(SIZE_KEY)));
    }

    // For quantity, which must be an integer
    if (ctx.queryParamMap().containsKey(QUANTITY_KEY)) {
      String qParam = ctx.queryParam(QUANTITY_KEY);
      try {
        int q = Integer.parseInt(qParam);
        filters.add(Filters.eq(QUANTITY_KEY, q));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("quantity must be an integer.");
      }
    }

    // For packageSize, which must be an integer
    if (ctx.queryParamMap().containsKey(COUNT_KEY)) {
      String cParam = ctx.queryParam(COUNT_KEY);
      try {
        int c = Integer.parseInt(cParam);
        filters.add(Filters.eq(COUNT_KEY, c));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("packageSize must be an integer.");
      }
    }

    // For notes
    if (ctx.queryParamMap().containsKey(NOTES_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(NOTES_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(NOTES_KEY, pattern));
    }

    // For material (searches exactly and anyOf)
    if (ctx.queryParamMap().containsKey(MATERIAL_KEY)) {
      filters.add(attributeOptionsFilter(MATERIAL_KEY, ctx.queryParam(MATERIAL_KEY)));
    }

    // For type (searches exactly and anyOf)
    if (ctx.queryParamMap().containsKey(TYPE_KEY)) {
      filters.add(attributeOptionsFilter(TYPE_KEY, ctx.queryParam(TYPE_KEY)));
    }

    // For supplyID
    if (ctx.queryParamMap().containsKey(ID_KEY)) {
      filters.add(multipleIntakeFilter(ID_KEY, ctx.queryParam(ID_KEY)));
    }

    // An empty Document matches everything; otherwise every selected filter must match.
    return filters.isEmpty() ? new Document() : and(filters);
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

  private String formatID(int n) {
    return String.format("Supply-%05d", n);
  }

  private List<String> sanitizeInventoryIds(List<String> invIDs) {
    List<String> sanitized = new ArrayList<>();

    if (invIDs == null) {
      return sanitized;
    }

    for (String invID : invIDs) {
      if (invID == null || invID.isBlank()) {
        continue;
      }

      String trimmed = invID.trim();
      if (!sanitized.contains(trimmed)) {
        sanitized.add(trimmed);
      }
    }

    return sanitized;
  }

  private List<String> sanitizePreferredInventoryIds(List<String> preferredIds, List<String> linkedIds) {
    List<String> sanitizedLinkedIds = sanitizeInventoryIds(linkedIds);
    return sanitizeInventoryIds(preferredIds).stream()
      .filter(sanitizedLinkedIds::contains)
      .toList();
  }

  /**
   * Scans supply list to find the next available ID number for supplyID
   * @return The number to use
   */
  private int getNextSequence() {
    SupplyList maxIdItem = supplyListCollection
      .find(Filters.regex(ID_KEY, "^Supply-\\d{5}$"))
      .sort(Sorts.descending(ID_KEY))
      .first();
    int idNum = extractNumber(maxIdItem != null ? maxIdItem.supplyID : null);
    return idNum + 1;
  }

  /**
   * Generates the next available ID in the format "ID-XXXXX"
   * @return The generated ID
   */
  private String generateNextID() {
    return formatID(getNextSequence());
  }

  // Endpoint to generate the next ID
  @Route(method = HttpMethod.GET, path = "/api/supplylist/nextid")
  @RequirePermission("add_supply_list")
  public void generateNextID(Context ctx) {
    ctx.json(generateNextID());
    ctx.status(HttpStatus.OK);
  }

  /**
   * Add a new Supply List to the database based on the JSON body of the request, which must include
   * at least school, grade, and item fields. The method validates the input and returns a 201
   * Created status if successful. The new Supply List's ID is generated by MongoDB and returned
   * in the response body as JSON.
   * @param ctx
   */
  @Route(method = HttpMethod.POST, path = API_SUPPLYLIST)
  @RequirePermission("add_supply_list")
  public void addSupplyList(Context ctx) {
    SupplyList newSupplyList = ctx.bodyValidator(SupplyList.class)
    .check(s -> s.school != null && !s.school.isBlank(), "school must be a non-empty string")
    .check(s -> s.grade != null && !s.grade.isBlank(), "grade must be a non-empty string")
    .check(s -> s.item != null && !s.item.isEmpty(), "item must be a non-empty list")
    .check(s -> s.packageSize == null || s.packageSize > 0, "packageSize must be null or a positive integer")
    .check(s -> s.quantity == null || s.quantity > 0, "quantity must be null or a positive integer")
    .get();

    newSupplyList.supplyID = generateNextID();
    newSupplyList.percentageFilled = -1; // Initialize percentageFilled to -1 to indicate it hasn't been calculated yet
    newSupplyList.invIDs = sanitizeInventoryIds(newSupplyList.invIDs);
    newSupplyList.preferredInventoryIds = sanitizePreferredInventoryIds(
      newSupplyList.preferredInventoryIds,
      newSupplyList.invIDs);
    supplyListCollection.insertOne(newSupplyList);
    ctx.status(HttpStatus.CREATED);
  }

  /**
   * deleteSupplyList removes the Supply List with the specified ID from the database.
   * If the ID is not a valid Mongo Object ID, it returns a 400 Bad Request response.
   * If no Supply List with the specified ID exists, it returns a 404 Not Found response.
   * If the deletion is successful, it returns a 204 No Content response.
   * @param ctx
   */
  @Route(method = HttpMethod.DELETE, path = API_SUPPLYLIST_BY_ID)
  @RequirePermission("delete_supply_list")
  public void deleteSupplyList(Context ctx) {
    String id = ctx.pathParam("id");
    try {
      long deletedCount = supplyListCollection.deleteOne(eq("_id", new ObjectId(id))).getDeletedCount();
      if (deletedCount == 0) {
        throw new NotFoundResponse("The requested supply list item was not found");
      }
      ctx.status(HttpStatus.NO_CONTENT);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested supply list id wasn't a legal Mongo Object ID.");
    }
  }

  /**
   * editSupplyList updates the Supply List with the specified ID in the database.
   * If the ID is not a valid Mongo Object ID, it returns a 400 Bad Request response.
   * If no Supply List with the specified ID exists, it returns a 404 Not Found response.
   * If the update is successful, it returns a 200 OK response.
   * @param ctx
   */
  @Route(method = HttpMethod.PUT, path = API_SUPPLYLIST_BY_ID)
  @RequirePermission("edit_supply_list")
  public void editSupplyList(Context ctx) {
    String id = ctx.pathParam("id");
    SupplyList updatedSupplyList = ctx.bodyValidator(SupplyList.class)
      .check(s -> s.school != null && !s.school.isBlank(), "school must be a non-empty string")
      .check(s -> s.grade != null && !s.grade.isBlank(), "grade must be a non-empty string")
      .check(s -> s.item != null && !s.item.isEmpty(), "item must be a non-empty list")
      .check(s -> s.packageSize == null || s.packageSize > 0, "packageSize must be null or a positive integer")
      .check(s -> s.quantity == null || s.quantity > 0, "quantity must be null or a positive integer")
      .get();

    try {
      ObjectId objectId = new ObjectId(id);

      SupplyList existingSupplyList = supplyListCollection.find(eq("_id", objectId)).first();
      if (existingSupplyList == null) {
        throw new NotFoundResponse("The requested supply list item was not found");
      }

      // The path id is the source of truth even if the request body has no _id
      // or carries a stale one
      updatedSupplyList._id = id;
      // These fields are not editable, and must be preserved from the existing document
      updatedSupplyList.supplyID = existingSupplyList.supplyID;
      List<String> existingInvIDs = sanitizeInventoryIds(existingSupplyList.invIDs);
      List<String> existingPreferredIds = sanitizePreferredInventoryIds(
        existingSupplyList.preferredInventoryIds,
        existingInvIDs);
      if (updatedSupplyList.invIDs == null) {
        updatedSupplyList.invIDs = existingInvIDs;
        updatedSupplyList.percentageFilled = existingSupplyList.percentageFilled;
      } else {
        updatedSupplyList.invIDs = sanitizeInventoryIds(updatedSupplyList.invIDs);
        updatedSupplyList.percentageFilled = updatedSupplyList.invIDs.equals(existingInvIDs)
          ? existingSupplyList.percentageFilled
          : -1;
      }
      updatedSupplyList.preferredInventoryIds = updatedSupplyList.preferredInventoryIds == null
        ? sanitizePreferredInventoryIds(existingPreferredIds, updatedSupplyList.invIDs)
        : sanitizePreferredInventoryIds(updatedSupplyList.preferredInventoryIds, updatedSupplyList.invIDs);

      supplyListCollection.replaceOne(eq("_id", objectId), updatedSupplyList);
      ctx.status(HttpStatus.OK);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested supply list id wasn't a legal Mongo Object ID.");
    }
  }

  // /**
  //  * calculatePercentageFilled calculates the percentage of the supply list item that is filled
  //  * @param supplyList The supply list item to calculate the percentage for
  //  */
  // private void calculatePercentageFilled(SupplyList supplyList) {
  //   if (supplyList == null) {
  //     return;
  //   }

  //   int totalQuantity = supplyList.quantity != null ? supplyList.quantity : 0;
  //   int requestedQuantity = 0;

  //   // >= 0 is a "percentage" filled
  //   // -1 is "not calculated" (default)
  //   // -2 is "not applicable" (ie: empty invIDs list)

  //   if (supplyList.invIDs != null && !supplyList.invIDs.isEmpty()) {
  //     for (String invID : supplyList.invIDs) {
  //       Inventory inventory = inventoryCollection.find(eq("internalID", invID)).first();
  //       if (inventory != null) {
  //         requestedQuantity += inventory.quantity;
  //       }
  //     }
  //   } else {
  //     supplyList.percentageFilled = -2; // Indicates that the supply list item has no associated inventory items
  //     return;
  //   }

  //   int percentageFilled = totalQuantity > 0 ? ((int) requestedQuantity / totalQuantity) * 100 : 0;
  //   supplyList.percentageFilled = percentageFilled;
  // }

}
