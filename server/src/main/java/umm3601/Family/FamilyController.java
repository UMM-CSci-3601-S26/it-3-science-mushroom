package umm3601.Family;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import io.javalin.Javalin;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.result.DeleteResult;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

import static com.mongodb.client.model.Filters.eq;

import umm3601.Controller;

/* FamilyController Contains the Following:
- getFamilies()
- getFamily() /By ID/
- addNewFamily()
- deleteFamily() /By ID/
- getDashboardStats() /Has its own API/
- exportFamiliesAsCSV()
*/

/* Notes:
I'd like to make more checks for adding a family.
Just dont know how to make it work the way I wish.
*/

public class FamilyController implements Controller {
  private static final String API_FAMILY = "/api/family";
  private static final String API_DASHBOARD = "/api/dashboard";
  private static final String API_FAMILY_BY_ID = "/api/family/{id}";
  private static final String API_FAMILY_EXPORT = "/api/family/export";

  public static final String EMAIL_REGEX = "^[a-zA-Z0-9_!#$%&'*+/=?`{|}~^.-]+@[a-zA-Z0-9.-]+$";

  private final JacksonMongoCollection<Family> familyCollection;

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
    Family newFamily = ctx.bodyValidator(Family.class)
      .check(fam -> fam.email.matches(EMAIL_REGEX),
        "Family must have a valid email; body was " + body)
      // .check(fam -> fam.students,
      //   "Family must have a legal family role; body was " + body)
      .get();

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
          + "; perhaps illegal Family ID or an ID for an item not in the system?");
    }
    ctx.status(HttpStatus.OK);
  }

  public void getDashboardStats(Context ctx) {
    ArrayList<Family> families = familyCollection
      .find()
      .into(new ArrayList<>());

    Map<String, Integer> studentsPerSchool = new HashMap<>();
    Map<String, Integer> studentsPerGrade = new HashMap<>();

    for (Family family : families) {
      for (Family.StudentInfo student : family.students) {
        //count per school
        studentsPerSchool.merge(student.school, 1, Integer::sum);

        //count per grade
        studentsPerGrade.merge(student.grade, 1, Integer::sum);
      }
    }
    Map<String, Object> result = new HashMap<>();
    result.put("studentsPerSchool", studentsPerSchool);
    result.put("studentsPerGrade", studentsPerGrade);
    result.put("totalFamilies", families.size());

    ctx.json(result);
  }

  public void exportFamiliesAsCSV(Context ctx) {
    List<Family> families = familyCollection.find().into(new ArrayList<>());

    StringBuilder csv = new StringBuilder();

    // Header
    csv.append("Guardian Name,Email,Address,Time Slot,Number of Students\n");

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

    ctx.contentType("text/csv");
    ctx.header("Content-Disposition", "attachment; filename=families.csv");
    ctx.status(HttpStatus.OK);
    ctx.result(csv.toString());
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_FAMILY, this::getFamilies);
    server.post(API_FAMILY, this::addNewFamily);

    // Put specific routes FIRST
    server.get(API_FAMILY_EXPORT, this::exportFamiliesAsCSV);
    server.get(API_DASHBOARD, this::getDashboardStats);

    // Put {id} routes LAST
    server.get(API_FAMILY_BY_ID, this::getFamily);
    server.delete(API_FAMILY_BY_ID, this::deleteFamily);
  }
}
