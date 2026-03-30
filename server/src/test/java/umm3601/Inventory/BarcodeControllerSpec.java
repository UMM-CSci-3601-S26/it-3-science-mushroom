package umm3601.Inventory;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.Arrays;

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

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

@SuppressWarnings({ "MagicNumber" })
public class BarcodeControllerSpec {

  private BarcodeController barcodeController;
  private ObjectId pencilId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<Inventory> inventoryCaptor;

  @Captor
  private ArgumentCaptor<Document> documentCaptor;

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
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);

    MongoCollection<Document> inventoryDocuments = db.getCollection("inventory");
    inventoryDocuments.drop();

    pencilId = new ObjectId();
    inventoryDocuments.insertOne(new Document()
        .append("_id", pencilId)
        .append("item", "Pencil")
        .append("brand", "Ticonderoga")
        .append("color", "yellow")
        .append("count", 1)
        .append("size", "N/A")
        .append("description", "A standard pencil")
        .append("quantity", 10)
        .append("notes", "N/A")
        .append("type", "#2")
        .append("material", "wood")
        .append("internalBarcode", "ITEM-00001")
        .append("manufacturedBarcode", "MFG-ABC123"));

    inventoryDocuments.insertOne(new Document()
        .append("item", "Eraser")
        .append("brand", "Pink Pearl")
        .append("color", "pink")
        .append("count", 1)
        .append("size", "N/A")
        .append("description", "A standard eraser")
        .append("quantity", 5)
        .append("notes", "N/A")
        .append("type", "rubber")
        .append("material", "rubber")
        .append("internalBarcode", "ITEM-00002")
        .append("manufacturedBarcode", "MFG-DEF456"));

    // Item with no Barcode
    inventoryDocuments.insertOne(new Document()
        .append("item", "Notebook")
        .append("brand", "Five Star")
        .append("color", "blue")
        .append("count", 1)
        .append("size", "N/A")
        .append("description", "A standard notebook")
        .append("quantity", 3)
        .append("notes", "N/A")
        .append("type", "spiral")
        .append("material", "paper"));

    barcodeController = new BarcodeController(db);
  }

  // -- addRoutes --

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    barcodeController.addRoutes(mockServer);
    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
    verify(mockServer, Mockito.atLeast(1)).post(any(), any());
  }

  // -- getNextBarcode --

  @Test
  void getNextBarcodeReturnsNextSequentialCode() throws IOException {
    barcodeController.getNextBarcode(ctx);

    verify(ctx).json(documentCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    // Highest existing is ITEM-00002, so next should be ITEM-00003
    assertEquals("ITEM-00003", documentCaptor.getValue().getString("internalBarcode"));
  }

  @Test
  void getNextBarcodeReturnsIntDashZeroZeroZeroOneWhenNoBarcodesExist() throws IOException {
    // Drop all items with internalBarcode set
    db.getCollection("inventory").drop();

    barcodeController.getNextBarcode(ctx);

    verify(ctx).json(documentCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals("ITEM-00001", documentCaptor.getValue().getString("internalBarcode"));
  }

  // -- lookupBarcode --

  @Test
  void lookupByInternalBarcodeReturnsCorrectItem() throws IOException {
    when(ctx.pathParam("code")).thenReturn("ITEM-00001");

    barcodeController.lookupBarcode(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Pencil", inventoryCaptor.getValue().item);
    assertEquals("ITEM-00001", inventoryCaptor.getValue().internalBarcode);
  }

  @Test
  void lookupByManufacturedBarcodeReturnsCorrectItem() throws IOException {
    when(ctx.pathParam("code")).thenReturn("MFG-ABC123");

    barcodeController.lookupBarcode(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Pencil", inventoryCaptor.getValue().item);
    assertEquals("MFG-ABC123", inventoryCaptor.getValue().manufacturedBarcode);
  }

  @Test
  void lookupBarcodeThrowsNotFoundForUnknownCode() throws IOException {
    when(ctx.pathParam("code")).thenReturn("UNKNOWN-99999");

    NotFoundResponse ex = assertThrows(NotFoundResponse.class, () -> {
      barcodeController.lookupBarcode(ctx);
    });

    assertTrue(ex.getMessage().contains("UNKNOWN-99999"));
  }

  // -- addInventory --

  @Test
  void addInventoryCreatesNewItem() throws IOException {
    Inventory newItem = new Inventory();
    newItem.item = "Ruler";
    newItem.brand = "Staedtler";
    newItem.color = "clear";
    newItem.size = "12 inch";
    newItem.type = "straight";
    newItem.material = "plastic";
    newItem.description = "A standard ruler";
    newItem.quantity = 8;
    newItem.count = 1;
    newItem.notes = "N/A";
    newItem.internalBarcode = "ITEM-00004";
    newItem.manufacturedBarcode = "MFG-GHI789";

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(newItem);

    barcodeController.addInventory(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);
    assertEquals("Ruler", inventoryCaptor.getValue().item);
    assertEquals("ITEM-00004", inventoryCaptor.getValue().internalBarcode);

    // Verify it was actually inserted into the database
    long count = db.getCollection("inventory")
        .countDocuments(new Document("internalBarcode", "ITEM-00004"));
    assertEquals(1, count);
  }

  @Test
  void addInventoryThrowsBadRequestWhenItemNameMissing() throws IOException {
    Inventory newItem = new Inventory();
    newItem.item = "";
    newItem.internalBarcode = "ITEM-00004";

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(newItem);

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      barcodeController.addInventory(ctx);
    });

    assertEquals("Item name is required.", ex.getMessage());
  }

  @Test
  void addInventoryThrowsBadRequestWhenInternalBarcodeMissing() throws IOException {
    Inventory newItem = new Inventory();
    newItem.item = "Ruler";
    newItem.internalBarcode = "";

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(newItem);

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      barcodeController.addInventory(ctx);
    });

    assertEquals("Internal barcode is required", ex.getMessage());
  }

  // -- updateQuantity --

  @Test
  void updateQuantityAddsOneToQuantity() throws IOException {
    when(ctx.pathParam("id")).thenReturn(pencilId.toHexString());
    when(ctx.bodyAsClass(Document.class)).thenReturn(new Document("action", "add"));

    barcodeController.updateQuantity(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    // findOneAndUpdate returns the pre-update document, so verify DB directly
    Document updated = db.getCollection("inventory")
        .find(new Document("_id", pencilId)).first();
    assertEquals(11, updated.getInteger("quantity")); // was 10, now 11
  }

  @Test
  void updateQuantityRemovesOneFromQuantity() throws IOException {
    when(ctx.pathParam("id")).thenReturn(pencilId.toHexString());
    when(ctx.bodyAsClass(Document.class)).thenReturn(new Document("action", "remove"));

    barcodeController.updateQuantity(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Document updated = db.getCollection("inventory")
        .find(new Document("_id", pencilId)).first();
    assertEquals(9, updated.getInteger("quantity")); // was 10, now 9
  }

  @Test
  void updateQuantityThrowsBadRequestForInvalidAction() throws IOException {
    when(ctx.pathParam("id")).thenReturn(pencilId.toHexString());
    when(ctx.bodyAsClass(Document.class)).thenReturn(new Document("action", "invalid"));

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      barcodeController.updateQuantity(ctx);
    });

    assertEquals("action must be 'add' or 'remove'", ex.getMessage());
  }

  @Test
  void updateQuantityThrowsBadRequestForInvalidId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("not-a-valid-id");
    when(ctx.bodyAsClass(Document.class)).thenReturn(new Document("action", "add"));

    assertThrows(BadRequestResponse.class, () -> {
      barcodeController.updateQuantity(ctx);
    });
  }

  @Test
  void updateQuantityThrowsNotFoundForNonexistentId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("588935f5c668650dc77df581");
    when(ctx.bodyAsClass(Document.class)).thenReturn(new Document("action", "add"));

    assertThrows(NotFoundResponse.class, () -> {
      barcodeController.updateQuantity(ctx);
    });
  }
}
