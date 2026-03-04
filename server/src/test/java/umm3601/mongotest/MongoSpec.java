package umm3601.mongotest;

import static com.mongodb.client.model.Filters.gt;
import static com.mongodb.client.model.Projections.excludeId;
import static com.mongodb.client.model.Projections.fields;
import static com.mongodb.client.model.Projections.include;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoIterable;
import com.mongodb.client.model.Accumulators;
import com.mongodb.client.model.Aggregates;
import com.mongodb.client.model.Sorts;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * Simple tests to verify we can connect to MongoDB and do basic queries.
 */
@SuppressWarnings({"MagicNumber"})
class MongoSpec {

  private MongoCollection<Document> inventoryDocuments;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @BeforeAll
  static void setupDB() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
      .applyToClusterSettings(builder ->
        builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
      .build());

    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void clearAndPopulateDB() {
    inventoryDocuments = db.getCollection("inventory");
    inventoryDocuments.drop();
    List<Document> testItems = new ArrayList<>();
    testItems.add(
      new Document()
        .append("item", "Test Item")
        .append("description", "This is a test item.")
        .append("brand", "Test")
        .append("color", "Test")
        .append("size", "Test")
        .append("type", "Test")
        .append("material", "Test")
        .append("count", 50)
        .append("quantity", 100)
        .append("notes", "This is a test item."));
    testItems.add(
      new Document()
        .append("item", "Backpack")
        .append("description", "Backpack")
        .append("brand", "N/A")
        .append("color", "N/A")
        .append("size", "N/A")
        .append("type", "N/A")
        .append("material", "N/A")
        .append("count", 1)
        .append("quantity", 10)
        .append("notes", "N/A"));

    inventoryDocuments.insertMany(testItems);
  }

  private List<Document> intoList(MongoIterable<Document> documents) {
    List<Document> items = new ArrayList<>();
    documents.into(items);
    return items;
  }

  private int countItems(FindIterable<Document> documents) {
    List<Document> items = intoList(documents);
    return items.size();
  }

  @Test
  void shouldBeTwoItems() {
    FindIterable<Document> documents = inventoryDocuments.find();
    int numberOfItems = countItems(documents);
    assertEquals(2, numberOfItems, "Should be 2 total items");
  }

  @Test
  void shouldBeOneOver10Quantity() {
    FindIterable<Document> documents = inventoryDocuments.find(gt("quantity", 10));
    int numberOfItems = countItems(documents);
    assertEquals(1, numberOfItems, "Should be 1 item with quantity over 10");
  }

  @Test
  void over10QuantitySortedByItem() {
    List<Document> docs
      = inventoryDocuments.find(gt("quantity", 10))
      .sort(Sorts.ascending("item"))
      .into(new ArrayList<>());
    assertEquals(1, docs.size(), "Should be 1");
    assertEquals("Test Item", docs.get(0).get("item"), "The only item should be Test Item");
  }

  @Test
  void justItemAndBrand() {
    List<Document> docs
      = inventoryDocuments.find().projection(fields(include("item", "brand")))
      .into(new ArrayList<>());
    assertEquals(2, docs.size(), "Should be 2");
    assertEquals("Test Item", docs.get(0).get("item"), "First should be Test Item");
    assertNotNull(docs.get(0).get("brand"), "First should have brand");
    assertNull(docs.get(0).get("type"), "First shouldn't have 'type'");
    assertNotNull(docs.get(0).get("_id"), "First should have '_id'");
  }

  @Test
  void justItemAndBrandNoId() {
    List<Document> docs
      = inventoryDocuments.find()
      .projection(fields(include("item", "brand"), excludeId()))
      .into(new ArrayList<>());
    assertEquals(2, docs.size(), "Should be 2");
    assertEquals("Test Item", docs.get(0).get("item"), "First should be Test Item");
    assertNotNull(docs.get(0).get("brand"), "First should have brand");
    assertNull(docs.get(0).get("type"), "First shouldn't have 'type'");
    assertNull(docs.get(0).get("_id"), "First should not have '_id'");
  }

  @Test
  void justItemAndBrandNoIdSortedByType() {
    List<Document> docs
      = inventoryDocuments.find()
      .sort(Sorts.ascending("type"))
      .projection(fields(include("item", "brand"), excludeId()))
      .into(new ArrayList<>());
    assertEquals(2, docs.size(), "Should be 2");
    assertEquals("Backpack", docs.get(0).get("item"), "First should be Backpack");
    assertNotNull(docs.get(0).get("brand"), "First should have brand");
    assertNull(docs.get(0).get("type"), "First shouldn't have 'type'");
    assertNull(docs.get(0).get("_id"), "First should not have '_id'");
  }

  @Test
  void quantityCounts() {
    List<Document> docs
      = inventoryDocuments.aggregate(
      Arrays.asList(
        Aggregates.group("$quantity",
          Accumulators.sum("quantityCount", 1)),
        Aggregates.sort(Sorts.ascending("_id"))
      )
    ).into(new ArrayList<>());
    assertEquals(2, docs.size(), "Should be two distinct quantities");
    assertEquals(10, docs.get(0).get("_id"));
    assertEquals(1, docs.get(0).get("quantityCount"));
    assertEquals(100, docs.get(1).get("_id"));
    assertEquals(1, docs.get(1).get("quantityCount"));
  }

}
