package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;

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

@SuppressWarnings({ "MagicNumber" })
class InventoryReservationServiceSpec {
  private InventoryReservationService inventoryReservationService;

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
    db.getCollection("family").drop();
    db.getCollection("inventory").drop();
    db.getCollection("purchaseListSnapshots").drop();
    db.getCollection("supplylist").drop();

    inventoryReservationService = new InventoryReservationService(db);
  }

  @Test
  void rebuildInventoryReservationReservesFullStudentDemand() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 2, "PENCIL-1"));
    db.getCollection("supplylist").insertOne(supplyListDoc("Pencil", 2));
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(2, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationDoesNotPartiallyReserveStudentDemand() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 1, "PENCIL-1"));
    db.getCollection("supplylist").insertOne(supplyListDoc("Pencil", 2));
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(0, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationClearsStaleReservedQuantityBeforeRebuilding() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 4, 3, "PENCIL-1"));
    db.getCollection("supplylist").insertOne(supplyListDoc("Pencil", 1));
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(1, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationReservesUnsavedChecklistItems() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 2, "PENCIL-1"));
    db.getCollection("family").insertOne(familyWithChecklistDoc(false));

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(2, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationDoesNotReserveSubstitutedChecklistMatches() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 2, "PENCIL-1"));
    db.getCollection("family").insertOne(familyWithSubstitutedChecklistDoc());

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(0, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationStillReservesUnconfirmedChecklistMatches() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 2, "PENCIL-1"));
    db.getCollection("family").insertOne(familyWithUnconfirmedChecklistDoc());

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(2, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationSkipsSavedChecklistSections() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 2, "PENCIL-1"));
    db.getCollection("family").insertOne(familyWithChecklistDoc(true));

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(0, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationDoesNotLeaveReservedQuantityGreaterThanQuantity() {
    db.getCollection("inventory").insertOne(inventoryDoc("Pencil", 1, 5, "PENCIL-1"));

    inventoryReservationService.rebuildInventoryReservation();

    Document inventory = findInventoryByInternalId("PENCIL-1");
    assertEquals(0, inventory.getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationUsesPurchaseListPreferenceBeforeLinkedInventory() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", 2, "ID-00001"),
      inventoryDoc("Pencil", 2, "ID-00002")));
    String supplyListId = insertSupplyList("Pencil", 2, List.of("ID-00002"));
    insertPurchaseListPreference(supplyListId, "ID-00001", false);
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    assertEquals(2, findInventoryByInternalId("ID-00001").getInteger("reservedQuantity"));
    assertEquals(0, findInventoryByInternalId("ID-00002").getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationUsesResolvedPurchaseListPreference() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", 2, "ID-00001"),
      inventoryDoc("Pencil", 2, "ID-00002")));
    String supplyListId = insertSupplyList("Pencil", 2, List.of("ID-00002"));
    insertPurchaseListPreference(supplyListId, "ID-00001", true);
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    assertEquals(2, findInventoryByInternalId("ID-00001").getInteger("reservedQuantity"));
    assertEquals(0, findInventoryByInternalId("ID-00002").getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationUsesLinkedInventoryWhenPreferenceIsUnavailable() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", 1, "ID-00001"),
      inventoryDoc("Pencil", 2, "ID-00002")));
    String supplyListId = insertSupplyList("Pencil", 2, List.of("ID-00002"));
    insertPurchaseListPreference(supplyListId, "ID-00001", false);
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    assertEquals(0, findInventoryByInternalId("ID-00001").getInteger("reservedQuantity"));
    assertEquals(2, findInventoryByInternalId("ID-00002").getInteger("reservedQuantity"));
  }

  @Test
  void rebuildInventoryReservationIgnoresPreferenceForAnotherSupplyListItem() {
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", 2, "ID-00001"),
      inventoryDoc("Pencil", 2, "ID-00002")));
    insertSupplyList("Pencil", 2, List.of("ID-00002"));
    insertPurchaseListPreference("507f1f77bcf86cd799439011", "ID-00001", false);
    db.getCollection("family").insertOne(familyWithStudentDoc());

    inventoryReservationService.rebuildInventoryReservation();

    assertEquals(0, findInventoryByInternalId("ID-00001").getInteger("reservedQuantity"));
    assertEquals(2, findInventoryByInternalId("ID-00002").getInteger("reservedQuantity"));
  }

  private Document inventoryDoc(String item, int quantity, String internalId) {
    return inventoryDoc(item, quantity, 0, internalId);
  }

  private Document inventoryDoc(String item, int quantity, int reservedQuantity, String internalId) {
    return new Document()
      .append("item", item)
      .append("description", item)
      .append("quantity", quantity)
      .append("reservedQuantity", reservedQuantity)
      .append("internalID", internalId)
      .append("internalBarcode", internalId);
  }

  private Document supplyListDoc(String item, int quantity) {
    return new Document()
      .append("district", "District 1")
      .append("school", "Morris")
      .append("grade", "6")
      .append("teacher", "N/A")
      .append("item", List.of(item))
      .append("quantity", quantity);
  }

  private String insertSupplyList(String item, int quantity, List<String> linkedInventoryIds) {
    Document supplyList = supplyListDoc(item, quantity).append("invIDs", linkedInventoryIds);
    db.getCollection("supplylist").insertOne(supplyList);
    return supplyList.getObjectId("_id").toHexString();
  }

  private void insertPurchaseListPreference(
      String supplyListId,
      String internalId,
      boolean resolved
  ) {
    Document allocation = new Document()
      .append("internalId", internalId)
      .append("quantity", 2)
      .append("sourceIds", List.of(supplyListId));
    Document purchaseItem = new Document()
      .append("selectedFulfillmentAllocations", List.of(allocation));
    db.getCollection("purchaseListSnapshots").insertOne(new Document()
      .append("_id", "latest-purchase-list")
      .append("items", resolved ? List.of() : List.of(purchaseItem))
      .append("resolvedItems", resolved ? List.of(purchaseItem) : List.of()));
  }

  private Document familyWithStudentDoc() {
    return new Document()
      .append("status", "not_helped")
      .append("helped", false)
      .append("students", List.of(new Document()
        .append("name", "Test Student")
        .append("school", "Morris")
        .append("grade", "6")
        .append("teacher", "N/A")));
  }

  private Document familyWithChecklistDoc(boolean sectionSaved) {
    return new Document()
      .append("status", "being_helped")
      .append("helped", false)
      .append("checklist", new Document()
        .append("snapshot", true)
        .append("sections", List.of(new Document()
          .append("id", "student-1")
          .append("saved", sectionSaved)
          .append("items", List.of(new Document()
            .append("id", "student-1-item-1")
            .append("matchedInventoryId", "PENCIL-1")
            .append("requestedQuantity", 2))))));
  }

  private Document familyWithSubstitutedChecklistDoc() {
    return new Document()
      .append("status", "being_helped")
      .append("helped", false)
      .append("checklist", new Document()
        .append("snapshot", true)
        .append("sections", List.of(new Document()
          .append("id", "student-1")
          .append("saved", false)
          .append("items", List.of(new Document()
            .append("id", "student-1-item-1")
            .append("selected", false)
            .append("matchedInventoryId", "PENCIL-1")
            .append("substituteBarcode", "SUB-1")
            .append("requestedQuantity", 2))))));
  }

  private Document familyWithUnconfirmedChecklistDoc() {
    return new Document()
      .append("status", "being_helped")
      .append("helped", false)
      .append("checklist", new Document()
        .append("snapshot", true)
        .append("sections", List.of(new Document()
          .append("id", "student-1")
          .append("saved", false)
          .append("items", List.of(new Document()
            .append("id", "student-1-item-1")
            .append("selected", false)
            .append("matchedInventoryId", "PENCIL-1")
            .append("requestedQuantity", 2))))));
  }

  private Document findInventoryByInternalId(String internalId) {
    return db.getCollection("inventory")
      .find(new Document("internalID", internalId))
      .first();
  }
}
