// Package
package umm3601.Settings;

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
import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// Misc Imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;

/**
 * Controller for the singleton app settings document.
 *
 * Routes:
 *  - GET  /api/settings                     â†’ returns the full settings document
 *  - PATCH /api/settings/schools            â†’ replaces the schools list
 *  - PATCH /api/settings/timeAvailability   â†’ replaces the time availability labels
 *  - PATCH /api/settings/availableSpots     â†’ replaces the availableSpots integer
 *
 * Patching by section prevents one tab from overwriting another's changes.
 * All patch operations use upsert so the document is created on first write.
 */
public class SettingsController {

  // The fixed _id used for the singleton settings document
  public static final String SETTINGS_ID = "app-settings";

  private static final String API_SETTINGS = "/api/settings";
  private static final String API_SETTINGS_SCHOOLS = "/api/settings/schools";
  private static final String API_SETTINGS_TIME = "/api/settings/timeAvailability";
  private static final String API_SETTINGS_SUPPLY_ORDER = "/api/settings/supplyOrder";
  private static final String API_SETTINGS_AVAILABLE_SPOTS = "/api/settings/availableSpots";
  private static final String API_SETTINGS_BARCODE_PRINT_WARNING_LIMIT = "/api/settings/barcodePrintWarningLimit";

  private static final int DEFAULT_AVAILABLE_SPOTS = 5;
  private static final int DEFAULT_BARCODE_PRINT_WARNING_LIMIT = 25;

  private static final String API_SETTINGS_DRIVE_DAY = "/api/settings/driveDay";

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
  @Route(method = HttpMethod.GET, path = API_SETTINGS)
  @RequirePermission("view_settings")
  public void getSettings(Context ctx) {
    Settings settings = getSettingsDocument();
    ctx.json(settings);
    ctx.status(HttpStatus.OK);
  }

  public Settings getSettingsDocument() {
    Settings settings = settingsCollection.find(eq("_id", SETTINGS_ID)).first();
    if (settings == null) {
      settings = new Settings();
      settings._id = SETTINGS_ID;
      settings.schools = new ArrayList<>();
      settings.timeAvailability = new Settings.TimeAvailabilityLabels();
      settings.availableSpots = DEFAULT_AVAILABLE_SPOTS;
      settings.barcodePrintWarningLimit = DEFAULT_BARCODE_PRINT_WARNING_LIMIT;
      settings.supplyOrder = new ArrayList<>();
    } else if (settings.supplyOrder == null) {
      settings.supplyOrder = new ArrayList<>();
    }
    if (settings.barcodePrintWarningLimit < 1) {
      settings.barcodePrintWarningLimit = DEFAULT_BARCODE_PRINT_WARNING_LIMIT;
    }
    ctx.json(settings);
    ctx.status(HttpStatus.OK);
  }

  /**
   * PATCH /api/settings/schools
   * Replaces the schools list. Body: { "schools": [{ "name": "...", "abbreviation": "..." }] }
   */
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_SCHOOLS)
  @RequirePermission("edit_schools")
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
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_SUPPLY_ORDER)
  @RequirePermission("edit_supply_order")
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
   * Body: { "earlyMorning": "8:00â€“9:00 AM", "lateMorning": "...", ... }
   */
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_TIME)
  @RequirePermission("edit_time_availability")
  public void updateTimeAvailability(Context ctx) {

    Document taDoc = new Document()
        .append("earlyMorning", ctx.formParam("earlyMorning"))
        .append("lateMorning", ctx.formParam("lateMorning"))
        .append("earlyAfternoon", ctx.formParam("earlyAfternoon"))
        .append("lateAfternoon", ctx.formParam("lateAfternoon"));

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("timeAvailability", taDoc)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_AVAILABLE_SPOTS)
  @RequirePermission("edit_available_spots")
  public void updateSpotAvailability(Context ctx) {
    Settings body = ctx.bodyAsClass(Settings.class);

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("availableSpots", body.availableSpots)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }
  
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_DRIVE_DAY)
  @RequirePermission("edit_drive_day")
  public void updateDriveDay(Context ctx) {
    Settings.DriveDay body = ctx.bodyAsClass(Settings.DriveDay.class);

    Document driveDayDoc = new Document()
        .append("date", body.date)
        .append("location", body.location);

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("driveDay", driveDayDoc)),
        new UpdateOptions().upsert(true));

      ctx.status(HttpStatus.OK);
    }
    
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_BARCODE_PRINT_WARNING_LIMIT)
  @RequirePermission("edit_barcode_print_limit")
  public void updateBarcodePrintWarningLimit(Context ctx) {
    Settings body = ctx.bodyAsClass(Settings.class);

    if (body.barcodePrintWarningLimit < 1) {
      throw new BadRequestResponse("barcodePrintWarningLimit must be at least 1.");
    }

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("barcodePrintWarningLimit", body.barcodePrintWarningLimit)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }
}
