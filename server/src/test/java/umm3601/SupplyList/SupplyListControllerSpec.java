// Packages
package umm3601.SupplyList;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
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
public class SupplyListControllerSpec {
  private SupplyListController supplylistController;
  private ObjectId samsId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @Mock
  private Context ctx;

  @Captor
  private ArgumentCaptor<ArrayList<SupplyList>> supplylistArrayCaptor;

  @Captor
  private ArgumentCaptor<SupplyList> supplylistCaptor;

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
    MongoCollection<Document> supplylistDocuments = db.getCollection("supplylist");
    supplylistDocuments.drop();
    List<Document> testSupplyList = new ArrayList<>();
    testSupplyList.add(
        new Document()
            .append("school", "MHS")
            .append("grade", "PreK")
            .append("item",  "Pencil")
            .append("brand",  "Ticonderoga")
            .append("color",  "yellow")
            .append("count",  1)
            .append("size",  "N/A")
            .append("description",  "A standard pencil")
            .append("quantity", 10)
            .append("notes",  "N/A")
            .append("type", "#2")
            .append("material", "wood"));
    testSupplyList.add(
        new Document()
            .append("school", "CHS")
            .append("grade", "12th grade")
            .append("item", "Eraser")
            .append("brand", "Pink Pearl")
            .append("color", "pink")
            .append("count", 1)
            .append("size", "N/A")
            .append("description", "A standard eraser")
            .append("quantity", 5)
            .append("notes", "N/A")
            .append("type", "rubber")
            .append("material", "rubber"));
    testSupplyList.add(
        new Document()
            .append("school", "MHS")
            .append("grade", "PreK")
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

    samsId = new ObjectId();
    Document sam = new Document()
        .append("_id", samsId)
        .append("school", "MHS")
        .append("grade", "PreK")
        .append("item", "Backpack")
        .append("brand", "JanSport")
        .append("color", "black")
        .append("count", 1)
        .append("size", "Standard")
        .append("description", "A standard backpack")
        .append("quantity", 2)
        .append("notes", "Plain colors only")
        .append("type", "shoulder bag")
        .append("material", "fabric");

    supplylistDocuments.insertMany(testSupplyList);
    supplylistDocuments.insertOne(sam);

    supplylistController = new SupplyListController(db);
  }

  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    supplylistController.addRoutes(mockServer);
    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
  }

  // -- Supply List GET Tests -- \\

  @Test
  void canGetAllSupplyList() throws IOException {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(
        db.getCollection("supplylist").countDocuments(),
        supplylistArrayCaptor.getValue().size());
  }

  @Test
  void getListWithExistentId() throws IOException {
    String id = samsId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    supplylistController.getList(ctx);

    verify(ctx).json(supplylistCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals("Backpack", supplylistCaptor.getValue().item);
    assertEquals(samsId.toHexString(), supplylistCaptor.getValue()._id);
  }

  @Test
  void getListWithBadId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.getList(ctx);
    });

    assertEquals("The requested supply list id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void getListWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      supplylistController.getList(ctx);
    });

    assertEquals("The requested supply list item was not found", exception.getMessage());
  }

  // -- Supply List filter Tests -- \\

  @Test
  void quantityFilterRejectsNonIntegerQuantity() {
    when(ctx.queryParamMap()).thenReturn(Map.of("quantity", List.of("notAnInt")));
    when(ctx.queryParam("quantity")).thenReturn("notAnInt");

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.getSupplyLists(ctx);
    });

    assertEquals("quantity must be an integer.", ex.getMessage());
  }

  @Test
  void canFilterSupplyListByItemCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("item", List.of("pEnCiL")));
    when(ctx.queryParam("item")).thenReturn("pEnCiL");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("Pencil", supplylistArrayCaptor.getValue().get(0).item);
  }

  @Test
  void canFilterSupplyListByBrandCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("brand", List.of("tIcOnDeRoGa")));
    when(ctx.queryParam("brand")).thenReturn("tIcOnDeRoGa");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("Ticonderoga", supplylistArrayCaptor.getValue().get(0).brand);
  }

  @Test
  void canFilterSupplyListByColorCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("color", List.of("yElLoW")));
    when(ctx.queryParam("color")).thenReturn("yElLoW");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("yellow", supplylistArrayCaptor.getValue().get(0).color);
  }

  @Test
  void canFilterSupplyListBySizeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("size", List.of("sTaNdArD")));
    when(ctx.queryParam("size")).thenReturn("sTaNdArD");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("Standard", supplylistArrayCaptor.getValue().get(0).size);
  }

  @Test
  void canFilterSupplyListByDescriptionCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("description", List.of("A standard backpack")));
    when(ctx.queryParam("description")).thenReturn("A standard backpack");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("A standard backpack", supplylistArrayCaptor.getValue().get(0).description);
  }

  @Test
  void canFilterSupplyListByNotesCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("notes", List.of("Plain colors only")));
    when(ctx.queryParam("notes")).thenReturn("Plain colors only");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("Plain colors only", supplylistArrayCaptor.getValue().get(0).notes);
  }

  @Test
  void canFilterSupplyListByMaterialCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("material", List.of("wood")));
    when(ctx.queryParam("material")).thenReturn("wood");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("wood", supplylistArrayCaptor.getValue().get(0).material);
  }

  @Test
  void canFilterSupplyListByTypeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("type", List.of("shoulder bag")));
    when(ctx.queryParam("type")).thenReturn("shoulder bag");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertEquals("shoulder bag", supplylistArrayCaptor.getValue().get(0).type);
  }

  @Test
  void canFilterSupplyListBySchoolCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("school", List.of("MHS")));
    when(ctx.queryParam("school")).thenReturn("MHS");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(3, supplylistArrayCaptor.getValue().size());
    assertEquals("MHS", supplylistArrayCaptor.getValue().get(0).school);
  }

  @Test
  void canFilterSupplyListByGradeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("grade", List.of("PreK")));
    when(ctx.queryParam("grade")).thenReturn("PreK");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(3, supplylistArrayCaptor.getValue().size());
    assertEquals("PreK", supplylistArrayCaptor.getValue().get(0).grade);
  }
}

