package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Auth.Role;
import umm3601.Settings.Settings;
import umm3601.Settings.SettingsController;
import umm3601.Users.UsersService;

@SuppressWarnings({ "MagicNumber", "unchecked" })
public class FamilyPortalControllerSpec {
  private static final String GUARDIAN_ID = "guardian-user-id";

  private FamilyController familyController;
  private SettingsController settingsController;
  private UsersService usersService;
  private FamilyPortalController portalController;
  private Context ctx;

  @BeforeEach
  void setupEach() {
    familyController = mock(FamilyController.class);
    settingsController = mock(SettingsController.class);
    usersService = mock(UsersService.class);
    portalController = new FamilyPortalController(familyController, settingsController, usersService);
    ctx = mock(Context.class);

    when(ctx.attribute("userId")).thenReturn(GUARDIAN_ID);
    when(ctx.attribute("systemRole")).thenReturn(Role.GUARDIAN);
  }

  @Test
  void getPortalSummaryReturnsPendingProfileWhenNoFamilyExists() {
    Settings settings = settings();
    when(familyController.getByOwnerUserId(GUARDIAN_ID))
      .thenThrow(new NotFoundResponse("No family profile exists for this guardian yet"));
    when(settingsController.getSettingsDocument()).thenReturn(settings);

    portalController.getPortalSummary(ctx);

    ArgumentCaptor<Map<String, Object>> summaryCaptor = ArgumentCaptor.forClass(Map.class);
    verify(ctx).json(summaryCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Map<String, Object> summary = summaryCaptor.getValue();
    assertEquals(false, summary.get("profileComplete"));
    assertNull(summary.get("family"));
    assertEquals(settings.driveDay, summary.get("driveDay"));
    assertEquals("to be assigned", summary.get("timeSlot"));
    assertEquals("pending", summary.get("timeSlotStatus"));
    assertEquals(settings.schools, summary.get("schools"));
    assertEquals(settings.timeAvailability, summary.get("timeAvailability"));
  }

  @Test
  void getPortalSummaryReturnsAssignedProfileWhenFamilyHasTimeSlot() {
    Family family = validFamily();
    family.profileComplete = true;
    family.timeSlot = "10:00 AM";

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);
    when(settingsController.getSettingsDocument()).thenReturn(settings());

    portalController.getPortalSummary(ctx);

    ArgumentCaptor<Map<String, Object>> summaryCaptor = ArgumentCaptor.forClass(Map.class);
    verify(ctx).json(summaryCaptor.capture());

    Map<String, Object> summary = summaryCaptor.getValue();
    assertEquals(true, summary.get("profileComplete"));
    assertEquals(family, summary.get("family"));
    assertEquals("10:00 AM", summary.get("timeSlot"));
    assertEquals("assigned", summary.get("timeSlotStatus"));
  }

  @Test
  void getPortalSummaryReturnsPendingStatusForBlankTimeSlot() {
    Family family = validFamily();
    family.profileComplete = true;
    family.timeSlot = " ";

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);
    when(settingsController.getSettingsDocument()).thenReturn(settings());

    portalController.getPortalSummary(ctx);

    ArgumentCaptor<Map<String, Object>> summaryCaptor = ArgumentCaptor.forClass(Map.class);
    verify(ctx).json(summaryCaptor.capture());

    assertEquals("pending", summaryCaptor.getValue().get("timeSlotStatus"));
  }

  @Test
  void upsertPortalFormPersistsGuardianOwnerAndDefaultTimeSlot() {
    Family submittedFamily = validFamily();
    submittedFamily.timeSlot = "";

    when(ctx.bodyAsClass(Family.class)).thenReturn(submittedFamily);

    portalController.upsertPortalForm(ctx);

    ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
    verify(familyController).upsertByOwnerUserId(familyCaptor.capture());
    verify(usersService).updateUserEmailById(GUARDIAN_ID, submittedFamily.email);
    verify(ctx).status(HttpStatus.OK);

    Family savedFamily = familyCaptor.getValue();
    assertEquals(GUARDIAN_ID, savedFamily.ownerUserId);
    assertTrue(savedFamily.profileComplete);
    assertEquals("to be assigned", savedFamily.timeSlot);
  }

  @Test
  void upsertPortalFormKeepsExistingTimeSlot() {
    Family submittedFamily = validFamily();
    submittedFamily.timeSlot = "11:00 AM";

    when(ctx.bodyAsClass(Family.class)).thenReturn(submittedFamily);

    portalController.upsertPortalForm(ctx);

    ArgumentCaptor<Family> familyCaptor = ArgumentCaptor.forClass(Family.class);
    verify(familyController).upsertByOwnerUserId(familyCaptor.capture());
    assertEquals("11:00 AM", familyCaptor.getValue().timeSlot);
  }

  @Test
  void upsertPortalFormRejectsMissingBody() {
    when(ctx.bodyAsClass(Family.class)).thenReturn(null);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("Family request body is required"));
  }

  @Test
  void upsertPortalFormRejectsMissingGuardianName() {
    Family family = validFamily();
    family.guardianName = " ";
    when(ctx.bodyAsClass(Family.class)).thenReturn(family);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("Guardian name is required"));
  }

  @Test
  void upsertPortalFormRejectsInvalidEmail() {
    Family family = validFamily();
    family.email = "not-an-email";
    when(ctx.bodyAsClass(Family.class)).thenReturn(family);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("valid email"));
  }

  @Test
  void upsertPortalFormRejectsMissingAddress() {
    Family family = validFamily();
    family.address = "";
    when(ctx.bodyAsClass(Family.class)).thenReturn(family);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("Address is required"));
  }

  @Test
  void upsertPortalFormRejectsMissingStudents() {
    Family family = validFamily();
    family.students = List.of();
    when(ctx.bodyAsClass(Family.class)).thenReturn(family);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("At least one student is required"));
  }

  @Test
  void upsertPortalFormRejectsInvalidStudent() {
    Family family = validFamily();
    family.students = List.of(new Family.StudentInfo());
    when(ctx.bodyAsClass(Family.class)).thenReturn(family);

    BadRequestResponse exception = assertThrows(BadRequestResponse.class,
      () -> portalController.upsertPortalForm(ctx));

    assertTrue(exception.getMessage().contains("Each student must include"));
  }

  @Test
  void getPortalChecklistReturnsChecklistForCompletedProfile() {
    Family family = validFamily();
    family.profileComplete = true;
    family.checklist = new Family.FamilyChecklist();

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);

    portalController.getPortalChecklist(ctx);

    verify(ctx).json(family.checklist);
    verify(ctx).status(HttpStatus.OK);
  }

  @Test
  void getPortalChecklistRejectsIncompleteProfile() {
    Family family = validFamily();
    family.profileComplete = false;

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);

    ForbiddenResponse exception = assertThrows(ForbiddenResponse.class,
      () -> portalController.getPortalChecklist(ctx));

    assertTrue(exception.getMessage().contains("Complete the family form"));
  }

  @Test
  void getPortalDriveDayReturnsAssignedTimeSlotStatus() {
    Family family = validFamily();
    family.profileComplete = true;
    family.timeSlot = "1:00 PM";
    Settings settings = settings();

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);
    when(settingsController.getSettingsDocument()).thenReturn(settings);

    portalController.getPortalDriveDay(ctx);

    ArgumentCaptor<Map<String, Object>> responseCaptor = ArgumentCaptor.forClass(Map.class);
    verify(ctx).json(responseCaptor.capture());
    verify(ctx).status(HttpStatus.OK);

    Map<String, Object> response = responseCaptor.getValue();
    assertEquals(settings.driveDay, response.get("driveDay"));
    assertEquals("1:00 PM", response.get("timeSlot"));
    assertEquals("assigned", response.get("timeSlotStatus"));
  }

  @Test
  void getPortalDriveDayReturnsPendingForMissingTimeSlot() {
    Family family = validFamily();
    family.profileComplete = true;
    family.timeSlot = null;

    when(familyController.getByOwnerUserId(GUARDIAN_ID)).thenReturn(family);
    when(settingsController.getSettingsDocument()).thenReturn(settings());

    portalController.getPortalDriveDay(ctx);

    ArgumentCaptor<Map<String, Object>> responseCaptor = ArgumentCaptor.forClass(Map.class);
    verify(ctx).json(responseCaptor.capture());

    assertEquals("pending", responseCaptor.getValue().get("timeSlotStatus"));
  }

  @Test
  void portalRoutesRejectNonGuardians() {
    when(ctx.attribute("systemRole")).thenReturn(Role.VOLUNTEER);

    ForbiddenResponse exception = assertThrows(ForbiddenResponse.class,
      () -> portalController.getPortalSummary(ctx));

    assertTrue(exception.getMessage().contains("guardian accounts only"));
  }

  private Family validFamily() {
    Family family = new Family();
    family.guardianName = "Pat Guardian";
    family.email = "pat@example.com";
    family.address = "123 Main Street";
    family.timeSlot = "10:00 AM";
    family.profileComplete = false;

    Family.StudentInfo student = new Family.StudentInfo();
    student.name = "Student Name";
    student.grade = "5";
    student.school = "Morris Area";
    family.students = List.of(student);

    return family;
  }

  private Settings settings() {
    Settings settings = new Settings();
    settings.driveDay = new Settings.DriveDay();
    settings.driveDay.date = "2026-08-15";
    settings.driveDay.location = "Morris Area High School";
    settings.timeAvailability = new Settings.TimeAvailabilityLabels();

    Settings.SchoolInfo school = new Settings.SchoolInfo();
    school.name = "Morris Area";
    school.abbreviation = "MA";
    settings.schools = List.of(school);

    return settings;
  }
}
