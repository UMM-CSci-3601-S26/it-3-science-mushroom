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
