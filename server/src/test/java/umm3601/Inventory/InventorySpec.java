// Packages
package umm3601.Inventory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import io.javalin.http.Context;
import org.bson.Document;
import java.util.List;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.MongoClients;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertFalse;

import static org.mockito.Mockito.when;
import static org.mockito.Mockito.mock;
import org.junit.jupiter.api.AfterEach;
import com.mongodb.client.MongoClient;


// InventorySpec Class
public class InventorySpec {
  private static final String FAKE_ID_STRING_1 = "fakeIdOne";
  private static final String FAKE_ID_STRING_2 = "fakeIdTwo";
  private MongoDatabase db;
  private InventoryController inventoryController;
  private Context ctx;
  private static final int INITIAL_QUANT = 5;
  private static final int EXPECTED_QUANT = 6;
  private static final int INCOMING_QUANT = 3;
  private static final int FIVE = 5;
  private static final int THREE = 3;

  private Inventory inv1;
  private Inventory inv2;
  private MongoClient mongoClient;

  // -- Test Management -- \\

  @BeforeEach
  void setupEach() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "mongodb://localhost:27017");
    mongoClient = MongoClients.create(mongoAddr);
    db = mongoClient.getDatabase("test");
    db.getCollection("inventory").drop();
    inventoryController = new InventoryController(db);
    ctx = mock(Context.class);
    inv1 = new Inventory();
    inv2 = new Inventory();

    inv1.item = "Pencil";
    inv1.brand = "Ticonderoga";
    inv1.description = "Ticonderoga Pencil";
  }

  @AfterEach
  void tearDownEach() {
    if (db != null) {
      db.getCollection("inventory").drop();
    }
    if (mongoClient != null) {
      mongoClient.close();
    }
  }

  // -- Inventory ID Tests -- \\

  @Test
  void inventoriesWithEqualIdAreEqual() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_1;

    assertTrue(inv1.equals(inv2));
  }

  @Test
  void inventoriesWithDifferentIdAreNotEqual() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_2;

    assertFalse(inv1.equals(inv2));
  }

  @Test
  void hashCodesAreBasedOnId() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_1;

    assertTrue(inv1.hashCode() == inv2.hashCode());
  }

  @SuppressWarnings("unlikely-arg-type")
  @Test
  void inventoriesAreNotEqualToOtherKindsOfThings() {
    inv1._id = FAKE_ID_STRING_1;
    // an Inventory is not equal to its id even though id is used for checking equality
    assertFalse(inv1.equals(FAKE_ID_STRING_1));
  }

  @Test
  void nullId() {
    inv1._id = null;
    inv2._id = FAKE_ID_STRING_2;

    assertEquals(inv1.hashCode(), 0);
    assertFalse(inv1.equals(inv2));
  }

  // -- Misc Inventory Tests -- \\

  @Test
  void inventoryToString() {
    assertEquals(inv1.toString(), "Pencil Ticonderoga Ticonderoga Pencil");
  }
  @Test
void addInventoryUpdatesExistingItem() {
    Document invDoc = new Document("internalBarcode", "ABC")
        .append("quantity", INITIAL_QUANT);

    db.getCollection("inventory").insertOne(invDoc);

    // Mock incoming request body
    Inventory incoming = new Inventory();
    incoming.internalBarcode = "ABC";
    incoming.quantity = 1;

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(incoming);

    inventoryController.addInventory(ctx);

    Document updated = db.getCollection("inventory")
      .find(new Document("internalBarcode", "ABC"))
      .first();

    assertEquals(EXPECTED_QUANT, updated.getInteger("quantity"));
  }
  @Test
  void addInventoryUpdatesExistingItemWithInternalBarcode() {
    Document existing = new Document("internalBarcode", "ABC")
      .append("quantity", 2);

    db.getCollection("inventory").insertOne(existing);

    Inventory incoming = new Inventory();
    incoming.internalBarcode = "ABC";
    incoming.quantity = THREE;

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(incoming);

    inventoryController.addInventory(ctx);

    Document updated = db.getCollection("inventory")
      .find(new Document("internalBarcode", "ABC"))
      .first();

    assertEquals(FIVE, updated.getInteger("quantity"));
  }
  @Test
  void addInventoryCreatesNewItemWithExternalBarcode() {
    Inventory incoming = new Inventory();
    incoming.externalBarcode = List.of("EXT-123");
    incoming.quantity = INCOMING_QUANT;

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(incoming);

    inventoryController.addInventory(ctx);

    Document created = db.getCollection("inventory")
      .find(new Document("externalBarcode", List.of("EXT-123")))
      .first();

    assertEquals(INCOMING_QUANT, created.getInteger("quantity"));
  }
}
