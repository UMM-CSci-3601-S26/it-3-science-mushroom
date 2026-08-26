// Packages
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
import java.util.ArrayList;
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
import com.mongodb.client.MongoDatabase;
// IO Imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.json.JavalinJackson;
import io.javalin.validation.BodyValidator;
import umm3601.Common.InventoryMatcher;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength" })
class FamilyControllerSaveSessionInventorySpec {
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

    db.getCollection("family").drop();
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();

    testFamilyId = new ObjectId();
    db.getCollection("family").insertOne(familyDoc());
    db.getCollection("supplylist").insertOne(supplyListDoc("Backpack"));
    db.getCollection("inventory").insertOne(
      inventoryDoc("Backpack", "Student Backpack", 2, "ID-10000", "ITEM-10000", "EXT-10000"));

    InventoryMatcher inventoryMatcher = new InventoryMatcher(db);
    familyController = new FamilyController(db, inventoryMatcher);
  }

  @Test
  void saveFamilyHelpSessionAllAllowsUsingTheSessionHeldMatchedInventory() {
    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items = new ArrayList<>(List.of(matchedChecklistItem("student-1-item-1", "ID-10000")));

    saveAll(family);

    Document matchedInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-10000"))
      .first();
    assertEquals(1, matchedInventory.getInteger("quantity"));
    assertEquals(0, matchedInventory.getInteger("reservedQuantity"));
  }

  @Test
  void saveFamilyHelpSessionAllRejectsDuplicateMatchedTargetBeforeMutatingInventory() {
    Family family = startHelpSessionAndGetFamily();

    db.getCollection("inventory").updateOne(
      eq("internalID", "ID-10000"),
      new Document("$set", new Document("reservedQuantity", 2)));

    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items = new ArrayList<>(List.of(
      matchedChecklistItem("student-1-item-1", "ID-10000"),
      matchedChecklistItem("student-1-item-2", "ID-10000")));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> saveAll(family));

    assertTrue(exception.getMessage().contains("Not enough unreserved stock"));
    Document matchedInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-10000"))
      .first();
    assertEquals(2, matchedInventory.getInteger("quantity"));
    assertEquals(2, matchedInventory.getInteger("reservedQuantity"));
  }

  @Test
  void saveFamilyHelpSessionAllRejectsDuplicateSubstituteTargetBeforeMutatingInventory() {
    db.getCollection("inventory").insertOne(
      inventoryDoc("Water Bottle", "Blue Bottle", 1, "ID-20000", "SUB-20000", "EXT-20000"));

    Family family = startHelpSessionAndGetFamily();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    section.items = new ArrayList<>(List.of(
      substituteChecklistItem("student-1-item-1"),
      substituteChecklistItem("student-1-item-2")));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class, () -> saveAll(family));

    assertTrue(exception.getMessage().contains("Not enough unreserved stock"));
    Document substituteInventory = db.getCollection("inventory")
      .find(eq("internalID", "ID-20000"))
      .first();
    assertEquals(1, substituteInventory.getInteger("quantity"));
  }

  private Family startHelpSessionAndGetFamily() {
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());
    familyController.startFamilyHelpSession(ctx);
    verify(ctx).json(familyCaptor.capture());
    Family family = familyCaptor.getValue();
    Mockito.clearInvocations(ctx);
    return family;
  }

  private void saveAll(Family family) {
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

  private Family.ChecklistItem matchedChecklistItem(String itemId, String matchedInventoryId) {
    Family.ChecklistItem item = new Family.ChecklistItem();
    item.id = itemId;
    item.label = "Backpack";
    item.selected = true;
    item.available = true;
    item.requestedQuantity = 1;
    item.matchedInventoryId = matchedInventoryId;
    return item;
  }

  private Family.ChecklistItem substituteChecklistItem(String itemId) {
    Family.ChecklistItem item = new Family.ChecklistItem();
    item.id = itemId;
    item.label = "Water Bottle";
    item.selected = true;
    item.available = false;
    item.requestedQuantity = 1;
    item.substituteBarcode = "SUB-20000";
    return item;
  }

  private Document familyDoc() {
    return new Document("_id", testFamilyId)
      .append("guardianName", "Bob Jones")
      .append("email", "bob@email.com")
      .append("address", "456 Oak Ave")
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
        .append("backpack", true)));
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
      .append("reservedQuantity", 0)
      .append("internalID", internalId)
      .append("internalBarcode", internalBarcode)
      .append("externalBarcode", List.of(externalBarcode));
  }
}
