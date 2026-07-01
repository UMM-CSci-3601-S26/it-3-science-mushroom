package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Collections;
import java.util.List;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;

import umm3601.Family.Family.StudentInfo;
import umm3601.SupplyList.SupplyList;

@SuppressWarnings({ "MagicNumber" })
class FamilyChecklistGeneratorSpec {
  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private FamilyChecklistGenerator generator;

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
    MongoCollection<Document> supplyListDocuments = db.getCollection("supplylist");
    supplyListDocuments.drop();
    supplyListDocuments.insertMany(List.of(
      supplyListDoc("Backpack"),
      supplyListDoc("Water Bottle")));

    generator = new FamilyChecklistGenerator(
      JacksonMongoCollection.builder().build(
        db,
        "supplylist",
        SupplyList.class,
        UuidRepresentation.STANDARD));
  }

  @Test
  void generateCurrentFamilyChecklistBuildsStudentSectionsWithoutSnapshot() {
    Family family = new Family();
    family.guardianName = "Bob Jones";

    StudentInfo firstStudent = studentInfo("Sara", "5", "Roosevelt", "N/A");
    StudentInfo secondStudent = studentInfo("Alex", "5", "Roosevelt", "N/A");

    family.students = List.of(firstStudent, secondStudent);

    Family.FamilyChecklist checklist = generator.generateCurrentFamilyChecklist(family);

    assertFalse(checklist.snapshot);
    assertEquals("family-checklist-v1", checklist.templateId);
    assertEquals(2, checklist.sections.size());
    assertEquals("Sara", checklist.sections.get(0).title);
    assertEquals(2, checklist.sections.get(0).items.size());
    assertEquals("Alex", checklist.sections.get(1).title);
    assertEquals(2, checklist.sections.get(1).items.size());
  }

  @Test
  void generateCurrentFamilyChecklistHandlesMissingFamilyAndStudentData() {
    Family.FamilyChecklist missingFamilyChecklist = generator.generateCurrentFamilyChecklist(null);

    assertFalse(missingFamilyChecklist.snapshot);
    assertEquals("Family Checklist", missingFamilyChecklist.printableTitle);
    assertEquals(0, missingFamilyChecklist.sections.size());

    Family family = new Family();
    family.guardianName = "Bob Jones";
    family.students = Collections.singletonList((StudentInfo) null);

    Family.FamilyChecklist checklist = generator.generateCurrentFamilyChecklist(family);

    assertFalse(checklist.snapshot);
    assertEquals(1, checklist.sections.size());
    assertEquals("Student 1", checklist.sections.get(0).title);
    assertEquals(0, checklist.sections.get(0).items.size());
  }

  @Test
  void getSupplyListsForStudentCoversTeacherMismatchAndNoMatches() {
    db.getCollection("supplylist").insertOne(new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "Ms Smith")
      .append("item", List.of("Folder"))
      .append("quantity", 1));

    List<SupplyList> noMatches = generator.getSupplyListsForStudent(
      studentInfo(null, "5", "Different", "N/A"));
    assertEquals(0, noMatches.size());

    List<SupplyList> wrongGradeMatches = generator.getSupplyListsForStudent(
      studentInfo(null, "6", "Roosevelt", "N/A"));
    assertEquals(0, wrongGradeMatches.size());

    List<SupplyList> filteredMatches = generator.getSupplyListsForStudent(
      studentInfo(null, "5", "Roosevelt", "N/A"));
    assertEquals(2, filteredMatches.size());
  }

  @Test
  void getSupplyListsForStudentMatchesSchoolAcronymsAndGradeFormats() {
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

    List<SupplyList> matches = generator.getSupplyListsForStudent(
      studentInfo(null, "12", "MAHS", "N/A"));

    assertEquals(2, matches.size());
    assertTrue(matches.stream().anyMatch(match -> List.of("Notebook").equals(match.item)));
    assertTrue(matches.stream().anyMatch(match -> List.of("Folder").equals(match.item)));

    List<SupplyList> middleSchoolMatches = generator.getSupplyListsForStudent(
      studentInfo(null, "7", "MAMS", "N/A"));
    assertEquals(1, middleSchoolMatches.size());
    assertEquals(List.of("Pencil"), middleSchoolMatches.get(0).item);

    List<SupplyList> elementaryMatches = generator.getSupplyListsForStudent(
      studentInfo(null, "5", "MAE", "N/A"));
    assertEquals(1, elementaryMatches.size());
    assertEquals(List.of("Crayon"), elementaryMatches.get(0).item);
  }

  private static Document supplyListDoc(String item) {
    return new Document()
      .append("district", "District 1")
      .append("school", "Roosevelt")
      .append("grade", "5")
      .append("teacher", "N/A")
      .append("item", List.of(item))
      .append("quantity", 1);
  }

  private StudentInfo studentInfo(String name, String grade, String school, String teacher) {
    StudentInfo student = new StudentInfo();
    student.name = name;
    student.grade = grade;
    student.school = school;
    student.teacher = teacher;
    return student;
  }
}
