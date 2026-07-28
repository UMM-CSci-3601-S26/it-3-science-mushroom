// Package
package umm3601.Settings;

// Static Imports
import static com.mongodb.client.model.Filters.eq;

// Java Imports
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
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
 * Patching by section prevents one tab from overwriting another's changes.
 * All patch operations use upsert so the document is created on first write.
 */
public class SettingsController {

  // The fixed _id used for the singleton settings document
  public static final String SETTINGS_ID = "app-settings";

  private static final String API_SETTINGS = "/api/settings";
  private static final String API_SETTINGS_SCHOOLS = "/api/settings/schools";
  private static final String API_SETTINGS_TIME = "/api/settings/timeAvailability";
  private static final String API_SETTINGS_DEFAULT_SCHEDULE_COLUMNS = "/api/settings/defaultScheduleColumns";
  private static final String API_SETTINGS_SUPPLY_ORDER = "/api/settings/supplyOrder";
  private static final String API_SETTINGS_BARCODE_PRINT_WARNING_LIMIT = "/api/settings/barcodePrintWarningLimit";
  private static final String API_SETTINGS_DRIVE_DAY = "/api/settings/driveDay";

  // Default values for settings fields if the document doesn't exist yet or is missing fields.
  private static final int DEFAULT_BARCODE_PRINT_WARNING_LIMIT = 25;
  private static final int DEFAULT_ENGLISH_FAMILY_COLUMNS = 1;
  private static final int DEFAULT_SPANISH_FAMILY_COLUMNS = 0;
  private static final DateTimeFormatter TIME_SLOT_FORMATTER =
      DateTimeFormatter.ofPattern("h:mm a", Locale.US);

  private final JacksonMongoCollection<Settings> settingsCollection;

  public SettingsController(MongoDatabase database) {
    settingsCollection = JacksonMongoCollection.builder().build(
        database,
        "settings",
        Settings.class,
        UuidRepresentation.STANDARD);
  }

  /**
   * getSettings retrieves the singleton settings document and returns it as JSON. If the document doesn't exist,
   * it returns a new Settings object with default values (except for _id which is set to SETTINGS_ID). The
   * client can use this endpoint to get the current application settings, including the list of schools,
   * time availability labels, schedule column defaults, supply item order, barcode print warning limit, and drive
   * day information.
   * @param ctx
   */
  @Route(method = HttpMethod.GET, path = API_SETTINGS)
  @RequirePermission("view_settings")
  public void getSettings(Context ctx) {
    Settings settings = getSettingsDocument();
    ctx.json(settings);
    ctx.status(HttpStatus.OK);
  }

  // getSettingsDocument is a helper method that retrieves the settings document from the database,
  // applying default values for any missing fields to ensure the returned Settings object is always
  // complete and usable by the client.
  public Settings getSettingsDocument() {
    Settings settings = settingsCollection.find(eq("_id", SETTINGS_ID)).first();
    if (settings == null) {
      settings = new Settings();
      settings._id = SETTINGS_ID;
      settings.schools = new ArrayList<>();
      settings.timeAvailability = new Settings.TimeAvailabilityLabels();
      settings.defaultScheduleColumns = defaultScheduleColumns();
      settings.barcodePrintWarningLimit = DEFAULT_BARCODE_PRINT_WARNING_LIMIT;
      settings.supplyOrder = new ArrayList<>();
    } else if (settings.supplyOrder == null) {
      settings.supplyOrder = new ArrayList<>();
    }
    if (settings.defaultScheduleColumns == null) {
      settings.defaultScheduleColumns = defaultScheduleColumns();
    }
    if (settings.defaultScheduleColumns.englishFamilies < 1) {
      settings.defaultScheduleColumns.englishFamilies = DEFAULT_ENGLISH_FAMILY_COLUMNS;
    }
    if (settings.defaultScheduleColumns.spanishFamilies < 0) {
      settings.defaultScheduleColumns.spanishFamilies = DEFAULT_SPANISH_FAMILY_COLUMNS;
    }
    if (settings.barcodePrintWarningLimit < 1) {
      settings.barcodePrintWarningLimit = DEFAULT_BARCODE_PRINT_WARNING_LIMIT;
    }
    return settings;
  }

  private static Settings.DefaultScheduleColumns defaultScheduleColumns() {
    Settings.DefaultScheduleColumns defaults = new Settings.DefaultScheduleColumns();
    defaults.englishFamilies = DEFAULT_ENGLISH_FAMILY_COLUMNS;
    defaults.spanishFamilies = DEFAULT_SPANISH_FAMILY_COLUMNS;
    return defaults;
  }

  /**
   * updateSchools replaces the list of schools in the settings document with the provided list.
   * The request body must include a 'schools' array, where each entry has a 'name' and 'abbreviation'.
   * This endpoint allows operators to manage the schools that families can select from when filling out their profiles.
   * The method validates the input and updates the settings document in the database, creating it if it doesn't exist.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing or does not include a valid 'schools' array
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
   * updateSupplyOrder replaces the supplyOrder list in the settings document with the provided list.
   * The request body must include a 'supplyOrder' array, where each entry has an 'itemTerm' and 'status'.
   * This endpoint allows operators to manage how supply items are categorized for drive day checklists.
   * The method validates the input and updates the settings document in the database, creating it if it doesn't exist.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing or does not include a valid 'supplyOrder' array
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
   * updateTimeAvailability updates the time availability labels in the settings document with the provided values.
   * The request body must include an object with 'earlyMorning', 'lateMorning', 'earlyAfternoon', and
   * 'lateAfternoon' fields.
   * This endpoint allows operators to configure the human-readable time labels that correspond to the
   * availability slots families select in their profiles. The method validates the input and updates the settings
   * document in the database, creating it if it doesn't exist.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing or does not include all required time availability fields
   */
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_TIME)
  @RequirePermission("edit_time_availability")
  public void updateTimeAvailability(Context ctx) {
    Settings.TimeAvailabilityLabels body = ctx.bodyAsClass(Settings.TimeAvailabilityLabels.class);
    validateTimeAvailabilityLabels(body);

    Document taDoc = new Document()
        .append("earlyMorning", body.earlyMorning)
        .append("lateMorning", body.lateMorning)
        .append("earlyAfternoon", body.earlyAfternoon)
        .append("lateAfternoon", body.lateAfternoon);

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("timeAvailability", taDoc)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  private void validateTimeAvailabilityLabels(Settings.TimeAvailabilityLabels labels) {
    if (labels == null) {
      throw new BadRequestResponse("Request body must include time availability labels.");
    }

    validateTimeSlotLabel(labels.earlyMorning, "earlyMorning");
    validateTimeSlotLabel(labels.lateMorning, "lateMorning");
    validateTimeSlotLabel(labels.earlyAfternoon, "earlyAfternoon");
    validateTimeSlotLabel(labels.lateAfternoon, "lateAfternoon");
  }

  private void validateTimeSlotLabel(String timeSlot, String fieldName) {
    if (timeSlot == null || timeSlot.isBlank()) {
      throw new BadRequestResponse(fieldName + " must be a valid time slot.");
    }

    String[] rangeParts = timeSlot.trim().split("\\s*[-\u2013\u2014]\\s*", 2);
    String endMeridiem = rangeParts.length == 2 ? meridiem(rangeParts[1]) : null;
    String startMeridiem = meridiem(rangeParts[0]);
    if (startMeridiem == null) {
      startMeridiem = endMeridiem;
    }
    if (endMeridiem == null) {
      endMeridiem = startMeridiem;
    }

    LocalTime start = parseTimeSlotPart(rangeParts[0], startMeridiem, fieldName);
    if (rangeParts.length == 1) {
      return;
    }

    LocalTime end = parseTimeSlotPart(rangeParts[1], endMeridiem, fieldName);
    if (!end.isAfter(start)) {
      throw new BadRequestResponse(fieldName + " end time must be after the start time.");
    }
  }

  private LocalTime parseTimeSlotPart(String timeText, String meridiem, String fieldName) {
    if (meridiem == null) {
      throw new BadRequestResponse(fieldName + " must include AM or PM.");
    }

    String cleanedTime = timeText
        .replaceAll("(?i)\\b(AM|PM)\\b", "")
        .trim();

    try {
      return LocalTime.parse(cleanedTime + " " + meridiem, TIME_SLOT_FORMATTER);
    } catch (DateTimeParseException exception) {
      throw new BadRequestResponse(fieldName + " contains an invalid time.");
    }
  }

  private String meridiem(String timeText) {
    java.util.regex.Matcher matcher = Pattern.compile("(?i)\\b(AM|PM)\\b").matcher(timeText);
    String result = null;
    while (matcher.find()) {
      result = matcher.group(1).toUpperCase(Locale.US);
    }
    return result;
  }

  /**
   * updateDefaultScheduleColumns updates the default schedule column counts used when a new family schedule is made.
   * The request body must include 'englishFamilies' and 'spanishFamilies' count fields.
   * @param ctx
   * @throws BadRequestResponse if either column count is outside the supported range
   */
  @Route(method = HttpMethod.PATCH, path = API_SETTINGS_DEFAULT_SCHEDULE_COLUMNS)
  @RequirePermission("edit_time_availability")
  public void updateDefaultScheduleColumns(Context ctx) {
    Settings.DefaultScheduleColumns body = ctx.bodyAsClass(Settings.DefaultScheduleColumns.class);
    validateDefaultScheduleColumns(body);

    Document defaultScheduleColumnsDoc = new Document()
        .append("englishFamilies", body.englishFamilies)
        .append("spanishFamilies", body.spanishFamilies);

    settingsCollection.updateOne(
        eq("_id", SETTINGS_ID),
        new Document("$set", new Document("defaultScheduleColumns", defaultScheduleColumnsDoc)),
        new UpdateOptions().upsert(true));

    ctx.status(HttpStatus.OK);
  }

  private void validateDefaultScheduleColumns(Settings.DefaultScheduleColumns defaultScheduleColumns) {
    if (defaultScheduleColumns == null) {
      throw new BadRequestResponse("Request body must include default schedule columns.");
    }
    if (defaultScheduleColumns.englishFamilies < 1) {
      throw new BadRequestResponse("englishFamilies must be at least 1.");
    }
    if (defaultScheduleColumns.spanishFamilies < 0) {
      throw new BadRequestResponse("spanishFamilies must be at least 0.");
    }
  }

  /**
   * updateDriveDay updates the drive day information in the settings document with the provided date and location.
   * The request body must include a 'date' field (in ISO format) and a 'location' field (string).
   * This endpoint allows operators to set the date and location for the upcoming drive day, which can be displayed to
   * families in the portal. The method validates the input and updates the settings document in the database,
   * creating it if it doesn't exist.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing or does not include valid 'date' and 'location' fields
   */
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

  /**
   * updateBarcodePrintWarningLimit updates the barcode print warning limit in the settings document.
   * The request body must include a 'barcodePrintWarningLimit' field with a positive integer value.
   * This endpoint allows operators to set a threshold for how many barcode labels can be printed for a single
   * item before a warning is shown, helping to prevent excessive printing.
   * The method validates the input and updates the settings document in the database, creating it if it doesn't exist.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing or does not include a valid
   *                            'barcodePrintWarningLimit' value
   */
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
