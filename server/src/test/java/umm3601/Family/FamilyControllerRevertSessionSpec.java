// Packages
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
import java.util.Arrays;
import java.util.List;

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
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.json.JavalinJackson;
import io.javalin.validation.BodyValidator;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength" })
class FamilyControllerRevertSessionSpec {
  private FamilyController familyController;
  private ObjectId testFamilyId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;
  private static JavalinJackson javalinJackson = new JavalinJackson();

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<Family> familyCaptor;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");
    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
        .build());
    db = mongoClient.getDatabase("test-revert-session");
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

    testFamilyId = new ObjectId();
    familyDocuments.insertOne(familyDoc());
    supplyListDocuments.insertMany(List.of(
      supplyListDoc("Backpack"),
      supplyListDoc("Water Bottle")));
    inventoryDocuments.insertMany(List.of(
      inventoryDoc("Backpack", "Student Backpack", 3, "ID-10000", "ITEM-10000", "EXT-10000"),
      inventoryDoc("Notebook", "Wide Ruled Notebook", 4, "ID-10001", "ITEM-10001", "SUB-10001"),
      inventoryDoc("Water Bottle", "Blue Water Bottle", 0, "ID-10002", "ITEM-10002", "EXT-10002")));
    settingsDocuments.insertOne(new Document().append("availableSpots", 5));

    familyController = new FamilyController(db);
  }

  @Test
  void revertCompletedFamilyHelpSessionRestoresInventoryAndReopensSnapshot() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    String matchedInventoryId = section.items.get(0).matchedInventoryId;
    section.items.get(1).selected = false;
    section.items.get(1).substituteBarcode = "SUB-10001";
    saveAllSections(family);
    Mockito.clearInvocations(ctx);

    Document consumedBackpackInventory = inventoryByInternalId(matchedInventoryId);
    Document consumedSubstituteInventory = inventoryByInternalId("ID-10001");
    assertEquals(2, consumedBackpackInventory.getInteger("quantity"));
    assertEquals(3, consumedSubstituteInventory.getInteger("quantity"));

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.revertCompletedFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family revertedFamily = familyCaptor.getValue();
    assertEquals("being_helped", revertedFamily.status);
    assertFalse(revertedFamily.helped);
    assertNotNull(revertedFamily.checklist);
    assertTrue(revertedFamily.checklist.snapshot);
    assertFalse(revertedFamily.checklist.sections.get(0).saved);
    assertEquals("ID-10001", revertedFamily.checklist.sections.get(0).items.get(1).substituteInventoryId);
    assertEquals(3, inventoryByInternalId(matchedInventoryId).getInteger("quantity"));
    assertEquals(4, inventoryByInternalId("ID-10001").getInteger("quantity"));
  }

  @Test
  void revertCompletedFamilyHelpSessionRejectsIncompleteSessions() {
    startHelpSessionAndGetFamily();

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.revertCompletedFamilyHelpSession(ctx));

    assertTrue(exception.getMessage().contains("Only completed help sessions can be reverted"));
  }

  @Test
  void revertCompletedFamilyHelpSessionRejectsUnsavedCompletedChecklist() {
    Family family = startHelpSessionAndGetFamily();
    family.checklist.snapshot = false;
    family.checklist.sections.get(0).saved = false;

    db.getCollection("family").updateOne(eq("_id", testFamilyId), new Document(
      "$set", new Document()
        .append("status", "helped")
        .append("helped", true)
        .append("checklist", checklistDoc(family.checklist))));

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> familyController.revertCompletedFamilyHelpSession(ctx));

    assertTrue(exception.getMessage().contains("Only completed help sessions can be reverted"));
  }

  @Test
  void revertCompletedFamilyHelpSessionRestoresSubstituteByBarcodeWhenInventoryIdIsMissing() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistItem substitutedItem = family.checklist.sections.get(0).items.get(1);
    family.checklist.snapshot = false;
    family.checklist.sections.get(0).saved = true;
    family.checklist.sections.get(0).items.get(0).selected = false;
    family.checklist.sections.get(0).items.get(0).notPickedUpReason = "available_didnt_need";
    substitutedItem.selected = false;
    substitutedItem.substituteBarcode = "SUB-10001";
    substitutedItem.substituteInventoryId = null;

    db.getCollection("inventory").updateOne(eq("internalID", "ID-10001"), new Document(
      "$set", new Document("quantity", 3)));
    db.getCollection("family").updateOne(eq("_id", testFamilyId), new Document(
      "$set", new Document()
        .append("status", "helped")
        .append("helped", true)
        .append("checklist", checklistDoc(family.checklist))));

    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.revertCompletedFamilyHelpSession(ctx);

    verify(ctx).json(familyCaptor.capture());
    Family revertedFamily = familyCaptor.getValue();
    assertEquals("ID-10001", revertedFamily.checklist.sections.get(0).items.get(1).substituteInventoryId);
    assertEquals(4, inventoryByInternalId("ID-10001").getInteger("quantity"));
  }

  private Family startHelpSessionAndGetFamily() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.startFamilyHelpSession(ctx);
    verify(ctx).json(familyCaptor.capture());
    Family family = familyCaptor.getValue();
    Mockito.clearInvocations(ctx);
    return family;
  }

  private void saveAllSections(Family family) {
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
  }

  private Document inventoryByInternalId(String internalId) {
    return db.getCollection("inventory")
      .find(eq("internalID", internalId))
      .first();
  }

  private Document familyDoc() {
    return new Document("_id", testFamilyId)
      .append("guardianName", "Bob Jones")
      .append("email", "bob@email.com")
      .append("address", "456 Oak Ave")
      .append("accommodations", "None")
      .append("timeSlot", "2:00-3:00")
      .append("timeAvailability", new Document()
        .append("earlyMorning", false)
        .append("lateMorning", true)
        .append("earlyAfternoon", false)
        .append("lateAfternoon", true))
      .append("helped", false)
      .append("status", "not_helped")
      .append("students", List.of(new Document()
        .append("name", "Sara")
        .append("grade", "5")
        .append("school", "Roosevelt")
        .append("schoolAbbreviation", "R")
        .append("teacher", "N/A")
        .append("backpack", true)
        .append("headphones", false)));
  }

  private Document checklistDoc(Family.FamilyChecklist checklist) {
    List<Document> sections = checklist.sections.stream()
      .map(section -> new Document()
        .append("id", section.id)
        .append("title", section.title)
        .append("printableTitle", section.printableTitle)
        .append("saved", section.saved)
        .append("items", checklistItemDocs(section.items)))
      .toList();

    return new Document()
      .append("templateId", checklist.templateId)
      .append("printableTitle", checklist.printableTitle)
      .append("snapshot", checklist.snapshot)
      .append("sections", sections);
  }

  private List<Document> checklistItemDocs(List<Family.ChecklistItem> items) {
    return items.stream()
      .map(item -> new Document()
        .append("id", item.id)
        .append("label", item.label)
        .append("selected", item.selected)
        .append("available", item.available)
        .append("matchedInventoryId", item.matchedInventoryId)
        .append("requestedQuantity", item.requestedQuantity)
        .append("notPickedUpReason", item.notPickedUpReason)
        .append("substituteBarcode", item.substituteBarcode)
        .append("substituteInventoryId", item.substituteInventoryId))
      .toList();
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
}
