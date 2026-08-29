// Packages /
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;
import static com.mongodb.client.model.Updates.unset;
import static umm3601.Family.ChecklistItemRules.hasText;

// Java Imports
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.locks.ReentrantLock;
import java.util.regex.Pattern;

// Org Imports
import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.conversions.Bson;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

// Com Imports
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Filters;
import com.mongodb.client.model.UpdateOneModel;
import com.mongodb.client.model.Updates;
import com.mongodb.client.model.WriteModel;
import com.mongodb.client.result.DeleteResult;

// IO Imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// Misc Imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Role;
import umm3601.Auth.Route;
import umm3601.Common.AuthContext;
import umm3601.Common.InventoryMatcher;
import umm3601.Settings.Settings;
import umm3601.Users.Users;

/* FamilyController Contains the Following:
- getFamilies()
- getFamily() /By ID/
- addNewFamily()
- updateFamily() /By ID/
- deleteFamily() /By ID/
- getDashboardStats() /Has its own API/
- exportFamiliesAsCSV()
*/

// Controller
public class FamilyController {
  // API Endpoints
  private static final String API_FAMILY = "/api/family";
  private static final String API_SCHEDULE_FAMILIES = "/api/family/schedule";
  private static final String API_CLEAR_SCHEDULED_TIMES = "/api/family/schedule/clear";
  private static final String API_DASHBOARD = "/api/dashboard";
  private static final String API_FAMILY_BY_ID = "/api/family/{id}";
  private static final String API_FAMILY_EXPORT = "/api/family/export";
  private static final String API_FAMILY_HELPED = "/api/family/{id}/helped";
  private static final String API_FAMILY_STATUS = "/api/family/{id}/status";
  private static final String API_FAMILY_NEEDED_ITEM_LOGS = "/api/family/needed-item-logs";
  private static final String API_FAMILY_CHECKLIST = "/api/family/{id}/checklist";
  private static final String API_FAMILY_CURRENT_CHECKLIST = "/api/family/{id}/current-checklist";
  private static final String API_FAMILY_FINALIZED_CHECKLIST = "/api/family/{id}/finalized-checklist";
  private static final String API_FAMILY_HELP_SESSION = "/api/family/{id}/help-session";
  private static final String API_FAMILY_HELP_SESSION_START = "/api/family/{id}/help-session/start";
  private static final String API_FAMILY_HELP_SESSION_SAVE_CHILD = "/api/family/{id}/help-session/save-child";
  private static final String API_FAMILY_HELP_SESSION_SAVE_ALL = "/api/family/{id}/help-session/save-all";
  private static final String API_FAMILY_HELP_SESSION_CLEAR = "/api/family/{id}/help-session/clear";
  private static final String API_FAMILY_HELP_SESSION_REVERT = "/api/family/{id}/help-session/revert";
  private static final String API_FAMILY_GUARDIAN_LINK = "/api/family/{id}/guardian-link";
  private static final String STATUS_HELPED = "helped";
  private static final String STATUS_NOT_HELPED = "not_helped";
  private static final String STATUS_BEING_HELPED = "being_helped";

  // Regex
  public static final String EMAIL_REGEX = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

  // Filter key
  static final String FAMILY_KEY = "guardianName";
  static final String FIRST_NAME_KEY = "guardianFirstName";
  static final String LAST_NAME_KEY = "guardianLastName";
  static final String STATUS_KEY = "status";
  static final String HELPED_KEY = "helped";
  private static final String API_FAMILY_DELETE_REQUEST = "/api/family/{id}/delete-request";
  private static final String API_FAMILY_DELETE_REQUESTS = "/api/family/delete-requests";

  // Database Collection
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<Settings> settingsCollection;
  private final JacksonMongoCollection<Users> usersCollection;
  private final FamilyNeededItemService familyNeededItemService;
  private final FamilyChecklistInventoryService familyChecklistInventoryService;
  private final InventoryReservationService inventoryReservationService;
  private final FamilyChecklistService familyChecklistService;
  private final FamilySchedulingService familySchedulingService;
  private final Object helpSessionMutationQueueMonitor = new Object();
  private ReentrantLock helpSessionMutationQueue;


  // Database Constructor
  public FamilyController(MongoDatabase database) {
    this(database, new InventoryMatcher(database));
  }

  public FamilyController(MongoDatabase database, InventoryMatcher inventoryMatcher) {
    this(
      database,
      new InventoryReservationService(database, inventoryMatcher),
      inventoryMatcher,
      new FamilyChecklistService(database, inventoryMatcher),
      new FamilySchedulingService()
    );
  }

  public FamilyController(
      MongoDatabase database,
      InventoryReservationService inventoryReservationService,
      InventoryMatcher inventoryMatcher
  ) {
    this(
      database,
      inventoryReservationService,
      inventoryMatcher,
      new FamilyChecklistService(database, inventoryMatcher),
      new FamilySchedulingService()
    );
  }

  public FamilyController(
      MongoDatabase database,
      InventoryReservationService inventoryReservationService,
      InventoryMatcher inventoryMatcher,
      FamilyChecklistService familyChecklistService
  ) {
    this(
      database,
      inventoryReservationService,
      inventoryMatcher,
      familyChecklistService,
      new FamilySchedulingService()
    );
  }

  public FamilyController(
      MongoDatabase database,
      InventoryReservationService inventoryReservationService,
      InventoryMatcher inventoryMatcher,
      FamilyChecklistService familyChecklistService,
      FamilySchedulingService familySchedulingService
  ) {
    this.inventoryReservationService = inventoryReservationService;
    this.familyChecklistService = familyChecklistService;
    this.familySchedulingService = familySchedulingService;
    this.familyChecklistInventoryService = new FamilyChecklistInventoryService(database, inventoryMatcher);
    familyCollection = JacksonMongoCollection.builder().build(
        database,
        "family",
        Family.class,
        UuidRepresentation.STANDARD);
    settingsCollection = JacksonMongoCollection.builder().build(
      database,
      "settings",
      Settings.class,
      UuidRepresentation.STANDARD);
    usersCollection = JacksonMongoCollection.builder().build(
        database,
        "users",
        Users.class,
        UuidRepresentation.STANDARD);
    familyNeededItemService = new FamilyNeededItemService(database);
  }

  // GET all families
  /**
   * Gets a list of all families, filtered by query parameters if applicable.
   * Supported query parameters are: Guardian Name, Guardian First Name, Guardian Last Name,
   * Status (helped, not_helped, being_helped), and Helped (true/false).
   * @param ctx the Javalin context containing the families query
   */
  @Route(method = HttpMethod.GET, path = API_FAMILY)
  @RequirePermission("view_families")
  public void getFamilies(Context ctx) {
    Bson filter = constructDatabaseFilter(ctx);

    ArrayList<Family> matchingFamilies = familyCollection.find(filter).into(new ArrayList<>());
    matchingFamilies = applyComputedFilters(matchingFamilies, ctx);

    ctx.json(matchingFamilies);
    ctx.status(HttpStatus.OK);
  }

  // GET family by ID
  /**
   * Gets a family by its ID.
   * @param ctx the Javalin context containing the family ID
   * @throws BadRequestResponse if the provided ID is not a legal Mongo Object ID
   * @throws NotFoundResponse if no family with the provided ID is found
   */
  @Route(method = HttpMethod.GET, path = API_FAMILY_BY_ID)
  @RequirePermission("view_family")
  public void getFamily(Context ctx) {
    String id = ctx.pathParam("id");
    Family family;

    try {
      family = familyCollection.find(eq("_id", new ObjectId(id))).first();
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }
    if (family == null) {
      throw new NotFoundResponse("The requested family was not found");
    } else {
      ctx.json(family);
      ctx.status(HttpStatus.OK);
    }
  }

  @Route(method = HttpMethod.GET, path = API_FAMILY_FINALIZED_CHECKLIST)
  @RequirePermission("view_family_checklist")
  public void getFinalizedFamilyChecklist(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));

    if (family.checklist == null || family.checklist.snapshot || !STATUS_HELPED.equals(determineStatus(family))) {
      throw new NotFoundResponse("The finalized checklist for this family was not found");
    }

    ctx.json(family.checklist);
  }

  @Route(method = HttpMethod.GET, path = API_FAMILY_CURRENT_CHECKLIST)
  @RequirePermission("manage_family_help_sessions")
  public void getCurrentFamilyChecklist(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));

    ctx.json(generateCurrentFamilyChecklist(family));
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.GET, path = API_FAMILY_NEEDED_ITEM_LOGS)
  @RequirePermission("manage_family_help_sessions")
  public void getNeededItemLogs(Context ctx) {
    ctx.json(familyNeededItemService.getNeededItemLogs());
    ctx.status(HttpStatus.OK);
  }

  public Family getByOwnerUserId(String ownerUserId) {
    Family family = familyCollection.find(eq("ownerUserId", ownerUserId)).first();
    if (family == null) {
      throw new NotFoundResponse("No family profile exists for this guardian yet");
    }
    return family;
  }

  public void upsertByOwnerUserId(Family family) {
    Family existingFamily = familyCollection.find(eq("ownerUserId", family.ownerUserId)).first();
    normalizeFamilyForPersistence(family, existingFamily);
    family.profileComplete = true;

    if (existingFamily == null) {
      familyCollection.insertOne(family);
      return;
    }

    family._id = existingFamily._id;
    family.helped = existingFamily.helped;
    family.status = determineStatus(existingFamily);
    family.deleteRequest = existingFamily.deleteRequest;
    familyCollection.replaceOne(eq("_id", new ObjectId(existingFamily._id)), family);
  }

  @Route(method = HttpMethod.POST, path = API_SCHEDULE_FAMILIES)
  @RequirePermission("schedule_families")
  /*
  * Calls scheduling algorithm to sort families into their ideal time slots
  */
  public void scheduleFamilies(Context ctx) {
    Bson filter = constructDatabaseFilter(ctx);

    Settings settings = settingsCollection.find().first();

    ArrayList<Family> families = familyCollection
        .find(filter)
        .into(new ArrayList<>()); //loading families

    Settings.TimeAvailabilityLabels timeAvailability = settings == null ? null : settings.timeAvailability;
    Settings.DefaultScheduleColumns defaultScheduleColumns =
        settings == null ? null : settings.defaultScheduleColumns;
    familySchedulingService.schedulingAlgorithm(
        families,
        timeAvailability,
        defaultScheduleColumns); // scheduling families

    List<WriteModel<Family>> updates = new ArrayList<>();

    for (Family fam : families) {
        updates.add(
            new UpdateOneModel<>(
                Filters.eq("_id", new ObjectId(fam._id)),
                Updates.combine(
                    Updates.set("timeSlot", fam.timeSlot),
                    Updates.set("scheduleAssignment", scheduleAssignmentDocument(fam.scheduleAssignment)),
                    Updates.set("scheduleAssignments", scheduleAssignmentDocuments(fam.scheduleAssignments)))
            )
        );
    }

    familyCollection.bulkWrite(updates);

    ctx.json(families);
    ctx.status(HttpStatus.OK);
  }

  private Document scheduleAssignmentDocument(Family.ScheduleAssignment scheduleAssignment) {
    if (scheduleAssignment == null) {
      return null;
    }

    return new Document()
        .append("timeSlot", scheduleAssignment.timeSlot)
        .append("columnType", scheduleAssignment.columnType)
        .append("columnIndex", scheduleAssignment.columnIndex);
  }

  private List<Document> scheduleAssignmentDocuments(List<Family.ScheduleAssignment> scheduleAssignments) {
    if (scheduleAssignments == null) {
      return List.of();
    }

    return scheduleAssignments.stream()
        .map(this::scheduleAssignmentDocument)
        .toList();
  }

  @Route(method = HttpMethod.POST, path = API_CLEAR_SCHEDULED_TIMES)
  @RequirePermission("schedule_families")
  public void clearScheduledTimes(Context ctx) {
    familyCollection.updateMany(
        new Document(),
        Updates.combine(
            Updates.set("timeSlot", ""),
            unset("scheduleAssignment"),
            unset("scheduleAssignments")));

    ArrayList<Family> families = familyCollection
        .find()
        .into(new ArrayList<>());

    ctx.json(families);
    ctx.status(HttpStatus.OK);
  }

  // Filter for families
  /**
   * Constructs a MongoDB filter based on the query parameters in the provided Javalin context.
   * Supported query parameters are: Guardian Name
   * @param ctx the Javalin context containing the family query parameters
   * @return a Bson filter to be used in MongoDB queries for families
   */
  private Bson constructDatabaseFilter(Context ctx) {
    List<Bson> filters = new ArrayList<>();

    if (ctx.queryParamMap().containsKey(FAMILY_KEY)) {
      Pattern pattern = Pattern.compile(Pattern.quote(ctx.queryParam(FAMILY_KEY)), Pattern.CASE_INSENSITIVE);
      filters.add(regex(FAMILY_KEY, pattern));
    }

    return filters.isEmpty() ? new Document() : and(filters);
  }

  private ArrayList<Family> applyComputedFilters(ArrayList<Family> families, Context ctx) {
    ArrayList<Family> filteredFamilies = new ArrayList<>(families);

    if (ctx.queryParamMap().containsKey(FIRST_NAME_KEY)) {
      String firstName = normalizeNamePart(ctx.queryParam(FIRST_NAME_KEY));
      filteredFamilies.removeIf(family -> !extractGuardianFirstName(family.guardianName).contains(firstName));
    }

    if (ctx.queryParamMap().containsKey(LAST_NAME_KEY)) {
      String lastName = normalizeNamePart(ctx.queryParam(LAST_NAME_KEY));
      filteredFamilies.removeIf(family -> !extractGuardianLastName(family.guardianName).contains(lastName));
    }

    if (ctx.queryParamMap().containsKey(STATUS_KEY)) {
      String requestedStatus = normalizeStatusValue(ctx.queryParam(STATUS_KEY));
      filteredFamilies.removeIf(family -> !determineStatus(family).equals(requestedStatus));
    }

    if (ctx.queryParamMap().containsKey(HELPED_KEY)) {
      boolean requestedHelped = Boolean.parseBoolean(ctx.queryParam(HELPED_KEY));
      filteredFamilies.removeIf(family -> isHelpedStatus(determineStatus(family)) != requestedHelped);
    }

    return filteredFamilies;
  }

  // POST new family
  /**
   * Adds a new family to the database based on the JSON body of the provided Javalin context.
   * @param ctx the Javalin context containing the new family data
   * @throws BadRequestResponse if the provided family data is invalid
   * (e.g. missing required fields, invalid email format)
   */
  @Route(method = HttpMethod.POST, path = API_FAMILY)
  @RequirePermission("add_family")
  public void addNewFamily(Context ctx) {
    String body = ctx.body();
    Family newFamily = ctx.bodyValidator(Family.class).get();

    // Validate email (has to be present and match regex)
    if (newFamily.email == null || !newFamily.email.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse(
        "Family must have a valid email; email was " + newFamily.email + "; family was " + body);
      // throw new BadRequestResponse("Family must have a valid email.");
      // Note: This is commented out in favor of the expanded one for development purposes.
    }

    normalizeFamilyForPersistence(newFamily, null);
    newFamily.profileComplete = true;
    familyCollection.insertOne(newFamily);

    ctx.json(Map.of("id", newFamily._id));
    ctx.status(HttpStatus.CREATED);
  }

  // UPDATE family
  /**
   * Updates an existing family in the database based on the family ID in the path parameter
   * and the updated family data in the JSON body of the provided Javalin context.
   * @param ctx the Javalin context containing the updated family data
   * @throws BadRequestResponse if the provided family ID is not a legal Mongo Object ID,
   * or if the updated family data is invalid (e.g. missing required fields, invalid email format)
   * @throws NotFoundResponse if no family with the provided ID is found
   * @throws BadRequestResponse if the updated family data is invalid (e.g. invalid email format)
   * @returns the updated family data as JSON in the response body
   */
  @Route(method = HttpMethod.PUT, path = API_FAMILY_BY_ID)
  @RequirePermission("edit_family")
  public void updateFamily(Context ctx) {
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The requested family was not found");
    }

    Family updatedFamily = ctx.bodyValidator(Family.class).get();

    if (updatedFamily.email == null || !updatedFamily.email.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse(
        "Family must have a valid email; email was " + updatedFamily.email + "; family was " + ctx.body());
    }

    normalizeFamilyForPersistence(updatedFamily, existingFamily);
    updatedFamily.helped = existingFamily.helped;
    updatedFamily.status = determineStatus(existingFamily);
    updatedFamily.checklist = normalizeChecklist(
      updatedFamily.checklist != null ? updatedFamily.checklist : existingFamily.checklist,
      updatedFamily.guardianName,
      updatedFamily.students
    );

    Bson update = new Document("$set", new Document()
      .append("guardianName", updatedFamily.guardianName)
      .append("ownerUserId", existingFamily.ownerUserId)
      .append("profileComplete", existingFamily.profileComplete)
      .append("email", updatedFamily.email)
      .append("address", updatedFamily.address)
      .append("accommodations", updatedFamily.accommodations)
      .append("needSpanishHelp", updatedFamily.needSpanishHelp)
      .append("timeSlot", updatedFamily.timeSlot)
      .append("timeAvailability", new Document()
        .append("earlyMorning", updatedFamily.timeAvailability.earlyMorning)
        .append("lateMorning", updatedFamily.timeAvailability.lateMorning)
        .append("earlyAfternoon", updatedFamily.timeAvailability.earlyAfternoon)
        .append("lateAfternoon", updatedFamily.timeAvailability.lateAfternoon)
      )
      .append("students", studentInfoToDocuments(updatedFamily.students))
      .append("helped", updatedFamily.helped)
      .append("status", updatedFamily.status)
      .append("deleteRequest", deleteRequestToDocument(existingFamily.deleteRequest))
      .append("checklist", checklistToDocument(updatedFamily.checklist))
    );

    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // DELETE family
  /**
   * Deletes an existing family from the database based on the family ID
   * in the path parameter of the provided Javalin context.
   * @param ctx the Javalin context containing the family ID
   * @throws BadRequestResponse if the provided family ID is not a legal Mongo Object ID
   * @throws NotFoundResponse if no family with the provided ID is found, or if the family
   * could not be deleted for some reason (e.g. database error)
   */
  @Route(method = HttpMethod.DELETE, path = API_FAMILY_BY_ID)
  @RequirePermission("delete_family")
  public void deleteFamily(Context ctx) {
    String id = ctx.pathParam("id");
    DeleteResult deleteResult;

    // Handle case where ID is not proper
    try {
      ObjectId familyId = new ObjectId(id);
      deleteResult = familyCollection.deleteOne(eq("_id", familyId));
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    if (deleteResult.getDeletedCount() != 1) {
      ctx.status(HttpStatus.NOT_FOUND);
      throw new NotFoundResponse(
        "Was unable to delete Family ID"
          + id
          + "; perhaps illegal Family ID or an ID for a Family not in the system?");
    }
    ctx.status(HttpStatus.OK);
  }

  // DELETE request to delete family (volunteer->admin approval flow)
  @Route(method = HttpMethod.POST, path = API_FAMILY_DELETE_REQUEST)
  @RequirePermission("request_family_delete")
  public void requestToDeleteFamily(Context ctx) {
    AuthContext authContext = AuthContext.from(ctx);
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The requested family was not found");
    }

    String rawBody = ctx.body();
    FamilyDeleteRequest deleteRequest = rawBody == null || rawBody.isBlank()
      ? new FamilyDeleteRequest()
      : ctx.bodyAsClass(FamilyDeleteRequest.class);
    String message = deleteRequest.message == null || deleteRequest.message.isBlank()
      ? "Delete requested"
      : deleteRequest.message.trim();
    Users requester = findUserById(authContext.userId());

    Bson update = new Document("$set", new Document()
      .append("deleteRequest", new Document()
        .append("requested", true)
        .append("message", message)
        .append("requestedByUserId", authContext.userId())
        .append("requestedByUserName", displayNameForUser(requester))
        .append("requestedBySystemRole", requester == null || requester.systemRole == null
          ? authContext.role().name()
          : requester.systemRole.name())
        .append("requestedAt", Instant.now().toString())
      )
    );

    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  @SuppressWarnings({"VisibilityModifier"})
  public static class FamilyDeleteRequest {
    public String message;
  }

  @Route(method = HttpMethod.GET, path = API_FAMILY_DELETE_REQUESTS)
  @RequirePermission("delete_family")
  public void getDeleteRequests(Context ctx) {
    List<Family> familiesWithDeleteRequests = familyCollection
      .find(eq("deleteRequest.requested", true))
      .into(new ArrayList<>());
    familiesWithDeleteRequests.forEach(this::hydrateDeleteRequestRequester);
    ctx.json(familiesWithDeleteRequests);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.DELETE, path = API_FAMILY_DELETE_REQUEST)
  @RequirePermission("delete_family")
  public void restoreFamilyDeleteRequest(Context ctx) {
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id wasn't a legal Mongo Object ID.");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The requested family was not found");
    }

    Bson update = unset("deleteRequest");
    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.PATCH, path = API_FAMILY_HELPED)
  @RequirePermission("edit_family")
  public void updateFamilyHelped(Context ctx) {
    updateFamilyStatus(ctx);
  }

  @Route(method = HttpMethod.PATCH, path = API_FAMILY_STATUS)
  @RequirePermission("edit_family")
  public void updateFamilyStatus(Context ctx) {
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id was not legal");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The family was not found");
    }

    FamilyStatusUpdateRequest statusUpdate = ctx.bodyValidator(FamilyStatusUpdateRequest.class).get();
    if (!statusUpdate.hasStatusUpdate()) {
      throw new BadRequestResponse("A family status update must include either helped or status.");
    }

    String normalizedStatus = normalizeStatusValue(statusUpdate.getStatus());
    if (normalizedStatus == null) {
      normalizedStatus = statusUpdate.getHelped() != null && statusUpdate.getHelped()
        ? STATUS_HELPED
        : STATUS_NOT_HELPED;
    }
    boolean helped = statusUpdate.getHelped() != null
      ? statusUpdate.getHelped()
      : isHelpedStatus(normalizedStatus);

    Bson update = new Document("$set", new Document()
      .append("helped", helped)
      .append("status", normalizedStatus));

    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.PATCH, path = API_FAMILY_CHECKLIST)
  @RequirePermission("manage_family_help_sessions")
  public void updateFamilyChecklist(Context ctx) {
    Family result = runInHelpSessionMutationQueue(() -> updateFamilyChecklistQueued(ctx));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family updateFamilyChecklistQueued(Context ctx) {
    String id = ctx.pathParam("id");
    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id was not legal");
    }

    Family existingFamily = familyCollection.find(eq("_id", familyId)).first();

    if (existingFamily == null) {
      throw new NotFoundResponse("The family was not found");
    }

    FamilyChecklistUpdateRequest checklistUpdate = ctx.bodyValidator(FamilyChecklistUpdateRequest.class).get();
    if (checklistUpdate.getChecklist() == null) {
      throw new BadRequestResponse("A checklist payload is required.");
    }
    ensureHelpSessionExists(existingFamily);

    Family.FamilyChecklist normalizedChecklist = normalizeChecklist(
      checklistUpdate.getChecklist(),
      existingFamily.guardianName,
      existingFamily.students
    );

    Bson update = new Document("$set", new Document("checklist", checklistToDocument(normalizedChecklist)));
    familyCollection.updateOne(eq("_id", familyId), update);
    inventoryReservationService.rebuildInventoryReservation();

    return familyCollection.find(eq("_id", familyId)).first();
  }

  @Route(method = HttpMethod.GET, path = API_FAMILY_HELP_SESSION)
  @RequirePermission("manage_family_help_sessions")
  public void getFamilyHelpSession(Context ctx) {
    String familyId = ctx.pathParam("id");
    Family family = requireFamily(familyId);
    if (family.checklist == null || !family.checklist.snapshot) {
      family = startOrRefreshHelpSession(familyId);
    }

    ctx.json(family);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.POST, path = API_FAMILY_HELP_SESSION_START)
  @RequirePermission("manage_family_help_sessions")
  public void startFamilyHelpSession(Context ctx) {
    Family result = startOrRefreshHelpSession(ctx.pathParam("id"));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family startOrRefreshHelpSession(String familyId) {
    return runInHelpSessionMutationQueue(() -> startOrRefreshLoadedHelpSession(requireFamily(familyId)));
  }

  private Family runInHelpSessionMutationQueue(HelpSessionMutation mutation) {
    ReentrantLock queue = lockHelpSessionMutationQueue();
    try {
      return mutation.run();
    } finally {
      queue.unlock();
      clearHelpSessionMutationQueueIfIdle(queue);
    }
  }

  private ReentrantLock lockHelpSessionMutationQueue() {
    synchronized (helpSessionMutationQueueMonitor) {
      if (helpSessionMutationQueue == null) {
        helpSessionMutationQueue = new ReentrantLock(true);
      }
      helpSessionMutationQueue.lock();
      return helpSessionMutationQueue;
    }
  }

  private void clearHelpSessionMutationQueueIfIdle(ReentrantLock queue) {
    synchronized (helpSessionMutationQueueMonitor) {
      if (helpSessionMutationQueue == queue && !queue.isLocked() && !queue.hasQueuedThreads()) {
        helpSessionMutationQueue = null;
      }
    }
  }

  private Family startOrRefreshLoadedHelpSession(Family family) {
    if (family.checklist == null || !family.checklist.snapshot) {
      String previousStatus = determineStatus(family);
      boolean previousHelped = family.helped;
      inventoryReservationService.rebuildInventoryReservationExcludingFamily(family._id);
      family.checklist = generateChecklistSnapshot(family);
      family.checklist.previousStatus = previousStatus;
      family.checklist.previousHelped = previousHelped;
    }

    family.status = STATUS_BEING_HELPED;
    family.helped = false;
    persistFamilyChecklistAndStatus(family);
    inventoryReservationService.rebuildInventoryReservation();

    return familyCollection.find(eq("_id", new ObjectId(family._id))).first();
  }

  @Route(method = HttpMethod.POST, path = API_FAMILY_HELP_SESSION_SAVE_CHILD)
  @RequirePermission("manage_family_help_sessions")
  public void saveFamilyHelpSessionChild(Context ctx) {
    Family result = runInHelpSessionMutationQueue(() -> saveFamilyHelpSessionChildQueued(ctx));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family saveFamilyHelpSessionChildQueued(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureHelpSessionExists(family);

    FamilyHelpSessionSaveChildRequest request = ctx.bodyValidator(FamilyHelpSessionSaveChildRequest.class).get();
    if (request.getSectionId() == null || request.getSectionId().isBlank() || request.getSection() == null) {
      throw new BadRequestResponse("A sectionId and section payload are required.");
    }

    Family.ChecklistSection existingSection = findSectionById(family.checklist, request.getSectionId());
    if (existingSection == null) {
      throw new NotFoundResponse("The requested child checklist section was not found");
    }
    if (existingSection.saved) {
      throw new BadRequestResponse("This child checklist has already been saved.");
    }

    Family.ChecklistSection normalizedSection = normalizeSectionForSave(request.getSectionId(), request.getSection());
    commitSectionInventoryChanges(normalizedSection, existingSection);
    normalizedSection.saved = true;
    replaceSection(family.checklist, normalizedSection);

    family.status = areAllSectionsSaved(family.checklist) ? STATUS_HELPED : STATUS_BEING_HELPED;
    family.helped = STATUS_HELPED.equals(family.status);
    if (family.helped) {
      family.checklist.snapshot = false;
    }
    persistFamilyChecklistAndStatus(family);

    return familyCollection.find(eq("_id", new ObjectId(family._id))).first();
  }

  @Route(method = HttpMethod.POST, path = API_FAMILY_HELP_SESSION_SAVE_ALL)
  @RequirePermission("manage_family_help_sessions")
  public void saveFamilyHelpSessionAll(Context ctx) {
    Family result = runInHelpSessionMutationQueue(() -> saveFamilyHelpSessionAllQueued(ctx));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family saveFamilyHelpSessionAllQueued(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureHelpSessionExists(family);

    List<Family.ChecklistSection> existingUnsavedSections = new ArrayList<>();
    for (Family.ChecklistSection section : family.checklist.sections) {
      if (!section.saved) {
        existingUnsavedSections.add(section);
      }
    }
    Map<String, Integer> heldQuantityByInventoryId =
      familyChecklistInventoryService.heldReservationsForSections(existingUnsavedSections);

    FamilyHelpSessionSaveAllRequest request = ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class).get();
    if (request.getChecklist() != null) {
      family.checklist = normalizeChecklist(request.getChecklist(), family.guardianName, family.students);
      family.checklist.snapshot = true;
    }

    List<Family.ChecklistSection> normalizedUnsavedSections = new ArrayList<>();
    for (Family.ChecklistSection section : family.checklist.sections) {
      if (!section.saved) {
        Family.ChecklistSection normalizedSection = normalizeSectionForSave(section.id, section);
        normalizedUnsavedSections.add(normalizedSection);
      }
    }
    familyChecklistInventoryService.validateSectionsInventoryChanges(
      normalizedUnsavedSections,
      heldQuantityByInventoryId);
    familyChecklistInventoryService.releaseHeldReservations(heldQuantityByInventoryId);

    for (Family.ChecklistSection normalizedSection : normalizedUnsavedSections) {
      familyChecklistInventoryService.applySectionInventoryChanges(normalizedSection);
      normalizedSection.saved = true;
      replaceSection(family.checklist, normalizedSection);
    }
    familyNeededItemService.recordNeededButNotAcquiredItems(family);

    family.status = STATUS_HELPED;
    family.helped = true;
    family.checklist.snapshot = false;
    persistFamilyChecklistAndStatus(family);

    return familyCollection.find(eq("_id", new ObjectId(family._id))).first();
  }

  private void releaseChecklistReservations(Family.FamilyChecklist checklist) {
    familyChecklistInventoryService.releaseChecklistReservations(checklist);
  }

  @Route(method = HttpMethod.POST, path = API_FAMILY_HELP_SESSION_CLEAR)
  @RequirePermission("manage_family_help_sessions")
  public void clearFamilyHelpSession(Context ctx) {
    Family result = runInHelpSessionMutationQueue(() -> clearFamilyHelpSessionQueued(ctx));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family clearFamilyHelpSessionQueued(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureHelpSessionExists(family);
    String restoredStatus = statusAfterClearingHelpSession(family.checklist);
    boolean restoredHelped = helpedAfterClearingHelpSession(family.checklist, restoredStatus);

    releaseChecklistReservations(family.checklist);

    family.checklist = null;
    family.status = restoredStatus;
    family.helped = restoredHelped;
    persistFamilyChecklistAndStatus(family);
    inventoryReservationService.rebuildInventoryReservation();

    return familyCollection.find(eq("_id", new ObjectId(family._id))).first();
  }

  private String statusAfterClearingHelpSession(Family.FamilyChecklist checklist) {
    if (checklist == null || !hasText(checklist.previousStatus)) {
      return STATUS_NOT_HELPED;
    }

    String previousStatus = normalizeStatusValue(checklist.previousStatus);
    return previousStatus == null ? STATUS_NOT_HELPED : previousStatus;
  }

  private boolean helpedAfterClearingHelpSession(Family.FamilyChecklist checklist, String restoredStatus) {
    if (checklist != null && checklist.previousHelped != null) {
      return checklist.previousHelped;
    }

    return STATUS_HELPED.equals(restoredStatus);
  }

  @Route(method = HttpMethod.POST, path = API_FAMILY_HELP_SESSION_REVERT)
  @RequirePermission("manage_family_help_sessions")
  public void revertCompletedFamilyHelpSession(Context ctx) {
    Family result = runInHelpSessionMutationQueue(() -> revertCompletedFamilyHelpSessionQueued(ctx));
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  private Family revertCompletedFamilyHelpSessionQueued(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureCompletedHelpSessionExists(family);

    familyNeededItemService.removeNeededButNotAcquiredItemLogs(family);
    restoreChecklistInventoryChanges(family.checklist);
    for (Family.ChecklistSection section : family.checklist.sections) {
      section.saved = false;
    }

    family.checklist.snapshot = true;
    family.status = STATUS_BEING_HELPED;
    family.helped = false;
    persistFamilyChecklistAndStatus(family);
    inventoryReservationService.rebuildInventoryReservation();

    return familyCollection.find(eq("_id", new ObjectId(family._id))).first();
  }

  // GET dashboard stats
  /**
   * Gets dashboard statistics including total number of families, total number of students,
   * students per school, and students per grade.
   * @param ctx the Javalin context for the request
   * @returns a JSON object containing the dashboard statistics in the response body
   */
  @Route(method = HttpMethod.GET, path = API_DASHBOARD)
  @RequirePermission("view_dashboard_stats")
  public void getDashboardStats(Context ctx) {
    ArrayList<Family> families = familyCollection
      .find()
      .into(new ArrayList<>());

    Map<String, Integer> studentsPerSchool = new HashMap<>();
    Map<String, Integer> studentsPerGrade = new HashMap<>();

    int totalStudents = 0;

    // Loop through all families and their students to count students per school and grade
    for (Family family : families) {
      if (family.students == null) {
        continue; // Skip families with no students (shouldn't happen, but just in case)
      }
      for (Family.StudentInfo student : family.students) {
        // Count per school
        studentsPerSchool.merge(student.school, 1, Integer::sum);

        // Count per grade
        studentsPerGrade.merge(student.grade, 1, Integer::sum);

        // Count of total students
        totalStudents = totalStudents + 1;
      }
    }
    // Compile results into map to return as JSOn
    Map<String, Object> result = new HashMap<>();
    result.put("studentsPerSchool", studentsPerSchool);
    result.put("studentsPerGrade", studentsPerGrade);
    result.put("totalFamilies", families.size());
    result.put("totalStudents", totalStudents);

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.PATCH, path = API_FAMILY_GUARDIAN_LINK)
  @RequirePermission("link-guardian")
  public void linkGuardian(Context ctx) {
    String id = ctx.pathParam("id");

    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id was not a legal Mongo Object.");
    }

    Family family = familyCollection.find(eq("_id", familyId)).first();
    if (family == null) {
      throw new NotFoundResponse("The requested family was not found");
    }
    if (hasText(family.ownerUserId)) {
      throw new BadRequestResponse("Family already has a linked guardian account");
    }

    FamilyGuardianLinkRequest request = ctx.bodyAsClass(FamilyGuardianLinkRequest.class);
    if (request == null || !hasText(request.getGuardianUserId())) {
      throw new BadRequestResponse("guardianUserId is required");
    }

    ObjectId guardianUserId;
    try {
      guardianUserId = new ObjectId(request.getGuardianUserId());
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested guardian user id was not a legal Mongo Object ID");
    }

    Users guardian = usersCollection.find(eq("_id", guardianUserId)).first();
    if (guardian == null) {
      throw new NotFoundResponse("The requested guardian user was not found");
    }
    if (guardian.systemRole != Role.GUARDIAN) {
      throw new BadRequestResponse("Linked user must be a guardian account");
    }

    Family alreadyLinkedFamily = familyCollection.find(eq("ownerUserId", request.getGuardianUserId())).first();
    if (alreadyLinkedFamily != null) {
      throw new BadRequestResponse("Guardian account is already linked to a family");
    }

    familyCollection.updateOne(eq("_id", familyId), Updates.set("ownerUserId", request.getGuardianUserId()));
    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.DELETE, path = API_FAMILY_GUARDIAN_LINK)
  @RequirePermission("link-guardian")
  public void unlinkGuardian(Context ctx) {
    String id = ctx.pathParam("id");

    ObjectId familyId;

    try {
      familyId = new ObjectId(id);
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id was not a legal Mongo Object.");
    }

    Family family = familyCollection.find(eq("_id", familyId)).first();
    if (family == null) {
      throw new NotFoundResponse("The requested family was not found");
    }

    familyCollection.updateOne(eq("_id", familyId), unset("ownerUserId"));
    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // GET export families as CSV
  @Route(method = HttpMethod.GET, path = API_FAMILY_EXPORT)
  @RequirePermission("export_families_csv")
  public void exportFamiliesAsCSV(Context ctx) {
    List<Family> families = familyCollection.find().into(new ArrayList<>());

    StringBuilder csv = new StringBuilder();

    // Headers
    csv.append("Guardian Name,Email,Address,Time Slot,Number of Students\n");

    // Fill rows
    for (Family family : families) {
      int studentCount = family.students != null ? family.students.size() : 0;

      csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%d\n",
        cleanUpCSV(family.guardianName).replace("\"", "\"\""),
        cleanUpCSV(family.email).replace("\"", "\"\""),
        cleanUpCSV(family.address).replace("\"", "\"\""),
        cleanUpCSV(family.timeSlot).replace("\"", "\"\""),
        studentCount
      ));
    }

    // Set response headers for CSV download
    ctx.contentType("text/csv");
    ctx.header("Content-Disposition", "attachment; filename=families.csv");
    ctx.status(HttpStatus.OK);
    ctx.result(csv.toString());
  }

  /**
   * Cleans up CSV values by handling nulls, flattening line breaks,
   * preventing formula injection, trimming whitespace, and removing outside quotes from values.
   * @param value CSV value to clean up
   * @return Cleaned up CSV value
   */
  public static String cleanUpCSV(String value) {
    // Handle null values
    if (value == null) {
      return "";
    }

    // Clean up line breaks (flatten them). Ensures each value always occupies a single CSV row
    String cleaned = value
      .replace("\r\n", " ")
      .replace("\n", " ")
      .replace("\r", " ");

    // Put a single ' in front of any =, + , -, or @ to ensure spreadsheet software doesn't see it as a formula
    // There shouldn't ever be any data like this, but this is just in case
    if (cleaned.matches("^[\\t ]*[=+\\-@].*")) {
      cleaned = "'" + cleaned;
    }

    // Trim whitespace from beginning and end of value
    cleaned = cleaned.trim();

    // Remove outside quotes if they exist (but keep internal quotes, which should be escaped by doubling them)
    if (cleaned.startsWith("\"") && cleaned.endsWith("\"")) {
      cleaned = cleaned.substring(1, cleaned.length() - 1);
    }

    return cleaned;
  }

  private Family requireFamily(String id) {
    try {
      Family family = familyCollection.find(eq("_id", new ObjectId(id))).first();
      if (family == null) {
        throw new NotFoundResponse("The family was not found");
      }
      normalizeFamilyForPersistence(family, family);
      return family;
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested family id was not legal");
    }
  }

  private void ensureHelpSessionExists(Family family) {
    if (family.checklist == null || !family.checklist.snapshot) {
      throw new BadRequestResponse("A help session must be started before saving checklist progress.");
    }
  }

  private void ensureCompletedHelpSessionExists(Family family) {
    if (family.checklist == null
        || family.checklist.snapshot
        || !STATUS_HELPED.equals(determineStatus(family))
        || !areAllSectionsSaved(family.checklist)) {
      throw new BadRequestResponse("Only completed help sessions can be reverted.");
    }
  }

  private Family.FamilyChecklist generateChecklistSnapshot(Family family) {
    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(family);
    return normalizeChecklist(checklist, family.guardianName, family.students);
  }

  public Family.FamilyChecklist generateCurrentFamilyChecklist(Family family) {
    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(family);
    checklist.snapshot = false;
    return normalizeChecklist(
      checklist,
      family == null ? null : family.guardianName,
      family == null ? null : family.students
    );
  }

  private void persistFamilyChecklistAndStatus(Family family) {
    familyCollection.updateOne(eq("_id", new ObjectId(family._id)), Updates.combine(
      Updates.set("checklist", checklistToDocument(family.checklist)),
      Updates.set("status", family.status),
      Updates.set("helped", family.helped)
    ));
  }

  private Family.ChecklistSection findSectionById(Family.FamilyChecklist checklist, String sectionId) {
    for (Family.ChecklistSection section : checklist.sections) {
      if (section.id != null && section.id.equals(sectionId)) {
        return section;
      }
    }
    return null;
  }

  private void replaceSection(Family.FamilyChecklist checklist, Family.ChecklistSection updatedSection) {
    for (int i = 0; i < checklist.sections.size(); i++) {
      if (updatedSection.id.equals(checklist.sections.get(i).id)) {
        checklist.sections.set(i, updatedSection);
        return;
      }
    }
  }

  private boolean areAllSectionsSaved(Family.FamilyChecklist checklist) {
    return checklist.sections.stream().allMatch(section -> section.saved);
  }

  private Family.ChecklistSection normalizeSectionForSave(String sectionId, Family.ChecklistSection section) {
    Family.ChecklistSection normalizedSection = section != null ? section : new Family.ChecklistSection();
    normalizedSection.id = sectionId;
    if (!hasText(normalizedSection.title)) {
      normalizedSection.title = normalizedSection.printableTitle;
    }
    if (!hasText(normalizedSection.printableTitle)) {
      normalizedSection.printableTitle = normalizedSection.title;
    }
    if (normalizedSection.items == null) {
      normalizedSection.items = new ArrayList<>();
    }
    if (normalizedSection.notGivenItems == null) {
      normalizedSection.notGivenItems = new ArrayList<>();
    }

    int itemIndex = 1;
    for (Family.ChecklistItem item : normalizedSection.items) {
      normalizeChecklistItem(item, sectionId + "-item-" + itemIndex);
      itemIndex++;
    }

    int notGivenItemIndex = 1;
    for (Family.ChecklistItem item : normalizedSection.notGivenItems) {
      normalizeChecklistItem(item, sectionId + "-not-given-item-" + notGivenItemIndex);
      notGivenItemIndex++;
    }

    return normalizedSection;
  }

  private void normalizeChecklistItem(Family.ChecklistItem item, String fallbackId) {
    if (!hasText(item.id)) {
      item.id = fallbackId;
    }
    item.requestedQuantity = ChecklistItemRules.quantityOrOne(item.requestedQuantity);
    item.notPickedUpReason = normalizeReason(item.notPickedUpReason);
    normalizeFulfillmentItems(item);
  }

  private void normalizeFulfillmentItems(Family.ChecklistItem item) {
    if (item.fulfillmentItems == null) {
      item.fulfillmentItems = new ArrayList<>();
    }

    if (item.fulfillmentItems.isEmpty() && isChosenSubstitution(item)) {
      item.fulfillmentItems.add(legacySubstitutionAsFulfillmentItem(item));
    }

    List<Family.FulfillmentItem> normalizedItems = new ArrayList<>();
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      if (fulfillmentItem == null) {
        continue;
      }

      normalizeFulfillmentItem(fulfillmentItem);

      if (ChecklistItemRules.hasFulfillmentItemTarget(fulfillmentItem)) {
        normalizedItems.add(fulfillmentItem);
      }
    }

    item.fulfillmentItems = normalizedItems;
  }

  private void normalizeFulfillmentItem(Family.FulfillmentItem fulfillmentItem) {
    fulfillmentItem.inventoryId = normalizeOptionalText(fulfillmentItem.inventoryId);
    fulfillmentItem.barcode = normalizeOptionalText(fulfillmentItem.barcode);
    fulfillmentItem.item = normalizeOptionalText(fulfillmentItem.item);
    fulfillmentItem.description = normalizeOptionalText(fulfillmentItem.description);
    fulfillmentItem.quantity = ChecklistItemRules.quantityOrOne(fulfillmentItem.quantity);
  }

  private String normalizeOptionalText(String value) {
    return hasText(value) ? value.trim() : null;
  }

  private Family.FulfillmentItem legacySubstitutionAsFulfillmentItem(Family.ChecklistItem item) {
    Family.FulfillmentItem fulfillmentItem = new Family.FulfillmentItem();
    fulfillmentItem.inventoryId = item.substituteInventoryId;
    fulfillmentItem.barcode = item.substituteBarcode;
    fulfillmentItem.item = item.substituteItem;
    fulfillmentItem.description = item.substituteDescription;
    fulfillmentItem.quantity = item.requestedQuantity;
    return fulfillmentItem;
  }

  private void commitSectionInventoryChanges(
      Family.ChecklistSection section,
      Family.ChecklistSection existingSection
  ) {
    familyChecklistInventoryService.commitSectionInventoryChanges(section, existingSection);
  }

  private void restoreChecklistInventoryChanges(Family.FamilyChecklist checklist) {
    familyChecklistInventoryService.restoreChecklistInventoryChanges(checklist);
  }

  private void validateChecklistItemForSave(Family.ChecklistItem item) {
    familyChecklistInventoryService.validateChecklistItemForSave(item);
  }

  private boolean isChosenSubstitution(Family.ChecklistItem item) {
    return ChecklistItemRules.isChosenSubstitution(item);
  }

  private boolean isValidNotPickedUpReason(String reason) {
    return ChecklistItemRules.isValidNotPickedUpReason(reason);
  }

  private String normalizeReason(String reason) {
    return ChecklistItemRules.normalizeReason(reason);
  }

  private void consumeInventory(String internalId, int amount) {
    familyChecklistInventoryService.consumeInventory(internalId, amount);
  }

  private boolean nameEquivalent(String left, String right) {
    String leftToken = normalizeToken(left);
    String rightToken = normalizeToken(right);
    String strictLeftToken = normalizeTokenWithoutPluralFold(left);
    String strictRightToken = normalizeTokenWithoutPluralFold(right);
    return leftToken.equals(rightToken)
      || strictLeftToken.equals(acronymToken(right))
      || strictRightToken.equals(acronymToken(left));
  }

  private String normalizeToken(String value) {
    String normalized = normalizeTokenWithoutPluralFold(value);
    if (normalized.endsWith("s") && normalized.length() > 1) {
      return normalized.substring(0, normalized.length() - 1);
    }
    return normalized;
  }

  private String normalizeTokenWithoutPluralFold(String value) {
    if (value == null) {
      return "";
    }
    return value.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9]+", "");
  }

  private List<String> tokenParts(String value) {
    if (value == null) {
      return List.of();
    }
    String[] parts = value.trim().toLowerCase(Locale.US).split("[^a-z0-9]+");
    List<String> tokens = new ArrayList<>();
    for (String part : parts) {
      String normalized = normalizeToken(part);
      if (!normalized.isBlank()) {
        tokens.add(normalized);
      }
    }
    return tokens;
  }

  private String acronymToken(String value) {
    if (value == null) {
      return "";
    }
    String[] parts = value.trim().toLowerCase(Locale.US).split("[^a-z0-9]+");
    StringBuilder acronym = new StringBuilder();
    for (String part : parts) {
      if (!part.isBlank()) {
        acronym.append(part.charAt(0));
      }
    }
    return acronym.length() > 1 ? acronym.toString() : "";
  }

  private void normalizeFamilyForPersistence(Family family, Family existingFamily) {
    if (family.students == null) {
      family.students = existingFamily != null && existingFamily.students != null
        ? existingFamily.students
        : new ArrayList<>();
    }

    String normalizedStatus = normalizeStatusValue(family.status);
    if (normalizedStatus == null) {
      if (existingFamily != null && existingFamily.status != null) {
        normalizedStatus = normalizeStatusValue(existingFamily.status);
      } else {
        normalizedStatus = family.helped ? STATUS_HELPED : STATUS_NOT_HELPED;
      }
    }

    boolean helped = family.helped;
    if (family.status != null) {
      helped = isHelpedStatus(normalizedStatus);
    } else if (existingFamily != null && family.helped == existingFamily.helped) {
      helped = isHelpedStatus(normalizedStatus);
    }

    family.status = normalizedStatus;
    family.helped = helped;
    family.checklist = normalizeChecklist(
      family.checklist != null ? family.checklist : existingFamily != null ? existingFamily.checklist : null,
      family.guardianName,
      family.students
    );
  }

  private Family.FamilyChecklist normalizeChecklist(
    Family.FamilyChecklist checklist,
    String guardianName,
    List<Family.StudentInfo> students
  ) {
    Family.FamilyChecklist normalizedChecklist = checklist != null ? checklist : new Family.FamilyChecklist();

    if (normalizedChecklist.templateId == null || normalizedChecklist.templateId.isBlank()) {
      normalizedChecklist.templateId = "family-checklist-v1";
    }
    if (checklist == null) {
      normalizedChecklist.snapshot = false;
    }
    if (normalizedChecklist.printableTitle == null || normalizedChecklist.printableTitle.isBlank()) {
      normalizedChecklist.printableTitle = guardianName == null || guardianName.isBlank()
        ? "Family Checklist"
        : guardianName + " Checklist";
    }

    if (normalizedChecklist.sections == null) {
      normalizedChecklist.sections = new ArrayList<>();
    }

    int sectionIndex = 1;
    for (Family.ChecklistSection section : normalizedChecklist.sections) {
      if (section.items == null) {
        section.items = new ArrayList<>();
      }
      if (section.notGivenItems == null) {
        section.notGivenItems = new ArrayList<>();
      }
      if (section.id == null || section.id.isBlank()) {
        section.id = "section-" + sectionIndex;
      }
      if (section.title == null || section.title.isBlank()) {
        section.title = "Section " + sectionIndex;
      }
      if (section.printableTitle == null || section.printableTitle.isBlank()) {
        section.printableTitle = section.title;
      }

      int itemIndex = 1;
      for (Family.ChecklistItem item : section.items) {
        normalizeChecklistItem(item, section.id + "-item-" + itemIndex);
        itemIndex++;
      }

      int notGivenItemIndex = 1;
      for (Family.ChecklistItem item : section.notGivenItems) {
        normalizeChecklistItem(item, section.id + "-not-given-item-" + notGivenItemIndex);
        notGivenItemIndex++;
      }
      sectionIndex++;
    }

    return normalizedChecklist;
  }

  private String normalizeStatusValue(String status) {
    if (status == null || status.isBlank()) {
      return null;
    }

    String normalized = status.trim().toLowerCase(Locale.US).replace('-', '_').replace(' ', '_');
    if (STATUS_HELPED.equals(normalized)) {
      return STATUS_HELPED;
    }
    if (STATUS_NOT_HELPED.equals(normalized)) {
      return STATUS_NOT_HELPED;
    }
    if (STATUS_BEING_HELPED.equals(normalized)) {
      return STATUS_BEING_HELPED;
    }
    throw new BadRequestResponse("Family status must be helped, not_helped, or being_helped.");
  }

  private String determineStatus(Family family) {
    String normalizedStatus = normalizeStatusValue(family.status);
    if (normalizedStatus != null) {
      return normalizedStatus;
    }
    return family.helped ? STATUS_HELPED : STATUS_NOT_HELPED;
  }

  private boolean isHelpedStatus(String status) {
    return STATUS_HELPED.equals(status);
  }

  private String normalizeNamePart(String namePart) {
    return namePart == null ? "" : namePart.trim().toLowerCase(Locale.US);
  }

  private String extractGuardianFirstName(String guardianName) {
    String normalizedGuardianName = normalizeNamePart(guardianName);
    if (normalizedGuardianName.isBlank()) {
      return "";
    }
    String[] nameParts = normalizedGuardianName.split("\\s+");
    return nameParts[0];
  }

  private String extractGuardianLastName(String guardianName) {
    String normalizedGuardianName = normalizeNamePart(guardianName);
    if (normalizedGuardianName.isBlank()) {
      return "";
    }
    String[] nameParts = normalizedGuardianName.split("\\s+");
    return nameParts[nameParts.length - 1];
  }

  /**
   * Converts a list of StudentInfo objects to a list of Documents for MongoDB storage.
   * @param students the list of StudentInfo objects to convert
   * @return the list of Documents representing the student information
   */
  private List<Document> studentInfoToDocuments(List<Family.StudentInfo> students) {
    List<Document> updatedStudentInfo = new ArrayList<>();
    if (students == null) {
      return updatedStudentInfo;
    }

    for (Family.StudentInfo student : students) {
      Document updatedStudent = new Document()
        .append("name", student.name)
        .append("grade", student.grade)
        .append("school", student.school)
        .append("schoolAbbreviation", student.schoolAbbreviation)
        .append("teacher", student.teacher)
        .append("headphones", student.headphones)
        .append("backpack", student.backpack);
      updatedStudentInfo.add(updatedStudent);
    }

    return updatedStudentInfo;
  }

  private Document checklistToDocument(Family.FamilyChecklist checklist) {
    if (checklist == null) {
      return null;
    }

    List<Document> sectionDocuments = new ArrayList<>();
    if (checklist.sections != null) {
      for (Family.ChecklistSection section : checklist.sections) {
        List<Document> itemDocuments = new ArrayList<>();
        if (section.items != null) {
          for (Family.ChecklistItem item : section.items) {
            itemDocuments.add(checklistItemToDocument(item));
          }
        }
        List<Document> notGivenItemDocuments = new ArrayList<>();
        if (section.notGivenItems != null) {
          for (Family.ChecklistItem item : section.notGivenItems) {
            notGivenItemDocuments.add(checklistItemToDocument(item));
          }
        }

        sectionDocuments.add(new Document()
          .append("id", section.id)
          .append("title", section.title)
          .append("printableTitle", section.printableTitle)
          .append("saved", section.saved)
          .append("items", itemDocuments)
          .append("notGivenItems", notGivenItemDocuments));
      }
    }

    return new Document()
      .append("templateId", checklist.templateId)
      .append("printableTitle", checklist.printableTitle)
      .append("snapshot", checklist.snapshot)
      .append("previousStatus", checklist.previousStatus)
      .append("previousHelped", checklist.previousHelped)
      .append("sections", sectionDocuments);
  }

  private Document checklistItemToDocument(Family.ChecklistItem item) {
    return new Document()
      .append("id", item.id)
      .append("label", item.label)
      .append("selected", item.selected)
      .append("available", item.available)
      .append("itemDescription", item.itemDescription)
      .append("supplyListId", item.supplyListId)
      .append("matchedInventoryId", item.matchedInventoryId)
      .append("matchedInventoryItem", item.matchedInventoryItem)
      .append("matchedInventoryDescription", item.matchedInventoryDescription)
      .append("requestedQuantity", item.requestedQuantity)
      .append("notPickedUpReason", item.notPickedUpReason)
      .append("substituteItem", item.substituteItem)
      .append("substituteBarcode", item.substituteBarcode)
      .append("substituteDescription", item.substituteDescription)
      .append("substituteInventoryId", item.substituteInventoryId)
      .append("notes", item.notes)
      .append("fulfillmentItems", fulfillmentItemsToDocuments(item.fulfillmentItems));
  }

  private List<Document> fulfillmentItemsToDocuments(List<Family.FulfillmentItem> fulfillmentItems) {
    List<Document> documents = new ArrayList<>();
    if (fulfillmentItems == null) {
      return documents;
    }

    for (Family.FulfillmentItem fulfillmentItem : fulfillmentItems) {
      if (fulfillmentItem == null) {
        continue;
      }

      documents.add(new Document()
        .append("inventoryId", fulfillmentItem.inventoryId)
        .append("barcode", fulfillmentItem.barcode)
        .append("item", fulfillmentItem.item)
        .append("description", fulfillmentItem.description)
        .append("quantity", fulfillmentItem.quantity));
    }

    return documents;
  }

  private Document deleteRequestToDocument(Family.DeleteRequest deleteRequest) {
    if (deleteRequest == null) {
      return null;
    }
    return new Document()
      .append("requested", deleteRequest.requested)
      .append("message", deleteRequest.message)
      .append("requestedByUserId", deleteRequest.requestedByUserId)
      .append("requestedByUserName", deleteRequest.requestedByUserName)
      .append("requestedBySystemRole", deleteRequest.requestedBySystemRole)
      .append("requestedAt", deleteRequest.requestedAt);
  }

  private void hydrateDeleteRequestRequester(Family family) {
    if (family == null
        || family.deleteRequest == null
        || family.deleteRequest.requestedByUserId == null) {
      return;
    }

    Users requester = findUserById(family.deleteRequest.requestedByUserId);
    if (requester == null) {
      return;
    }

    family.deleteRequest.requestedByUserName = displayNameForUser(requester);
    if (requester.systemRole != null) {
      family.deleteRequest.requestedBySystemRole = requester.systemRole.name();
    }
  }

  private Users findUserById(String userId) {
    if (userId == null || userId.isBlank()) {
      return null;
    }
    try {
      return usersCollection.find(eq("_id", new ObjectId(userId))).first();
    } catch (IllegalArgumentException e) {
      return null;
    }
  }

  private String displayNameForUser(Users user) {
    if (user == null) {
      return null;
    }
    if (user.fullName != null && !user.fullName.isBlank()) {
      return user.fullName;
    }
    return user.username;
  }

  private interface HelpSessionMutation {
    Family run();
  }

}
