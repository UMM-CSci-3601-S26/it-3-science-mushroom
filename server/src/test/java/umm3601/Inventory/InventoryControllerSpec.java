// Packages
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
            .append("count",  1)
            .append("size",  "N/A")
            .append("color",  "yellow")
            .append("type", "#2")
            .append("material", "wood")
            .append("description",  "A standard pencil")
            .append("quantity", 10) // Over stocked
            .append("maxQuantity", 5)
            .append("minQuantity", 1)
            .append("notes",  "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Eraser")
            .append("brand", "Pink Pearl")
            .append("count", 1)
            .append("size", "N/A")
            .append("color", "pink")
            .append("type", "rubber")
            .append("material", "rubber")
            .append("description", "A standard eraser")
            .append("quantity", 5) // Properly stocked
            .append("maxQuantity", 10)
            .append("minQuantity", 1)
            .append("notes", "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Notebook")
            .append("brand", "Five Star")
            .append("count", 1)
            .append("size", "N/A")
            .append("color", "blue")
            .append("type", "spiral")
            .append("material", "paper")
            .append("description", "A standard notebook")
            .append("quantity", 3) // Under stocked
            .append("maxQuantity", 10)
            .append("minQuantity", 5)
            .append("notes", "N/A"));
    testInventory.add(
        new Document()
            .append("item", "Folder")
            .append("brand", "Manilla")
            .append("count", 1)
            .append("size", "3 hole")
            .append("color", "green")
            .append("type", "3 hole")
            .append("material", "paper")
            .append("description", "A standard green manilla folder")
            .append("quantity", 0) // Out of stock
            .append("maxQuantity", 10)
            .append("minQuantity", 5)
            .append("notes", "N/A")
);

    samsId = new ObjectId();
    Document sam = new Document()
        .append("_id", samsId)
        .append("item", "Backpack")
        .append("brand", "JanSport")
        .append("count", 1)
        .append("size", "Standard")
        .append("color", "black")
        .append("type", "shoulder bag")
        .append("material", "fabric")
        .append("description", "A standard backpack")
        .append("quantity", 2)
        .append("maxQuantity", 10)
        .append("minQuantity", 1)
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
}

