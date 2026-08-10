package umm3601.PurchaseList;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
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
class PurchaseListServiceSpec {
  private static final String SCHOOL = "Morris Elementary";
  private static final String TEACHER = "Ms. Doe";

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private PurchaseListService purchaseListService;

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
    db.getCollection("family").drop();
    db.getCollection("supplylist").drop();
    purchaseListService = new PurchaseListService(db);
  }

  @Test
  void includesUnlinkedSupplyListDemandWhenInventoryHasNoMatch() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Backpack", 2));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(1, snapshot.summary.totalDemandedItems);
    assertEquals(1, snapshot.summary.itemsNeedingPurchase);
    assertEquals(2, snapshot.summary.totalUnitsNeeded);
    assertEquals(0, snapshot.summary.totalUnitsOnHand);
    assertEquals(2, snapshot.summary.totalUnitsToBuy);

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Backpack", item.item);
    assertEquals("2x Backpacks", item.description);
    assertEquals(2, item.totalNeeded);
    assertEquals(0, item.quantityOnHand);
    assertEquals(2, item.quantityToBuy);
    assertEquals(0, item.fulfillmentPercent);
    assertEquals("unfulfilled", item.fulfillmentStatus);
    assertEquals(List.of(), item.linkedInventoryIds);
    assertEquals(1, item.sources.size());
    assertEquals(1, item.sources.get(0).studentCount);
    assertEquals(2, item.sources.get(0).quantityPerStudent);
  }

  @Test
  void matchesUnlinkedSupplyListDemandToInventoryWithoutEnoughStock() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00001", "Glue Stick", 3));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Glue Stick", 2));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Glue Stick", item.item);
    assertEquals("2x Glue Sticks", item.description);
    assertEquals(4, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(1, item.quantityToBuy);
    assertEquals(75, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00001"), item.linkedInventoryIds);
  }

  @Test
  void usesLinkedInventoryAsManagerFulfillmentIntent() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 3));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00002", "Disinfectant Wipe", 7));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Sanitizing Wipes", 1, List.of("ID-00002")));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Sanitizing Wipes", item.item);
    assertEquals("1x Sanitizing Wipes (linked to Disinfectant Wipe)", item.description);
    assertEquals(3, item.totalNeeded);
    assertEquals(7, item.quantityOnHand);
    assertEquals(0, item.quantityToBuy);
    assertEquals(100, item.fulfillmentPercent);
    assertEquals("fulfilled", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00002"), item.linkedInventoryIds);
  }

  @Test
  void aggregatesMultipleSupplyListRowsAgainstOneInventoryItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "2", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00003", "Notebook", 3));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Notebook", 1),
      supplyListDoc(SCHOOL, "2", TEACHER, "Notebook", 2)));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Notebook", item.item);
    assertEquals(4, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(1, item.quantityToBuy);
    assertEquals(75, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertEquals(2, item.sources.size());
  }

  @Test
  void aggregatesLinkedAndAutoMatchedSupplyListRowsAgainstSameInventoryItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00006", "Disinfectant Wipe", 3));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Disinfectant Wipe", 2),
      supplyListDoc(SCHOOL, "1", TEACHER, "Sanitizing Wipes", 1, List.of("ID-00006"))));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertAll(
      () -> assertEquals(1, snapshot.items.size()),
      () -> assertEquals(1, snapshot.summary.totalDemandedItems),
      () -> assertEquals(6, snapshot.summary.totalUnitsNeeded),
      () -> assertEquals(3, snapshot.summary.totalUnitsOnHand),
      () -> assertEquals(3, snapshot.summary.totalUnitsToBuy));

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Sanitizing Wipes", item.item);
    assertEquals("1x Sanitizing Wipes (linked to Disinfectant Wipe)", item.description);
    assertEquals(6, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(3, item.quantityToBuy);
    assertEquals(50, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00006"), item.linkedInventoryIds);
    assertEquals(2, item.sources.size());
  }

  @Test
  void aggregatesOverlappingLinkedInventorySetsIntoOnePurchaseListItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00010", "Marker", 3),
      inventoryDoc("ID-00011", "Writing Tool", 4),
      inventoryDoc("ID-00012", "Pencil", 5)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 2, List.of("ID-00010", "ID-00011")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Pencil", 2, List.of("ID-00011", "ID-00012"))));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertAll(
      () -> assertEquals(1, snapshot.items.size()),
      () -> assertEquals(1, snapshot.summary.totalDemandedItems),
      () -> assertEquals(20, snapshot.summary.totalUnitsNeeded),
      () -> assertEquals(12, snapshot.summary.totalUnitsOnHand),
      () -> assertEquals(8, snapshot.summary.totalUnitsToBuy));

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals(20, item.totalNeeded);
    assertEquals(12, item.quantityOnHand);
    assertEquals(8, item.quantityToBuy);
    assertEquals(60, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00010", "ID-00011", "ID-00012"), item.linkedInventoryIds);
    assertEquals(2, item.sources.size());
  }

  @Test
  void usesInventoryIdentityWhenMatchedSupplyListItemIsGeneric() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00004", "Marker", 1)
      .append("brand", "Crayola")
      .append("color", "Blue")
      .append("type", "Washable")
      .append("material", "Plastic")
      .append("packageSize", 8));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals("8 Pack of Blue Washable Crayola Marker (Plastic)", snapshot.items.get(0).description);
  }

  @Test
  void displaysStructuredSupplyListDetailsForUnmatchedItems() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1)
      .append("packageSize", 24)
      .append("color", attributeExactly("Blue"))
      .append("type", attributeExactly("Washable"))
      .append("size", attributeExactly("Wide"))
      .append("brand", attributeAnyOf("Crayola", "RoseArt"))
      .append("material", attributeExactly("Plastic"))
      .append("notes", "primary classroom"));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(
      "1x 24ct Blue Washable Wide Crayola/RoseArt Marker (Plastic, primary classroom)",
      snapshot.items.get(0).description);
  }

  @Test
  void usesStoredInventoryDescriptionWhenLinkedInventoryHasNoStructuredDisplay() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00005", "", 1)
      .append("description", "Reusable school pouch"));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Binder Pencil bag", 1, List.of("ID-00005")));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(
      "1x Binder Pencil bag (linked to Reusable school pouch)",
      snapshot.items.get(0).description);
  }

  @Test
  void ignoresGenericValuesWhenBuildingSupplyListDisplay() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1)
      .append("brand", attributeAnyOf("N/A"))
      .append("material", attributeExactly("N/A"))
      .append("notes", "N/A"));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals("1x Folder", snapshot.items.get(0).description);
  }

  private Document inventoryDoc(String internalId, String item, int quantity) {
    return new Document()
      .append("_id", new ObjectId())
      .append("item", item)
      .append("description", item)
      .append("quantity", quantity)
      .append("reservedQuantity", 0)
      .append("packageSize", 1)
      .append("internalID", internalId)
      .append("internalBarcode", internalId);
  }

  private Document supplyListDoc(
      String school,
      String grade,
      String teacher,
      String item,
      int quantity
  ) {
    return supplyListDoc(school, grade, teacher, item, quantity, List.of());
  }

  private Document supplyListDoc(
      String school,
      String grade,
      String teacher,
      String item,
      int quantity,
      List<String> invIDs
  ) {
    return new Document()
      .append("_id", new ObjectId())
      .append("school", school)
      .append("grade", grade)
      .append("teacher", teacher)
      .append("item", List.of(item))
      .append("quantity", quantity)
      .append("invIDs", invIDs);
  }

  private Document attributeExactly(String value) {
    return new Document()
      .append("exactly", value)
      .append("anyOf", List.of());
  }

  private Document attributeAnyOf(String... values) {
    return new Document()
      .append("exactly", "")
      .append("anyOf", List.of(values));
  }

  private Document familyDoc(String school, String grade, String teacher, int studentCount) {
    List<Document> students = new ArrayList<>();
    for (int index = 1; index <= studentCount; index++) {
      students.add(new Document()
        .append("name", "Student " + index)
        .append("school", school)
        .append("grade", grade)
        .append("teacher", teacher));
    }

    return new Document()
      .append("_id", new ObjectId())
      .append("guardianName", "Guardian")
      .append("students", students);
  }
}
