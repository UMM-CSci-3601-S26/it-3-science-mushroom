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
    db.getCollection("purchaseListSnapshots").drop();

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
    assertEquals("ITEM-10001", item.substituteBarcode);
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
  void generateChecklistSnapshotUsesPurchaseListPreferenceBeforeLinkedInventory() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Folder", "Blue 2 Prong Folder (Plastic)", 8,
        "ID-20000", "ITEM-20000", "EXT-20000"),
      inventoryDoc("Folder", "Red 2 Prong Folder (Plastic)", 8,
        "ID-20001", "ITEM-20001", "EXT-20001")));
    String supplyListId = insertSupplyList("Folder", 2, List.of("ID-20001"));
    insertPurchaseListPreference(supplyListId, "ID-20000", false);

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithStudent());
    Family.ChecklistItem folder = checklist.sections.get(0).items.get(0);

    assertEquals("ID-20000", folder.matchedInventoryId);
    assertEquals("Blue 2 Prong Folder (Plastic)", folder.matchedInventoryDescription);
  }

  @Test
  void generateChecklistSnapshotUsesResolvedPurchaseListPreference() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Folder", "Blue 2 Prong Folder (Plastic)", 8,
        "ID-20000", "ITEM-20000", "EXT-20000"),
      inventoryDoc("Folder", "Red 2 Prong Folder (Plastic)", 8,
        "ID-20001", "ITEM-20001", "EXT-20001")));
    String supplyListId = insertSupplyList("Folder", 2, List.of("ID-20001"));
    insertPurchaseListPreference(supplyListId, "ID-20000", true);

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithStudent());

    assertEquals("ID-20000", checklist.sections.get(0).items.get(0).matchedInventoryId);
  }

  @Test
  void generateChecklistSnapshotUsesLinkedInventoryWhenPreferenceIsUnavailable() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Folder", "Blue 2 Prong Folder (Plastic)", 1,
        "ID-20000", "ITEM-20000", "EXT-20000"),
      inventoryDoc("Folder", "Red 2 Prong Folder (Plastic)", 8,
        "ID-20001", "ITEM-20001", "EXT-20001")));
    String supplyListId = insertSupplyList("Folder", 2, List.of("ID-20001"));
    insertPurchaseListPreference(supplyListId, "ID-20000", false);

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithStudent());

    assertEquals("ID-20001", checklist.sections.get(0).items.get(0).matchedInventoryId);
  }

  @Test
  void generateChecklistSnapshotIgnoresAnotherRequestsPreferenceAndMissingLink() {
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("Folder", "Blue 2 Prong Folder (Plastic)", 8,
        "ID-20000", "ITEM-20000", "EXT-20000"),
      inventoryDoc("Folder", "Red 2 Prong Folder (Plastic)", 8,
        "ID-20001", "ITEM-20001", "EXT-20001")));
    insertSupplyList("Folder", 2, List.of("ID-29999", "ID-20001"));
    insertPurchaseListPreference("507f1f77bcf86cd799439011", "ID-20000", false);

    Family.FamilyChecklist checklist = familyChecklistService.generateChecklistSnapshot(familyWithStudent());

    assertEquals("ID-20001", checklist.sections.get(0).items.get(0).matchedInventoryId);
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

  private String insertSupplyList(String item, int quantity, List<String> linkedInventoryIds) {
    Document supplyList = supplyListDoc(item)
      .append("quantity", quantity)
      .append("invIDs", linkedInventoryIds);
    db.getCollection("supplylist").insertOne(supplyList);
    return supplyList.getObjectId("_id").toHexString();
  }

  private void insertPurchaseListPreference(
      String supplyListId,
      String internalId,
      boolean resolved
  ) {
    Document allocation = new Document()
      .append("internalId", internalId)
      .append("quantity", 2)
      .append("sourceIds", List.of(supplyListId));
    Document purchaseItem = new Document()
      .append("selectedFulfillmentAllocations", List.of(allocation));
    db.getCollection("purchaseListSnapshots").insertOne(new Document()
      .append("_id", "latest-purchase-list")
      .append("items", resolved ? List.of() : List.of(purchaseItem))
      .append("resolvedItems", resolved ? List.of(purchaseItem) : List.of()));
  }

  private Family familyWithStudent() {
    Family.StudentInfo student = new Family.StudentInfo();
    student.name = "Test Student";
    student.school = "Roosevelt";
    student.grade = "5";
    student.teacher = "N/A";

    Family family = new Family();
    family.guardianName = "Test Family";
    family.students = List.of(student);
    return family;
  }

  private Document inventoryDoc(String item, String description, int quantity,
      String internalId, String internalBarcode, String externalBarcode) {
    return new Document()
      .append("item", item)
      .append("description", description)
      .append("quantity", quantity)
      .append("internalID", internalId)
      .append("internalBarcode", internalBarcode)
      .append("externalBarcode", List.of(externalBarcode));
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
      new Class<?>[] {SupplyList.class, String.class, List.class}, supplyList, itemId, List.of());
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
