package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.BadRequestResponse;
import umm3601.Common.InventoryMatcher;

@SuppressWarnings({ "MagicNumber" })
class FamilyChecklistInventoryServiceSpec {
  private FamilyChecklistInventoryService inventoryService;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

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
    db.getCollection("inventory").drop();
    inventoryService = new FamilyChecklistInventoryService(db, new InventoryMatcher(db));
  }

  @Test
  void commitSectionInventoryChangesConsumesFulfillmentItems() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Backpack", 5, 3, "BACKPACK-1", "BACKPACK-BARCODE"),
      inventoryDoc("Notebook", 4, 0, "NOTEBOOK-1", "NOTEBOOK-BARCODE"),
      inventoryDoc("Eraser", 4, 0, "ERASER-1", "ERASER-BARCODE")));

    Family.ChecklistSection existingSection = sectionWithMatchedItem("BACKPACK-1", 3);
    Family.ChecklistSection updatedSection = sectionWithMatchedItem("BACKPACK-1", 3);
    Family.ChecklistItem updatedItem = updatedSection.items.get(0);
    updatedItem.selected = true;
    updatedItem.fulfillmentItems = List.of(
      fulfillmentItem("NOTEBOOK-1", null, 1),
      fulfillmentItem(null, "ERASER-BARCODE", 2));

    inventoryService.commitSectionInventoryChanges(updatedSection, existingSection);

    Document originalInventory = findInventoryByInternalId("BACKPACK-1");
    Document notebookInventory = findInventoryByInternalId("NOTEBOOK-1");
    Document eraserInventory = findInventoryByInternalId("ERASER-1");
    assertEquals(5, originalInventory.getInteger("quantity"));
    assertEquals(0, originalInventory.getInteger("reservedQuantity"));
    assertEquals(3, notebookInventory.getInteger("quantity"));
    assertEquals(2, eraserInventory.getInteger("quantity"));
    assertEquals("ERASER-1", updatedItem.fulfillmentItems.get(1).inventoryId);
    assertEquals("Eraser", updatedItem.fulfillmentItems.get(1).item);
  }

  @Test
  void releaseChecklistReservationsReleasesFulfillmentItemReservations() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Backpack", 5, 0, "BACKPACK-1", "BACKPACK-BARCODE"),
      inventoryDoc("Notebook", 4, 1, "NOTEBOOK-1", "NOTEBOOK-BARCODE"),
      inventoryDoc("Eraser", 4, 2, "ERASER-1", "ERASER-BARCODE")));

    Family.ChecklistSection section = sectionWithMatchedItem("BACKPACK-1", 3);
    section.items.get(0).fulfillmentItems = List.of(
      fulfillmentItem("NOTEBOOK-1", null, 1),
      fulfillmentItem(null, "ERASER-BARCODE", 2));

    inventoryService.releaseChecklistReservations(checklistWithSection(section));

    assertEquals(0, findInventoryByInternalId("NOTEBOOK-1").getInteger("reservedQuantity"));
    assertEquals(0, findInventoryByInternalId("ERASER-1").getInteger("reservedQuantity"));
    assertEquals(0, findInventoryByInternalId("BACKPACK-1").getInteger("reservedQuantity"));
  }

  @Test
  void restoreChecklistInventoryChangesRestoresFulfillmentItems() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Notebook", 3, 0, "NOTEBOOK-1", "NOTEBOOK-BARCODE"),
      inventoryDoc("Eraser", 2, 0, "ERASER-1", "ERASER-BARCODE")));

    Family.ChecklistSection section = sectionWithMatchedItem("NOTEBOOK-1", 3);
    Family.ChecklistItem item = section.items.get(0);
    item.selected = true;
    item.fulfillmentItems = List.of(
      fulfillmentItem("NOTEBOOK-1", null, 1),
      fulfillmentItem(null, "ERASER-BARCODE", 2));

    inventoryService.restoreChecklistInventoryChanges(checklistWithSection(section));

    assertEquals(4, findInventoryByInternalId("NOTEBOOK-1").getInteger("quantity"));
    assertEquals(4, findInventoryByInternalId("ERASER-1").getInteger("quantity"));
    assertEquals("ERASER-1", item.fulfillmentItems.get(1).inventoryId);
    assertEquals("Eraser", item.fulfillmentItems.get(1).item);
  }

  @Test
  void validateChecklistItemForSaveRejectsFulfillmentQuantityGreaterThanRequested() {
    Family.ChecklistItem item = new Family.ChecklistItem();
    item.available = true;
    item.selected = true;
    item.requestedQuantity = 1;
    item.fulfillmentItems = List.of(fulfillmentItem("NOTEBOOK-1", null, 2));

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> inventoryService.validateChecklistItemForSave(item));

    assertEquals("Fulfilled quantity cannot exceed requested quantity.", exception.getMessage());
  }

  private Document inventoryDoc(
      String item,
      int quantity,
      int reservedQuantity,
      String internalId,
      String internalBarcode
  ) {
    return new Document()
      .append("item", item)
      .append("description", item)
      .append("quantity", quantity)
      .append("reservedQuantity", reservedQuantity)
      .append("internalID", internalId)
      .append("internalBarcode", internalBarcode)
      .append("externalBarcode", List.of());
  }

  private Family.ChecklistSection sectionWithMatchedItem(String inventoryId, int requestedQuantity) {
    Family.ChecklistItem item = new Family.ChecklistItem();
    item.available = true;
    item.matchedInventoryId = inventoryId;
    item.requestedQuantity = requestedQuantity;

    Family.ChecklistSection section = new Family.ChecklistSection();
    section.items = List.of(item);
    return section;
  }

  private Family.FamilyChecklist checklistWithSection(Family.ChecklistSection section) {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    checklist.sections = List.of(section);
    return checklist;
  }

  private Family.FulfillmentItem fulfillmentItem(String inventoryId, String barcode, int quantity) {
    Family.FulfillmentItem fulfillmentItem = new Family.FulfillmentItem();
    fulfillmentItem.inventoryId = inventoryId;
    fulfillmentItem.barcode = barcode;
    fulfillmentItem.quantity = quantity;
    return fulfillmentItem;
  }

  private Document findInventoryByInternalId(String internalId) {
    return db.getCollection("inventory")
      .find(new Document("internalID", internalId))
      .first();
  }
}
