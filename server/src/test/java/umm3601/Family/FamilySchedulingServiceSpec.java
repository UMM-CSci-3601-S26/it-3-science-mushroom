package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.javalin.http.NotFoundResponse;
import umm3601.Family.Family.AvailabilityOptions;
import umm3601.Family.Family.StudentInfo;
import umm3601.Settings.Settings;
import umm3601.Settings.Settings.TimeAvailabilityLabels;

@SuppressWarnings({ "MagicNumber" })
class FamilySchedulingServiceSpec {
  private FamilySchedulingService familySchedulingService;

  @BeforeEach
  void setupEach() {
    familySchedulingService = new FamilySchedulingService();
  }

  @Test
  void subdivideTimeSlotCreatesFifteenMinuteBlocks() {
    List<String> blocks = familySchedulingService.subdivideTimeSlot("8:00-9:00 AM");

    assertEquals(List.of(
      "8:00-8:15 AM",
      "8:15-8:30 AM",
      "8:30-8:45 AM",
      "8:45-9:00 AM"), blocks);
  }

  @Test
  void subdivideTimeSlotHandlesPmRangeWhenOnlyTheEndHasMeridiem() {
    List<String> blocks = familySchedulingService.subdivideTimeSlot("1:00-2:00 PM");

    assertEquals(List.of(
      "1:00-1:15 PM",
      "1:15-1:30 PM",
      "1:30-1:45 PM",
      "1:45-2:00 PM"), blocks);
  }

  @Test
  void subdivideTimeSlotHandlesEnDashRange() {
    List<String> blocks = familySchedulingService.subdivideTimeSlot("8:00\u20139:00 AM");

    assertEquals(List.of(
      "8:00-8:15 AM",
      "8:15-8:30 AM",
      "8:30-8:45 AM",
      "8:45-9:00 AM"), blocks);
  }

  @Test
  void schedulingAlgorithmTreatsSingleSettingTimeAsOneHourWindow() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Family One", true, false, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00 AM";

    familySchedulingService.schedulingAlgorithm(families, currentSettings);

    assertEquals("8:00-8:15 AM", families.get(0).timeSlot);
  }

  @Test
  void schedulingAlgorithmAllowsMissingSettingsWhenThereAreNoFamilies() {
    ArrayList<Family> families = new ArrayList<>();

    ArrayList<Family> scheduledFamilies = familySchedulingService.schedulingAlgorithm(families, null);

    assertEquals(List.of(), scheduledFamilies);
  }

  @Test
  void schedulingAlgorithmThrowsWhenAFamilyHasNoAvailability() {
    Family family = new Family();
    family.guardianName = null;
    family.timeAvailability = null;
    family.students = null;

    ArrayList<Family> families = new ArrayList<>(List.of(family));

    assertThrows(NotFoundResponse.class,
      () -> familySchedulingService.schedulingAlgorithm(families, defaultTimeAvailability()));
  }

  @Test
  void schedulingAlgorithmInfersMeridiemFromAvailabilityWindow() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Morning Family", true, false, false, false, 2),
      familyForScheduling("Afternoon Family", false, false, true, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00";
    currentSettings.earlyAfternoon = "1:00-2:00";

    familySchedulingService.schedulingAlgorithm(families, currentSettings);

    assertEquals("8:00-8:15 AM", familyNamed(families, "Morning Family").timeSlot);
    assertEquals("1:00-1:15 PM", familyNamed(families, "Afternoon Family").timeSlot);
  }

  @Test
  void schedulingAlgorithmAssignsFamiliesToFifteenMinuteBlocks() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Jane Doe", true, true, true, true, 2),
      familyForScheduling("John Christensen", false, true, false, false, 2),
      familyForScheduling("John Johnson", false, false, false, true, 1),
      familyForScheduling("Melina Brim", false, false, true, true, 2),
      familyForScheduling("Bob Dylan", false, true, true, true, 2),
      familyForScheduling("Bob Jones", false, true, false, true, 1)));

    familySchedulingService.schedulingAlgorithm(families, defaultTimeAvailability());

    assertEquals("John Christensen", families.get(0).guardianName);
    assertEquals("10:00-10:15 AM", families.get(0).timeSlot);
    assertEquals("John Johnson", families.get(1).guardianName);
    assertEquals("3:00-3:15 PM", families.get(1).timeSlot);
    assertEquals("Melina Brim", families.get(2).guardianName);
    assertEquals("1:00-1:15 PM", families.get(2).timeSlot);
    assertEquals("Bob Jones", families.get(3).guardianName);
    assertEquals("10:15-10:30 AM", families.get(3).timeSlot);
    assertEquals("Bob Dylan", families.get(4).guardianName);
    assertEquals("10:30-10:45 AM", families.get(4).timeSlot);
    assertEquals("Jane Doe", families.get(5).guardianName);
    assertEquals("8:00-8:15 AM", families.get(5).timeSlot);
  }

  @Test
  void schedulingAlgorithmThrowsWhenNoFifteenMinuteBlocksAreAvailable() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Family One", true, false, false, false, 2),
      familyForScheduling("Family Two", true, false, false, false, 2),
      familyForScheduling("Family Three", true, false, false, false, 2),
      familyForScheduling("Family Four", true, false, false, false, 2),
      familyForScheduling("Family Five", true, false, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00 AM";

    assertThrows(NotFoundResponse.class,
      () -> familySchedulingService.schedulingAlgorithm(families, currentSettings));
  }

  @Test
  void schedulingAlgorithmUsesTwoBlocksForFamiliesWithMoreThanThreeChildren() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Large Family", true, false, false, false, 4),
      familyForScheduling("Small Family", true, false, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00 AM";

    familySchedulingService.schedulingAlgorithm(families, currentSettings);

    assertEquals("8:00-8:30 AM", families.get(0).timeSlot);
    assertEquals("8:30-8:45 AM", families.get(1).timeSlot);
  }

  @Test
  void schedulingAlgorithmUsesThreeBlocksForFamiliesWithMoreThanSixChildren() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Extra Large Family", true, false, false, false, 7),
      familyForScheduling("Small Family", true, false, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00 AM";

    familySchedulingService.schedulingAlgorithm(families, currentSettings);

    assertEquals("8:00-8:45 AM", families.get(0).timeSlot);
    assertEquals("8:45-9:00 AM", families.get(1).timeSlot);
  }

  @Test
  void schedulingAlgorithmAssignsFamiliesToOpenColumnsInTheSameTimeBlock() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Family One", true, false, false, false, 2),
      familyForScheduling("Family Two", true, false, false, false, 2)));

    familySchedulingService.schedulingAlgorithm(
        families,
        defaultTimeAvailability(),
        defaultScheduleColumns(2, 0));

    assertEquals("8:00-8:15 AM", families.get(0).timeSlot);
    assertEquals("English", families.get(0).scheduleAssignment.columnType);
    assertEquals(1, families.get(0).scheduleAssignment.columnIndex);
    assertEquals("8:00-8:15 AM", families.get(1).timeSlot);
    assertEquals("English", families.get(1).scheduleAssignment.columnType);
    assertEquals(2, families.get(1).scheduleAssignment.columnIndex);
  }

  @Test
  void schedulingAlgorithmAssignsSpanishFamiliesToSpanishColumns() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Spanish Family", true, false, false, false, 2, true),
      familyForScheduling("English Family", true, false, false, false, 2)));

    familySchedulingService.schedulingAlgorithm(
        families,
        defaultTimeAvailability(),
        defaultScheduleColumns(1, 1));

    Family spanishFamily = familyNamed(families, "Spanish Family");
    Family englishFamily = familyNamed(families, "English Family");

    assertEquals("8:00-8:15 AM", spanishFamily.timeSlot);
    assertEquals("Spanish", spanishFamily.scheduleAssignment.columnType);
    assertEquals(1, spanishFamily.scheduleAssignment.columnIndex);
    assertEquals("8:00-8:15 AM", englishFamily.timeSlot);
    assertEquals("English", englishFamily.scheduleAssignment.columnType);
    assertEquals(1, englishFamily.scheduleAssignment.columnIndex);
  }

  @Test
  void schedulingAlgorithmDoesNotDoubleBookAColumnWhenAvailabilityWindowsOverlap() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Early Family", true, false, false, false, 2),
      familyForScheduling("Large Early Family", true, false, false, false, 4),
      familyForScheduling("Late Family", false, true, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:30-9:30 AM";
    currentSettings.lateMorning = "9:00-10:00 AM";

    familySchedulingService.schedulingAlgorithm(
        families,
        currentSettings,
        defaultScheduleColumns(1, 0));

    Family largeEarlyFamily = familyNamed(families, "Large Early Family");
    Family earlyFamily = familyNamed(families, "Early Family");
    Family lateFamily = familyNamed(families, "Late Family");

    assertEquals("8:30-9:00 AM", largeEarlyFamily.timeSlot);
    assertEquals("9:00-9:15 AM", earlyFamily.timeSlot);
    assertEquals("9:15-9:30 AM", lateFamily.timeSlot);
    assertEquals(1, largeEarlyFamily.scheduleAssignments.get(0).columnIndex);
    assertEquals(1, largeEarlyFamily.scheduleAssignments.get(1).columnIndex);
    assertEquals(1, earlyFamily.scheduleAssignment.columnIndex);
    assertEquals(1, lateFamily.scheduleAssignment.columnIndex);
  }

  @Test
  void schedulingAlgorithmUsesSupportColumnsForLargeFamiliesWhenColumnsAreOpen() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Large Family", true, false, false, false, 4),
      familyForScheduling("Small Family", true, false, false, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00 AM";

    familySchedulingService.schedulingAlgorithm(
        families,
        currentSettings,
        defaultScheduleColumns(2, 0));

    Family largeFamily = familyNamed(families, "Large Family");
    Family smallFamily = familyNamed(families, "Small Family");

    assertEquals("8:00-8:15 AM", largeFamily.timeSlot);
    assertEquals(2, largeFamily.scheduleAssignments.size());
    assertEquals(1, largeFamily.scheduleAssignments.get(0).columnIndex);
    assertEquals(2, largeFamily.scheduleAssignments.get(1).columnIndex);
    assertEquals("8:15-8:30 AM", smallFamily.timeSlot);
  }

  private Settings.TimeAvailabilityLabels defaultTimeAvailability() {
    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00 AM";
    currentSettings.lateMorning = "10:00-11:00 AM";
    currentSettings.earlyAfternoon = "1:00-2:00 PM";
    currentSettings.lateAfternoon = "3:00-4:00 PM";
    return currentSettings;
  }

  private Family familyForScheduling(String guardianName, boolean earlyMorning,
      boolean lateMorning, boolean earlyAfternoon, boolean lateAfternoon, int studentCount) {
    return familyForScheduling(
        guardianName,
        earlyMorning,
        lateMorning,
        earlyAfternoon,
        lateAfternoon,
        studentCount,
        false);
  }

  private Family familyForScheduling(String guardianName, boolean earlyMorning,
      boolean lateMorning, boolean earlyAfternoon, boolean lateAfternoon, int studentCount,
      boolean needSpanishHelp) {
    AvailabilityOptions availability = new AvailabilityOptions();
    availability.earlyMorning = earlyMorning;
    availability.lateMorning = lateMorning;
    availability.earlyAfternoon = earlyAfternoon;
    availability.lateAfternoon = lateAfternoon;

    Family family = new Family();
    family.guardianName = guardianName;
    family.timeAvailability = availability;
    family.needSpanishHelp = needSpanishHelp;
    family.students = new ArrayList<>();
    for (int i = 0; i < studentCount; i++) {
      family.students.add(studentInfo("Student " + i, "4"));
    }
    return family;
  }

  private Settings.DefaultScheduleColumns defaultScheduleColumns(int englishFamilies, int spanishFamilies) {
    Settings.DefaultScheduleColumns defaultScheduleColumns = new Settings.DefaultScheduleColumns();
    defaultScheduleColumns.englishFamilies = englishFamilies;
    defaultScheduleColumns.spanishFamilies = spanishFamilies;
    return defaultScheduleColumns;
  }

  private Family familyNamed(ArrayList<Family> families, String guardianName) {
    return families.stream()
        .filter(family -> guardianName.equals(family.guardianName))
        .findFirst()
        .orElseThrow();
  }

  private StudentInfo studentInfo(String name, String grade) {
    StudentInfo student = new StudentInfo();
    student.name = name;
    student.grade = grade;
    student.school = "Morris Area Elementary School";
    student.schoolAbbreviation = "MAES";
    student.teacher = "N/A";
    student.backpack = true;
    student.headphones = true;
    return student;
  }
}
