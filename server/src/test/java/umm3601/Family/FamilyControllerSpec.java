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

// Misc Imports
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength" })
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

    familyDocuments.drop();
    supplyListDocuments.drop();
    inventoryDocuments.drop();

    List<Document> testFamilies = new ArrayList<>();

    testFamilies.add(
      new Document()
        .append("guardianName", "Jane Doe")
        .append("email", "jane@email.com")
        .append("address", "123 Street")
        .append("timeSlot", "10:00-11:00")
        .append("helped", false)
        .append("status", "not_helped")
        .append("students", List.of(
          new Document()
            .append("name", "Alice")
            .append("grade", "3")
            .append("school", "MAHS")
            .append("teacher", "N/A"),
          new Document()
            .append("name", "Timmy")
            .append("grade", "5")
            .append("school", "MAHS")
            .append("teacher", "N/A")
        )));
    testFamilies.add(
      new Document()
        .append("guardianName", "John Christensen")
        .append("email", "jchristensen@email.com")
        .append("address", "713 Broadway")
        .append("timeSlot", "8:00-9:00")
        .append("helped", true)
        .append("status", "helped")
        .append("students", List.of(
          new Document()
            .append("name", "Sara")
            .append("grade", "7")
            .append("school", "MAHS")
            .append("teacher", "N/A"),
          new Document()
            .append("name", "Ronan")
            .append("grade", "4")
            .append("school", "HHS")
            .append("teacher", "N/A")
        )));
    testFamilies.add(
      new Document()
        .append("guardianName", "John Johnson")
        .append("email", "jjohnson@email.com")
        .append("address", "456 Avenue")
        .append("timeSlot", "2:00-3:00")
        .append("helped", false)
        .append("status", "being_helped")
        .append("students", List.of(
          new Document()
            .append("name", "Lilian")
            .append("grade", "1")
            .append("school", "HHS")
            .append("teacher", "N/A")
        )));

    testFamilyId = new ObjectId();

    Document specialFamily = new Document()
      .append("_id", testFamilyId)
      .append("guardianName", "Bob Jones")
      .append("email", "bob@email.com")
      .append("address", "456 Oak Ave")
      .append("timeSlot", "2:00-3:00")
      .append("helped", false)
      .append("status", "not_helped")
      .append("students", List.of(
        new Document()
          .append("name", "Sara")
          .append("grade", "5")
          .append("school", "Roosevelt")
          .append("teacher", "N/A")
      ));

    familyDocuments.insertMany(testFamilies);
    familyDocuments.insertOne(specialFamily);

    supplyListDocuments.insertMany(List.of(
      new Document()
        .append("district", "District 1")
        .append("school", "Roosevelt")
        .append("grade", "5")
        .append("teacher", "N/A")
        .append("item", List.of("Backpack"))
        .append("quantity", 1),
      new Document()
        .append("district", "District 1")
        .append("school", "Roosevelt")
        .append("grade", "5")
        .append("teacher", "N/A")
        .append("item", List.of("Water Bottle"))
        .append("quantity", 1)));

    inventoryDocuments.insertMany(List.of(
      new Document()
        .append("item", "Backpack")
        .append("description", "Student Backpack")
        .append("quantity", 3)
        .append("internalID", "ID-10000")
        .append("internalBarcode", "ITEM-10000")
        .append("externalBarcode", List.of("EXT-10000")),
      new Document()
        .append("item", "Notebook")
        .append("description", "Wide Ruled Notebook")
        .append("quantity", 4)
        .append("internalID", "ID-10001")
        .append("internalBarcode", "ITEM-10001")
        .append("externalBarcode", List.of("SUB-10001")),
      new Document()
        .append("item", "Water Bottle")
        .append("description", "Blue Water Bottle")
        .append("quantity", 0)
        .append("internalID", "ID-10002")
        .append("internalBarcode", "ITEM-10002")
        .append("externalBarcode", List.of("EXT-10002"))));

    familyController = new FamilyController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);

    familyController.addRoutes(mockServer);

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
    assertEquals(3, familyArrayListCaptor.getValue().size());
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
    assertNull(familyCaptor.getValue().checklist);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    assertNull(updatedFamily.get("checklist"));

    Document substituteInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-10001"))
      .first();
    assertEquals(3, substituteInventory.getInteger("quantity"));
  }

  @Test
  void saveFamilyHelpSessionAllSupportsProvidedChecklistPayload() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
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
    assertNull(familyCaptor.getValue().checklist);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    assertNull(updatedFamily.get("checklist"));
  }

  @Test
  void saveFamilyHelpSessionChildClearsSnapshotWhenLastSectionIsSaved() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
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
    assertNull(familyCaptor.getValue().checklist);

    Document updatedFamily = db.getCollection("family").find(eq("_id", testFamilyId)).first();
    assertNull(updatedFamily.get("checklist"));
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
    assertEquals(6, result.get("totalStudents"));
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
  void privateMatchingHelpersCoverBranchyCases() throws Exception {
    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Notebook");
    supplyList.brand = new SupplyList.AttributeOptions();
    supplyList.brand.allOf = "Five Star";
    supplyList.color = new SupplyList.ColorAttributeOptions();
    supplyList.color.anyOf = List.of("Blue", "Black");
    supplyList.size = new SupplyList.AttributeOptions();
    supplyList.size.anyOf = List.of("Wide");
    supplyList.type = new SupplyList.AttributeOptions();
    supplyList.type.allOf = "Ruled";
    supplyList.material = new SupplyList.AttributeOptions();
    supplyList.material.anyOf = List.of("Paper");
    supplyList.packageSize = 1;

    Inventory inventory = new Inventory();
    inventory.item = "Notebook";
    inventory.brand = "Five Star";
    inventory.color = "Blue";
    inventory.size = "Wide";
    inventory.type = "Ruled";
    inventory.material = "Paper";
    inventory.packageSize = 1;

    boolean matches = invokePrivate("inventoryMatchesSupplyList",
      new Class<?>[] {Inventory.class, SupplyList.class}, inventory, supplyList);
    int score = invokePrivate("inventorySpecificityScore", new Class<?>[] {Inventory.class}, inventory);

    assertTrue(matches);
    assertTrue(score > 0);
  }

  @Test
  void privateLookupAndConsumeHelpersCoverErrorBranches() throws Exception {
    Inventory found = invokePrivate("findInventoryByBarcode", new Class<?>[] {String.class}, "SUB-10001");
    assertNotNull(found);
    assertEquals("ID-10001", found.internalID);

    NotFoundResponse missingInventory = assertThrows(NotFoundResponse.class,
      () -> invokePrivate("consumeInventory", new Class<?>[] {String.class, int.class}, "DOES-NOT-EXIST", 1));
    assertTrue(missingInventory.getMessage().contains("No item found for internalID"));

    BadRequestResponse missingInternalId = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("consumeInventory", new Class<?>[] {String.class, int.class}, "", 1));
    assertTrue(missingInternalId.getMessage().contains("missing its inventory match"));
  }

  @Test
  void privateReasonHelpersNormalizeAndValidate() throws Exception {
    String normalized = invokePrivate("normalizeReason", new Class<?>[] {String.class}, "Available Didn't Need");
    boolean valid = invokePrivate("isValidNotPickedUpReason", new Class<?>[] {String.class}, normalized);
    boolean invalid = invokePrivate("isValidNotPickedUpReason", new Class<?>[] {String.class}, "bad_reason");

    assertEquals("available_didnt_need", normalized);
    assertTrue(valid);
    assertFalse(invalid);
  }

  @Test
  void privateFindInventoryByBarcodeReturnsNullWhenMissing() throws Exception {
    Inventory found = invokePrivate("findInventoryByBarcode", new Class<?>[] {String.class}, "MISSING-BARCODE");
    assertNull(found);
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
  void privateInventoryMatchCoversNegativeBranches() throws Exception {
    SupplyList emptyItems = new SupplyList();
    emptyItems.item = null;

    Inventory inventory = new Inventory();
    inventory.item = "Notebook";
    inventory.brand = "Acme";
    inventory.packageSize = 2;

    boolean missingItems = invokePrivate("inventoryMatchesSupplyList",
      new Class<?>[] {Inventory.class, SupplyList.class}, inventory, emptyItems);
    assertFalse(missingItems);

    SupplyList mismatchedBrand = new SupplyList();
    mismatchedBrand.item = List.of("Notebook");
    mismatchedBrand.brand = new SupplyList.AttributeOptions();
    mismatchedBrand.brand.allOf = "Other";

    boolean brandMismatch = invokePrivate("inventoryMatchesSupplyList",
      new Class<?>[] {Inventory.class, SupplyList.class}, inventory, mismatchedBrand);
    assertFalse(brandMismatch);

    SupplyList mismatchedPackage = new SupplyList();
    mismatchedPackage.item = List.of("Notebook");
    mismatchedPackage.packageSize = 1;

    boolean packageMismatch = invokePrivate("inventoryMatchesSupplyList",
      new Class<?>[] {Inventory.class, SupplyList.class}, inventory, mismatchedPackage);
    assertFalse(packageMismatch);
  }

  @Test
  void privateAttributeHelpersCoverNullAndMismatchBranches() throws Exception {
    boolean nullAttribute = invokePrivate("matchesAttribute",
      new Class<?>[] {SupplyList.AttributeOptions.class, String.class}, null, "Blue");
    assertTrue(nullAttribute);

    SupplyList.AttributeOptions anyOf = new SupplyList.AttributeOptions();
    anyOf.anyOf = List.of("Blue", "Black");
    boolean anyOfMatch = invokePrivate("matchesAttribute",
      new Class<?>[] {SupplyList.AttributeOptions.class, String.class}, anyOf, "Blue");
    boolean anyOfMiss = invokePrivate("matchesAttribute",
      new Class<?>[] {SupplyList.AttributeOptions.class, String.class}, anyOf, "Red");
    assertTrue(anyOfMatch);
    assertFalse(anyOfMiss);

    SupplyList.AttributeOptions allOfMismatch = new SupplyList.AttributeOptions();
    allOfMismatch.allOf = "Wide";
    boolean allOfFalse = invokePrivate("matchesAttribute",
      new Class<?>[] {SupplyList.AttributeOptions.class, String.class}, allOfMismatch, "Narrow");
    assertFalse(allOfFalse);

    SupplyList.ColorAttributeOptions colorAllOf = new SupplyList.ColorAttributeOptions();
    colorAllOf.allOf = List.of("Blue");
    boolean colorAllOfMiss = invokePrivate("matchesColorAttribute",
      new Class<?>[] {SupplyList.ColorAttributeOptions.class, String.class}, colorAllOf, "Red");
    assertFalse(colorAllOfMiss);

    SupplyList.ColorAttributeOptions colorAnyOf = new SupplyList.ColorAttributeOptions();
    colorAnyOf.anyOf = List.of("Black", "Red");
    boolean colorAnyOfMatch = invokePrivate("matchesColorAttribute",
      new Class<?>[] {SupplyList.ColorAttributeOptions.class, String.class}, colorAnyOf, "Red");
    boolean colorAnyOfMiss = invokePrivate("matchesColorAttribute",
      new Class<?>[] {SupplyList.ColorAttributeOptions.class, String.class}, colorAnyOf, "Green");
    assertTrue(colorAnyOfMatch);
    assertFalse(colorAnyOfMiss);
  }

  @Test
  void privateValidateChecklistItemCoversAdditionalBranches() throws Exception {
    Family.ChecklistItem unavailableSelected = new Family.ChecklistItem();
    unavailableSelected.selected = true;
    unavailableSelected.available = false;
    assertThrows(BadRequestResponse.class,
      () -> invokePrivate("validateChecklistItemForSave", new Class<?>[] {Family.ChecklistItem.class},
        unavailableSelected));

    Family.ChecklistItem availableUnchecked = new Family.ChecklistItem();
    availableUnchecked.selected = false;
    availableUnchecked.available = true;
    BadRequestResponse missingReason = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("validateChecklistItemForSave", new Class<?>[] {Family.ChecklistItem.class},
        availableUnchecked));
    assertTrue(missingReason.getMessage().contains("must include a reason or substitution barcode"));

    Family.ChecklistItem invalidReason = new Family.ChecklistItem();
    invalidReason.selected = false;
    invalidReason.available = true;
    invalidReason.notPickedUpReason = "bad_reason";
    BadRequestResponse invalidReasonException = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("validateChecklistItemForSave", new Class<?>[] {Family.ChecklistItem.class},
        invalidReason));
    assertTrue(invalidReasonException.getMessage().contains("Checklist reason must be"));

    Family.ChecklistItem unavailableUnchecked = new Family.ChecklistItem();
    unavailableUnchecked.selected = false;
    unavailableUnchecked.available = false;
    invokePrivate("validateChecklistItemForSave", new Class<?>[] {Family.ChecklistItem.class}, unavailableUnchecked);
    assertEquals("not_available_didnt_receive", unavailableUnchecked.notPickedUpReason);
  }

  @Test
  void privateNormalizeHelpersCoverDefaultBranches() throws Exception {
    Family.ChecklistSection section = new Family.ChecklistSection();
    section.printableTitle = "Printable";
    section.items = new ArrayList<>(List.of(new Family.ChecklistItem()));

    Family.ChecklistSection normalizedSection = invokePrivate(
      "normalizeSectionForSave",
      new Class<?>[] {String.class, Family.ChecklistSection.class},
      "student-1",
      section);
    assertEquals("student-1", normalizedSection.id);
    assertEquals("Printable", normalizedSection.title);
    assertEquals("student-1-item-1", normalizedSection.items.get(0).id);
    assertEquals(1, normalizedSection.items.get(0).requestedQuantity);

    String beingHelped = invokePrivate("normalizeStatusValue", new Class<?>[] {String.class}, "being helped");
    assertEquals("being_helped", beingHelped);

    BadRequestResponse invalidStatus = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("normalizeStatusValue", new Class<?>[] {String.class}, "done"));
    assertTrue(invalidStatus.getMessage().contains("must be helped, not_helped, or being_helped"));

    String normalizedToken = invokePrivate("normalizeToken", new Class<?>[] {String.class}, " Notebooks ");
    String normalizedNull = invokePrivate("normalizeToken", new Class<?>[] {String.class}, (Object) null);
    assertEquals("notebook", normalizedToken);
    assertEquals("", normalizedNull);
  }

  @Test
  void privateConsumeInventoryRejectsLowQuantity() throws Exception {
    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("consumeInventory", new Class<?>[] {String.class, int.class}, "ID-10000", 10));

    assertTrue(exception.getMessage().contains("Inventory quantity is too low"));
  }

  @Test
  void privateInventorySpecificityScoreCoversFalseBranches() throws Exception {
    Inventory sparseInventory = new Inventory();
    sparseInventory.brand = "N/A";
    sparseInventory.color = null;
    sparseInventory.size = "";
    sparseInventory.type = " ";
    sparseInventory.material = "N/A";
    sparseInventory.packageSize = 1;

    int score = invokePrivate("inventorySpecificityScore", new Class<?>[] {Inventory.class}, sparseInventory);

    assertEquals(0, score);
  }

  @Test
  void privateGetSupplyListsForStudentCoversTeacherMismatchAndNoMatches() throws Exception {
    db.getCollection("supplylist").insertOne(new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "Ms Smith")
      .append("item", List.of("Folder"))
      .append("quantity", 1));

    Family.StudentInfo mismatchedSchool = new Family.StudentInfo();
    mismatchedSchool.school = "Different";
    mismatchedSchool.grade = "5";
    mismatchedSchool.teacher = "N/A";

    List<SupplyList> noMatches = invokePrivate("getSupplyListsForStudent",
      new Class<?>[] {Family.StudentInfo.class}, mismatchedSchool);
    assertEquals(0, noMatches.size());

    Family.StudentInfo mismatchedTeacher = new Family.StudentInfo();
    mismatchedTeacher.school = "Roosevelt";
    mismatchedTeacher.grade = "5";
    mismatchedTeacher.teacher = "N/A";

    List<SupplyList> filteredMatches = invokePrivate("getSupplyListsForStudent",
      new Class<?>[] {Family.StudentInfo.class}, mismatchedTeacher);
    assertEquals(2, filteredMatches.size());
  }

  @Test
  void privateBuildChecklistItemSnapshotCoversUnavailableFallbackBranch() throws Exception {
    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Scissors");
    supplyList.quantity = 0;

    Family.ChecklistItem item = invokePrivate("buildChecklistItemSnapshot",
      new Class<?>[] {SupplyList.class, String.class}, supplyList, "section-item-1");

    assertEquals("section-item-1", item.id);
    assertEquals(1, item.requestedQuantity);
    assertFalse(item.available);
    assertFalse(item.selected);
    assertNull(item.matchedInventoryId);
  }

  @Test
  void privateRequireFamilyCoversErrorBranches() {
    BadRequestResponse badId = assertThrows(BadRequestResponse.class,
      () -> invokePrivate("requireFamily", new Class<?>[] {String.class}, "bad-id"));
    assertTrue(badId.getMessage().contains("family id was not legal"));

    NotFoundResponse missing = assertThrows(NotFoundResponse.class,
      () -> invokePrivate("requireFamily", new Class<?>[] {String.class}, new ObjectId().toString()));
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

  @SuppressWarnings("unchecked")
  private <T> T invokePrivate(String methodName, Class<?>[] parameterTypes, Object... args) throws Exception {
    Method method = FamilyController.class.getDeclaredMethod(methodName, parameterTypes);
    method.setAccessible(true);

    try {
      return (T) method.invoke(familyController, args);
    } catch (InvocationTargetException exception) {
      if (exception.getCause() instanceof Exception) {
        throw (Exception) exception.getCause();
      }
      throw exception;
    }
  }
}
