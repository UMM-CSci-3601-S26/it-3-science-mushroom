package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import umm3601.Common.InventoryMatcher;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

@SuppressWarnings({ "MagicNumber", "checkstyle:MethodLength" })
class FamilyChecklistServiceSpec {
  private FamilyChecklistService familyChecklistService;

  private static MongoClient mongoClient;
  private static MongoDatabase db;

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
  void setupEach() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("settings").drop();

    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc("Backpack"),
      supplyListDoc("Water Bottle")));

    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Backpack", "Student Backpack", 3, "ID-10000", "ITEM-10000", "EXT-10000"),
      inventoryDoc("Notebook", "Wide Ruled Notebook", 4, "ID-10001", "ITEM-10001", "SUB-10001"),
      inventoryDoc("Water Bottle", "Blue Water Bottle", 0, "ID-10002", "ITEM-10002", "EXT-10002")));

    InventoryMatcher inventoryMatcher = new InventoryMatcher(db);
    familyChecklistService = new FamilyChecklistService(db, inventoryMatcher);
  }

  @Test
  void bestInventoryDescriptionFallsBackToItemString() throws Exception {
    Inventory inventoryWithDescription = new Inventory();
    inventoryWithDescription.item = "Backpack";
    inventoryWithDescription.description = "Blue student backpack";

    Inventory inventoryWithoutDescription = new Inventory();
    inventoryWithoutDescription.item = "Notebook";
    inventoryWithoutDescription.description = "";

    assertEquals("Blue student backpack", invokeBestInventoryDescription(inventoryWithDescription));
    assertEquals("Notebook", invokeBestInventoryDescription(inventoryWithoutDescription));
  }

  @Test
  void getSupplyListsForStudentCoversTeacherMismatchAndNoMatches() throws Exception {
    db.getCollection("supplylist").insertOne(new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "Ms Smith")
      .append("item", List.of("Folder"))
      .append("quantity", 1));

    Family.StudentInfo mismatchedSchool = new Family.StudentInfo();
    mismatchedSchool.school = "Different";
    mismatchedSchool.grade = "5";
    mismatchedSchool.teacher = "N/A";

    List<SupplyList> noMatches = invokeGetSupplyListsForStudent(mismatchedSchool);
    assertEquals(0, noMatches.size());

    Family.StudentInfo mismatchedGrade = new Family.StudentInfo();
    mismatchedGrade.school = "Roosevelt";
    mismatchedGrade.grade = "6";
    mismatchedGrade.teacher = "N/A";

    List<SupplyList> wrongGradeMatches = invokeGetSupplyListsForStudent(mismatchedGrade);
    assertEquals(0, wrongGradeMatches.size());

    Family.StudentInfo mismatchedTeacher = new Family.StudentInfo();
    mismatchedTeacher.school = "Roosevelt";
    mismatchedTeacher.grade = "5";
    mismatchedTeacher.teacher = "N/A";

    List<SupplyList> filteredMatches = invokeGetSupplyListsForStudent(mismatchedTeacher);
    assertEquals(2, filteredMatches.size());
  }

  @Test
  void getSupplyListsForStudentMatchesSchoolAcronymsAndGradeFormats() throws Exception {
    db.getCollection("supplylist").drop();
    db.getCollection("supplylist").insertMany(List.of(
      new Document()
        .append("district", "District 1")
        .append("school", "Morris Area High School")
        .append("grade", "12th Grade")
        .append("teacher", "N/A")
        .append("item", List.of("Notebook"))
        .append("quantity", 1),
      new Document()
        .append("district", "District 1")
        .append("school", "Morris Area High School")
        .append("grade", "High School")
        .append("teacher", "")
        .append("item", List.of("Folder"))
        .append("quantity", 1),
      new Document()
        .append("district", "District 1")
        .append("school", "Morris Area Middle School")
        .append("grade", "Middle School")
        .append("teacher", "")
        .append("item", List.of("Pencil"))
        .append("quantity", 1),
      new Document()
        .append("district", "District 1")
        .append("school", "Morris Area Elementary")
        .append("grade", "Elementary")
        .append("teacher", "")
        .append("item", List.of("Crayon"))
        .append("quantity", 1)));

    Family.StudentInfo student = new Family.StudentInfo();
    student.school = "MAHS";
    student.grade = "12";
    student.teacher = "N/A";

    List<SupplyList> matches = invokeGetSupplyListsForStudent(student);

    assertEquals(2, matches.size());
    assertTrue(matches.stream().anyMatch(match -> List.of("Notebook").equals(match.item)));
    assertTrue(matches.stream().anyMatch(match -> List.of("Folder").equals(match.item)));

    Family.StudentInfo middleSchoolStudent = new Family.StudentInfo();
    middleSchoolStudent.school = "MAMS";
    middleSchoolStudent.grade = "7";
    middleSchoolStudent.teacher = "N/A";

    List<SupplyList> middleSchoolMatches = invokeGetSupplyListsForStudent(middleSchoolStudent);
    assertEquals(1, middleSchoolMatches.size());
    assertEquals(List.of("Pencil"), middleSchoolMatches.get(0).item);

    Family.StudentInfo elementaryStudent = new Family.StudentInfo();
    elementaryStudent.school = "MAE";
    elementaryStudent.grade = "5";
    elementaryStudent.teacher = "N/A";

    List<SupplyList> elementaryMatches = invokeGetSupplyListsForStudent(elementaryStudent);
    assertEquals(1, elementaryMatches.size());
    assertEquals(List.of("Crayon"), elementaryMatches.get(0).item);
  }

  @Test
  void buildChecklistItemSnapshotCoversUnavailableFallbackBranch() throws Exception {
    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Scissors");
    supplyList.quantity = 0;

    Family.ChecklistItem item = invokeBuildChecklistItemSnapshot(supplyList, "section-item-1");

    assertEquals("section-item-1", item.id);
    assertEquals(1, item.requestedQuantity);
    assertFalse(item.available);
    assertFalse(item.selected);
    assertNull(item.matchedInventoryId);
  }

  @Test
  void buildChecklistItemSnapshotSuggestsSubstituteWhenStrictMatchIsUnavailable() throws Exception {
    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Composition Notebook");
    supplyList.quantity = 1;

    Family.ChecklistItem item = invokeBuildChecklistItemSnapshot(supplyList, "section-item-1");

    assertFalse(item.available);
    assertFalse(item.selected);
    assertNull(item.matchedInventoryId);
    assertEquals("ID-10001", item.substituteInventoryId);
    assertNull(item.substituteBarcode);
    assertEquals("Notebook", item.substituteItem);
    assertEquals("Wide Ruled Notebook", item.substituteDescription);
  }

  @Test
  void buildChecklistItemSnapshotPrefersSimpleMatchForBroadRequest() throws Exception {
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      new Document()
        .append("item", "Pencil")
        .append("description", "Pencil")
        .append("quantity", 4)
        .append("internalID", "PLAIN-PENCIL")
        .append("internalBarcode", "PLAIN-PENCIL"),
      new Document()
        .append("item", "Pencil")
        .append("description", "Yellow pencil")
        .append("quantity", 30)
        .append("color", "Yellow")
        .append("internalID", "YELLOW-PENCIL")
        .append("internalBarcode", "YELLOW-PENCIL"),
      new Document()
        .append("item", "Pencil")
        .append("description", "Number 2 black Ticonderoga unsharpened pencil")
        .append("quantity", 100)
        .append("brand", "Ticonderoga")
        .append("color", "Black")
        .append("type", "Number 2")
        .append("material", "Wood")
        .append("internalID", "SPECIFIC-PENCIL")
        .append("internalBarcode", "SPECIFIC-PENCIL")));

    SupplyList supplyList = new SupplyList();
    supplyList.item = List.of("Pencil");
    supplyList.quantity = 1;

    Family.ChecklistItem item = invokeBuildChecklistItemSnapshot(supplyList, "section-item-1");

    assertTrue(item.available);
    assertFalse(item.selected);
    assertEquals("PLAIN-PENCIL", item.matchedInventoryId);
  }

  @Test
  void generateChecklistSnapshotDoesNotReuseOneLinkedInventoryCountAcrossRows() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc("Colored Pencil", List.of("ID-10020")),
      supplyListDoc("Graphite Pencil", List.of("ID-10020"))));
    db.getCollection("inventory").insertOne(
      inventoryDoc("Pencil", "Shared Pencil", 1, "ID-10020", "ITEM-10020", "EXT-10020"));

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithOneStudent());
    List<Family.ChecklistItem> items = checklist.sections.get(0).items;

    assertEquals(2, items.size());
    assertEquals(1, items.stream().filter(item -> item.available).count());
    assertEquals(1, items.stream().filter(item -> !item.available).count());
    assertEquals(1, items.stream()
      .filter(item -> "ID-10020".equals(item.matchedInventoryId))
      .count());
  }

  @Test
  void generateChecklistSnapshotMovesToNextLinkedInventoryWhenFirstLinkedItemIsSpent() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc("Colored Pencil", List.of("ID-10020", "ID-10021")),
      supplyListDoc("Graphite Pencil", List.of("ID-10020", "ID-10021"))));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Pencil", "First Pencil", 1, "ID-10020", "ITEM-10020", "EXT-10020"),
      inventoryDoc("Pencil", "Second Pencil", 1, "ID-10021", "ITEM-10021", "EXT-10021")));

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithOneStudent());
    List<Family.ChecklistItem> items = checklist.sections.get(0).items;

    assertEquals(2, items.size());
    assertTrue(items.stream().allMatch(item -> item.available));
    assertEquals(List.of("ID-10020", "ID-10021"), items.stream()
      .map(item -> item.matchedInventoryId)
      .toList());
  }

  @Test
  void generateChecklistSnapshotSharesLinkedInventoryLedgerAcrossStudentSections() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("supplylist").insertOne(supplyListDoc("Backpack", List.of("ID-10020")));
    db.getCollection("inventory").insertOne(
      inventoryDoc("Backpack", "Shared Backpack", 1, "ID-10020", "ITEM-10020", "EXT-10020"));

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithTwoStudents());
    List<Family.ChecklistItem> firstStudentItems = checklist.sections.get(0).items;
    List<Family.ChecklistItem> secondStudentItems = checklist.sections.get(1).items;

    assertEquals(1, firstStudentItems.size());
    assertEquals(1, secondStudentItems.size());
    assertTrue(firstStudentItems.get(0).available);
    assertEquals("ID-10020", firstStudentItems.get(0).matchedInventoryId);
    assertFalse(secondStudentItems.get(0).available);
    assertNull(secondStudentItems.get(0).matchedInventoryId);
  }

  @Test
  void generateChecklistSnapshotUsesSavedDriveOrderForChecklistItems() {
    seedSupplyOrder(
      supplyOrderDoc("Water Bottle", "staged"),
      supplyOrderDoc("Backpack", "unstaged"));

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithOneStudent());
    List<String> labels = checklist.sections.get(0).items.stream()
      .map(item -> item.label)
      .toList();

    assertEquals(List.of("1 Water Bottle", "1 Backpack"), labels);
  }

  @Test
  void generateChecklistSnapshotExcludesNotGivenDriveOrderItems() {
    seedSupplyOrder(supplyOrderDoc("Backpacks", "notGiven"));
    db.getCollection("inventory").insertOne(
      inventoryDoc("Backpack", "Extra Inventory Backpack", 5, "ID-10021", "ITEM-10021", "EXT-10021"));

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithOneStudent());
    List<String> labels = checklist.sections.get(0).items.stream()
      .map(item -> item.label)
      .toList();
    List<String> notGivenLabels = checklist.sections.get(0).notGivenItems.stream()
      .map(item -> item.label)
      .toList();

    assertEquals(List.of("1 Water Bottle"), labels);
    assertEquals(List.of("1 Backpack"), notGivenLabels);
  }

  private Document supplyListDoc(String item) {
    return new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "N/A")
      .append("item", List.of(item))
      .append("quantity", 1);
  }

  private Document supplyListDoc(String item, List<String> invIDs) {
    return supplyListDoc(item)
      .append("invIDs", invIDs);
  }

  private Document inventoryDoc(String item, String description, int quantity,
      String internalId, String internalBarcode, String externalBarcode) {
    return new Document()
      .append("item", item)
      .append("description", description)
      .append("quantity", quantity)
      .append("reservedQuantity", 0)
      .append("packageSize", 1)
      .append("internalID", internalId)
      .append("internalBarcode", internalBarcode)
      .append("externalBarcode", List.of(externalBarcode));
  }

  private void seedSupplyOrder(Document... orderEntries) {
    db.getCollection("settings").drop();
    db.getCollection("settings").insertOne(new Document("_id", "app-settings")
      .append("supplyOrder", List.of(orderEntries)));
  }

  private Document supplyOrderDoc(String itemTerm, String status) {
    return new Document()
      .append("itemTerm", itemTerm)
      .append("status", status);
  }

  private Family familyWithOneStudent() {
    Family family = new Family();
    family.guardianName = "Test Guardian";
    family.students = List.of(student("Alex"));
    return family;
  }

  private Family familyWithTwoStudents() {
    Family family = new Family();
    family.guardianName = "Test Guardian";
    family.students = List.of(student("Alex"), student("Jordan"));
    return family;
  }

  private Family.StudentInfo student(String name) {
    Family.StudentInfo student = new Family.StudentInfo();
    student.name = name;
    student.school = "Roosevelt";
    student.grade = "5";
    student.teacher = "N/A";
    return student;
  }

  private String invokeBestInventoryDescription(Inventory inventory) throws Exception {
    return invokePrivate("bestInventoryDescription", new Class<?>[] {Inventory.class}, inventory);
  }

  private List<SupplyList> invokeGetSupplyListsForStudent(Family.StudentInfo student) throws Exception {
    return invokePrivate("getSupplyListsForStudent", new Class<?>[] {Family.StudentInfo.class}, student);
  }

  private Family.ChecklistItem invokeBuildChecklistItemSnapshot(SupplyList supplyList, String itemId)
      throws Exception {
    return invokePrivate("buildChecklistItemSnapshot",
      new Class<?>[] {SupplyList.class, String.class}, supplyList, itemId);
  }

  @SuppressWarnings("unchecked")
  private <T> T invokePrivate(String methodName, Class<?>[] parameterTypes, Object... args) throws Exception {
    Method method = FamilyChecklistService.class.getDeclaredMethod(methodName, parameterTypes);
    method.setAccessible(true);

    try {
      return (T) method.invoke(familyChecklistService, args);
    } catch (InvocationTargetException exception) {
      if (exception.getCause() instanceof Exception) {
        throw (Exception) exception.getCause();
      }
      throw exception;
    }
  }
}
