// Packages /
package umm3601.Family;

// Static Imports
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.regex;

// Java Imports
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
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
import io.javalin.Javalin;
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;

// Misc Imports
import umm3601.Controller;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;
import umm3601.settings.Settings;

/* FamilyController Contains the Following:
- getFamilies()
- getFamily() /By ID/
- addNewFamily()
- deleteFamily() /By ID/
- getDashboardStats() /Has its own API/
- exportFamiliesAsCSV()
*/

// Controller
public class FamilyController implements Controller {
  // API Endpoints
  private static final String API_FAMILY = "/api/family";
  private static final String API_SCHEDULE_FAMILIES = "/api/family/schedule";
  private static final String API_DASHBOARD = "/api/dashboard";
  private static final String API_FAMILY_BY_ID = "/api/family/{id}";
  private static final String API_FAMILY_EXPORT = "/api/family/export";
  private static final String API_FAMILY_HELPED = "/api/family/{id}/helped";
  private static final String API_FAMILY_STATUS = "/api/family/{id}/status";
  private static final String API_FAMILY_CHECKLIST = "/api/family/{id}/checklist";
  private static final String API_FAMILY_HELP_SESSION = "/api/family/{id}/help-session";
  private static final String API_FAMILY_HELP_SESSION_START = "/api/family/{id}/help-session/start";
  private static final String API_FAMILY_HELP_SESSION_SAVE_CHILD = "/api/family/{id}/help-session/save-child";
  private static final String API_FAMILY_HELP_SESSION_SAVE_ALL = "/api/family/{id}/help-session/save-all";
  private static final String API_FAMILY_HELP_SESSION_CLEAR = "/api/family/{id}/help-session/clear";
  private static final String STATUS_HELPED = "helped";
  private static final String STATUS_NOT_HELPED = "not_helped";
  private static final String STATUS_BEING_HELPED = "being_helped";
  private static final String REASON_AVAILABLE_DIDNT_NEED = "available_didnt_need";
  private static final String REASON_NOT_AVAILABLE_DIDNT_RECEIVE = "not_available_didnt_receive";
  private static final String REASON_SUBSTITUTED = "substituted";

  // Regex
  public static final String EMAIL_REGEX = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$";

  // Filter key
  static final String FAMILY_KEY = "guardianName";
  static final String FIRST_NAME_KEY = "guardianFirstName";
  static final String LAST_NAME_KEY = "guardianLastName";
  static final String STATUS_KEY = "status";
  static final String HELPED_KEY = "helped";

  // Database Collection
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final JacksonMongoCollection<Settings> settingsCollection;


  // Database Constructor
  public FamilyController(MongoDatabase database) {
    familyCollection = JacksonMongoCollection.builder().build(
        database,
        "family",
        Family.class,
        UuidRepresentation.STANDARD);
    supplyListCollection = JacksonMongoCollection.builder().build(
        database,
        "supplylist",
        SupplyList.class,
        UuidRepresentation.STANDARD);
    inventoryCollection = JacksonMongoCollection.builder().build(
        database,
        "inventory",
        Inventory.class,
        UuidRepresentation.STANDARD);
    settingsCollection = JacksonMongoCollection.builder().build(
      database,
      "settings",
      Settings.class,
      UuidRepresentation.STANDARD);
  }

  // GET all families
  public void getFamilies(Context ctx) {
    Bson filter = constructDatabaseFilter(ctx);

    ArrayList<Family> matchingFamilies = familyCollection.find(filter).into(new ArrayList<>());
    matchingFamilies = applyComputedFilters(matchingFamilies, ctx);

    ctx.json(matchingFamilies);
    ctx.status(HttpStatus.OK);
  }

  // GET family by ID
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

  // takes the list of families and goes through them one by one sorting them into the first available time slot
  public ArrayList<Family> schedulingAlgorithm(ArrayList<Family> families, int capacity) {
    int earlyMorningCapacity = 0; // current number of people in a timeslot
    int lateMorningCapacity = 0;
    int earlyAfternoonCapacity = 0;
    int lateAfternoonCapacity = 0;

    families.sort(Comparator.comparingInt(f -> f.timeAvailability.countTrue()));

    Settings.TimeAvailabilityLabels currentSettings = new Settings.TimeAvailabilityLabels();

    for (int j = 0; j < families.size(); j++) {
      int famSize = families.get(j).students.size() + 1;

      // goes through for each item in the array
      if (families.get(j).timeAvailability.earlyMorning) {
        // checks if earlyMorning availability is marked true
        if (earlyMorningCapacity + famSize <= capacity) {
          // checks if the family fits within the capacity restraints of the bin
          families.get(j).timeSlot = currentSettings.earlyMorning;
          // should correspond with set timeslot in settings
          earlyMorningCapacity += famSize;
          // adds the number of people in the family to the capacity
          continue;
        }
      }

      if (families.get(j).timeAvailability.lateMorning) {
        // checks if lateMorning availability is marked true
        if (lateMorningCapacity + famSize <= capacity) {
          // checks if the family fits within the capacity restraints of the bin
          families.get(j).timeSlot = currentSettings.lateMorning;
          //should correspond with set timeslot in settings
          lateMorningCapacity += famSize;
          // adds the number of people in the family to the capacity
          continue;
        }
      }

      if (families.get(j).timeAvailability.earlyAfternoon) {
        // checks if earlyAfternoon availability is marked true
        if (earlyAfternoonCapacity + famSize <= capacity) {
          // checks if the family fits within the capacity restraints of the bin
          families.get(j).timeSlot = currentSettings.earlyAfternoon;
          //should correspond with set timeslot in settings
          earlyAfternoonCapacity += famSize;
          // adds the number of people in the family to the capacity
          continue;
        }
      }

      if (families.get(j).timeAvailability.lateAfternoon) {
        // checks if lateAfternoon availability is marked true
        if (lateAfternoonCapacity + famSize <= capacity) {
          // checks if the family fits within the capacity restraints
          families.get(j).timeSlot = currentSettings.lateAfternoon;
          //should correspond with set timeslot in settings
          lateAfternoonCapacity += famSize;
          // adds the number of people in the family to the capacity
          continue;
        }
      }

      throw new NotFoundResponse("Not all families were able to be sorted, your event capacity may be too low");

    }
    return families;
  }

  public void scheduleFamilies(Context ctx) {
    Bson filter = constructDatabaseFilter(ctx);

    Settings settings = settingsCollection.find().first();

    ArrayList<Family> families = familyCollection
        .find(filter)
        .into(new ArrayList<>()); //loading families

    int capacity = settings.availableSpots;

    schedulingAlgorithm(families, capacity); // scheduling families

    List<WriteModel<Family>> updates = new ArrayList<>();

    for (Family fam : families) {
        updates.add(
            new UpdateOneModel<>(
                Filters.eq("_id", fam._id),
                Updates.set("timeSlot", fam.timeSlot)
            )
        );
    }

    familyCollection.bulkWrite(updates);

    ctx.json(families);
    ctx.status(HttpStatus.OK);
  }

  // Filter for families
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
    familyCollection.insertOne(newFamily);

    ctx.json(Map.of("id", newFamily._id));
    ctx.status(HttpStatus.CREATED);
  }

  // UPDATE family
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
      .append("email", updatedFamily.email)
      .append("address", updatedFamily.address)
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
      .append("checklist", checklistToDocument(updatedFamily.checklist))
    );

    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();

    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // DELETE family
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

  public void updateFamilyHelped(Context ctx) {
    updateFamilyStatus(ctx);
  }

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

  public void updateFamilyChecklist(Context ctx) {
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

    Family.FamilyChecklist normalizedChecklist = normalizeChecklist(
      checklistUpdate.getChecklist(),
      existingFamily.guardianName,
      existingFamily.students
    );

    Bson update = new Document("$set", new Document("checklist", checklistToDocument(normalizedChecklist)));
    familyCollection.updateOne(eq("_id", familyId), update);

    Family result = familyCollection.find(eq("_id", familyId)).first();
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  public void getFamilyHelpSession(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    if (family.checklist == null || !family.checklist.snapshot) {
      family.checklist = generateChecklistSnapshot(family);
      family.status = STATUS_BEING_HELPED;
      family.helped = false;
      persistFamilyChecklistAndStatus(family);
      family = familyCollection.find(eq("_id", new ObjectId(family._id))).first();
    }

    ctx.json(family);
    ctx.status(HttpStatus.OK);
  }

  public void startFamilyHelpSession(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));

    if (family.checklist == null || !family.checklist.snapshot) {
      family.checklist = generateChecklistSnapshot(family);
    }

    family.status = STATUS_BEING_HELPED;
    family.helped = false;
    persistFamilyChecklistAndStatus(family);

    Family result = familyCollection.find(eq("_id", new ObjectId(family._id))).first();
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  public void saveFamilyHelpSessionChild(Context ctx) {
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
    commitSectionInventoryChanges(normalizedSection);
    normalizedSection.saved = true;
    replaceSection(family.checklist, normalizedSection);

    family.status = areAllSectionsSaved(family.checklist) ? STATUS_HELPED : STATUS_BEING_HELPED;
    family.helped = STATUS_HELPED.equals(family.status);
    if (family.helped) {
      family.checklist = null;
    }
    persistFamilyChecklistAndStatus(family);

    Family result = familyCollection.find(eq("_id", new ObjectId(family._id))).first();
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  public void saveFamilyHelpSessionAll(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureHelpSessionExists(family);

    FamilyHelpSessionSaveAllRequest request = ctx.bodyValidator(FamilyHelpSessionSaveAllRequest.class).get();
    if (request.getChecklist() != null) {
      family.checklist = normalizeChecklist(request.getChecklist(), family.guardianName, family.students);
      family.checklist.snapshot = true;
    }

    for (Family.ChecklistSection section : family.checklist.sections) {
      if (!section.saved) {
        Family.ChecklistSection normalizedSection = normalizeSectionForSave(section.id, section);
        commitSectionInventoryChanges(normalizedSection);
        normalizedSection.saved = true;
        replaceSection(family.checklist, normalizedSection);
      }
    }

    family.status = STATUS_HELPED;
    family.helped = true;
    family.checklist = null;
    persistFamilyChecklistAndStatus(family);

    Family result = familyCollection.find(eq("_id", new ObjectId(family._id))).first();
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  public void clearFamilyHelpSession(Context ctx) {
    Family family = requireFamily(ctx.pathParam("id"));
    ensureHelpSessionExists(family);

    family.checklist = null;
    family.status = STATUS_NOT_HELPED;
    family.helped = false;
    persistFamilyChecklistAndStatus(family);

    Family result = familyCollection.find(eq("_id", new ObjectId(family._id))).first();
    ctx.json(result);
    ctx.status(HttpStatus.OK);
  }

  // GET dashboard stats
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

  // GET export families as CSV
  public void exportFamiliesAsCSV(Context ctx) {
    List<Family> families = familyCollection.find().into(new ArrayList<>());

    StringBuilder csv = new StringBuilder();

    // Headers
    csv.append("Guardian Name,Email,Address,Time Slot,Number of Students\n");

    // Fill rows
    for (Family family : families) {
      int studentCount = family.students != null ? family.students.size() : 0;

      csv.append(String.format("\"%s\",\"%s\",\"%s\",\"%s\",%d\n",
        cleanUpCSV(family.guardianName),
        cleanUpCSV(family.email),
        cleanUpCSV(family.address),
        cleanUpCSV(family.timeSlot),
        studentCount
      ));
    }

    // Set response headers for CSV download
    ctx.contentType("text/csv");
    ctx.header("Content-Disposition", "attachment; filename=families.csv");
    ctx.status(HttpStatus.OK);
    ctx.result(csv.toString());
  }

  // This method cleans up the CSV to ensure the generated CSV is formatted properly
  // and won't have issues with any spreadsheet software
  public static String cleanUpCSV(String value) {
    // Handle null values
    if (value == null) {
      return "";
    }

    // Clean up line breaks (flatten them). Ensures each family always occupies a single CSV row
    String cleaned = value
      .replace("\r\n", " ")
      .replace("\n", " ")
      .replace("\r", " ");

    // Put a single ' in front of any =, + , -, or @ to ensure spreadsheet software doesn't see it as a formula
    // There shouldn't ever be any data like this, but this is just in case
    if (cleaned.matches("^[\\t ]*[=+\\-@].*")) {
      cleaned = "'" + cleaned;
    }

    // Replace " with "" to escape CSV quotes
    return cleaned.replace("\"", "\"\"");
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

  private Family.FamilyChecklist generateChecklistSnapshot(Family family) {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    checklist.templateId = "family-help-session-v1";
    checklist.printableTitle = family.guardianName + " Checklist";
    checklist.snapshot = true;
    checklist.sections = new ArrayList<>();

    int studentIndex = 1;
    for (Family.StudentInfo student : family.students) {
      Family.ChecklistSection section = new Family.ChecklistSection();
      section.id = "student-" + studentIndex;
      section.title = hasText(student.name) ? student.name : "Student " + studentIndex;
      section.printableTitle = section.title;
      section.saved = false;
      section.items = buildChecklistItemsForStudent(student, section.id);
      checklist.sections.add(section);
      studentIndex++;
    }

    return normalizeChecklist(checklist, family.guardianName, family.students);
  }

  private List<Family.ChecklistItem> buildChecklistItemsForStudent(Family.StudentInfo student, String sectionId) {
    List<Family.ChecklistItem> checklistItems = new ArrayList<>();
    List<SupplyList> supplyLists = getSupplyListsForStudent(student);

    int itemIndex = 1;
    for (SupplyList supplyList : supplyLists) {
      Family.ChecklistItem item = buildChecklistItemSnapshot(supplyList, sectionId + "-item-" + itemIndex);
      checklistItems.add(item);
      itemIndex++;
    }

    return checklistItems;
  }

  private List<SupplyList> getSupplyListsForStudent(Family.StudentInfo student) {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    ArrayList<SupplyList> matching = new ArrayList<>();

    for (SupplyList supplyList : allSupplyLists) {
      if (!nameEquivalent(supplyList.school, student.school)) {
        continue;
      }
      if (!nameEquivalent(supplyList.grade, student.grade)) {
        continue;
      }
      if (hasText(supplyList.teacher) && !nameEquivalent(supplyList.teacher, student.teacher)) {
        continue;
      }
      matching.add(supplyList);
    }

    matching.sort(Comparator.comparing(supplyList -> supplyList.toString().toLowerCase(Locale.US)));
    return matching;
  }

  private Family.ChecklistItem buildChecklistItemSnapshot(SupplyList supplyList, String itemId) {
    Family.ChecklistItem checklistItem = new Family.ChecklistItem();
    checklistItem.id = itemId;
    checklistItem.label = supplyList.toString();
    checklistItem.itemDescription = supplyList.toString();
    checklistItem.supplyListId = supplyList._id;
    checklistItem.requestedQuantity = supplyList.quantity == null || supplyList.quantity <= 0 ? 1 : supplyList.quantity;

    Inventory match = findBestInventoryMatch(supplyList);
    checklistItem.available = match != null && match.quantity > 0;
    checklistItem.selected = checklistItem.available;
    checklistItem.matchedInventoryId = match != null ? match.internalID : null;

    return checklistItem;
  }

  private Inventory findBestInventoryMatch(SupplyList supplyList) {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());

    return inventories.stream()
      .filter(inventory -> inventory.quantity > 0)
      .filter(inventory -> inventoryMatchesSupplyList(inventory, supplyList))
      .max(Comparator.comparingInt(this::inventorySpecificityScore))
      .orElse(null);
  }

  private boolean inventoryMatchesSupplyList(Inventory inventory, SupplyList supplyList) {
    if (supplyList.item == null || supplyList.item.isEmpty()) {
      return false;
    }

    boolean itemMatch = supplyList.item.stream().anyMatch(item -> nameEquivalent(item, inventory.item));
    if (!itemMatch) {
      return false;
    }

    if (!matchesAttribute(supplyList.brand, inventory.brand)) {
      return false;
    }
    if (!matchesColorAttribute(supplyList.color, inventory.color)) {
      return false;
    }
    if (!matchesAttribute(supplyList.size, inventory.size)) {
      return false;
    }
    if (!matchesAttribute(supplyList.type, inventory.type)) {
      return false;
    }
    if (!matchesAttribute(supplyList.material, inventory.material)) {
      return false;
    }
    if (supplyList.packageSize != null && supplyList.packageSize > 0 && inventory.packageSize > 0
      && !Objects.equals(supplyList.packageSize, inventory.packageSize)) {
      return false;
    }

    return true;
  }

  private int inventorySpecificityScore(Inventory inventory) {
    int score = 0;
    if (hasValue(inventory.brand)) {
      score++;
    }
    if (hasValue(inventory.color)) {
      score++;
    }
    if (hasValue(inventory.size)) {
      score++;
    }
    if (hasValue(inventory.type)) {
      score++;
    }
    if (hasValue(inventory.material)) {
      score++;
    }
    if (inventory.packageSize > 1) {
      score++;
    }
    return score;
  }

  private boolean matchesAttribute(SupplyList.AttributeOptions options, String inventoryValue) {
    if (options == null) {
      return true;
    }
    if (hasText(options.allOf) && !nameEquivalent(options.allOf, inventoryValue)) {
      return false;
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
    }
    return true;
  }

  private boolean matchesColorAttribute(SupplyList.ColorAttributeOptions options, String inventoryValue) {
    if (options == null) {
      return true;
    }
    if (options.allOf != null && !options.allOf.isEmpty()) {
      boolean allOfMatch = options.allOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
      if (!allOfMatch) {
        return false;
      }
    }
    if (options.anyOf != null && !options.anyOf.isEmpty()) {
      return options.anyOf.stream().anyMatch(option -> nameEquivalent(option, inventoryValue));
    }
    return true;
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

    int itemIndex = 1;
    for (Family.ChecklistItem item : normalizedSection.items) {
      if (!hasText(item.id)) {
        item.id = sectionId + "-item-" + itemIndex;
      }
      if (item.requestedQuantity == null || item.requestedQuantity <= 0) {
        item.requestedQuantity = 1;
      }
      item.notPickedUpReason = normalizeReason(item.notPickedUpReason);
      itemIndex++;
    }

    return normalizedSection;
  }

  private void commitSectionInventoryChanges(Family.ChecklistSection section) {
    for (Family.ChecklistItem item : section.items) {
      validateChecklistItemForSave(item);

      if (item.selected) {
        consumeInventory(item.matchedInventoryId, item.requestedQuantity);
      } else if (hasText(item.substituteBarcode)) {
        Inventory substituteInventory = findInventoryByBarcode(item.substituteBarcode);
        if (substituteInventory == null) {
          throw new NotFoundResponse("No inventory item found for substitute barcode: " + item.substituteBarcode);
        }
        consumeInventory(substituteInventory.internalID, item.requestedQuantity);
        item.substituteInventoryId = substituteInventory.internalID;
        item.substituteItem = substituteInventory.item;
        item.substituteDescription = substituteInventory.description;
        item.notPickedUpReason = REASON_SUBSTITUTED;
      }
    }
  }

  private void validateChecklistItemForSave(Family.ChecklistItem item) {
    if (item.selected && !item.available) {
      throw new BadRequestResponse("Unavailable items cannot be saved as selected.");
    }

    if (!item.selected) {
      boolean hasSubstitution = hasText(item.substituteBarcode);
      boolean hasReason = hasText(item.notPickedUpReason);

      if (!item.available && !hasReason && !hasSubstitution) {
        item.notPickedUpReason = REASON_NOT_AVAILABLE_DIDNT_RECEIVE;
        hasReason = true;
      }

      if (!hasSubstitution && !hasReason) {
        throw new BadRequestResponse("Unchecked items must include a reason or substitution barcode.");
      }

      if (hasReason && !isValidNotPickedUpReason(item.notPickedUpReason)) {
        throw new BadRequestResponse(
          "Checklist reason must be available_didnt_need, not_available_didnt_receive, or substituted.");
      }
    }
  }

  private boolean isValidNotPickedUpReason(String reason) {
    String normalizedReason = normalizeReason(reason);
    return REASON_AVAILABLE_DIDNT_NEED.equals(normalizedReason)
      || REASON_NOT_AVAILABLE_DIDNT_RECEIVE.equals(normalizedReason)
      || REASON_SUBSTITUTED.equals(normalizedReason);
  }

  private String normalizeReason(String reason) {
    if (reason == null) {
      return null;
    }
    return reason.trim()
      .toLowerCase(Locale.US)
      .replace("'", "")
      .replaceAll("[\\s-]+", "_");
  }

  private Inventory findInventoryByBarcode(String barcode) {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    for (Inventory inventory : inventories) {
      if (nameEquivalent(inventory.internalBarcode, barcode)) {
        return inventory;
      }
      if (inventory.externalBarcode != null && inventory.externalBarcode.stream()
        .anyMatch(code -> nameEquivalent(code, barcode))) {
        return inventory;
      }
    }
    return null;
  }

  private void consumeInventory(String internalId, int amount) {
    if (!hasText(internalId)) {
      throw new BadRequestResponse("A selected checklist item is missing its inventory match.");
    }

    Inventory inventory = inventoryCollection.find(eq("internalID", internalId)).first();
    if (inventory == null) {
      throw new NotFoundResponse("No item found for internalID: " + internalId);
    }
    if (inventory.quantity < amount) {
      throw new BadRequestResponse("Inventory quantity is too low to fulfill checklist item: " + internalId);
    }

    inventoryCollection.updateOne(eq("_id",
     new ObjectId(inventory._id)), Updates.set("quantity", inventory.quantity - amount));
  }

  private boolean nameEquivalent(String left, String right) {
    return normalizeToken(left).equals(normalizeToken(right));
  }

  private String normalizeToken(String value) {
    if (value == null) {
      return "";
    }
    String normalized = value.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9]+", "");
    if (normalized.endsWith("s") && normalized.length() > 1) {
      return normalized.substring(0, normalized.length() - 1);
    }
    return normalized;
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private boolean hasValue(String value) {
    return hasText(value) && !"n/a".equalsIgnoreCase(value.trim());
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

    if (normalizedChecklist.sections.isEmpty() && students != null) {
      int studentIndex = 1;
      for (Family.StudentInfo student : students) {
        Family.ChecklistSection section = new Family.ChecklistSection();
        section.id = "student-" + studentIndex;
        String studentName = student != null && student.name != null && !student.name.isBlank()
          ? student.name
          : "Student " + studentIndex;
        section.title = studentName;
        section.printableTitle = studentName;
        section.items = new ArrayList<>();
        normalizedChecklist.sections.add(section);
        studentIndex++;
      }
    }

    int sectionIndex = 1;
    for (Family.ChecklistSection section : normalizedChecklist.sections) {
      if (section.items == null) {
        section.items = new ArrayList<>();
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
        if (item.id == null || item.id.isBlank()) {
          item.id = section.id + "-item-" + itemIndex;
        }
        if (item.requestedQuantity == null || item.requestedQuantity <= 0) {
          item.requestedQuantity = 1;
        }
        item.notPickedUpReason = normalizeReason(item.notPickedUpReason);
        itemIndex++;
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
            itemDocuments.add(new Document()
              .append("id", item.id)
              .append("label", item.label)
              .append("selected", item.selected)
              .append("available", item.available)
              .append("itemDescription", item.itemDescription)
              .append("supplyListId", item.supplyListId)
              .append("matchedInventoryId", item.matchedInventoryId)
              .append("requestedQuantity", item.requestedQuantity)
              .append("notPickedUpReason", item.notPickedUpReason)
              .append("substituteItem", item.substituteItem)
              .append("substituteBarcode", item.substituteBarcode)
              .append("substituteDescription", item.substituteDescription)
              .append("substituteInventoryId", item.substituteInventoryId)
              .append("notes", item.notes));
          }
        }

        sectionDocuments.add(new Document()
          .append("id", section.id)
          .append("title", section.title)
          .append("printableTitle", section.printableTitle)
          .append("saved", section.saved)
          .append("items", itemDocuments));
      }
    }

    return new Document()
      .append("templateId", checklist.templateId)
      .append("printableTitle", checklist.printableTitle)
      .append("snapshot", checklist.snapshot)
      .append("sections", sectionDocuments);
  }

  @Override
  public void addRoutes(Javalin server) {
    server.get(API_FAMILY_EXPORT, this::exportFamiliesAsCSV);
    server.get(API_FAMILY, this::getFamilies);
    server.get(API_FAMILY_BY_ID, this::getFamily);
    server.get(API_DASHBOARD, this::getDashboardStats);
    server.get(API_FAMILY_HELP_SESSION, this::getFamilyHelpSession);

    server.put(API_FAMILY_BY_ID, this::updateFamily);
    server.patch(API_FAMILY_HELPED, this::updateFamilyHelped);
    server.patch(API_FAMILY_STATUS, this::updateFamilyStatus);
    server.patch(API_FAMILY_CHECKLIST, this::updateFamilyChecklist);

    server.post(API_FAMILY, this::addNewFamily);
    server.post(API_SCHEDULE_FAMILIES, this::scheduleFamilies);
    server.post(API_FAMILY_HELP_SESSION_START, this::startFamilyHelpSession);
    server.post(API_FAMILY_HELP_SESSION_SAVE_CHILD, this::saveFamilyHelpSessionChild);
    server.post(API_FAMILY_HELP_SESSION_SAVE_ALL, this::saveFamilyHelpSessionAll);
    server.post(API_FAMILY_HELP_SESSION_CLEAR, this::clearFamilyHelpSession);

    server.delete(API_FAMILY_BY_ID, this::deleteFamily);
  }
}
