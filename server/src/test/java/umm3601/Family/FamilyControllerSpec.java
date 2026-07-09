// Packages
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
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
import umm3601.Auth.Role;
import umm3601.Family.Family.AvailabilityOptions;
import umm3601.Family.Family.StudentInfo;
import umm3601.Users.Users;
import umm3601.Users.UsersService;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength", "checkstyle:ParameterNumber" })
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
  private ArgumentCaptor<Family.FamilyChecklist> checklistCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  @Captor
  private ArgumentCaptor<Map<String, Object>> dashboardCaptor;

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
  void setupEach() {
    MockitoAnnotations.openMocks(this);

    MongoCollection<Document> familyDocuments = db.getCollection("family");
    MongoCollection<Document> supplyListDocuments = db.getCollection("supplylist");
    MongoCollection<Document> inventoryDocuments = db.getCollection("inventory");
    MongoCollection<Document> settingsDocuments = db.getCollection("settings");

    familyDocuments.drop();
    supplyListDocuments.drop();
    inventoryDocuments.drop();
    settingsDocuments.drop();

    List<Document> testFamilies = List.of(
      familyDoc("Jane Doe", "jane@email.com", "123 Street", "None", "10:00-11:00",
        true, true, true, true, false, "not_helped", List.of(
          studentDoc("Alice", "3", "Morris Area High School", "MAHS", true, false),
          studentDoc("Timmy", "5", "Morris Area High School", "MAHS"))),
      familyDoc("John Christensen", "jchristensen@email.com", "713 Broadway", "None", "8:00-9:00",
        false, true, false, false, true, "helped", List.of(
          studentDoc("Sara", "7", "Morris Area High School", "MAHS"),
          studentDoc("Ronan", "4", "Herman High School", "HHS"))),
      familyDoc("John Johnson", "jjohnson@email.com", "456 Avenue", "None", "2:00-3:00",
        false, false, false, true, false, "being_helped", List.of(
          studentDoc("Lilian", "1", "Herman High School", "HHS"))),
      familyDoc("Melina Brim", "melina@email.com", "125 Street", null, "10:00-11:00",
        false, false, true, true, false, "not_helped", List.of(
          studentDoc("Tricia", "3", "Morris Area High School", "MAHS", true, false),
          studentDoc("Bernice", "5", "Morris Area High School", "MAHS"))),
      familyDoc("Bob Dylan", "therealbobdylan@email.com", "Nowhere", null, "10:00-11:00",
        false, true, true, true, false, "not_helped", List.of(
          studentDoc("Jeanie", "3", "Morris Area High School", "MAHS", true, false),
          studentDoc("Fred", "5", "Morris Area High School", "MAHS"))));

    testFamilyId = new ObjectId();

    Document specialFamily = familyDoc(testFamilyId, "Bob Jones", "bob@email.com", "456 Oak Ave",
      "None", "2:00-3:00", false, true, false, true, false, "not_helped",
      List.of(studentDoc("Sara", "5", "Roosevelt", "R", true, false)));

    familyDocuments.insertMany(testFamilies);
    familyDocuments.insertOne(specialFamily);

    supplyListDocuments.insertMany(List.of(
      supplyListDoc("Backpack"),
      supplyListDoc("Water Bottle")));

    inventoryDocuments.insertMany(List.of(
      inventoryDoc("Backpack", "Student Backpack", 3, "ID-10000", "ITEM-10000", "EXT-10000"),
      inventoryDoc("Notebook", "Wide Ruled Notebook", 4, "ID-10001", "ITEM-10001", "SUB-10001"),
      inventoryDoc("Water Bottle", "Blue Water Bottle", 0, "ID-10002", "ITEM-10002", "EXT-10002")));

    settingsDocuments.insertOne(new Document()
      .append("availableSpots", 5)
      .append("timeAvailability", new Document()
        .append("earlyMorning", "8:00-9:00 AM")
        .append("lateMorning", "10:00-11:00 AM")
        .append("earlyAfternoon", "1:00-2:00 PM")
        .append("lateAfternoon", "3:00-4:00 PM")));

    InventoryMatcher inventoryMatcher = new InventoryMatcher(db);
    familyController = new FamilyController(db, inventoryMatcher);
  }

  private Document familyDoc(String guardianName, String email, String address, String accommodations,
      String timeSlot, boolean earlyMorning, boolean lateMorning, boolean earlyAfternoon,
      boolean lateAfternoon, boolean helped, String status, List<Document> students) {
    return familyDoc(null, guardianName, email, address, accommodations, timeSlot, earlyMorning,
      lateMorning, earlyAfternoon, lateAfternoon, helped, status, students);
  }

  private Document familyDoc(ObjectId id, String guardianName, String email, String address,
      String accommodations, String timeSlot, boolean earlyMorning, boolean lateMorning,
      boolean earlyAfternoon, boolean lateAfternoon, boolean helped, String status,
      List<Document> students) {
    Document family = new Document();
    if (id != null) {
      family.append("_id", id);
    }
    family.append("guardianName", guardianName)
      .append("email", email)
      .append("address", address);
    if (accommodations != null) {
      family.append("accommodations", accommodations);
    }
    return family.append("timeSlot", timeSlot)
      .append("timeAvailability", timeAvailabilityDoc(earlyMorning, lateMorning,
        earlyAfternoon, lateAfternoon))
      .append("helped", helped)
      .append("status", status)
      .append("students", students);
  }

  private Document timeAvailabilityDoc(boolean earlyMorning, boolean lateMorning,
      boolean earlyAfternoon, boolean lateAfternoon) {
    return new Document()
      .append("earlyMorning", earlyMorning)
      .append("lateMorning", lateMorning)
      .append("earlyAfternoon", earlyAfternoon)
      .append("lateAfternoon", lateAfternoon);
  }

  private Document studentDoc(String name, String grade, String school, String schoolAbbreviation) {
    return studentDoc(name, grade, school, schoolAbbreviation, null, null);
  }

  private Document studentDoc(String name, String grade, String school, String schoolAbbreviation,
      Boolean backpack, Boolean headphones) {
    Document student = new Document()
      .append("name", name)
      .append("grade", grade)
      .append("school", school)
      .append("schoolAbbreviation", schoolAbbreviation)
      .append("teacher", "N/A");
    if (backpack != null) {
      student.append("backpack", backpack);
    }
    if (headphones != null) {
      student.append("headphones", headphones);
    }
    return student;
  }

  private Document supplyListDoc(String item) {
    return new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "N/A")
      .append("item", List.of(item))
      .append("quantity", 1);
  }

  private Document inventoryDoc(String item, String description, int quantity,
      String internalId, String internalBarcode, String externalBarcode) {
    return new Document()
      .append("item", item)
      .append("description", description)
      .append("quantity", quantity)
      .append("internalID", internalId)
      .append("internalBarcode", internalBarcode)
      .append("externalBarcode", List.of(externalBarcode));
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    umm3601.Auth.RouteRegistrar.register(mockServer, familyController, null);
    verify(mockServer, Mockito.atLeast(5)).get(any(), any());
    verify(mockServer, Mockito.atLeast(3)).post(any(), any());
    verify(mockServer, Mockito.atLeast(3)).patch(any(), any());
    verify(mockServer, Mockito.atLeastOnce()).delete(any(), any());
  }

  @Test
  void canGetAllFamilies() {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(db.getCollection("family").countDocuments(), familyArrayListCaptor.getValue().size());
  }

  @Test
  void canClearScheduledTimes() {
    familyController.clearScheduledTimes(ctx);

    verify(ctx).json(familyArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    List<Document> families = db.getCollection("family")
      .find()
      .into(new ArrayList<>());

    assertEquals(db.getCollection("family").countDocuments(), familyArrayListCaptor.getValue().size());
    assertTrue(families.stream().allMatch(family -> "".equals(family.getString("timeSlot"))));
  }

  @Test
  void canGetFamilyWithString() {
    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put(FamilyController.FAMILY_KEY, List.of("John"));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam(FamilyController.FAMILY_KEY)).thenReturn("John");
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(2, familyArrayListCaptor.getValue().size());
  }

  @Test
  void canFilterByGuardianLastName() {
    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put("guardianLastName", List.of("Johnson"));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam("guardianLastName")).thenReturn("Johnson");
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    assertEquals(1, familyArrayListCaptor.getValue().size());
    assertEquals("John Johnson", familyArrayListCaptor.getValue().get(0).guardianName);
  }

  @Test
  void canFilterByGuardianFirstName() {
    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put("guardianFirstName", List.of("Jane"));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam("guardianFirstName")).thenReturn("Jane");
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    assertEquals(1, familyArrayListCaptor.getValue().size());
    assertEquals("Jane Doe", familyArrayListCaptor.getValue().get(0).guardianName);
  }

  @Test
  void canFilterFamiliesByStatus() {
    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put("status", List.of("helped"));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam("status")).thenReturn("helped");
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    assertEquals(1, familyArrayListCaptor.getValue().size());
    assertEquals("John Christensen", familyArrayListCaptor.getValue().get(0).guardianName);
  }

  @Test
  void canFilterFamiliesByHelpedBoolean() {
    Map<String, List<String>> queryParams = new HashMap<>();
    queryParams.put("helped", List.of("false"));
    when(ctx.queryParamMap()).thenReturn(queryParams);
    when(ctx.queryParam("helped")).thenReturn("false");
    familyController.getFamilies(ctx);
    verify(ctx).json(familyArrayListCaptor.capture());
    assertEquals(5, familyArrayListCaptor.getValue().size());
  }

  @Test
  void getFamilyWithExistentId() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.getFamily(ctx);
    verify(ctx).json(familyCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Bob Jones", familyCaptor.getValue().guardianName);
    assertEquals(testFamilyId.toString(), familyCaptor.getValue()._id);
  }

  @Test
  void getFamilyWithBadId() {
    when(ctx.pathParam("id")).thenReturn("bad");
    Throwable exception = assertThrows(BadRequestResponse.class, () -> familyController.getFamily(ctx));
    assertEquals("The requested family id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void getFamiliesWithNonexistentId() {
    when(ctx.pathParam("id")).thenReturn("588935f5c668650dc77df581");
    Throwable exception = assertThrows(NotFoundResponse.class, () -> familyController.getFamily(ctx));
    assertEquals("The requested family was not found", exception.getMessage());
  }

  @Test
  void getFinalizedFamilyChecklistReturnsCompletedChecklist() {
    Family family = startHelpSessionAndGetFamily();
    family.checklist.sections.get(0).items.get(0).selected = true;
    family.checklist.sections.get(0).items.get(1).selected = false;
    family.checklist.sections.get(0).items.get(1).substituteBarcode = "SUB-10001";
    FamilyHelpSessionSaveAllRequest request = new FamilyHelpSessionSaveAllRequest();
    request.setChecklist(family.checklist);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveAllRequest.class);
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveAllRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveAllRequest.class)));
    familyController.saveFamilyHelpSessionAll(ctx);
    Mockito.clearInvocations(ctx);
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.getFinalizedFamilyChecklist(ctx);
    verify(ctx).json(checklistCaptor.capture());
    assertFalse(checklistCaptor.getValue().snapshot);
    assertTrue(checklistCaptor.getValue().sections.get(0).saved);
  }

  @Test
  void getFinalizedFamilyChecklistRejectsActiveSnapshot() {
    startHelpSessionAndGetFamily();
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    Throwable exception = assertThrows(NotFoundResponse.class,
      () -> familyController.getFinalizedFamilyChecklist(ctx));

    assertEquals("The finalized checklist for this family was not found", exception.getMessage());
  }

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
      .thenReturn(new BodyValidator<>(json, Family.class, () -> javalinJackson.fromJsonString(json, Family.class)));

    familyController.addNewFamily(ctx);
    verify(ctx).json(mapCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);
    Document added = db.getCollection("family")
      .find(eq("_id", new ObjectId(mapCaptor.getValue().get("id"))))
      .first();
    assertEquals("Charlie Brown", added.get("guardianName"));
    assertEquals("charlie@email.com", added.get("email"));
    assertEquals("not_helped", added.get("status"));
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
      .thenReturn(new BodyValidator<>(json, Family.class, () -> javalinJackson.fromJsonString(json, Family.class)));
    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> familyController.addNewFamily(ctx));
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
      .thenReturn(new BodyValidator<>(json, Family.class, () -> javalinJackson.fromJsonString(json, Family.class)));
    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> familyController.addNewFamily(ctx));
    assertTrue(exception.getMessage().contains("valid email"));
    assertTrue(exception.getMessage().contains("email was null"));
  }

  @Test
  void updateFamily() {
    Family updatedFamily = new Family();
    updatedFamily._id = testFamilyId.toString();
    updatedFamily.guardianName = "Bob Jones";
    updatedFamily.email = "bob@email.com";
    updatedFamily.address = "789 7th Ave";
    updatedFamily.timeSlot = "2:00-3:00";
    updatedFamily.timeAvailability = new AvailabilityOptions();
      updatedFamily.timeAvailability.earlyMorning = false;
      updatedFamily.timeAvailability.lateMorning = true;
      updatedFamily.timeAvailability.earlyAfternoon = false;
      updatedFamily.timeAvailability.lateAfternoon = false;
    updatedFamily.students = new ArrayList<>();
    String json = javalinJackson.toJsonString(updatedFamily, Family.class);
    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(json, Family.class, () -> javalinJackson.fromJsonString(json, Family.class)));
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.updateFamily(ctx);
    verify(ctx).json(familyCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    Document added = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    assertEquals("789 7th Ave", added.get("address"));
    Family result = familyCaptor.getValue();
    assertEquals("789 7th Ave", result.address);
    assertEquals("Bob Jones", result.guardianName);
    assertEquals("bob@email.com", result.email);
  }

  @Test
  void updateFamilyWithBadId() {
    when(ctx.pathParam("id")).thenReturn("bad");
    Throwable exception = assertThrows(BadRequestResponse.class, () -> familyController.updateFamily(ctx));
    assertEquals("The requested family id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void updateFamiliesWithNonexistentId() {
    when(ctx.pathParam("id")).thenReturn("588935f5c668650dc77df581");
    Throwable exception = assertThrows(NotFoundResponse.class, () -> familyController.updateFamily(ctx));
    assertEquals("The requested family was not found", exception.getMessage());
  }

  @Test
  void updateFamilyRejectsInvalidEmailForExistingFamily() {
    Family updatedFamily = new Family();
    updatedFamily.guardianName = "Bob Jones";
    updatedFamily.email = "not-an-email";
    updatedFamily.address = "456 Oak Ave";
    updatedFamily.timeSlot = "2:00-3:00";
    updatedFamily.students = new ArrayList<>();
    String json = javalinJackson.toJsonString(updatedFamily, Family.class);
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(json, Family.class, () -> javalinJackson.fromJsonString(json, Family.class)));
    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> familyController.updateFamily(ctx));
    assertTrue(exception.getMessage().contains("valid email"));
  }

  @Test
  void updateFamilyStatusMarksFamilyHelped() {
    String json = """
      {
        "status": "helped"
      }
      """;
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyStatusUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyStatusUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyStatusUpdateRequest.class)));
    familyController.updateFamilyStatus(ctx);
    verify(ctx).json(familyCaptor.capture());
    assertTrue(familyCaptor.getValue().helped);
    assertEquals("helped", familyCaptor.getValue().status);
  }

  @Test
  void updateFamilyStatusSupportsStatusPayloadWithoutHelpedBoolean() {
    String json = """
      {
        "status": "being_helped"
      }
      """;
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyStatusUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyStatusUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyStatusUpdateRequest.class)));
    familyController.updateFamilyStatus(ctx);
    verify(ctx).json(familyCaptor.capture());
    assertFalse(familyCaptor.getValue().helped);
    assertEquals("being_helped", familyCaptor.getValue().status);
  }

  @Test
  void updateFamilyHelpedSupportsBooleanPayload() {
    String json = """
      {
        "helped": false
      }
      """;
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyStatusUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyStatusUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyStatusUpdateRequest.class)));
    familyController.updateFamilyHelped(ctx);
    verify(ctx).json(familyCaptor.capture());
    assertFalse(familyCaptor.getValue().helped);
    assertEquals("not_helped", familyCaptor.getValue().status);
  }

  @Test
  void updateFamilyStatusRejectsBadIdAndMissingFamily() {
    when(ctx.pathParam("id")).thenReturn("bad-id");
    BadRequestResponse badId = assertThrows(BadRequestResponse.class,
      () -> familyController.updateFamilyStatus(ctx));
    assertTrue(badId.getMessage().contains("family id was not legal"));
    when(ctx.pathParam("id")).thenReturn(new ObjectId().toString());
    NotFoundResponse missing = assertThrows(NotFoundResponse.class,
      () -> familyController.updateFamilyStatus(ctx));
    assertTrue(missing.getMessage().contains("family was not found"));
  }

  @Test
  void updateFamilyStatusRejectsMissingPayload() {
    String json = "{}";
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyStatusUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyStatusUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyStatusUpdateRequest.class)));
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
       () -> familyController.updateFamilyStatus(ctx));
    assertTrue(exception.getMessage().contains("must include either helped or status"));
  }

  @Test
  void updateFamilyChecklistRejectsBadIdAndMissingFamily() {
    when(ctx.pathParam("id")).thenReturn("bad-id");

    BadRequestResponse badId = assertThrows(BadRequestResponse.class,
      () -> familyController.updateFamilyChecklist(ctx));
    assertTrue(badId.getMessage().contains("family id was not legal"));

    when(ctx.pathParam("id")).thenReturn(new ObjectId().toString());

    NotFoundResponse missing = assertThrows(NotFoundResponse.class,
      () -> familyController.updateFamilyChecklist(ctx));
    assertTrue(missing.getMessage().contains("family was not found"));
  }

  @Test
  void updateFamilyChecklistPersistsChecklist() {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    Family.ChecklistSection section = new Family.ChecklistSection();
    section.id = "student-1";
    section.title = "Sara";

    Family.ChecklistItem item = new Family.ChecklistItem();
    item.id = "student-1-item-1";
    item.label = "Backpack";
    section.items = new ArrayList<>(List.of(item));
    checklist.sections = new ArrayList<>(List.of(section));

    FamilyChecklistUpdateRequest request = new FamilyChecklistUpdateRequest();
    request.setChecklist(checklist);
    String json = javalinJackson.toJsonString(request, FamilyChecklistUpdateRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyChecklistUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyChecklistUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyChecklistUpdateRequest.class)));

    familyController.updateFamilyChecklist(ctx);

    verify(ctx).json(familyCaptor.capture());
    assertNotNull(familyCaptor.getValue().checklist);
    assertEquals(1, familyCaptor.getValue().checklist.sections.size());
  }

  @Test
  void startFamilyHelpSessionBuildsSnapshotChecklist() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.startFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family family = familyCaptor.getValue();

    assertEquals("being_helped", family.status);
    assertFalse(family.helped);
    assertTrue(family.checklist.snapshot);
    assertEquals(1, family.checklist.sections.size());
    assertEquals(2, family.checklist.sections.get(0).items.size());
    assertTrue(family.checklist.sections.get(0).items.get(0).available);
    assertFalse(family.checklist.sections.get(0).items.get(1).available);
  }

  @Test
  void getFamilyHelpSessionCreatesSnapshotIfMissing() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.getFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    assertTrue(familyCaptor.getValue().checklist.snapshot);
    assertEquals("being_helped", familyCaptor.getValue().status);
  }

  @Test
  void getFamilyHelpSessionUsesExistingSnapshotWhenAlreadyStarted() {
    Family startedFamily = startHelpSessionAndGetFamily();

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.getFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family fetchedFamily = familyCaptor.getValue();
    assertTrue(fetchedFamily.checklist.snapshot);
    assertEquals(startedFamily.checklist.sections.size(), fetchedFamily.checklist.sections.size());
  }

  @Test
  void startFamilyHelpSessionReusesExistingSnapshot() {
    Family startedFamily = startHelpSessionAndGetFamily();

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.startFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family restartedFamily = familyCaptor.getValue();
    assertTrue(restartedFamily.checklist.snapshot);
    assertEquals(startedFamily.checklist.sections.size(), restartedFamily.checklist.sections.size());
  }

  @Test
  void saveFamilyHelpSessionChildConsumesInventoryAndKeepsSessionOpen() {
    Family family = startHelpSessionAndGetFamily();
    addUnsavedChecklistSection(testFamilyId, "student-2");
    Family.ChecklistSection section = family.checklist.sections.get(0);
    Family.ChecklistItem backpackItem = section.items.get(0);
    Family.ChecklistItem unavailableItem = section.items.get(1);
    backpackItem.selected = true;
    unavailableItem.selected = false;

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    familyController.saveFamilyHelpSessionChild(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family savedFamily = familyCaptor.getValue();
    assertEquals("being_helped", savedFamily.status);
    assertFalse(savedFamily.helped);
    assertNotNull(savedFamily.checklist);
    assertTrue(savedFamily.checklist.sections.get(0).saved);
    assertEquals("not_available_didnt_receive",
      savedFamily.checklist.sections.get(0).items.get(1).notPickedUpReason);

    Document backpackInventory = db.getCollection("inventory")
      .find(eq("internalID", backpackItem.matchedInventoryId))
      .first();
    assertEquals(2, backpackInventory.getInteger("quantity"));
  }

  @Test
  void saveFamilyHelpSessionChildSupportsSubstitutionBarcode() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    Family.ChecklistItem unavailableItem = section.items.get(1);
    section.items.get(0).selected = true;
    unavailableItem.selected = false;
    unavailableItem.substituteBarcode = "SUB-10001";

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    familyController.saveFamilyHelpSessionChild(ctx);

    verify(ctx).json(familyCaptor.capture());
    assertEquals("helped", familyCaptor.getValue().status);
    assertTrue(familyCaptor.getValue().helped);
    assertNotNull(familyCaptor.getValue().checklist);
    assertFalse(familyCaptor.getValue().checklist.snapshot);
    assertTrue(familyCaptor.getValue().checklist.sections.get(0).saved);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    Document updatedChecklist = updatedFamily.get("checklist", Document.class);
    assertNotNull(updatedChecklist);
    assertFalse(updatedChecklist.getBoolean("snapshot"));

    Document substituteInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-10001"))
      .first();
    assertEquals(3, substituteInventory.getInteger("quantity"));
  }

  @Test
  void saveFamilyHelpSessionAllSupportsProvidedChecklistPayload() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items.get(0).selected = true;
    section.items.get(1).selected = false;
    section.items.get(1).substituteBarcode = "SUB-10001";

    FamilyHelpSessionSaveAllRequest request = new FamilyHelpSessionSaveAllRequest();
    request.setChecklist(family.checklist);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveAllRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveAllRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveAllRequest.class)));

    familyController.saveFamilyHelpSessionAll(ctx);

    verify(ctx).json(familyCaptor.capture());
    assertEquals("helped", familyCaptor.getValue().status);
    assertTrue(familyCaptor.getValue().helped);
    assertNotNull(familyCaptor.getValue().checklist);
    assertFalse(familyCaptor.getValue().checklist.snapshot);
    assertTrue(familyCaptor.getValue().checklist.sections.get(0).saved);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    Document updatedChecklist = updatedFamily.get("checklist", Document.class);
    assertNotNull(updatedChecklist);
    assertFalse(updatedChecklist.getBoolean("snapshot"));
  }

  @Test
  void saveFamilyHelpSessionAllReleasesMatchedInventoryWhenSubstitutionTakesItsPlace() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    Family.ChecklistItem backpackItem = section.items.get(0);
    backpackItem.selected = true;
    backpackItem.substituteBarcode = "SUB-10001";

    db.getCollection("inventory").updateOne(
      eq("internalID", backpackItem.matchedInventoryId),
      new Document("$set", new Document("reservedQuantity", backpackItem.requestedQuantity)));

    FamilyHelpSessionSaveAllRequest request = new FamilyHelpSessionSaveAllRequest();
    request.setChecklist(family.checklist);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveAllRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveAllRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveAllRequest.class)));

    familyController.saveFamilyHelpSessionAll(ctx);

    Document originalInventory = db.getCollection("inventory")
      .find(eq("internalID", backpackItem.matchedInventoryId))
      .first();
    assertEquals(3, originalInventory.getInteger("quantity"));
    assertEquals(0, originalInventory.getInteger("reservedQuantity"));

    Document substituteInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-10001"))
      .first();
    assertEquals(3, substituteInventory.getInteger("quantity"));
  }

  @Test
  void saveFamilyHelpSessionChildKeepsCompletedChecklistWhenLastSectionIsSaved() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items.get(0).selected = true;
    section.items.get(1).selected = false;
    section.items.get(1).substituteBarcode = "SUB-10001";

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    familyController.saveFamilyHelpSessionChild(ctx);

    verify(ctx).json(familyCaptor.capture());
    assertEquals("helped", familyCaptor.getValue().status);
    assertTrue(familyCaptor.getValue().helped);
    assertNotNull(familyCaptor.getValue().checklist);
    assertFalse(familyCaptor.getValue().checklist.snapshot);
    assertTrue(familyCaptor.getValue().checklist.sections.get(0).saved);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    Document updatedChecklist = updatedFamily.get("checklist", Document.class);
    assertNotNull(updatedChecklist);
    assertFalse(updatedChecklist.getBoolean("snapshot"));
  }

  @Test
  void saveFamilyHelpSessionChildRequiresExistingSnapshot() {
    String json = """
      {
        "sectionId": "student-1",
        "section": {
          "id": "student-1",
          "items": []
        }
      }
      """;

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("must be started before saving checklist progress"));
  }

  @Test
  void clearFamilyHelpSessionResetsInProgressSession() {
    startHelpSessionAndGetFamily();

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.clearFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family clearedFamily = familyCaptor.getValue();
    assertEquals("not_helped", clearedFamily.status);
    assertFalse(clearedFamily.helped);
    assertNull(clearedFamily.checklist);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    assertEquals("not_helped", updatedFamily.getString("status"));
    assertFalse(updatedFamily.getBoolean("helped"));
    assertNull(updatedFamily.get("checklist"));
  }

  @Test
  void clearFamilyHelpSessionRejectsMissingSnapshot() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.clearFamilyHelpSession(ctx));

    assertTrue(exception.getMessage().contains("must be started before saving checklist progress"));
  }

  @Test
  void saveFamilyHelpSessionChildRejectsUnknownSection() {
    startHelpSessionAndGetFamily();

    String json = """
      {
        "sectionId": "missing-section",
        "section": {
          "id": "missing-section",
          "items": []
        }
      }
      """;

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    NotFoundResponse exception = assertThrows(NotFoundResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("child checklist section was not found"));
  }

  @Test
  void saveFamilyHelpSessionChildRejectsAlreadySavedSection() {
    Family family = startHelpSessionAndGetFamily();
    addUnsavedChecklistSection(testFamilyId, "student-2");
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items.get(0).selected = true;
    section.items.get(1).selected = false;

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    familyController.saveFamilyHelpSessionChild(ctx);
    Mockito.clearInvocations(ctx);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("already been saved"));
  }

  @Test
  void saveFamilyHelpSessionChildRejectsSelectedUnavailableItem() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items.get(0).selected = true;
    section.items.get(1).selected = true;

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("Unavailable items cannot be saved as selected"));
  }

  @Test
  void saveFamilyHelpSessionChildRejectsUnknownSubstituteBarcode() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items.get(0).selected = true;
    section.items.get(1).selected = false;
    section.items.get(1).substituteBarcode = "UNKNOWN";

    FamilyHelpSessionSaveChildRequest request = new FamilyHelpSessionSaveChildRequest();
    request.setSectionId(section.id);
    request.setSection(section);
    String json = javalinJackson.toJsonString(request, FamilyHelpSessionSaveChildRequest.class);

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    NotFoundResponse exception = assertThrows(NotFoundResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("No inventory item found for substitute barcode"));
  }

  @Test
  void deleteFoundFamily() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.deleteFamily(ctx);

    verify(ctx).status(HttpStatus.OK);
    assertEquals(0, db.getCollection("family").countDocuments(eq("_id", testFamilyId)));
  }

  @Test
  void deleteFamilyNotFound() {
    String nonExistentId = new ObjectId().toString();
    when(ctx.pathParam("id")).thenReturn(nonExistentId);

    NotFoundResponse exception = assertThrows(NotFoundResponse.class, () -> familyController.deleteFamily(ctx));

    verify(ctx).status(HttpStatus.NOT_FOUND);
    assertTrue(exception.getMessage().contains(nonExistentId));
  }

  @Test
  void deleteFamilyInvalidId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> familyController.deleteFamily(ctx));

    assertEquals("The requested family id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void getDashboardStats() {
    familyController.getDashboardStats(ctx);

    verify(ctx).json(dashboardCaptor.capture());
    Map<String, Object> result = dashboardCaptor.getValue();

    assertTrue(result.containsKey("studentsPerSchool"));
    assertTrue(result.containsKey("studentsPerGrade"));
    assertTrue(result.containsKey("totalFamilies"));
    assertTrue(result.containsKey("totalStudents"));
    assertEquals((int) db.getCollection("family").countDocuments(), result.get("totalFamilies"));
    assertEquals(10, result.get("totalStudents"));
  }

  @SuppressWarnings("unchecked")
  @Test
  void dashboardSkipsFamiliesWithNullStudents() {
    db.getCollection("family").insertOne(new Document()
      .append("guardianName", "Null Students")
      .append("email", "")
      .append("address", "")
      .append("timeSlot", "")
      .append("students", null));

    familyController.getDashboardStats(ctx);

    verify(ctx).json(dashboardCaptor.capture());

    Map<String, Object> result = dashboardCaptor.getValue();
    Map<String, Integer> studentsPerSchool = (Map<String, Integer>) result.get("studentsPerSchool");
    assertEquals(3, studentsPerSchool.size());
  }

  @Test
  void exportFamiliesAsCSVProducesCorrectCSV() {
    familyController.exportFamiliesAsCSV(ctx);

    ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);
    verify(ctx).result(resultCaptor.capture());
    verify(ctx).contentType("text/csv");
    verify(ctx).status(HttpStatus.OK);

    String csv = resultCaptor.getValue();
    assertTrue(csv.contains("Guardian Name,Email,Address,Time Slot,Number of Students"));
    assertTrue(csv.contains("\"Jane Doe\",\"jane@email.com\",\"123 Street\",\"10:00-11:00\",2"));
    assertTrue(csv.contains("\"John Christensen\",\"jchristensen@email.com\",\"713 Broadway\",\"8:00-9:00\",2"));
    assertTrue(csv.contains("\"John Johnson\",\"jjohnson@email.com\",\"456 Avenue\",\"2:00-3:00\",1"));
    assertTrue(csv.contains("\"Bob Jones\",\"bob@email.com\",\"456 Oak Ave\",\"2:00-3:00\",1"));
  }

  @Test
  void exportFamiliesAsCSVCleansCSV() {
    db.getCollection("family").insertOne(new Document()
      .append("guardianName", "=CMD(\"calc\")")
      .append("email", "dumbdwads\"@email.com")
      .append("address", "123 Evil Beevil\nStreet")
      .append("timeSlot", "+1:00-2:00")
      .append("students", List.of()));

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

    assertEquals("Guardian Name,Email,Address,Time Slot,Number of Students\n", resultCaptor.getValue());
  }

  @SuppressWarnings("static-access")
  @Test
  void cleanUpCSVHandlesNullValues() {
    assertEquals("", familyController.cleanUpCSV(null));
  }

  @Test
  void exportFamiliesAsCSVHandlesNullStudents() {
    db.getCollection("family").insertOne(new Document()
      .append("guardianName", "Null Students")
      .append("email", "")
      .append("address", "")
      .append("timeSlot", "")
      .append("students", null));

    familyController.exportFamiliesAsCSV(ctx);

    ArgumentCaptor<String> resultCaptor = ArgumentCaptor.forClass(String.class);
    verify(ctx).result(resultCaptor.capture());

    assertTrue(resultCaptor.getValue().contains("\"Null Students\",\"\",\"\",\"\",0"));
  }

  @Test
  void privateLookupAndConsumeHelpersCoverErrorBranches() throws Exception {
    NotFoundResponse missingInventory = assertThrows(NotFoundResponse.class,
      () -> invokeConsumeInventory("DOES-NOT-EXIST", 1));
    assertTrue(missingInventory.getMessage().contains("No item found for internalID"));

    BadRequestResponse missingInternalId = assertThrows(BadRequestResponse.class,
      () -> invokeConsumeInventory("", 1));
    assertTrue(missingInternalId.getMessage().contains("missing its inventory match"));
  }

  @Test
  void privateReasonHelpersNormalizeAndValidate() throws Exception {
    String normalized = invokeNormalizeReason("Available Didn't Need");
    boolean valid = invokeIsValidNotPickedUpReason(normalized);
    boolean invalid = invokeIsValidNotPickedUpReason("bad_reason");

    assertEquals("available_didnt_need", normalized);
    assertTrue(valid);
    assertFalse(invalid);
  }

  @Test
  void updateFamilyChecklistRejectsMissingChecklistPayload() {
    String json = "{}";

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyChecklistUpdateRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyChecklistUpdateRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyChecklistUpdateRequest.class)));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.updateFamilyChecklist(ctx));

    assertTrue(exception.getMessage().contains("checklist payload is required"));
  }

  @Test
  void saveFamilyHelpSessionChildRejectsMissingSectionPayload() {
    startHelpSessionAndGetFamily();
    String json = "{}";

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveChildRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveChildRequest.class)));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.saveFamilyHelpSessionChild(ctx));

    assertTrue(exception.getMessage().contains("sectionId and section payload are required"));
  }

  @Test
  void saveFamilyHelpSessionAllRequiresExistingSnapshot() {
    String json = "{}";

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    when(ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class))
      .thenReturn(new BodyValidator<>(
        json,
        FamilyHelpSessionSaveAllRequest.class,
        () -> javalinJackson.fromJsonString(json, FamilyHelpSessionSaveAllRequest.class)));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.saveFamilyHelpSessionAll(ctx));

    assertTrue(exception.getMessage().contains("must be started before saving checklist progress"));
  }

  @Test
  void deleteRequestRequesterHelpersCoverMissingAndHydratedBranches() throws Exception {
    Family nullFamily = null;
    invokeHydrateDeleteRequestRequester(nullFamily);

    Family noRequest = new Family();
    invokeHydrateDeleteRequestRequester(noRequest);

    Family noRequesterId = new Family();
    noRequesterId.deleteRequest = new Family.DeleteRequest();
    invokeHydrateDeleteRequestRequester(noRequesterId);

    Family missingRequester = new Family();
    missingRequester.deleteRequest = new Family.DeleteRequest();
    missingRequester.deleteRequest.requestedByUserId = new ObjectId().toHexString();
    invokeHydrateDeleteRequestRequester(missingRequester);
    assertNull(missingRequester.deleteRequest.requestedByUserName);

    UsersService usersService = new UsersService(db);
    usersService.createUser(
      "helper.user",
      "hash",
      "Helper User",
      "helper@example.com",
      Role.VOLUNTEER,
      "volunteer_base");
    Users helper = usersService.findByUsername("helper.user");

    Family hydrated = new Family();
    hydrated.deleteRequest = new Family.DeleteRequest();
    hydrated.deleteRequest.requestedByUserId = helper._id;

    invokeHydrateDeleteRequestRequester(hydrated);

    assertEquals("Helper User", hydrated.deleteRequest.requestedByUserName);
    assertEquals("VOLUNTEER", hydrated.deleteRequest.requestedBySystemRole);
  }

  @Test
  void userLookupAndDisplayNameHelpersCoverFallbackBranches() throws Exception {
    assertNull(invokeFindUserById(null));
    assertNull(invokeFindUserById("   "));
    assertNull(invokeFindUserById("not-a-real-object-id"));
    assertNull(invokeDisplayNameForUser(null));

    Users usernameOnly = new Users();
    usernameOnly.username = "fallback.user";
    usernameOnly.fullName = "   ";

    assertEquals("fallback.user", invokeDisplayNameForUser(usernameOnly));

    Users fullNameUser = new Users();
    fullNameUser.username = "named.user";
    fullNameUser.fullName = "Named User";

    assertEquals("Named User", invokeDisplayNameForUser(fullNameUser));
  }

  @Test
  void privateValidateChecklistItemCoversAdditionalBranches() throws Exception {
    Family.ChecklistItem unavailableSelected = new Family.ChecklistItem();
    unavailableSelected.selected = true;
    unavailableSelected.available = false;
    assertThrows(BadRequestResponse.class,
      () -> invokeValidateChecklistItemForSave(unavailableSelected));

    Family.ChecklistItem availableUnchecked = new Family.ChecklistItem();
    availableUnchecked.selected = false;
    availableUnchecked.available = true;
    BadRequestResponse missingReason = assertThrows(BadRequestResponse.class,
      () -> invokeValidateChecklistItemForSave(availableUnchecked));
    assertTrue(missingReason.getMessage().contains("must include a reason or substitution barcode"));

    Family.ChecklistItem invalidReason = new Family.ChecklistItem();
    invalidReason.selected = false;
    invalidReason.available = true;
    invalidReason.notPickedUpReason = "bad_reason";
    BadRequestResponse invalidReasonException = assertThrows(BadRequestResponse.class,
      () -> invokeValidateChecklistItemForSave(invalidReason));
    assertTrue(invalidReasonException.getMessage().contains("reason must be"));

    Family.ChecklistItem itemNotAvaliableReason = new Family.ChecklistItem();
    itemNotAvaliableReason.selected = false;
    itemNotAvaliableReason.available = true;
    itemNotAvaliableReason.notPickedUpReason = "item_not_avaliable";
    invokeValidateChecklistItemForSave(itemNotAvaliableReason);

    Family.ChecklistItem unavailableUnchecked = new Family.ChecklistItem();
    unavailableUnchecked.selected = false;
    unavailableUnchecked.available = false;
    invokeValidateChecklistItemForSave(unavailableUnchecked);
    assertEquals("not_available_didnt_receive", unavailableUnchecked.notPickedUpReason);
  }

  @Test
  void privateNormalizeHelpersCoverDefaultBranches() throws Exception {
    Family.ChecklistSection section = new Family.ChecklistSection();
    section.printableTitle = "Printable";
    section.items = new ArrayList<>(List.of(new Family.ChecklistItem()));

    Family.ChecklistSection normalizedSection = invokeNormalizeSectionForSave("student-1", section);
    assertEquals("student-1", normalizedSection.id);
    assertEquals("Printable", normalizedSection.title);
    assertEquals("student-1-item-1", normalizedSection.items.get(0).id);
    assertEquals(1, normalizedSection.items.get(0).requestedQuantity);

    String beingHelped = invokeNormalizeStatusValue("being helped");
    assertEquals("being_helped", beingHelped);

    BadRequestResponse invalidStatus = assertThrows(BadRequestResponse.class,
      () -> invokeNormalizeStatusValue("done"));
    assertTrue(invalidStatus.getMessage().contains("must be helped, not_helped, or being_helped"));
  }

  @Test
  void privateConsumeInventoryRejectsLowQuantity() throws Exception {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> invokeConsumeInventory("ID-10000", 10));

    assertTrue(exception.getMessage().contains("Inventory quantity is too low"));
  }

  @Test
  void privateRequireFamilyCoversErrorBranches() {
    BadRequestResponse badId = assertThrows(BadRequestResponse.class,
      () -> invokeRequireFamily("bad-id"));
    assertTrue(badId.getMessage().contains("family id was not legal"));

    NotFoundResponse missing = assertThrows(NotFoundResponse.class,
      () -> invokeRequireFamily(new ObjectId().toString()));
    assertTrue(missing.getMessage().contains("family was not found"));
  }

  private Family startHelpSessionAndGetFamily() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.startFamilyHelpSession(ctx);
    verify(ctx).json(familyCaptor.capture());
    Family family = familyCaptor.getValue();
    Mockito.clearInvocations(ctx);
    return family;
  }

  private void addUnsavedChecklistSection(ObjectId familyId, String sectionId) {
    Document familyDocument = db.getCollection("family").find(eq("_id", familyId)).first();
    Document checklist = familyDocument.get("checklist", Document.class);
    @SuppressWarnings("unchecked")
    List<Document> sections = (List<Document>) checklist.get("sections");
    sections.add(new Document()
      .append("id", sectionId)
      .append("title", "Extra Student")
      .append("printableTitle", "Extra Student")
      .append("saved", false)
      .append("items", List.of()));

    db.getCollection("family").updateOne(eq("_id", familyId), new Document(
      "$set", new Document("checklist", checklist)));
  }

  private void invokeConsumeInventory(String internalId, int amount) throws Exception {
    invokePrivate("consumeInventory", new Class<?>[] {String.class, int.class}, internalId, amount);
  }

  private String invokeNormalizeReason(String reason) throws Exception {
    return invokePrivate("normalizeReason", new Class<?>[] {String.class}, reason);
  }

  private boolean invokeIsValidNotPickedUpReason(String reason) throws Exception {
    return invokePrivate("isValidNotPickedUpReason", new Class<?>[] {String.class}, reason);
  }

  private void invokeValidateChecklistItemForSave(Family.ChecklistItem item) throws Exception {
    invokePrivate("validateChecklistItemForSave", new Class<?>[] {Family.ChecklistItem.class}, item);
  }

  private Family.ChecklistSection invokeNormalizeSectionForSave(String sectionId, Family.ChecklistSection section)
      throws Exception {
    return invokePrivate("normalizeSectionForSave",
      new Class<?>[] {String.class, Family.ChecklistSection.class}, sectionId, section);
  }

  private String invokeNormalizeStatusValue(String status) throws Exception {
    return invokePrivate("normalizeStatusValue", new Class<?>[] {String.class}, status);
  }

  private void invokeHydrateDeleteRequestRequester(Family family) throws Exception {
    invokePrivate("hydrateDeleteRequestRequester", new Class<?>[] {Family.class}, family);
  }

  private Users invokeFindUserById(String userId) throws Exception {
    return invokePrivate("findUserById", new Class<?>[] {String.class}, userId);
  }

  private String invokeDisplayNameForUser(Users user) throws Exception {
    return invokePrivate("displayNameForUser", new Class<?>[] {Users.class}, user);
  }

  private String invokeNormalizeToken(String value) throws Exception {
    return invokePrivate("normalizeToken", new Class<?>[] {String.class}, (Object) value);
  }

  private Family invokeRequireFamily(String id) throws Exception {
    return invokePrivate("requireFamily", new Class<?>[] {String.class}, id);
  }

  @SuppressWarnings("unchecked")
  private <T> T invokePrivate(String methodName, Class<?>[] parameterTypes, Object... args) throws Exception {
    return invokePrivateOn(familyController, FamilyController.class, methodName, parameterTypes, args);
  }

  @SuppressWarnings("unchecked")
  private <T> T invokePrivateOn(Object target, Class<?> owner, String methodName,
      Class<?>[] parameterTypes, Object... args) throws Exception {
    Method method = owner.getDeclaredMethod(methodName, parameterTypes);
    method.setAccessible(true);

    try {
      return (T) method.invoke(target, args);
    } catch (InvocationTargetException exception) {
      if (exception.getCause() instanceof Exception) {
        throw (Exception) exception.getCause();
      }
      throw exception;
    }
  }

  private StudentInfo studentInfo(String name, String grade) {
    StudentInfo student = new StudentInfo();
    student.name = name;
    student.grade = grade;
    student.school = "Morris Area Elementary School";
    student.schoolAbbreviation = "MAES";
    student.teacher = "N/A";
    student.backpack = true;
    student.headphones = true;
    return student;
  }
}
