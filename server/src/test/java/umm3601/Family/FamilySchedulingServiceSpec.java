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
  void schedulingAlgorithmInfersMeridiemFromAvailabilityWindow() {
    ArrayList<Family> families = new ArrayList<>(List.of(
      familyForScheduling("Morning Family", true, false, false, false, 2),
      familyForScheduling("Afternoon Family", false, false, true, false, 2)));

    Settings.TimeAvailabilityLabels currentSettings = new TimeAvailabilityLabels();
    currentSettings.earlyMorning = "8:00-9:00";
    currentSettings.earlyAfternoon = "1:00-2:00";

    familySchedulingService.schedulingAlgorithm(families, currentSettings);

    assertEquals("8:00-8:15 AM", families.get(0).timeSlot);
    assertEquals("1:00-1:15 PM", families.get(1).timeSlot);
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
    AvailabilityOptions availability = new AvailabilityOptions();
    availability.earlyMorning = earlyMorning;
    availability.lateMorning = lateMorning;
    availability.earlyAfternoon = earlyAfternoon;
    availability.lateAfternoon = lateAfternoon;

    Family family = new Family();
    family.guardianName = guardianName;
    family.timeAvailability = availability;
    family.students = new ArrayList<>();
    for (int i = 0; i < studentCount; i++) {
      family.students.add(studentInfo("Student " + i, "4"));
    }
    return family;
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
