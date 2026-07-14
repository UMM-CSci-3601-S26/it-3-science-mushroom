package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

import io.javalin.http.Context;
import io.javalin.json.JavalinJackson;
import io.javalin.validation.BodyValidator;
import umm3601.Family.Family.AvailabilityOptions;
import umm3601.Family.Family.StudentInfo;

@SuppressWarnings({ "MagicNumber" })
class FamilyChecklistPersistenceSpec {
  private FamilyController familyController;
  private ObjectId testFamilyId;

  private static MongoClient mongoClient;
  private static MongoDatabase db;
  private static JavalinJackson javalinJackson = new JavalinJackson();

  @Mock
  private Context ctx;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(List.of(new ServerAddress(mongoAddr))))
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
    MockitoAnnotations.openMocks(this);
    db.getCollection("family").drop();
    db.getCollection("supplylist").drop();
    db.getCollection("inventory").drop();
    db.getCollection("settings").drop();
    db.getCollection("users").drop();

    testFamilyId = new ObjectId();
    db.getCollection("family").insertOne(familyDoc(testFamilyId));
    familyController = new FamilyController(db);
  }

  @Test
  void updateFamilyPreservesExistingChecklistWhenStudentIsAdded() {
    Document existingChecklist = checklistWithSections(List.of(checklistSection(
      "student-1",
      "Sara",
      List.of(checklistItem("student-1-item-1", "Existing Backpack")))));
    db.getCollection("family").updateOne(eq("_id", testFamilyId),
      new Document("$set", new Document("checklist", existingChecklist)));

    StudentInfo existingStudent = studentInfo("Sara");
    StudentInfo newStudent = studentInfo("Alex");

    updateFamilyWithStudents(List.of(existingStudent, newStudent));

    ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
    verify(ctx).json(familyCaptor.capture());
    Family result = familyCaptor.getValue();
    assertNotNull(result.checklist);
    assertEquals(1, result.checklist.sections.size());
    assertEquals("Sara", result.checklist.sections.get(0).title);
    assertEquals("Existing Backpack", result.checklist.sections.get(0).items.get(0).label);
  }

  @Test
  void updateFamilyPreservesEmptyChecklistSectionForExistingStudent() {
    Document existingChecklist = checklistWithSections(List.of(checklistSection(
      "student-1",
      "Sara",
      List.of())));
    db.getCollection("family").updateOne(eq("_id", testFamilyId),
      new Document("$set", new Document("checklist", existingChecklist)));

    updateFamilyWithStudents(List.of(studentInfo("Sara")));

    ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
    verify(ctx).json(familyCaptor.capture());
    Family result = familyCaptor.getValue();
    assertNotNull(result.checklist);
    assertEquals(1, result.checklist.sections.size());
    assertEquals("Sara", result.checklist.sections.get(0).title);
    assertEquals(0, result.checklist.sections.get(0).items.size());
  }

  @Test
  void updateFamilyPreservesExistingChecklistWhenStudentIsRemoved() {
    Document existingChecklist = checklistWithSections(List.of(
      checklistSection(
        "student-1",
        "Sara",
        List.of(checklistItem("student-1-item-1", "Existing Backpack"))),
      checklistSection(
        "student-2",
        "Alex",
        List.of(checklistItem("student-2-item-1", "Existing Notebook")))));
    db.getCollection("family").updateOne(eq("_id", testFamilyId),
      new Document("$set", new Document("checklist", existingChecklist)));

    updateFamilyWithStudents(List.of(studentInfo("Sara")));

    ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
    verify(ctx).json(familyCaptor.capture());
    Family result = familyCaptor.getValue();
    assertNotNull(result.checklist);
    assertEquals(2, result.checklist.sections.size());
    assertEquals("Sara", result.checklist.sections.get(0).title);
    assertEquals("Alex", result.checklist.sections.get(1).title);
  }

  private void updateFamilyWithStudents(List<StudentInfo> students) {
    Family updatedFamily = new Family();
    updatedFamily._id = testFamilyId.toString();
    updatedFamily.guardianName = "Bob Jones";
    updatedFamily.email = "bob@email.com";
    updatedFamily.address = "789 7th Ave";
    updatedFamily.timeSlot = "2:00-3:00";
    updatedFamily.timeAvailability = new AvailabilityOptions();
    updatedFamily.timeAvailability.lateMorning = true;
    updatedFamily.students = new ArrayList<>(students);

    String json = javalinJackson.toJsonString(updatedFamily, Family.class);
    when(ctx.body()).thenReturn(json);
    when(ctx.bodyValidator(Family.class))
      .thenReturn(new BodyValidator<>(
        json,
        Family.class,
        () -> javalinJackson.fromJsonString(json, Family.class)));
    when(ctx.pathParam("id")).thenReturn(testFamilyId.toString());

    familyController.updateFamily(ctx);
  }

  private Document familyDoc(ObjectId id) {
    return new Document()
      .append("_id", id)
      .append("guardianName", "Bob Jones")
      .append("email", "bob@email.com")
      .append("address", "456 Oak Ave")
      .append("timeSlot", "2:00-3:00")
      .append("timeAvailability", new Document()
        .append("earlyMorning", false)
        .append("lateMorning", true)
        .append("earlyAfternoon", false)
        .append("lateAfternoon", true))
      .append("helped", false)
      .append("status", "not_helped")
      .append("students", List.of(studentDoc("Sara")));
  }

  private Document checklistWithSections(List<Document> sections) {
    return new Document()
      .append("templateId", "family-checklist-v1")
      .append("printableTitle", "Bob Jones Checklist")
      .append("snapshot", false)
      .append("sections", sections);
  }

  private Document checklistSection(String id, String title, List<Document> items) {
    return new Document()
      .append("id", id)
      .append("title", title)
      .append("printableTitle", title)
      .append("saved", false)
      .append("items", items);
  }

  private Document checklistItem(String id, String label) {
    return new Document()
      .append("id", id)
      .append("label", label)
      .append("requestedQuantity", 1);
  }

  private Document studentDoc(String name) {
    return new Document()
      .append("name", name)
      .append("grade", "5")
      .append("school", "Roosevelt")
      .append("schoolAbbreviation", "R")
      .append("teacher", "N/A")
      .append("backpack", true)
      .append("headphones", false);
  }

  private StudentInfo studentInfo(String name) {
    StudentInfo student = new StudentInfo();
    student.name = name;
    student.grade = "5";
    student.school = "Roosevelt";
    student.schoolAbbreviation = "R";
    student.teacher = "N/A";
    student.backpack = true;
    student.headphones = false;
    return student;
  }
}
