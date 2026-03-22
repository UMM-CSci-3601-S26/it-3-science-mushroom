// Packages /
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

// Java Imports
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Org Imports
import org.bson.UuidRepresentation;
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
  public static final String EMAIL_REGEX = "^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$";

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
    ArrayList<Family> matchingFamilies = familyCollection
      .find()
      .into(new ArrayList<>());

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

  // POST new family
  public void addNewFamily(Context ctx) {
    String body = ctx.body();
    Family newFamily = ctx.bodyValidator(Family.class).get();

    // Validate email (has to be present and match regex)
    if (newFamily.email == null || !newFamily.email.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse(
        "Family must have a valid email; email was " + newFamily.email + "; family was " + body);
    }

    familyCollection.insertOne(newFamily);

    ctx.json(Map.of("id", newFamily._id));
    ctx.status(HttpStatus.CREATED);
  }

  // DELETE family
  public void deleteFamily(Context ctx) {
    String id = ctx.pathParam("id");
    DeleteResult deleteResult = familyCollection.deleteOne(eq("_id", new ObjectId(id)));

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

    // Loop through all families and their students to count students per school and grade
    for (Family family : families) {
      for (Family.StudentInfo student : family.students) {
        // Count per school
        studentsPerSchool.merge(student.school, 1, Integer::sum);

        // Count per grade
        studentsPerGrade.merge(student.grade, 1, Integer::sum);
      }
    }

    // Compile results into map to return as JSOn
    Map<String, Object> result = new HashMap<>();
    result.put("studentsPerSchool", studentsPerSchool);
    result.put("studentsPerGrade", studentsPerGrade);
    result.put("totalFamilies", families.size());

    ctx.json(result);
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
        family.guardianName,
        family.email,
        family.address,
        family.timeSlot,
        studentCount
      ));
    }

    // Set response headers for CSV download
    ctx.contentType("text/csv");
    ctx.header("Content-Disposition", "attachment; filename=families.csv");
    ctx.status(HttpStatus.OK);
    ctx.result(csv.toString());
  }

  @Override
  public void addRoutes(Javalin server) {
    // GET routes
    server.get(API_FAMILY_BY_ID, this::getFamily); // Family by ID
    server.get(API_FAMILY, this::getFamilies); // All families
    server.get(API_FAMILY_EXPORT, this::exportFamiliesAsCSV); // CSV export
    server.get(API_DASHBOARD, this::getDashboardStats); // Dashboard stats

    // POST routes
    server.post(API_FAMILY, this::addNewFamily); // Add family

    // DELETE routes
    server.delete(API_FAMILY_BY_ID, this::deleteFamily); // Delete family
  }
}
