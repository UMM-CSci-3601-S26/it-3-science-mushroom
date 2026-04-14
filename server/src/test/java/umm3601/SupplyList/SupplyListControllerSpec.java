// Packages
package umm3601.SupplyList;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
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
import io.javalin.json.JavalinJackson;
import io.javalin.validation.BodyValidator;
import io.javalin.validation.ValidationException;

/**
 * Tests for the SupplyListController using a real MongoDB "test" database.
 *
 * These tests make sure the controller behaves the way the rest of the app
 * expects it to. They cover:
 * - Getting all supply list items or a single item by ID
 * - Handling bad or nonexistent IDs
 * - Filtering supply list items by lots of fields (item, brand, school, grade,
 * etc.)
 * and making sure filters work even with weird capitalization
 * - Rejecting invalid numeric filters
 * - Making sure the controller registers its routes with Javalin
 *
 * Each test starts with a clean set of supply list documents so results are
 * predictable and easy to understand.
 */

// Tests for the Supply List Controller
@SuppressWarnings({ "MagicNumber" })
public class SupplyListControllerSpec {

  private static JavalinJackson javalinJackson = new JavalinJackson();

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

  // Runs once before all the tests. This connects to a real MongoDB "test"
  // database so the controller is working with actual data instead of fake mocks.
  // Basically sets up the shared database the tests will use.
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

  // Runs before every test. We clear out the supply list collection,
  // insert a small set of sample items, and reset all the mocks.
  // This keeps each test independent so nothing gets messed up by
  // whatever happened in a previous test.
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
        .append("item", Arrays.asList("Pencil"))
        .append("brand", new Document()
          .append("allOf", "Ticonderoga")
          .append("anyOf", new ArrayList<>()))
        .append("color", new Document()
          .append("allOf", Arrays.asList("yellow"))
          .append("anyOf", new ArrayList<>()))
        .append("packageSize", 1)
        .append("size", new Document()
          .append("allOf", "Standard")
          .append("anyOf", new ArrayList<>()))
        .append("quantity", 10)
        .append("notes", "N/A")
        .append("type", new Document()
          .append("allOf", "")
          .append("anyOf", new ArrayList<>()))
        .append("material", new Document()
          .append("allOf", "wood")
          .append("anyOf", new ArrayList<>()))
    );
    testSupplyList.add(
      new Document()
        .append("school", "CHS")
        .append("grade", "12th grade")
        .append("item", Arrays.asList("Eraser"))
        .append("brand", new Document()
          .append("allOf", "Pink Pearl")
          .append("anyOf", new ArrayList<>()))
        .append("color", new Document()
          .append("allOf", Arrays.asList("pink"))
          .append("anyOf", new ArrayList<>()))
        .append("packageSize", 1)
        .append("size", new Document()
          .append("allOf", "Small")
          .append("anyOf", new ArrayList<>()))
        .append("quantity", 5)
        .append("notes", "N/A")
        .append("type", new Document()
          .append("allOf", "")
          .append("anyOf", new ArrayList<>()))
        .append("material", new Document()
          .append("allOf", "rubber")
          .append("anyOf", new ArrayList<>()))
    );
    testSupplyList.add(
      new Document()
        .append("school", "MHS")
        .append("grade", "PreK")
        .append("item", Arrays.asList("Notebook"))
        .append("brand", new Document()
          .append("allOf", "Five Star")
          .append("anyOf", new ArrayList<>()))
        .append("color", new Document()
          .append("allOf", Arrays.asList("blue"))
          .append("anyOf", new ArrayList<>()))
        .append("packageSize", 1)
        .append("size", new Document()
          .append("allOf", "N/A")
          .append("anyOf", new ArrayList<>()))
        .append("quantity", 3)
        .append("notes", "N/A")
        .append("type", new Document()
          .append("allOf", "spiral")
          .append("anyOf", new ArrayList<>()))
        .append("material", new Document()
          .append("allOf", "paper")
          .append("anyOf", new ArrayList<>())));

    samsId = new ObjectId();
    Document sam = new Document()
      .append("_id", samsId)
      .append("school", "MHS")
      .append("grade", "PreK")
      .append("item", Arrays.asList("Backpack"))
      .append("brand", new Document()
        .append("allOf", "JanSport")
        .append("anyOf", new ArrayList<>()))
      .append("color", new Document()
        .append("allOf", Arrays.asList("black"))
        .append("anyOf", new ArrayList<>()))
      .append("packageSize", 1)
      .append("size", new Document()
        .append("allOf", "Standard")
        .append("anyOf", new ArrayList<>()))
      .append("quantity", 2)
      .append("notes", "Plain colors only")
      .append("type", new Document()
        .append("allOf", "shoulder bag")
        .append("anyOf", new ArrayList<>()))
      .append("material", new Document()
        .append("allOf", "fabric")
        .append("anyOf", new ArrayList<>()));

    supplylistDocuments.insertMany(testSupplyList);
    supplylistDocuments.insertOne(sam);

    supplylistController = new SupplyListController(db);
  }

  @Test
  void canGetAllSupplyList() {
    when(ctx.queryParamMap()).thenReturn(Collections.emptyMap());

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(
      db.getCollection("supplylist").countDocuments(),
      supplylistArrayCaptor.getValue().size());
  }

  @Test
  void getListWithExistentId() {
    String id = samsId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    supplylistController.getList(ctx);

    verify(ctx).json(supplylistCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertTrue(supplylistCaptor.getValue().item.contains("Backpack"));
    assertEquals(samsId.toHexString(), supplylistCaptor.getValue()._id);
  }

  @Test
  void getListWithBadId() {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.getList(ctx);
    });

    assertEquals("The requested supply list id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void getListWithNonexistentId() {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      supplylistController.getList(ctx);
    });

    assertEquals("The requested supply list item was not found", exception.getMessage());
  }

  // If someone tries to filter by a quantity that isn’t a number,
  // the controller should reject it instead of ignoring it or crashing.
  @Test
  void getSupplyListsRejectsNonIntegerQuantity() {
    when(ctx.queryParamMap()).thenReturn(Map.of("quantity", List.of("notAnInt")));
    when(ctx.queryParam("quantity")).thenReturn("notAnInt");

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.getSupplyLists(ctx);
    });

    assertEquals("quantity must be an integer.", ex.getMessage());
  }

  // The following few test checks that filtering works even if the user types the
  // value with weird capitalization. The controller should treat “pEnCiL” the
  // same as “pencil” and return the correct matching items.
  @Test
  void canFilterSupplyListByItemCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("item", List.of("pEnCiL")));
    when(ctx.queryParam("item")).thenReturn("pEnCiL");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).item.contains("Pencil"));
  }

  @Test
  void canFilterSupplyListByBrandCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("brand", List.of("tIcOnDeRoGa")));
    when(ctx.queryParam("brand")).thenReturn("tIcOnDeRoGa");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).brand.allOf.contains("Ticonderoga"));
  }

  @Test
  void canFilterSupplyListByColorCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("color", List.of("yElLoW")));
    when(ctx.queryParam("color")).thenReturn("yElLoW");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).color.allOf.contains("yellow"));
  }

  @Test
  void canFilterSupplyListBySizeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("size", List.of("sTaNdArD")));
    when(ctx.queryParam("size")).thenReturn("sTaNdArD");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(2, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().stream().allMatch(s -> "Standard".equals(s.size.allOf)));
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
    assertTrue(supplylistArrayCaptor.getValue().get(0).material.allOf.contains("wood"));
  }

  @Test
  void canFilterSupplyListByTypeCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("type", List.of("shoulder bag")));
    when(ctx.queryParam("type")).thenReturn("shoulder bag");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).type.allOf.contains("shoulder bag"));
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

  // The following test checks that multiple tags can be inserted in a filter
  @Test
  void canFilterSupplyListByItemMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("item", List.of("pEnCiL, Notebook")));
    when(ctx.queryParam("item")).thenReturn("pEnCiL, Notebook");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(2, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).item.contains("Pencil"));
    assertTrue(supplylistArrayCaptor.getValue().get(1).item.contains("Notebook"));
  }

  @Test
  void canFilterSupplyListByBrandMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("brand", List.of("tIcOnDeRoGa, Pink Pearl")));
    when(ctx.queryParam("brand")).thenReturn("tIcOnDeRoGa, Pink Pearl");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(2, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).brand.allOf.contains("Ticonderoga"));
    assertTrue(supplylistArrayCaptor.getValue().get(1).brand.allOf.contains("Pink Pearl"));
  }

  @Test
  void canFilterSupplyListByColorMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("color", List.of("yElLoW, Blue, Pink")));
    when(ctx.queryParam("color")).thenReturn("yElLoW, Blue, Pink");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(3, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).color.allOf.contains("yellow"));
    assertTrue(supplylistArrayCaptor.getValue().get(1).color.allOf.contains("pink"));
    assertTrue(supplylistArrayCaptor.getValue().get(2).color.allOf.contains("blue"));
  }

  @Test
  void canFilterSupplyListBySizeMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("size", List.of("sTaNdArD, Small")));
    when(ctx.queryParam("size")).thenReturn("sTaNdArD, Small");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(3, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().stream().anyMatch(s -> "Small".equals(s.size.allOf)));
    assertTrue(supplylistArrayCaptor.getValue().stream().anyMatch(s -> "Standard".equals(s.size.allOf)));
  }

  @Test
  void canFilterSupplyListByMaterialMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("material", List.of("wood, paper")));
    when(ctx.queryParam("material")).thenReturn("wood, paper");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(2, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().get(0).material.allOf.contains("wood"));
    assertTrue(supplylistArrayCaptor.getValue().get(1).material.allOf.contains("paper"));
  }

  @Test
  void canFilterSupplyListByTypeMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("type", List.of("bag, spiral")));
    when(ctx.queryParam("type")).thenReturn("bag, spiral");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(2, supplylistArrayCaptor.getValue().size());
    assertTrue(supplylistArrayCaptor.getValue().stream().anyMatch(s -> s.type.allOf.contains("spiral")));
    assertTrue(supplylistArrayCaptor.getValue().stream().anyMatch(s -> s.type.allOf.contains("shoulder bag")));
  }

  @Test
  void canFilterSupplyListBySchoolMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("school", List.of("MHS, CHS")));
    when(ctx.queryParam("school")).thenReturn("MHS, CHS");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(4, supplylistArrayCaptor.getValue().size());
    assertEquals("MHS", supplylistArrayCaptor.getValue().get(0).school);
    assertEquals("CHS", supplylistArrayCaptor.getValue().get(1).school);
  }

  @Test
  void canFilterSupplyListByGradeMultipleCaseInsensitive() {
    when(ctx.queryParamMap()).thenReturn(Map.of("grade", List.of("PreK, 12th grade")));
    when(ctx.queryParam("grade")).thenReturn("PreK, 12th grade");
    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(4, supplylistArrayCaptor.getValue().size());
    assertEquals("PreK", supplylistArrayCaptor.getValue().get(0).grade);
    assertEquals("12th grade", supplylistArrayCaptor.getValue().get(1).grade);

  }

  @Test
  void addSupplyItemSuccessfully() {
    String newSupplyList = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Marker"],
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 1,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": 10,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(newSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            newSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(newSupplyList, SupplyList.class)
          ));

    supplylistController.addSupplyList(ctx);

    verify(ctx).status(HttpStatus.CREATED);
  }

  @Test
  void addSupplyWithEmptyString() {
    String invalidSupplyList = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Marker"],
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 1,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": -5,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(invalidSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            invalidSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(invalidSupplyList, SupplyList.class)
          ));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.addSupplyList(ctx);
    });

    assertTrue(exception.getErrors().get("REQUEST_BODY")
    .get(0).toString().contains("quantity must be null or a positive integer"));
  }

  @Test
  void addSupplyItemWithInvalidCount() {
    String invalidSupplyList = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Marker"],
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 0,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": 10,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(invalidSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            invalidSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(invalidSupplyList, SupplyList.class)
          ));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.addSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("packageSize"))
    );
  }

  @Test
  void addSupplyItemWithMissingItemName() {
    String invalidSupplyList = """
        {
          "school": "MHS",
          "grade": "PreK",
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 1,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": 10,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(invalidSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            invalidSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(invalidSupplyList, SupplyList.class)
          ));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.addSupplyList(ctx);
    });

    assertTrue(exception.getErrors().get("REQUEST_BODY").get(0).toString().contains("item must be a non-empty list"));
  }

  @Test
  void addSupplyItemWithMissingSchool() {
    String invalidSupplyList = """
        {
          "grade": "PreK",
          "item": ["Marker"],
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 1,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": 10,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(invalidSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            invalidSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(invalidSupplyList, SupplyList.class)
          ));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.addSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("school"))
    );
  }

  @Test
  void addSupplyItemWithMissingGrade() {
    String invalidSupplyList = """
        {
          "school": "MHS",
          "item": ["Marker"],
          "brand": {"allOf": "", "anyOf": ["Crayola"]},
          "color": {"allOf": [], "anyOf": ["red"]},
          "packageSize": 1,
          "size": {"allOf": "N/A", "anyOf": []},
          "quantity": 10,
          "notes": "N/A",
          "type": {"allOf": "dry erase", "anyOf": []},
          "material": {"allOf": "plastic", "anyOf": []}
        }
        """;

    when(ctx.body()).thenReturn(invalidSupplyList);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            invalidSupplyList,
            SupplyList.class,
              () -> javalinJackson.fromJsonString(invalidSupplyList, SupplyList.class)
          ));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.addSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("grade"))
    );
  }

  @Test
  void deleteSupplyListWithExistentId() throws IOException {
    String id = samsId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    supplylistController.deleteSupplyList(ctx);

    verify(ctx).status(HttpStatus.NO_CONTENT);
  }

  @Test
  void deleteSupplyListWithBadId() throws IOException {
    when(ctx.pathParam("id")).thenReturn("bad");

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.deleteSupplyList(ctx);
    });

    assertEquals("The requested supply list id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void deleteSupplyListWithNonexistentId() throws IOException {
    String id = "588935f5c668650dc77df581";
    when(ctx.pathParam("id")).thenReturn(id);

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      supplylistController.deleteSupplyList(ctx);
    });

    assertEquals("The requested supply list item was not found", exception.getMessage());
  }

  @Test
  void deleteSupplyListActuallyDeletes() throws IOException {
    String id = samsId.toHexString();
    when(ctx.pathParam("id")).thenReturn(id);

    supplylistController.deleteSupplyList(ctx);

    verify(ctx).status(HttpStatus.NO_CONTENT);

    // Make sure the item is actually gone from the database
    when(ctx.pathParam("id")).thenReturn(id);
    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      supplylistController.getList(ctx);
    });

    assertEquals("The requested supply list item was not found", exception.getMessage());
  }


  // Makes sure the controller actually registers its routes with Javalin.
  // If someone accidentally removes or renames a route, this test will catch it.
  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    supplylistController.addRoutes(mockServer);
    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
  }

  @Test
  void canFilterSupplyListByCount() {
    when(ctx.queryParamMap()).thenReturn(Map.of("packageSize", List.of("1")));
    when(ctx.queryParam("packageSize")).thenReturn("1");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertTrue(supplylistArrayCaptor.getValue().size() > 0);
    assertEquals(1, supplylistArrayCaptor.getValue().get(0).packageSize);
  }

  @Test
  void getSupplyListsRejectsNonIntegerCount() {
    when(ctx.queryParamMap()).thenReturn(Map.of("packageSize", List.of("notAnInt")));
    when(ctx.queryParam("packageSize")).thenReturn("notAnInt");

    BadRequestResponse ex = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.getSupplyLists(ctx);
    });

    assertEquals("packageSize must be an integer.", ex.getMessage());
  }

  @Test
  void canFilterSupplyListByTeacher() {
    // Insert a doc with a teacher field
    db.getCollection("supplylist").insertOne(
        new Document()
            .append("school", "MHS")
            .append("grade", "PreK")
            .append("teacher", "Smith")
            .append("item", Arrays.asList("Ruler"))
            .append("brand", new Document()
              .append("allOf", "Westcott")
              .append("anyOf", new ArrayList<>()))
            .append("color", new Document()
              .append("allOf", Arrays.asList("clear"))
              .append("anyOf", new ArrayList<>()))
            .append("packageSize", 1)
            .append("size", new Document()
              .append("allOf", "12 inch")
              .append("anyOf", new ArrayList<>()))
            .append("quantity", 1)
            .append("notes", "N/A")
            .append("type", new Document()
              .append("allOf", "")
              .append("anyOf", new ArrayList<>()))
            .append("material", new Document()
              .append("allOf", "plastic")
              .append("anyOf", new ArrayList<>())));

    when(ctx.queryParamMap()).thenReturn(Map.of("teacher", List.of("Smith")));
    when(ctx.queryParam("teacher")).thenReturn("Smith");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
  }

  @Test
  void canFilterSupplyListByAcademicYear() {
    db.getCollection("supplylist").insertOne(
        new Document()
            .append("school", "MHS")
            .append("grade", "PreK")
            .append("academicYear", "2025-2026")
            .append("item", Arrays.asList("Scissors"))
            .append("brand", new Document()
                .append("allOf", "Fiskars")
                .append("anyOf", new ArrayList<>()))
            .append("color", new Document()
                .append("allOf", Arrays.asList("orange"))
                .append("anyOf", new ArrayList<>()))
            .append("packageSize", 1)
            .append("size", new Document()
                .append("allOf", "5 inch")
                .append("anyOf", new ArrayList<>()))
            .append("quantity", 1)
            .append("notes", "N/A")
            .append("type", new Document()
                .append("allOf", "")
                .append("anyOf", new ArrayList<>()))
            .append("material", new Document()
              .append("allOf", "metal")
              .append("anyOf", new ArrayList<>())));

    when(ctx.queryParamMap()).thenReturn(Map.of("academicYear", List.of("2025-2026")));
    when(ctx.queryParam("academicYear")).thenReturn("2025-2026");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertEquals(1, supplylistArrayCaptor.getValue().size());
  }

  @Test
  void canFilterSupplyListByQuantity() {
    when(ctx.queryParamMap()).thenReturn(Map.of("quantity", List.of("10")));
    when(ctx.queryParam("quantity")).thenReturn("10");

    supplylistController.getSupplyLists(ctx);

    verify(ctx).json(supplylistArrayCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertTrue(supplylistArrayCaptor.getValue().size() > 0);
  }

  // ---- editSupplyList ----

  @Test
  void editSupplyListWithValidId() throws IOException {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["red"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 3,
          "notes": "Updated notes",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    supplylistController.editSupplyList(ctx);

    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void editSupplyListWithMissingSchool() {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 2,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("school"))
    );
  }

  @Test
  void editSupplyListWithBlankSchool() {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "   ",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 2,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("school"))
    );
  }

  @Test
  void editSupplyListAllowsNullCountAndQuantity() {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": null,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": null,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    supplylistController.editSupplyList(ctx);

    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void editSupplyListWithInvalidCount() {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 0,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 2,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("packageSize"))
    );
  }

  @Test
  void editSupplyListWithInvalidQuantity() {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 0,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    ValidationException exception = assertThrows(ValidationException.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertTrue(
      exception.getErrors()
        .get("REQUEST_BODY")
        .stream()
        .anyMatch(err -> err.toString().contains("quantity"))
    );
  }

  @Test
  void editSupplyListWithBadId() {
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 2,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn("bad");
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    Throwable exception = assertThrows(BadRequestResponse.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertEquals("The requested supply list id wasn't a legal Mongo Object ID.", exception.getMessage());
  }

  @Test
  void editSupplyListWithNonexistentId() {
    String id = "588935f5c668650dc77df581";
    String updatedJson = """
        {
          "school": "MHS",
          "grade": "PreK",
          "item": ["Backpack"],
          "brand": {"allOf": "JanSport", "anyOf": []},
          "color": {"allOf": ["black"], "anyOf": []},
          "packageSize": 1,
          "size": {"allOf": "Standard", "anyOf": []},
          "quantity": 2,
          "notes": "N/A",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "fabric", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    Throwable exception = assertThrows(NotFoundResponse.class, () -> {
      supplylistController.editSupplyList(ctx);
    });

    assertEquals("The requested supply list item was not found", exception.getMessage());
  }

  @Test
  void editSupplyListActuallyUpdatesItem() throws IOException {
    String id = samsId.toHexString();
    String updatedJson = """
        {
          "school": "CHS",
          "grade": "5th grade",
          "item": ["Backpack"],
          "brand": {"allOf": "Nike", "anyOf": []},
          "color": {"allOf": ["blue"], "anyOf": []},
          "packageSize": 2,
          "size": {"allOf": "Large", "anyOf": []},
          "quantity": 5,
          "notes": "No wheels",
          "type": {"allOf": "shoulder bag", "anyOf": []},
          "material": {"allOf": "nylon", "anyOf": []}
        }
        """;

    when(ctx.pathParam("id")).thenReturn(id);
    when(ctx.bodyValidator(SupplyList.class))
        .thenReturn(new BodyValidator<SupplyList>(
            updatedJson,
            SupplyList.class,
            () -> javalinJackson.fromJsonString(updatedJson, SupplyList.class)));

    supplylistController.editSupplyList(ctx);
    verify(ctx).status(HttpStatus.OK);

    // Confirm the update persisted in the database
    when(ctx.pathParam("id")).thenReturn(id);
    supplylistController.getList(ctx);
    verify(ctx).json(supplylistCaptor.capture());
    assertEquals("CHS", supplylistCaptor.getValue().school);
    assertEquals("5th grade", supplylistCaptor.getValue().grade);
  }
}
