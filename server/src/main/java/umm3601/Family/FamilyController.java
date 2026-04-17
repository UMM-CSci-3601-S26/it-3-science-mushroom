// Packages /
package umm3601.Family;

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

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// Misc Imports
import umm3601.Controller;

/* FamilyController Contains the Following:
- getFamilies()
- getFamily() /By ID/
- addNewFamily()
- deleteFamily() /By ID/
- getDashboardStats() /Has its own API/
- exportFamiliesAsCSV()
*/

// Controller
public class FamilyController implements Controller {
  // API Endpoints
  private static final String API_FAMILY = "/api/family";
  private static final String API_DASHBOARD = "/api/dashboard";
  private static final String API_FAMILY_BY_ID = "/api/family/{id}";
  private static final String API_FAMILY_EXPORT = "/api/family/export";

  // Regex
  public static final String EMAIL_REGEX = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

  // Filter key
  static final String FAMILY_KEY = "guardianName";

  // Database Collection
  private final JacksonMongoCollection<Family> familyCollection;

  // Database Constructor
  public FamilyController(MongoDatabase database) {
    familyCollection = JacksonMongoCollection.builder().build(
        database,
        "family",
        Family.class,
        UuidRepresentation.STANDARD);
  }

  // GET all families
  public void getFamilies(Context ctx) {
    Bson filter = constructFilter(ctx);

    ArrayList<Family> matchingFamilies = familyCollection.find(filter).into(new ArrayList<>());

    ctx.json(matchingFamilies);
    ctx.status(HttpStatus.OK);
  }

  // GET family by ID
  public void getFamily(Context ctx) {
    String id = ctx.pathParam("id");
    Family family;

    try {
      family = familyCollection.find(eq("_id", new ObjectId(id))).first();
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }
    if (family == null) {
      throw new NotFoundResponse("The requested family was not found");
    } else {
      ctx.json(family);
      ctx.status(HttpStatus.OK);
    }
  }

  // Filter for families
  private Bson constructFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    if (ctx.queryParamMap().containsKey(FAMILY_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(FAMILY_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(FAMILY_KEY, pattern));
    }

    return filters.isEmpty() ? new Document() : and(filters);
  }

  // POST new family
  public void addNewFamily(Context ctx) {
    String body = ctx.body();
    Family newFamily = ctx.bodyValidator(Family.class).get();

    // Validate email (has to be present and match regex)
    if (newFamily.email == null || !newFamily.email.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse(
        "Family must have a valid email; email was " + newFamily.email + "; family was " + body);
      // throw new BadRequestResponse("Family must have a valid email.");
      // Note: This is commented out in favor of the expanded one for development purposes.
    }

    familyCollection.insertOne(newFamily);

    ctx.json(Map.of("id", newFamily._id));
    ctx.status(HttpStatus.CREATED);
  }

  // UPDATE family
  public void updateFamily(Context ctx) {
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The requested family was not found");
    }

    Family updatedFamily = ctx.bodyValidator(Family.class).get();

    if (updatedFamily.email == null || !updatedFamily.email.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse(
        "Family must have a valid email; email was " + updatedFamily.email + "; family was " + ctx.body());
    }

    List<Document> updatedStudentInfo = new ArrayList<>();

    for (Family.StudentInfo student : updatedFamily.students) {
      Document updatedStudent = new Document()
        .append("name", student.name)
        .append("grade", student.grade)
        .append("school", student.school)
        .append("teacher", student.teacher);

      updatedStudentInfo.add(updatedStudent);
    }

    Bson update = new Document("$set", new Document()
      .append("guardianName", updatedFamily.guardianName)
      .append("email", updatedFamily.email)
      .append("address", updatedFamily.address)
      .append("timeSlot", updatedFamily.timeSlot)
      .append("students", updatedStudentInfo)
    );

    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // DELETE family
  public void deleteFamily(Context ctx) {
    String id = ctx.pathParam("id");
    DeleteResult deleteResult;

    // Handle case where ID is not proper
    try {
      ObjectId familyId = new ObjectId(id);
      deleteResult = familyCollection.deleteOne(eq("_id", familyId));
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    if (deleteResult.getDeletedCount() != 1) {
      ctx.status(HttpStatus.NOT_FOUND);
      throw new NotFoundResponse(
        "Was unable to delete Family ID"
          + id
          + "; perhaps illegal Family ID or an ID for a Family not in the system?");
    }
    ctx.status(HttpStatus.OK);
  }

  // GET dashboard stats
  public void getDashboardStats(Context ctx) {
    ArrayList<Family> families = familyCollection
      .find()
      .into(new ArrayList<>());

    Map<String, Integer> studentsPerSchool = new HashMap<>();
    Map<String, Integer> studentsPerGrade = new HashMap<>();

    int totalStudents = 0;

    // Loop through all families and their students to count students per school and grade
    for (Family family : families) {
      if (family.students == null) {
        continue; // Skip families with no students (shouldn't happen, but just in case)
      }
      for (Family.StudentInfo student : family.students) {
        // Count per school
        studentsPerSchool.merge(student.school, 1, Integer::sum);

        // Count per grade
        studentsPerGrade.merge(student.grade, 1, Integer::sum);

        // Count of total students
        totalStudents = totalStudents + 1;
      }
    }

    // Compile results into map to return as JSOn
    Map<String, Object> result = new HashMap<>();
    result.put("studentsPerSchool", studentsPerSchool);
    result.put("studentsPerGrade", studentsPerGrade);
    result.put("totalFamilies", families.size());
    result.put("totalStudents", totalStudents);

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // GET export families as CSV
  public void exportFamiliesAsCSV(Context ctx) {
    List<Family> families = familyCollection.find().into(new ArrayList<>());

    StringBuilder csv = new StringBuilder();

    // Headers
    csv.append("Guardian Name,Email,Address,Time Slot,Number of Students\n");

    // Fill rows
    for (Family family : families) {
      int studentCount = family.students != null ? family.students.size() : 0;

      csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%d\n",
        cleanUpCSV(family.guardianName),
        cleanUpCSV(family.email),
        cleanUpCSV(family.address),
        cleanUpCSV(family.timeSlot),
        studentCount
      ));
    }

    // Set response headers for CSV download
    ctx.contentType("text/csv");
    ctx.header("Content-Disposition", "attachment; filename=families.csv");
    ctx.status(HttpStatus.OK);
    ctx.result(csv.toString());
  }

  /**
   * Cleans up CSV values by handling nulls, flattening line breaks, escaping quotes,
   * preventing formula injection, trimming whitespace, and removing outside quotes from values.
   * @param value CSV value to clean up
   * @return Cleaned up CSV value
   */
  public static String cleanUpCSV(String value) {
    // Handle null values
    if (value == null) {
      return "";
    }

    // Clean up line breaks (flatten them). Ensures each value always occupies a single CSV row
    String cleaned = value
      .replace("\r\n", " ")
      .replace("\n", " ")
      .replace("\r", " ");

    // Put a single ' in front of any =, + , -, or @ to ensure spreadsheet software doesn't see it as a formula
    // There shouldn't ever be any data like this, but this is just in case
    if (cleaned.matches("^[\\t ]*[=+\\-@].*")) {
      cleaned = "'" + cleaned;
    }

    // Trim whitespace from beginning and end of value
    cleaned = cleaned.trim();

    // Remove outside quotes if they exist (but keep internal quotes, which should be escaped by doubling them)
    if (cleaned.startsWith("\"") && cleaned.endsWith("\"")) {
      cleaned = cleaned.substring(1, cleaned.length() - 1);
    }

    return cleaned;
  }

  @Override
  public void addRoutes(Javalin server) {
    // GET routes
    server.get(API_FAMILY_EXPORT, this::exportFamiliesAsCSV); // CSV export
    server.get(API_FAMILY, this::getFamilies); // All families
    server.get(API_FAMILY_BY_ID, this::getFamily); // Family by ID
    server.get(API_DASHBOARD, this::getDashboardStats); // Dashboard stats

    // UPDATE routes
    server.put(API_FAMILY_BY_ID, this::updateFamily); // Update family by ID

    // POST routes
    server.post(API_FAMILY, this::addNewFamily); // Add family

    // DELETE routes
    server.delete(API_FAMILY_BY_ID, this::deleteFamily); // Delete family
  }
}
