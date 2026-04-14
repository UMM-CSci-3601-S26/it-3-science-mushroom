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

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// Misc Imports
import umm3601.Controller;

public class SupplyListController implements Controller {

  private static final String API_SUPPLYLIST = "/api/supplylist";
  private static final String API_SUPPLYLIST_BY_ID = "/api/supplylist/{id}";

  static final String ACADEMIC_YEAR_KEY = "academicYear";
  static final String SCHOOL_KEY = "school";
  static final String GRADE_KEY = "grade";
  static final String TEACHER_KEY = "teacher";
  static final String ITEM_KEY = "item";
  static final String BRAND_KEY = "brand";
  static final String COUNT_KEY = "count";
  static final String SIZE_KEY = "size";
  static final String COLOR_KEY = "color";
  static final String QUANTITY_KEY = "quantity";
  static final String NOTES_KEY = "notes";
  static final String MATERIAL_KEY = "material";
  static final String TYPE_KEY = "type";
  static final String SORT_ORDER_KEY = "sortorder";

  private final JacksonMongoCollection<SupplyList> supplyListCollection;

  public SupplyListController(MongoDatabase database) {
    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
      "supplylist",
      SupplyList.class,
      UuidRepresentation.STANDARD
    );
  }

  /**
   * Get a single Supply List by ID.
   * @param ctx The Javalin HTTP context
   * @throws BadRequestResponse if the ID was not a legal Mongo Object ID
   * @throws NotFoundResponse if no Supply List with the requested ID was found
   * @return The Supply List with the requested ID
   */
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
   * @param ctx The Javalin HTTP context
   */
  public void getSupplyLists(Context ctx) {
    Bson filter = constructFilter(ctx);

    FindIterable<SupplyList> results = supplyListCollection.find(filter);

    ArrayList<SupplyList> matching = results.into(new ArrayList<>());

    ctx.json(matching);
    ctx.status(HttpStatus.OK);
  }

  // "Crayons,,pencils"
  private Bson multipleIntakeFilter(String field, String raw) {
    List<Pattern> patterns = Arrays.stream(raw.split(","))
        .map(String::trim)
        .filter(s -> !s.isEmpty())
        .map(s -> Pattern.compile(Pattern.quote(s), Pattern.CASE_INSENSITIVE))
        .toList();

    return Filters.in(field, patterns);
  }

  // Builds a filter for AttributeOptions fields (brand, color, type, material).
  // Searches both the allOf and anyOf sub-arrays so either can satisfy the query.
  private Bson attributeOptionsFilter(String field, String raw) {
    return Filters.or(
      multipleIntakeFilter(field + ".allOf", raw),
      multipleIntakeFilter(field + ".anyOf", raw)
    );
  }

  /**
   * Construct a MongoDB filter based on query parameters in the HTTP request
   * @return A MongoDB filter
   */
  private Bson constructFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    // For school
    if (ctx.queryParamMap().containsKey(SCHOOL_KEY)) {
      filters.add(multipleIntakeFilter(SCHOOL_KEY, ctx.queryParam(SCHOOL_KEY)));
    }

    // For grade
    if (ctx.queryParamMap().containsKey(GRADE_KEY)) {
      filters.add(multipleIntakeFilter(GRADE_KEY, ctx.queryParam(GRADE_KEY)));
    }

    // For teacher
    if (ctx.queryParamMap().containsKey(TEACHER_KEY)) {
      filters.add(multipleIntakeFilter(TEACHER_KEY, ctx.queryParam(TEACHER_KEY)));
    }

    // For academic year
    if (ctx.queryParamMap().containsKey(ACADEMIC_YEAR_KEY)) {
      filters.add(multipleIntakeFilter(ACADEMIC_YEAR_KEY, ctx.queryParam(ACADEMIC_YEAR_KEY)));
    }

    // For item (array field — matches any element in the list)
    if (ctx.queryParamMap().containsKey(ITEM_KEY)) {
      filters.add(multipleIntakeFilter(ITEM_KEY, ctx.queryParam(ITEM_KEY)));
    }

    // For brand (searches allOf and anyOf)
    if (ctx.queryParamMap().containsKey(BRAND_KEY)) {
      filters.add(attributeOptionsFilter(BRAND_KEY, ctx.queryParam(BRAND_KEY)));
    }

    // For color (searches allOf and anyOf)
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

    // For count, which must be an integer
    if (ctx.queryParamMap().containsKey(COUNT_KEY)) {
      String cParam = ctx.queryParam(COUNT_KEY);
      try {
        int c = Integer.parseInt(cParam);
        filters.add(Filters.eq(COUNT_KEY, c));
      } catch (NumberFormatException e) {
        throw new BadRequestResponse("count must be an integer.");
      }
    }

    // For notes
    if (ctx.queryParamMap().containsKey(NOTES_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(NOTES_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(NOTES_KEY, pattern));
    }

    // For material (searches allOf and anyOf)
    if (ctx.queryParamMap().containsKey(MATERIAL_KEY)) {
      filters.add(attributeOptionsFilter(MATERIAL_KEY, ctx.queryParam(MATERIAL_KEY)));
    }

    // For type (searches allOf and anyOf)
    if (ctx.queryParamMap().containsKey(TYPE_KEY)) {
      filters.add(attributeOptionsFilter(TYPE_KEY, ctx.queryParam(TYPE_KEY)));
    }

    // If no filters, return an empty Document to match all; otherwise combine with $and
    return filters.isEmpty() ? new Document() : and(filters);
  }

  public void addSupplyList(Context ctx) {
    SupplyList newSupplyList = ctx.bodyValidator(SupplyList.class)
    .check(s -> s.school != null && !s.school.isBlank(), "school must be a non-empty string")
    .check(s -> s.grade != null && !s.grade.isBlank(), "grade must be a non-empty string")
    .check(s -> s.item != null && !s.item.isEmpty(), "item must be a non-empty list")
    .check(s -> s.count == null || s.count > 0, "count must be null or a positive integer")
    .check(s -> s.quantity == null || s.quantity > 0, "quantity must be null or a positive integer")
    .get();

    supplyListCollection.insertOne(newSupplyList);
    ctx.status(HttpStatus.CREATED);
  }

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

  public void editSupplyList(Context ctx) {
    String id = ctx.pathParam("id");
    SupplyList updatedSupplyList = ctx.bodyValidator(SupplyList.class)
      .check(s -> s.school != null && !s.school.isBlank(), "school must be a non-empty string")
      .check(s -> s.grade != null && !s.grade.isBlank(), "grade must be a non-empty string")
      .check(s -> s.item != null && !s.item.isEmpty(), "item must be a non-empty list")
      .check(s -> s.count == null || s.count > 0, "count must be null or a positive integer")
      .check(s -> s.quantity == null || s.quantity > 0, "quantity must be null or a positive integer")
      .get();

    try {
      updatedSupplyList._id = id; // Ensure the ID is set for the update
      long modifiedCount = supplyListCollection.replaceOne(
        eq("_id", new ObjectId(id)), updatedSupplyList).getModifiedCount();
      if (modifiedCount == 0) {
        throw new NotFoundResponse("The requested supply list item was not found");
      }
      ctx.status(HttpStatus.OK);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested supply list id wasn't a legal Mongo Object ID.");
    }
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_SUPPLYLIST, this::getSupplyLists);
    server.get(API_SUPPLYLIST_BY_ID, this::getList);

    server.post(API_SUPPLYLIST, this::addSupplyList);
    server.delete(API_SUPPLYLIST_BY_ID, this::deleteSupplyList);
    server.put(API_SUPPLYLIST_BY_ID, this::editSupplyList);
  }
}
