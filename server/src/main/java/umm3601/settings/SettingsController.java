// Package
package umm3601.settings;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

// Java Imports
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.UpdateOptions;

// IO Imports
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// Misc Imports
import umm3601.Controller;

/**
 * Controller for the singleton app settings document.
 *
 * Routes:
 *  - GET  /api/settings                     → returns the full settings document
 *  - PATCH /api/settings/schools            → replaces the schools list
 *  - PATCH /api/settings/timeAvailability   → replaces the time availability labels
 *
 * Patching by section prevents one tab from overwriting another's changes.
 * All patch operations use upsert so the document is created on first write.
 */
public class SettingsController implements Controller {

  // The fixed _id used for the singleton settings document
  public static final String SETTINGS_ID = "app-settings";

  private static final String API_SETTINGS = "/api/settings";
  private static final String API_SETTINGS_SCHOOLS = "/api/settings/schools";
  private static final String API_SETTINGS_TIME = "/api/settings/timeAvailability";
  private static final String API_SETTINGS_SUPPLY_ORDER = "/api/settings/supplyOrder";

  private final JacksonMongoCollection<Settings> settingsCollection;

  public SettingsController(MongoDatabase database) {
    settingsCollection = JacksonMongoCollection.builder().build(
        database,
        "settings",
        Settings.class,
        UuidRepresentation.STANDARD);
  }

  /**
   * GET /api/settings
   * Returns the settings document, or a safe default if none exists yet.
   */
  public void getSettings(Context ctx) {
    Settings settings = settingsCollection.find(eq("_id", SETTINGS_ID)).first();
    if (settings == null) {
      settings = new Settings();
      settings._id = SETTINGS_ID;
      settings.schools = new ArrayList<>();
      settings.timeAvailability = new Settings.TimeAvailabilityLabels();
      settings.supplyOrder = new ArrayList<>();
    } else if (settings.supplyOrder == null) {
      settings.supplyOrder = new ArrayList<>();
    }
    ctx.json(settings);
    ctx.status(HttpStatus.OK);
  }

  /**
   * PATCH /api/settings/schools
   * Replaces the schools list. Body: { "schools": [{ "name": "...", "abbreviation": "..." }] }
   */
  public void updateSchools(Context ctx) {
    Settings body = ctx.bodyAsClass(Settings.class);
    if (body.schools == null) {
      throw new BadRequestResponse("Request body must include a 'schools' array.");
    }

    // Convert to plain BSON Documents to avoid codec issues with nested POJOs in updates
    List<Document> schoolDocs = body.schools.stream()
        .map(s -> new Document("name", s.name).append("abbreviation", s.abbreviation))
        .collect(Collectors.toList());

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("schools", schoolDocs)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  /**
   * PATCH /api/settings/supplyOrder
   * Replaces the supply item ordering used when generating checklists.
   * Body: { "supplyOrder": [{ "supplyId": "...", "status": "staged|unstaged|notGiven" }] }
   */
  public void updateSupplyOrder(Context ctx) {
    // Validate request body
    Settings body = ctx.bodyAsClass(Settings.class);
    // supplyOrder is required but can be an empty array
    if (body.supplyOrder == null) {
      throw new BadRequestResponse("Request body must include a 'supplyOrder' array.");
    }

    // Convert to plain BSON Documents
    List<Document> orderDocs = body.supplyOrder.stream()
        // Each entry must have an itemTerm and a valid status
        .map(e -> new Document("itemTerm", e.itemTerm).append("status", e.status))
        .collect(Collectors.toList());

    // Update the supplyOrder field in the settings document
    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("supplyOrder", orderDocs)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  /**
   * PATCH /api/settings/timeAvailability
   * Replaces the time availability labels.
   * Body: { "earlyMorning": "8:00–9:00 AM", "lateMorning": "...", ... }
   */
  public void updateTimeAvailability(Context ctx) {
    Settings.TimeAvailabilityLabels labels = ctx.bodyAsClass(Settings.TimeAvailabilityLabels.class);

    Document taDoc = new Document()
        .append("earlyMorning", labels.earlyMorning)
        .append("lateMorning", labels.lateMorning)
        .append("earlyAfternoon", labels.earlyAfternoon)
        .append("lateAfternoon", labels.lateAfternoon);

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("timeAvailability", taDoc)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_SETTINGS, this::getSettings);
    server.patch(API_SETTINGS_SCHOOLS, this::updateSchools);
    server.patch(API_SETTINGS_TIME, this::updateTimeAvailability);
    server.patch(API_SETTINGS_SUPPLY_ORDER, this::updateSupplyOrder);
  }
}
