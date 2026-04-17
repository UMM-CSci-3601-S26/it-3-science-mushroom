// Packages
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

// Org Imports
import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;

// Com Imports
import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import io.javalin.json.JavalinJackson;
import io.javalin.validation.BodyValidator;


@SuppressWarnings({ "MagicNumber" })
class FamilyControllerSpec {
  private FamilyController familyController;

  private ObjectId testFamilyId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private static JavalinJackson javalinJackson = new JavalinJackson();

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<ArrayList<Family>> familyArrayListCaptor;

  @Captor
  private ArgumentCaptor<Family> familyCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  @Captor
  private ArgumentCaptor<Map<String, Object>> dashboardCaptor;

  // -- Test Management -- \\

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
        MongoClientSettings.builder()
            .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
            .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);

    MongoCollection<Document> familyDocuments = db.getCollection("family");
    familyDocuments.drop();

    List<Document> testFamilies = new ArrayList<>();

    testFamilies.add(
      new Document()
        .append("guardianName", "Jane Doe")
        .append("email", "jane@email.com")
        .append("address", "123 Street")
        .append("timeSlot", "10:00-11:00")
        .append("students", List.of(
          new Document()
            .append("name", "Alice")
            .append("grade", "3")
            .append("school", "Morris Area High School")
            .append("schoolAbbreviation", "MAHS")
            .append("teacher", "N/A")
            .append("backpack", true)
            .append("headphones", false),
          new Document()
            .append("name", "Timmy")
            .append("grade", "5")
            .append("school", "Morris Area High School")
            .append("schoolAbbreviation", "MAHS")
            .append("teacher", "N/A")
            .append("backpack", true)
            .append("headphones", false)
        )
    ));
    testFamilies.add(
      new Document()
      .append("guardianName", "John Christensen")
      .append("email", "jchristensen@email.com")
      .append("address", "713 Broadway")
      .append("timeSlot", "8:00-9:00")
      .append("students", List.of(
        new Document()
          .append("name", "Sara")
          .append("grade", "7")
          .append("school", "Morris Area High School")
          .append("schoolAbbreviation", "MAHS")
          .append("teacher", "N/A")
          .append("backpack", true)
          .append("headphones", false),
        new Document()
          .append("name", "Ronan")
          .append("grade", "4")
          .append("school", "Herman High School")
          .append("schoolAbbreviation", "HHS")
          .append("teacher", "N/A")
          .append("backpack", true)
          .append("headphones", false)
      ))
    );
    testFamilies.add(
      new Document()
        .append("guardianName", "John Johnson")
        .append("email", "jjohnson@email.com")
        .append("address", "456 Avenue")
        .append("timeSlot", "2:00-3:00")
        .append("students", List.of(
          new Document()
            .append("name", "Lilian")
            .append("grade", "1")
            .append("school", "Herman High School")
            .append("schoolAbbreviation", "HHS")
            .append("teacher", "N/A")
            .append("backpack", true)
            .append("headphones", false)
        ))
    );

    testFamilyId = new ObjectId();

    Document specialFamily = new Document()
      .append("_id", testFamilyId)
      .append("guardianName", "Bob Jones")
      .append("email", "bob@email.com")
      .append("address", "456 Oak Ave")
      .append("timeSlot", "2:00-3:00")
      .append("students", List.of(
        new Document()
          .append("name", "Sara")
          .append("grade", "5")
          .append("school", "Roosevelt")
          .append("schoolAbbreviation", "R")
          .append("teacher", "N/A")
          .append("backpack", true)
          .append("headphones", false)

      ));

    familyDocuments.insertMany(testFamilies);
    familyDocuments.insertOne(specialFamily);

    familyController = new FamilyController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);

    familyController.addRoutes(mockServer);

    verify(mockServer, Mockito.atLeast(4)).get(any(), any());
    verify(mockServer, Mockito.atLeastOnce()).post(any(), any());
    verify(mockServer, Mockito.atLeastOnce()).delete(any(), any());
  }

  // -- Family GET tests -- \\

  @Test
  void canGetAllFamilies() throws IOException {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());
    familyController.getFamilies(ctx);

    verify(ctx).json(familyArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(
      db.getCollection("family").countDocuments(),
      familyArrayListCaptor.getValue().size());
  }

  @Test
  void canGetFamilyWithString() throws IOException {
    Integer bodyNumber = 2;

    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put(FamilyController.FAMILY_KEY, Arrays.asList(new String[] {"John"}));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam(FamilyController.FAMILY_KEY)).thenReturn("John");

    familyController.getFamilies(ctx);

    verify(ctx).json(familyArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    // Confirm that we have two families with the pattern John in the family name.
    assertEquals(bodyNumber, familyArrayListCaptor.getValue().size());
  }

  @Test
  void getFamilyWithExistentId() {
    String id = testFamilyId.toString();
    when(ctx.pathParam("id")).thenReturn(id);

    familyController.getFamily(ctx);

    verify(ctx).json(familyCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Bob Jones", familyCaptor.getValue().guardianName);
    assertEquals(testFamilyId.toString(), familyCaptor.getValue()._id);
  }

  @Test
  void getFamilyWithBadId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      familyController.getFamily(ctx);
    });

    assertEquals(
      "The requested family id wasn't a legal Mongo Object ID.",
      exception.getMessage());
  }

  @Test
  void getFamiliesWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      familyController.getFamily(ctx);
    });

    assertEquals("The requested family was not found", exception.getMessage());
  }

  // -- Family POST Tests -- \\

  @Test
  void addNewFamily() {
    Family newFamily = new Family();
    newFamily.guardianName = "Charlie Brown";
    newFamily.email = "charlie@email.com";
    newFamily.address = "789 Pine St";
    newFamily.timeSlot = "Evening";
    newFamily.students = new ArrayList<>();

    String json = javalinJackson.toJsonString(newFamily, Family.class);

    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(
        json,
        Family.class,
        () -> javalinJackson.fromJsonString(json, Family.class)
      ));

    familyController.addNewFamily(ctx);

    verify(ctx).json(mapCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);

    Document added = db.getCollection("family")
      .find(eq("_id", new ObjectId(mapCaptor.getValue().get("id"))))
      .first();

    assertEquals("Charlie Brown", added.get("guardianName"));
    assertEquals("charlie@email.com", added.get("email"));
  }

  @Test
  void addInvalidEmail() {
    String json = """
      {
        "guardianName": "Invalid Email",
        "email": "invalid-email",
        "address": "",
        "timeSlot": "",
        "students": []
      }
      """;

    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(
        json,
        Family.class,
        () -> javalinJackson.fromJsonString(json, Family.class)
      ));

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        familyController.addNewFamily(ctx);
      });

    assertTrue(exception.getMessage().contains("email was invalid-email"));
  }

  @Test
  void addNullEmail() {
    String json = """
      {
        "guardianName": "Null Email",
        "email": null,
        "address": "",
        "timeSlot": "",
        "students": []
      }
      """;

    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(
        json,
        Family.class,
        () -> javalinJackson.fromJsonString(json, Family.class)
      ));

    BadRequestResponse exception =
      assertThrows(BadRequestResponse.class, () -> {
        familyController.addNewFamily(ctx);
      });

    assertTrue(exception.getMessage().contains("valid email"));
    assertTrue(exception.getMessage().contains("email was null"));
  }

  // -- Family PUT Tests -- \\
  @Test
  void updateFamily() {
    Family updatedFamily = new Family();
    updatedFamily._id = testFamilyId.toString();
    updatedFamily.guardianName = "Bob Jones";
    updatedFamily.email = "bob@email.com";
    updatedFamily.address = "789 7th Ave";
    updatedFamily.timeSlot = "2:00-3:00";
    updatedFamily.students = new ArrayList<>();

    String json = javalinJackson.toJsonString(updatedFamily, Family.class);

    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
        .thenReturn(new BodyValidator<>(
            json,
            Family.class,
            () -> javalinJackson.fromJsonString(json, Family.class)
        ));
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.updateFamily(ctx);

    verify(ctx).json(familyCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Document added = db.getCollection("family")
        .find(eq("_id", testFamilyId))
        .first();

    assertEquals("789 7th Ave", added.get("address"));

    Family result = familyCaptor.getValue();

    assertEquals("789 7th Ave", result.address);
    assertEquals("Bob Jones", result.guardianName);
    assertEquals("bob@email.com", result.email);
    assertEquals("2:00-3:00", result.timeSlot);
  }

  @Test
  void updateFamilyWithBadId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      familyController.updateFamily(ctx);
    });

    assertEquals(
      "The requested family id wasn't a legal Mongo Object ID.",
      exception.getMessage());
  }

  @Test
  void updateFamiliesWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      familyController.updateFamily(ctx);
    });

    assertEquals("The requested family was not found", exception.getMessage());
  }

  // -- Family DELETE Tests -- \\

  @Test
  void deleteFoundFamily() {
    when(ctx.pathParam("id"))
      .thenReturn(testFamilyId.toString());

    familyController.deleteFamily(ctx);

    verify(ctx).status(HttpStatus.OK);

    assertEquals(0,
      db.getCollection("family")
        .countDocuments(eq("_id", testFamilyId)));
  }

  @Test
  void deleteFamilyNotFound() {
    // Valid ObjectId format, but not in database
    String nonExistentId = new ObjectId().toString();
    when(ctx.pathParam("id")).thenReturn(nonExistentId);

    NotFoundResponse exception =
      assertThrows(NotFoundResponse.class, () -> {
        familyController.deleteFamily(ctx);
      });

    verify(ctx).status(HttpStatus.NOT_FOUND);

    assertTrue(exception.getMessage().contains(nonExistentId));
    assertTrue(exception.getMessage().contains("Was unable to delete Family ID"));
  }

  @Test
  void deleteFamilyInvalidId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      familyController.deleteFamily(ctx);
    });

    assertEquals(
      "The requested family id wasn't a legal Mongo Object ID.",
      exception.getMessage());
  }


  // -- Dashboard Tests -- \\

  @Test
  void getDashboardStats() {
    familyController.getDashboardStats(ctx);

    verify(ctx).json(dashboardCaptor.capture());

    Map<String, Object> result = dashboardCaptor.getValue();

    assertTrue(result.containsKey("studentsPerSchool"));
    assertTrue(result.containsKey("studentsPerGrade"));
    assertTrue(result.containsKey("totalFamilies"));
    assertTrue(result.containsKey("totalStudents"));

    assertEquals(
      (int) db.getCollection("family").countDocuments(),
      result.get("totalFamilies")
    );

    assertEquals(6, result.get("totalStudents"));
  }

  @SuppressWarnings("unchecked")
  @Test
  void dashboardSkipsFamiliesWithNullStudents() {
    Document nullStudentsFamily = new Document()
      .append("guardianName", "Null Students")
      .append("email", "")
      .append("address", "")
      .append("timeSlot", "")
      .append("students", null);

    db.getCollection("family").insertOne(nullStudentsFamily);
    familyController.getDashboardStats(ctx);

    verify(ctx).json(dashboardCaptor.capture());

    Map<String, Object> result = dashboardCaptor.getValue();

    // Just check studentsPerSchool since that's where the students data is used
    Map<String, Integer> studentsPerSchool = (Map<String, Integer>) result.get("studentsPerSchool");

    // Should just be the 3 schools from the setup data, not a "null" school from the new family
    assertEquals(3, studentsPerSchool.size());
  }

  // -- CSV Tests -- \\

  @Test
  void exportFamiliesAsCSVProducesCorrectCSV() {
    familyController.exportFamiliesAsCSV(ctx);

    ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);

    verify(ctx).result(resultCaptor.capture());
    verify(ctx).contentType("text/csv");
    verify(ctx).status(HttpStatus.OK);

    String csv = resultCaptor.getValue();

    // Check headers
    assertTrue(csv.contains(
      "Guardian Name,Email,Address,Time Slot,Number of Students"));

    // Check Jane Doe (2 students)
    assertTrue(csv.contains(
      "\"Jane Doe\",\"jane@email.com\",\"123 Street\",\"10:00-11:00\",2"));

    // Check John Christensen (2 students)
    assertTrue(csv.contains(
      "\"John Christensen\",\"jchristensen@email.com\",\"713 Broadway\",\"8:00-9:00\",2"));

    // Check John Johnson (1 student)
    assertTrue(csv.contains(
      "\"John Johnson\",\"jjohnson@email.com\",\"456 Avenue\",\"2:00-3:00\",1"));

    // Check Bob Jones (1 student)
    assertTrue(csv.contains(
      "\"Bob Jones\",\"bob@email.com\",\"456 Oak Ave\",\"2:00-3:00\",1"));
  }

  @Test
  void exportFamiliesAsCSVCleansCSV() {
    // As stated in FamilyController, these shouldn't be possible values,
    // but the clean up method should handle them just in case
    Document unsafeFamily = new Document()
      .append("guardianName", "=CMD(\"calc\")")
      .append("email", "dumbdwads\"@email.com")
      .append("address", "123 Evil Beevil\nStreet")
      .append("timeSlot", "+1:00-2:00")
      .append("students", List.of());

    db.getCollection("family").insertOne(unsafeFamily);

    familyController.exportFamiliesAsCSV(ctx);

    ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);
    verify(ctx).result(resultCaptor.capture());

    String csv = resultCaptor.getValue();

    assertTrue(csv.contains("\"'=CMD(\"\"calc\"\")\""));
    assertTrue(csv.contains("\"dumbdwads\"\"@email.com\""));
    assertTrue(csv.contains("\"123 Evil Beevil Street\""));
    assertTrue(csv.contains("\"'+1:00-2:00\""));
  }

  @Test
  void exportFamiliesAsCSVWithNoFamilies() {
    db.getCollection("family").deleteMany(new Document());

    familyController.exportFamiliesAsCSV(ctx);

    ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);
    verify(ctx).result(resultCaptor.capture());

    String csv = resultCaptor.getValue();

    // Should just be the headers, no rows
    assertEquals("Guardian Name,Email,Address,Time Slot,Number of Students\n", csv);
  }

  @SuppressWarnings("static-access")
  @Test
  void cleanUpCSVHandlesNullValues() {
    db.getCollection("family").deleteMany(new Document());

    String cleaned = familyController.cleanUpCSV(null);

    // Should just be an empty string, not "null" or anything else
    assertEquals("", cleaned);
  }

  @Test
  void exportFamiliesAsCSVHandlesNullStudents() {
  Document familyWithNullStudents = new Document()
    .append("guardianName", "Null Students")
      .append("email", "")
      .append("address", "")
      .append("timeSlot", "")
      .append("students", null);

  db.getCollection("family").insertOne(familyWithNullStudents);

  familyController.exportFamiliesAsCSV(ctx);

  ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);
  verify(ctx).result(resultCaptor.capture());

  String csv = resultCaptor.getValue();

  // Should have the family with 0 students
  assertTrue(csv.contains("\"Null Students\",\"\",\"\",\"\",0"));
}
}
