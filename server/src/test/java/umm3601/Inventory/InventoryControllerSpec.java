package umm3601.Inventory;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// IO Imports
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
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


@SuppressWarnings({ "MagicNumber" })
public class InventoryControllerSpec {

  private InventoryController inventoryController;
  private ObjectId samsId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<ArrayList<Inventory>> inventoryArrayListCaptor;

  @Captor
  private ArgumentCaptor<Inventory> inventoryCaptor;

  @Captor
  private ArgumentCaptor<Document> documentCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  // -- Test Management -- \\

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

    // Setup database
    MongoCollection<Document> inventoryDocuments = db.getCollection("inventory");
    inventoryDocuments.drop();
    List<Document> testInventory = new ArrayList<>();
    testInventory.add(
        new Document()
            .append("item",  "Pencil")
            .append("brand",  "Ticonderoga")
            .append("packageSize",  1)
            .append("size",  "N/A")
            .append("color",  "yellow")
            .append("type", "#2")
            .append("material", "wood")
            .append("description",  "A standard pencil")
            .append("quantity", 10) // Over stocked
            .append("maxQuantity", 5)
            .append("minQuantity", 1)
            .append("stockState", "Over-Stocked")
            .append("notes",  "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Eraser")
            .append("brand", "Pink Pearl")
            .append("packageSize", 1)
            .append("size", "N/A")
            .append("color", "pink")
            .append("type", "rubber")
            .append("material", "rubber")
            .append("description", "A standard eraser")
            .append("quantity", 5) // Properly stocked
            .append("maxQuantity", 10)
            .append("minQuantity", 1)
            .append("stockState", "Stocked")
            .append("notes", "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Notebook")
            .append("brand", "Five Star")
            .append("packageSize", 1)
            .append("size", "N/A")
            .append("color", "blue")
            .append("type", "spiral")
            .append("material", "paper")
            .append("description", "A standard notebook")
            .append("quantity", 3) // Under stocked
            .append("maxQuantity", 10)
            .append("minQuantity", 5)
            .append("stockState", "Under-Stocked")
            .append("notes", "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Folder")
            .append("brand", "Manilla")
            .append("packageSize", 1)
            .append("size", "3 hole")
            .append("color", "green")
            .append("type", "3 hole")
            .append("material", "paper")
            .append("description", "A standard green manilla folder")
            .append("quantity", 0) // Out of stock
            .append("maxQuantity", 10)
            .append("minQuantity", 5)
            .append("stockState", "Out of Stock")
            .append("notes", "N/A")
);

    samsId = new ObjectId();
    Document sam = new Document()
        .append("_id", samsId)
        .append("item", "Backpack")
        .append("brand", "JanSport")
        .append("packageSize", 1)
        .append("size", "Standard")
        .append("color", "black")
        .append("type", "shoulder bag")
        .append("material", "fabric")
        .append("description", "A standard backpack")
        .append("quantity", 2)
        .append("maxQuantity", 10)
        .append("minQuantity", 1)
        .append("stockState", "Stocked")
        .append("notes", "Plain colors only");

    inventoryDocuments.insertMany(testInventory);
    inventoryDocuments.insertOne(sam);

    inventoryController = new InventoryController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    inventoryController.addRoutes(mockServer);
    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
  }

  // -- Inventory GET Tests -- \\

  @Test
  void canGetAllInventory() throws IOException {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(
        db.getCollection("inventory").countDocuments(),
        inventoryArrayListCaptor.getValue().size());
  }

  @Test
  void getInventoryWithExistentId() throws IOException {
    String id = samsId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    inventoryController.getInventory(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Backpack", inventoryCaptor.getValue().item);
    assertEquals(samsId.toHexString(), inventoryCaptor.getValue()._id);
  }

  @Test
  void getInventoryWithBadId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      inventoryController.getInventory(ctx);
    });

    assertEquals("The requested inventory id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void getInventoryWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      inventoryController.getInventory(ctx);
    });

    assertEquals("The requested inventory item was not found", exception.getMessage());
  }

  // -- Inventory filter Tests -- \\

  @Test
  void canFilterInventoryByQuantity() throws IOException {
    when(ctx.queryParamMap()).thenReturn(Map.of("quantity", List.of("5")));
    when(ctx.queryParam("quantity")).thenReturn("5");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("Eraser", inventoryArrayListCaptor.getValue().get(0).item);
  }

  @Test
  void quantitiesFilterRejectsNonIntegerQuantity() {
    when(ctx.queryParamMap()).thenReturn(Map.of("quantity", List.of("notAnInt")));
    when(ctx.queryParam("quantity")).thenReturn("notAnInt");

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      inventoryController.getInventories(ctx);
  });

    assertEquals("quantity must be an integer.", ex.getMessage());
  }

  @Test
  void canFilterInventoryByItemCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("item", List.of("pEnCiL")));
    when(ctx.queryParam("item")).thenReturn("pEnCiL");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("Pencil", inventoryArrayListCaptor.getValue().get(0).item);
  }

  @Test
  void canFilterInventoryByBrandCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("brand", List.of("tIcOnDeRoGa")));
    when(ctx.queryParam("brand")).thenReturn("tIcOnDeRoGa");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("Ticonderoga", inventoryArrayListCaptor.getValue().get(0).brand);
  }

  @Test
  void canFilterInventoryByColorCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("color", List.of("yElLoW")));
    when(ctx.queryParam("color")).thenReturn("yElLoW");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("yellow", inventoryArrayListCaptor.getValue().get(0).color);
  }

  @Test
  void canFilterInventoryBySizeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("size", List.of("sTaNdArD")));
    when(ctx.queryParam("size")).thenReturn("sTaNdArD");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("Standard", inventoryArrayListCaptor.getValue().get(0).size);
  }

  @Test
  void canFilterInventoryByDescriptionCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("description", List.of("A standard backpack")));
    when(ctx.queryParam("description")).thenReturn("A standard backpack");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("A standard backpack", inventoryArrayListCaptor.getValue().get(0).description);
  }

  @Test
  void canFilterInventoryByNotesCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("notes", List.of("Plain colors only")));
    when(ctx.queryParam("notes")).thenReturn("Plain colors only");
    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("Plain colors only", inventoryArrayListCaptor.getValue().get(0).notes);
  }

  @Test
  void canFilterInventoryByMaterialCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("material", List.of("wood")));
    when(ctx.queryParam("material")).thenReturn("wood");
    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("wood", inventoryArrayListCaptor.getValue().get(0).material);
  }

  @Test
  void canFilterInventoryByTypeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("type", List.of("shoulder bag")));
    when(ctx.queryParam("type")).thenReturn("shoulder bag");
    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, inventoryArrayListCaptor.getValue().size());
    assertEquals("shoulder bag", inventoryArrayListCaptor.getValue().get(0).type);
  }
  @Test
  void getInventoriesRanksExactMatchBeforeStartsWithBeforeContains() {
    db.getCollection("inventory").insertMany(List.of(
        new Document()
            .append("item", "Glue")
            .append("brand", "Elmer's")
            .append("packageSize", 1)
            .append("size", "Small")
            .append("color", "white")
            .append("type", "liquid")
            .append("material", "glue")
            .append("description", "Exact match")
            .append("quantity", 4)
            .append("maxQuantity", 10)
            .append("minQuantity", 1)
            .append("notes", "N/A"),
        new Document()
            .append("item", "Glue Stick")
            .append("brand", "Elmer's")
            .append("packageSize", 1)
            .append("size", "Small")
            .append("color", "white")
            .append("type", "stick")
            .append("material", "glue")
            .append("description", "Starts with")
            .append("quantity", 4)
            .append("maxQuantity", 10)
            .append("minQuantity", 1)
            .append("notes", "N/A"),
        new Document()
            .append("item", "School Glue")
            .append("brand", "Elmer's")
            .append("packageSize", 1)
            .append("size", "Small")
            .append("color", "white")
            .append("type", "liquid")
            .append("material", "glue")
            .append("description", "Contains")
            .append("quantity", 4)
            .append("maxQuantity", 10)
            .append("minQuantity", 1)
            .append("notes", "N/A")));

    when(ctx.queryParamMap()).thenReturn(Map.of("item", List.of("Glue")));
    when(ctx.queryParam("item")).thenReturn("Glue");

    inventoryController.getInventories(ctx);

    verify(ctx).json(inventoryArrayListCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    ArrayList<Inventory> results = inventoryArrayListCaptor.getValue();
    assertEquals("Glue", results.get(0).item);
    assertEquals("Glue Stick", results.get(1).item);
    assertEquals("School Glue", results.get(2).item);
  }

  @Test
  void generateNextIdReturnsFirstWhenCollectionEmpty() {
    db.getCollection("inventory").drop();

    inventoryController.generateNextID(ctx);

    verify(ctx).json("ID-00001");
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void generateNextIdReturnsNextSequentialId() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-00009"));

    inventoryController.generateNextID(ctx);

    verify(ctx).json("ID-00010");
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void generateNextIdReturnsFirstWhenHighestIdIsMalformed() {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-ABC"));

    inventoryController.generateNextID(ctx);

    verify(ctx).json("ID-00001");
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void addInventoryAssignsNextIdsDefaultsQuantityAndSanitizesExternalBarcodes() {
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-00007")
        .append("internalBarcode", "ITEM-00008")
        .append("quantity", 2));

    Inventory incoming = new Inventory();
    incoming.item = "Markers";
    incoming.brand = "Expo";
    incoming.packageSize = 1;
    incoming.size = "Medium";
    incoming.color = "Black";
    incoming.type = "Dry Erase";
    incoming.material = "Plastic";
    incoming.description = "Black dry erase markers";
    incoming.notes = "N/A";
    incoming.quantity = 0;
    incoming.externalBarcode = Arrays.asList("EXT-1", "", "  ", "EXT-1", "ITEM-99999", "EXT-2");

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(incoming);

    inventoryController.addInventory(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);

    Inventory created = inventoryCaptor.getValue();
    assertEquals("ID-00009", created.internalID);
    assertEquals("ITEM-00009", created.internalBarcode);
    assertEquals(1, created.quantity);
    assertEquals(List.of("EXT-1", "EXT-2"), created.externalBarcode);
  }

  @Test
  void addInventoryInitializesExternalBarcodesWhenNull() {
    db.getCollection("inventory").drop();

    Inventory incoming = new Inventory();
    incoming.item = "Stapler";
    incoming.brand = "Swingline";
    incoming.packageSize = 1;
    incoming.size = "Standard";
    incoming.color = "Black";
    incoming.type = "Desk";
    incoming.material = "Metal";
    incoming.description = "A standard stapler";
    incoming.notes = "N/A";
    incoming.quantity = 2;
    incoming.externalBarcode = null;

    when(ctx.bodyAsClass(Inventory.class)).thenReturn(incoming);

    inventoryController.addInventory(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.CREATED);

    Inventory created = inventoryCaptor.getValue();
    assertEquals("ID-00001", created.internalID);
    assertEquals("ITEM-00001", created.internalBarcode);
    assertEquals(0, created.externalBarcode.size());
  }

  @Test
  void removeInventoryReducesQuantityWhenEnoughExists() {
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-00050")
        .append("quantity", 6));

    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "ID-00050";
    request.amount = 2;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    inventoryController.removeInventory(ctx);

    verify(ctx).json(inventoryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(4, inventoryCaptor.getValue().quantity);
    Document stored = db.getCollection("inventory").find(new Document("internalID", "ID-00050")).first();
    assertEquals(4, stored.getInteger("quantity"));
  }

  @Test
  void removeInventoryDeletesItemWhenQuantityHitsZero() {
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-00051")
        .append("quantity", 2));

    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "ID-00051";
    request.amount = 2;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    inventoryController.removeInventory(ctx);

    verify(ctx).json(documentCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Document result = documentCaptor.getValue();
    assertEquals(true, result.getBoolean("deleted"));
    assertEquals(0, result.getInteger("quantity"));
    assertEquals(0, db.getCollection("inventory").countDocuments(new Document("internalID", "ID-00051")));
  }

  @Test
  void removeInventoryRejectsBlankInternalId() {
    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "   ";
    request.amount = 1;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      inventoryController.removeInventory(ctx);
    });

    assertEquals("internalID is required to remove inventory", ex.getMessage());
  }

  @Test
  void removeInventoryRejectsNonPositiveAmount() {
    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "ID-00052";
    request.amount = 0;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      inventoryController.removeInventory(ctx);
    });

    assertEquals("amount must be greater than 0", ex.getMessage());
  }

  @Test
  void removeInventoryRejectsUnknownInternalId() {
    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "ID-99999";
    request.amount = 1;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    NotFoundResponse ex = assertThrows(NotFoundResponse.class, () -> {
      inventoryController.removeInventory(ctx);
    });

    assertEquals("No item found for internalID: ID-99999", ex.getMessage());
  }

  @Test
  void removeInventoryRejectsRemovingTooMuch() {
    db.getCollection("inventory").insertOne(new Document()
        .append("internalID", "ID-00053")
        .append("quantity", 1));

    RemoveInventoryRequest request = new RemoveInventoryRequest();
    request.internalID = "ID-00053";
    request.amount = 2;

    when(ctx.bodyAsClass(RemoveInventoryRequest.class)).thenReturn(request);

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      inventoryController.removeInventory(ctx);
    });

    assertEquals("Cannot remove more than current quantity", ex.getMessage());
  }
}

