// Packages
package umm3601.Inventory;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
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
import com.mongodb.client.model.Updates;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.UpdateResult;

// IO Imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// Misc Imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;
import umm3601.Family.Family;
import umm3601.Family.InventoryReservationService;
import umm3601.SupplyList.SupplyList;


// Controller
public class InventoryController {

  private static final String API_INVENTORY = "/api/inventory";
  private static final String API_INVENTORY_BY_ID = "/api/inventory/{id}";
  private static final String API_INVENTORY_REMOVE_QUANTITY = "/api/inventory/removeQuantity";
  private static final String API_INVENTORY_CLEAR = "/api/inventory/clear";
  private static final String API_INVENTORY_RESET = "/api/inventory/resetQuantity";
  private static final String API_CALCULATE_STATES = "/api/inventory/calculateStates";

  static final String ITEM_KEY = "item";
  static final String BRAND_KEY = "brand";
  static final String PACKAGE_KEY = "packageSize";
  static final String SIZE_KEY = "size";
  static final String COLOR_KEY = "color";
  static final String DESCRIPTION_KEY = "description";
  static final String QUANTITY_KEY = "quantity";
  static final String MAX_QUANTITY_KEY = "maxQuantity";
  static final String MIN_QUANTITY_KEY = "minQuantity";
  static final String NOTES_KEY = "notes";
  static final String MATERIAL_KEY = "material";
  static final String TYPE_KEY = "type";
  static final String SORT_ORDER_KEY = "sortorder";
  static final String RESERVED_QUANTITY_KEY = "reservedQuantity";

  private static final int EXACT_MATCH_SCORE = 3;
  private static final int STARTS_WITH_SCORE = 2;
  private static final int CONTAINS_SCORE = 1;
  private static final int NO_MATCH_SCORE = 0;
  private static final int INVALID_LINK_PERCENTAGE_FILLED = -2;
  private static final int PERCENT_SCALE = 100;
  private static final int BEST_MATCH_NULL_RESULT_INDEX = 3;
  private static final int SCHOOL_COUNT_RESULT_INDEX = 4;
  private static final String INTERNAL_INVENTORY_ID_PATTERN = "^ID-\\d{4,5}$";

  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final InventoryReservationService inventoryReservationService;
  private final InventoryIdService inventoryIdService;

  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;

  public InventoryController(MongoDatabase database) {
    this(database, new InventoryReservationService(database), new InventoryIdService(database));
  }

  public InventoryController(MongoDatabase database, InventoryReservationService inventoryReservationService) {
    this(database, inventoryReservationService, new InventoryIdService(database));
  }

  public InventoryController(
      MongoDatabase database,
      InventoryReservationService inventoryReservationService,
      InventoryIdService inventoryIdService
  ) {
    this.inventoryReservationService = inventoryReservationService;
    this.inventoryIdService = inventoryIdService;
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );

    familyCollection = JacksonMongoCollection.builder().build(
      database,
      "family",
      Family.class,
      UuidRepresentation.STANDARD
    );

    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
      "supplylist",
      SupplyList.class,
      UuidRepresentation.STANDARD
    );
  }

  // Endpoint to generate the next internal ID
  @Route(method = HttpMethod.GET, path = "/api/inventory/nextid")
  @RequirePermission("add_inventory_item")
  public void generateNextID(Context ctx) {
    ctx.json(inventoryIdService.generateNextID());
    ctx.status(HttpStatus.OK);
  }

  /**
   * Endpoint to add inventory, with logic to handle duplicates and quantity updates
   * @param ctx The context for the HTTP request
   */
  @Route(method = HttpMethod.POST, path = API_INVENTORY)
  @RequirePermission("add_inventory_item")
  public void addInventory(Context ctx) {
    Inventory newInv = ctx.bodyAsClass(Inventory.class);
    newInv.refreshDescription();

    Bson filter;
    if (newInv.internalBarcode != null && !newInv.internalBarcode.isBlank()) {
      filter = eq("internalBarcode", newInv.internalBarcode);
    } else if (newInv.externalBarcode != null && !newInv.externalBarcode.isEmpty()) {
      filter = Filters.in("externalBarcode", newInv.externalBarcode);
    } else {
      filter = eq("_id", new ObjectId());
    }

    Inventory exists = inventoryCollection.find(filter).first();

    // Update item quantity if it already exists
    if (exists != null) {
      int existingQuantity = (exists.quantity > 0) ? exists.quantity : 0;
      int newInvQuantity = (newInv.quantity > 0) ? newInv.quantity : 1;
      int newQuantity = existingQuantity + newInvQuantity;

      generateDescription(exists);

      inventoryCollection.updateOne(
        eq("_id", exists._id),
        new Document("$set", new Document(QUANTITY_KEY, newQuantity))
      );

      exists.quantity = newQuantity;
      inventoryReservationService.rebuildInventoryReservation();
      ctx.json(exists);
      ctx.status(HttpStatus.CREATED);
      return;
    }

    // Handle internalID and internalBarcode
    int next = inventoryIdService.getNextSequence();

    newInv.internalID = inventoryIdService.formatInternalID(next);
    newInv.internalBarcode = inventoryIdService.formatInternalBarcode(next);
    if (newInv.externalBarcode == null) {
      newInv.externalBarcode = new ArrayList<>();
    }

    // Filter out improper externalBarcode entries
    if (newInv.externalBarcode != null) {
      newInv.externalBarcode = newInv.externalBarcode.stream()
        .filter(code -> code != null && !code.isBlank() && !code.matches("^ITEM-\\d+$"))
        .distinct()
        .collect(Collectors.toList());
    }

    if (newInv.quantity <= 0) {
      newInv.quantity = 1;
    }

    newInv.reservedQuantity = 0;

    boolean idExists = inventoryCollection.find(eq("internalID", newInv.internalID)).first() != null;
    boolean barcodeExists = inventoryCollection.find(eq("internalBarcode", newInv.internalBarcode)).first() != null;

    // Duplicate check
    if (idExists || barcodeExists) {
      ctx.status(HttpStatus.CONFLICT);
      ctx.result("Duplicate internalID or internalBarcode detected");
      return;
    }

    // Initialize calculatedStockState and calculatedMinQuantity
    newInv.calculatedStockState = "Unknown";
    newInv.calculatedMinQuantity = 0;

    newInv.refreshDescription();
    inventoryCollection.insertOne(newInv);
    inventoryReservationService.rebuildInventoryReservation();
    ctx.json(newInv);
    ctx.status(HttpStatus.CREATED);
  }

  /**
   * Endpoint to remove a given quantity from a given inventory
   * @param ctx The context for the HTTP request
   */

  @Route(method = HttpMethod.POST, path = API_INVENTORY_REMOVE_QUANTITY)
  @RequirePermission("edit_inventory_item")
  public void removeQuantity(Context ctx) {
    RemoveQuantityRequest req = ctx.bodyAsClass(RemoveQuantityRequest.class);
    if (req.internalID == null || req.internalID.isBlank()) {
      throw new BadRequestResponse("internalID is required to update inventory");
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

    inventoryCollection.updateOne(
      eq("_id", exists._id),
      new Document("$set", new Document(QUANTITY_KEY, newQuantity))
    );

    exists.quantity = newQuantity;
    inventoryReservationService.rebuildInventoryReservation();
    ctx.json(exists);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.POST, path = API_INVENTORY + "/remove")
  @RequirePermission("edit_inventory_item")
  public void removeInventory(Context ctx) {
    removeQuantity(ctx);
  }

  /**
   * Deletes a single given inventory item from the database, identified by its internal ID
   * @param ctx The HTTP request context
   */
  @Route(method = HttpMethod.DELETE, path = API_INVENTORY_BY_ID)
  @RequirePermission("delete_inventory_item")
  public void deleteInventory(Context ctx) {
    String internalID = ctx.pathParam("id");
    DeleteResult result = inventoryCollection.deleteOne(eq("internalID", internalID));

    if (result.getDeletedCount() == 0) {
      throw new NotFoundResponse("The requested inventory item was not found");
    }

    inventoryReservationService.rebuildInventoryReservation();
    ctx.status(HttpStatus.OK);
  }

  /**
   * Deletes multiple inventory items from the database based on query parameters, similar to getInventories
   * @param ctx The HTTP request context
  */
  @Route(method = HttpMethod.DELETE, path = API_INVENTORY)
  @RequirePermission("delete_inventory_item")
  public void deleteInventories(Context ctx) {
    Bson filter = constructFilter(ctx);

    DeleteResult deleteResult = inventoryCollection.deleteMany(filter);
    long matchedCount = deleteResult.getDeletedCount();
    String message = matchedCount == 0
      ? "No inventory items matched the provided filters."
      : "Deleted " + matchedCount + " matching inventory item(s).";

    inventoryReservationService.rebuildInventoryReservation();
    ctx.json(Map.of("matchedCount", matchedCount, "message", message));
    ctx.status(HttpStatus.OK);
  }

  /**
   * Deletes all inventory items from the database.
   */
  @Route(method = HttpMethod.DELETE, path = API_INVENTORY_CLEAR)
  @RequirePermission("clear_inventory")
  public void clearInventory(Context ctx) {
    inventoryCollection.deleteMany(new Document());
    inventoryReservationService.rebuildInventoryReservation();
    ctx.status(HttpStatus.OK);
  }

  /**
   * Sets quantity, minQuantity, and maxQuantity to 0 for all matching inventory items based on query parameters
   */
  @Route(method = HttpMethod.PATCH, path = API_INVENTORY_RESET)
  @RequirePermission("reset_item_quantities")
  public void resetQuantities(Context ctx) {
    Bson filter = constructFilter(ctx);

    UpdateResult updateResult = inventoryCollection.updateMany(
      filter,
      Updates.combine(
        Updates.set(QUANTITY_KEY, 0),
        Updates.set(MAX_QUANTITY_KEY, 0),
        Updates.set(MIN_QUANTITY_KEY, 0)
      )
    );

    long matchedCount = updateResult.getMatchedCount();
    String message = matchedCount == 0
      ? "No inventory items matched the provided filters."
      : "Reset quantities for " + matchedCount + " matching inventory item(s).";

    inventoryReservationService.rebuildInventoryReservation();
    ctx.json(Map.of("matchedCount", matchedCount, "message", message));
    ctx.status(HttpStatus.OK);
  }

  /**
   * Calculates a relevance score for a given value based on how well it matches the search term
   * @param value The value to compare against the search term
   * @param search The search term to compare the value to
   * @return The relevance score, higher values mean a better match
   */
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

  /**
   * Endpoint to get a single inventory item by its MongoDB ID
   * @param ctx The context for the HTTP request
   */
  @Route(method = HttpMethod.GET, path = API_INVENTORY_BY_ID)
  @RequirePermission("view_inventory_item")
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

  /**
   * Endpoint to get inventory items based on query parameters
   * @param ctx The context for the HTTP request
   */
  @Route(method = HttpMethod.GET, path = API_INVENTORY)
  @RequirePermission("view_inventory")
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
      generateDescription(inv);
    }
    ctx.json(matching);
    ctx.status(HttpStatus.OK);
  }

  /**
   * Generates a description for the given inventory item based on its properties
   * @param inv The inventory item to generate a description for
   */
  private void generateDescription(Inventory inv) {
    if (inv == null) {
      return;
    }

    String generated = inv.buildDescription();
    String current = inv.description == null ? "" : inv.description.trim();

    inv.description = generated;

    if (inv._id != null && !generated.equals(current)) {
      inventoryCollection.updateOne(
        eq("_id", new ObjectId(inv._id)),
        Updates.set(DESCRIPTION_KEY, generated)
      );
    }
  }

  /**
   * Constructs a MongoDB filter based on query parameters
   * @param ctx The context containing query parameters
   * @return The constructed filter
   */
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
        inv.stockState = "Understocked";
      } else if (inv.quantity > inv.maxQuantity) {
        inv.stockState = "Overstocked";
      } else {
        inv.stockState = "Stocked";
      }
      inventoryCollection.updateOne(eq("_id", new ObjectId(inv._id)), Updates.set("stockState", inv.stockState));
    }
  }

  /**
   * Gets the total number of students in each school and grade.
   * @return a map of school to grade to teacher to student count
   */
  private Map<String, Map<String, Map<String, Integer>>> getSchoolGradeTeacherTotals() {
    ArrayList<Family> families = familyCollection.find().into(new ArrayList<>());
    Map<String, Map<String, Map<String, Integer>>> schoolGradeTeacherTotals = new HashMap<>();

    // Go through all the families
    for (Family family : families) {
      if (family == null || family.students == null) {
        continue;
      }

      // Go through all the students in that family
      for (Family.StudentInfo student : family.students) {
        if (student == null) {
          continue;
        }

        // Get the school, grade, and teacher for the student
        String school = student.school != null ? student.school : "Unknown School";
        String grade = student.grade != null ? student.grade : "Unknown Grade";
        String teacher = student.teacher != null ? student.teacher : "Unknown Teacher";

        // Add the student to the appropriate school
        Map<String, Map<String, Integer>> gradeTotals = schoolGradeTeacherTotals.get(school);
        if (gradeTotals == null) {
          gradeTotals = new HashMap<>();
          schoolGradeTeacherTotals.put(school, gradeTotals); // Put grades in schools
        }

        Map<String, Integer> teacherTotals = gradeTotals.get(grade);
        if (teacherTotals == null) {
          teacherTotals = new HashMap<>();
          gradeTotals.put(grade, teacherTotals); // Put teachers in grades
        }

        teacherTotals.put(teacher, teacherTotals.getOrDefault(teacher, 0) + 1);  // Add student to teacher
      }
    }

    return schoolGradeTeacherTotals;
  }

  /**
   * Updates the calculatedStockState of the given inventory item based on quantity, minQuantity, and maxQuantity.
   * Use this method to update the calculatedStockState of an inventory item whenever its
   * calculatedMinQuantity changes.
   *
   * @param inv The inventory item to update the calculatedStockState for
   * @throws NotFoundResponse if the item was not found
   * @throws IllegalArgumentException if calculatedMinQuantity is null
   * @return the updated calculatedStockState of the inventory item
  */
  private String calculateStockState(Inventory inv) {
    String calculatedStockState = null;
    // Make sure item exists
    if (inv == null) {
      throw new NotFoundResponse("The requested inventory item was not found");
    } else {
      // Validate quantity, minQuantity, and maxQuantity
      if (inv.calculatedMinQuantity == null) {
        throw new IllegalArgumentException("calculatedMinQuantity must be an integer.");
      }

      int itemDiff = inv.quantity - inv.calculatedMinQuantity;

      if (itemDiff == 0) {
        calculatedStockState = "Stocked";
      } else if (itemDiff < 0) {
        calculatedStockState = "Understocked";
      } else {
        calculatedStockState = "Overstocked";
      }

      return calculatedStockState;
    }
  }

  /**
   * Calculates the calculatedStockState and calculatedMinQuantity of items based on
   * number of students under each teacher, grade, and school.
   */
  private long[] calculateUnitsAndStates() {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    long totalSupplyLists = supplyListCollection.countDocuments();

    long validInvIDCount = 0;
    long invalidInvIDCount = 0;
    long bestMatchNullCount = 0;
    long schoolCount = 0;


    // loop through each supply list
    for (SupplyList supplyList : allSupplyLists) {
      int totalNeeded = 0;

      if (supplyList.school == null || supplyList.grade == null || supplyList.teacher == null) {
        continue; // Skip if any of the fields are null
      }

      // Find first properly formatted invID
      String validInvID = null;
      for (String invID : supplyList.invIDs) {
        if (isInternalInventoryId(invID)) {
          validInvID = invID;
          validInvIDCount++;
          break;
        }
      }

      if (validInvID == null) { // No properly formatted ID found
        invalidInvIDCount++;
        supplyList.percentageFilled = INVALID_LINK_PERCENTAGE_FILLED;
        supplyListCollection.updateOne(
          eq("_id", new ObjectId(supplyList._id)),
          Updates.set("percentageFilled", supplyList.percentageFilled));
        continue; // Skip to next supply list
      }

      Inventory bestMatch = inventoryCollection.find(eq("internalID", validInvID)).first();

      if (bestMatch == null) {
        bestMatchNullCount++;
        continue; // Skip if no matching inventory item is found
      }

      // loop through each school
      Map<String, Map<String, Map<String, Integer>>> studentTotals = getSchoolGradeTeacherTotals();
      for (Map.Entry<String, Map<String, Map<String, Integer>>> schoolEntry : studentTotals.entrySet()) {
        String school = schoolEntry.getKey();
        Map<String, Map<String, Integer>> gradeTotals = schoolEntry.getValue();

        // loop through each grade
        for (Map.Entry<String, Map<String, Integer>> gradeEntry : gradeTotals.entrySet()) {
          String grade = gradeEntry.getKey();
          Map<String, Integer> teacherTotals = gradeEntry.getValue();

          // loop through each teacher
          for (Map.Entry<String, Integer> teacherEntry : teacherTotals.entrySet()) {
            String teacher = teacherEntry.getKey();
            int numStudents = teacherEntry.getValue();

            // if the supply list matches the school, grade, and teacher,
            // add the quantity needed for that supply list to the total needed
            if (supplyList.school.equals(school)
              && supplyList.grade.equals(grade)
              && supplyList.teacher.equals(teacher)) {
              int qty = supplyList.quantity != null ? supplyList.quantity : 1;
              totalNeeded += numStudents * qty;

              schoolCount++;

              // Use the first linked item to update its calculatedMinQuantity.

              bestMatch.calculatedMinQuantity = totalNeeded;
              bestMatch.calculatedStockState = calculateStockState(bestMatch);
              inventoryCollection.updateOne(
                eq("_id", new ObjectId(bestMatch._id)),
                Updates.set("calculatedMinQuantity", bestMatch.calculatedMinQuantity));
              inventoryCollection.updateOne(
                eq("_id", new ObjectId(bestMatch._id)),
                Updates.set("calculatedStockState", bestMatch.calculatedStockState));

              // Combine quantity from all valid invIDs in the supply list to calculate percentageFilled
              int requestedQuantity = 0;
              for (String invID : supplyList.invIDs) {
                if (isInternalInventoryId(invID)) {
                  Inventory inv = inventoryCollection.find(eq("internalID", invID)).first();
                  if (inv != null) {
                    requestedQuantity += inv.quantity;
                  }
                }
              }

              int percentageFilled = requestedQuantity > 0
                ? (int) (Math.round((double) requestedQuantity / totalNeeded * PERCENT_SCALE))
                : 0;
              supplyList.percentageFilled = percentageFilled;
              supplyListCollection.updateOne(
                eq("_id", new ObjectId(supplyList._id)),
                Updates.set("percentageFilled", supplyList.percentageFilled));
            }
          }
        }
      }
    }

    return new long[]{totalSupplyLists, validInvIDCount, invalidInvIDCount, bestMatchNullCount, schoolCount};
  }

  // Endpoint to calculate states
  @Route(method = HttpMethod.POST, path = API_CALCULATE_STATES)
  @RequirePermission("edit_inventory_item")
  public void calculateStatesTest(Context ctx) {
    long[] results = calculateUnitsAndStates();
    ctx.json(Map.of(
      "totalSupplyLists", results[0],
      "validInvIDCount", results[1],
      "invalidInvIDCount", results[2],
      "bestMatchNullCount", results[BEST_MATCH_NULL_RESULT_INDEX],
      "schoolCount", results[SCHOOL_COUNT_RESULT_INDEX]
    ));
    ctx.status(HttpStatus.OK);
  }

  private boolean isInternalInventoryId(String invID) {
    return invID != null && invID.matches(INTERNAL_INVENTORY_ID_PATTERN);
  }

  // // Endpoint to calculate states
  // @Route(method = HttpMethod.GET, path = "$API_CALCULATE_STATES/test")
  // @RequirePermission("add_inventory_item")
  // public void calculateStates(Context ctx) {
  //   long[] results = calculateUnitsAndStates();
  //   ctx.json(Map.of(
  //     "Supply Lists Processed", results[0],
  //     "Properly Processed Supply Lists", results[1]
  //   ));
  //   ctx.status(HttpStatus.OK);
  // }
}
