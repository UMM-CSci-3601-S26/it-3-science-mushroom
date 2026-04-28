// Packages
package umm3601.settings;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static com.mongodb.client.model.Filters.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

// Java Imports
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
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
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.json.JavalinJackson;

/**
 * Tests for the SettingsController using a real MongoDB "test" database.
 *
 * These tests make sure the controller behaves the way the rest of the app
 * expects it to. They cover:
 * -
 * -
 * -
 * -
 *
 * Each test starts with a clean set of settings documents so results are
 * predictable and easy to understand.
 */

// Tests for the Settings Controller
@SuppressWarnings({ "MagicNumber" })
class SettingsControllerSpec {

  private SettingsController settingsController;
  private ObjectId testSettingsId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  @SuppressWarnings("unused")
  private static JavalinJackson javalinJackson = new JavalinJackson();

  @Mock
  private Context ctx;

  @Mock
  private JacksonMongoCollection<Settings> mockCollection;

  @Captor
  private ArgumentCaptor<ArrayList<Settings>> settingsArrayListCaptor;

  @Captor
  private ArgumentCaptor<Settings> settingsCaptor;

  @Captor
  private ArgumentCaptor<Map<String, String>> mapCaptor;

  @Captor
  private ArgumentCaptor<Map<String, Object>> dashboardCaptor;

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

  @BeforeEach
  void setupEach() throws IOException {
    MockitoAnnotations.openMocks(this);

    // Setup database
    MongoCollection<Document> settingsDocuments = db.getCollection("settings");
    settingsDocuments.drop();
    List<Document> testSettings = new ArrayList<>();
    testSettings.add(
        new Document()
            .append("school", "MHS")
            .append("grade", "4")
            .append("studentName", "Elmo")
            .append("requestedSupplies", List.of("headphones"))
            .append("settings", List.of(
                new Document()
                    .append("supply", new Document()
                        .append("item", "Pencils")
                        .append("brand", "Ticonderoga")
                        .append("description", "Ticonderoga Pencil"))
                    .append("completed", false)
                    .append("unreceived", false)
                    .append("selectedOption", null))));
    testSettings.add(
        new Document()
            .append("school", "AHS")
            .append("grade", "8")
            .append("studentName", "johnny")
            .append("requestedSupplies", List.of("backpack"))
            .append("settings", List.of(
                new Document()
                    .append("supply", new Document()
                        .append("item", "Notebooks")
                        .append("brand", "Five Star")
                        .append("description", "Five Star Notebook"))
                    .append("completed", false)
                    .append("unreceived", false)
                    .append("selectedOption", null))));
    testSettings.add(
        new Document()
            .append("school", "SHS")
            .append("grade", "2")
            .append("studentName", "Rocco")
            .append("requestedSupplies", List.of(""))
            .append("settings", List.of(
                new Document()
                    .append("supply", new Document()
                        .append("item", "Erasers")
                        .append("brand", "Pink Pearl")
                        .append("description", "Pink Pearl Eraser"))
                    .append("completed", false)
                    .append("unreceived", false)
                    .append("selectedOption", null))));

    testSettingsId = new ObjectId();

    Document specialSettings = new Document()
        .append("_id", testSettingsId)
        .append("school", "Nowhere")
        .append("grade", "12")
        .append("studentName", "bart")
        .append("requestedSupplies", List.of())
        .append("settings", List.of(
            new Document()
                .append("supply", new Document()
                    .append("item", "Markers")
                    .append("brand", "Crayola")
                    .append("description", "Crayola Markers"))
                .append("completed", false)
                .append("unreceived", false)
                .append("selectedOption", null)));

    settingsDocuments.insertMany(testSettings);
    settingsDocuments.insertOne(specialSettings);

    settingsController = new SettingsController(db);
  }

  @SuppressWarnings("unchecked")
  @Test
  void getSettingsReturnsDefaultWhenNoneExists() {
    FindIterable<Settings> mockFind = mock(FindIterable.class);

    when(mockCollection.find(eq("_id", SettingsController.SETTINGS_ID)))
        .thenReturn(mockFind);
    when(mockFind.first()).thenReturn(null);

    settingsController.getSettings(ctx);

    settingsCaptor = ArgumentCaptor.forClass(Settings.class);
    verify(ctx).json(settingsCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Settings returned = settingsCaptor.getValue();
    assertEquals(SettingsController.SETTINGS_ID, returned._id);
    assertNotNull(returned.schools);
    assertNotNull(returned.timeAvailability);
  }

  // Checks that the controller actually registers all its routes with Javalin.
  // If someone removes or renames a route by accident, this test will catch it.
  @Test
  void addsRoutes() {
    Javalin mockServer = mock(Javalin.class);
    settingsController.addRoutes(mockServer);

    verify(mockServer, Mockito.atLeast(1)).get(any(), any());
    verify(mockServer, atLeastOnce()).patch(any(), any());
    verify(mockServer, never()).post(any(), any()); // never use post so we confirm this
  }

  @Test
  void updateSchoolsThrowsOnMissingSchools() {
    Settings body = new Settings();
    body.schools = null; // Simulate missing schools
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);
    boolean threw = false;
    try {
      settingsController.updateSchools(ctx);
    } catch (io.javalin.http.BadRequestResponse e) {
      threw = true;
      assertEquals("Request body must include a 'schools' array.", e.getMessage());
    }
    assertTrue(threw);
  }

  @Test
  void updateSchoolsUpdatesSchoolsList() {
    Settings body = new Settings();
    Settings.SchoolInfo school = new Settings.SchoolInfo();
    school.name = "Test School";
    school.abbreviation = "TS";
    body.schools = List.of(school);
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSchools(ctx);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateSchoolsWithMultipleSchools() {
    Settings body = new Settings();
    Settings.SchoolInfo s1 = new Settings.SchoolInfo();
    s1.name = "School A";
    s1.abbreviation = "SA";
    Settings.SchoolInfo s2 = new Settings.SchoolInfo();
    s2.name = "School B";
    s2.abbreviation = "SB";
    body.schools = List.of(s1, s2);
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSchools(ctx);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateTimeAvailabilityUpdatesLabels() {
    Settings.TimeAvailabilityLabels labels = new Settings.TimeAvailabilityLabels();
    labels.earlyMorning = "8:00-9:00 AM";
    labels.lateMorning = "9:00-10:00 AM";
    labels.earlyAfternoon = "12:00-1:00 PM";
    labels.lateAfternoon = "2:00-3:00 PM";
    when(ctx.bodyAsClass(Settings.TimeAvailabilityLabels.class)).thenReturn(labels);

    settingsController.updateTimeAvailability(ctx);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateTimeAvailabilityWithNullFields() {
    Settings.TimeAvailabilityLabels labels = new Settings.TimeAvailabilityLabels();
    labels.earlyMorning = null;
    labels.lateMorning = null;
    labels.earlyAfternoon = null;
    labels.lateAfternoon = null;
    when(ctx.bodyAsClass(Settings.TimeAvailabilityLabels.class)).thenReturn(labels);

    settingsController.updateTimeAvailability(ctx);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void getSettingsReturnsExistingWhenPresent() {
    db.getCollection("settings").drop();
    db.getCollection("settings").insertOne(
      new Document("_id", SettingsController.SETTINGS_ID)
        .append("schools", List.of())
        .append("timeAvailability", new Document()));

    settingsController.getSettings(ctx);

    settingsCaptor = ArgumentCaptor.forClass(Settings.class);
    verify(ctx).json(settingsCaptor.capture());
    verify(ctx).status(HttpStatus.OK);
    assertEquals(SettingsController.SETTINGS_ID, settingsCaptor.getValue()._id);
  }

  // ---- updateSupplyOrder tests ----

  @Test
  void updateSupplyOrderWithValidBodyReturnsOK() {
    Settings.SupplyItemOrder entry = new Settings.SupplyItemOrder();
    entry.itemTerm = "notebook";
    entry.status = "staged";

    Settings body = new Settings();
    body.supplyOrder = List.of(entry);
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSupplyOrder(ctx);

    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateSupplyOrderWithNullSupplyOrderThrowsBadRequest() {
    Settings body = new Settings();
    body.supplyOrder = null;
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    boolean threw = false;
    try {
      settingsController.updateSupplyOrder(ctx);
    } catch (io.javalin.http.BadRequestResponse e) {
      threw = true;
      assertEquals("Request body must include a 'supplyOrder' array.", e.getMessage());
    }
    assertTrue(threw);
  }

  @Test
  void updateSupplyOrderWithEmptyArrayReturnsOK() {
    Settings body = new Settings();
    body.supplyOrder = List.of();
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSupplyOrder(ctx);

    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void updateSupplyOrderPersistsAndIsRetrievable() {
    // Drop and seed the real settings document
    db.getCollection("settings").drop();
    db.getCollection("settings").insertOne(
        new Document("_id", SettingsController.SETTINGS_ID)
            .append("schools", List.of())
            .append("timeAvailability", new Document()));
    Settings.SupplyItemOrder entry = new Settings.SupplyItemOrder();
    entry.itemTerm = "folder";
    entry.status = "unstaged";

    Settings body = new Settings();
    body.supplyOrder = List.of(entry);
    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSupplyOrder(ctx);
    verify(ctx).status(HttpStatus.OK);

    // Now GET settings and confirm the order is persisted
    settingsController.getSettings(ctx);
    settingsCaptor = ArgumentCaptor.forClass(Settings.class);
    verify(ctx).json(settingsCaptor.capture());

    Settings saved = settingsCaptor.getValue();
    assertEquals(1, saved.supplyOrder.size());
    assertEquals("folder", saved.supplyOrder.get(0).itemTerm);
    assertEquals("unstaged", saved.supplyOrder.get(0).status);
  }

  @Test
  void getSettingsMissingSupplyOrderDefaultsToEmpty() {
    // Insert a document without supplyOrder
    db.getCollection("settings").drop();
    db.getCollection("settings").insertOne(
        new Document("_id", SettingsController.SETTINGS_ID)
            .append("schools", List.of())
            .append("timeAvailability", new Document()));

    settingsController.getSettings(ctx);

    settingsCaptor = ArgumentCaptor.forClass(Settings.class);
    verify(ctx).json(settingsCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    assertNotNull(settingsCaptor.getValue().supplyOrder);
    assertEquals(0, settingsCaptor.getValue().supplyOrder.size());
  }

  @Test
  void updateSpotAvailabilityTest() {
    Settings body = new Settings();
    body.availableSpots = 10;

    when(ctx.bodyAsClass(Settings.class)).thenReturn(body);

    settingsController.updateSpotAvailability(ctx);

    assertEquals(body.availableSpots, 10);

    verify(ctx).status(HttpStatus.OK);
  }
}
