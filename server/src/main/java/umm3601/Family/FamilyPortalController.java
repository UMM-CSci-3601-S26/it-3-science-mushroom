package umm3601.Family;

import java.util.LinkedHashMap;
import java.util.Map;

import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;
import umm3601.Auth.Role;
import umm3601.Common.AuthContext;
import umm3601.Settings.Settings;
import umm3601.Settings.SettingsController;
import umm3601.Users.UsersService;

public class FamilyPortalController {

  private static final String API_PORTAL_BASE = "/api/family-portal";
  private static final String API_PORTAL_FORM = "/api/family-portal/form";
  private static final String API_PORTAL_CHECKLIST = "/api/family-portal/checklist";
  private static final String API_PORTAL_DRIVE_DAY = "/api/family-portal/drive-day";

  private final FamilyController familyController;
  private final SettingsController settingsController;
  private final UsersService usersService;

  public FamilyPortalController(
      FamilyController familyController,
      SettingsController settingsController,
      UsersService usersService) {
    this.familyController = familyController;
    this.settingsController = settingsController;
    this.usersService = usersService;
  }

  @Route(method = HttpMethod.GET, path = API_PORTAL_BASE)
  @RequirePermission("family_portal_access")
  public void getPortalSummary(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family family = null;
    try {
      family = familyController.getByOwnerUserId(authContext.userId());
    } catch (NotFoundResponse ignored) {
      // No profile yet is expected for first-time guardian users.
    }

    Settings settings = settingsController.getSettingsDocument();

    Map<String, Object> summary = new LinkedHashMap<>();
    summary.put("profileComplete", family != null && family.profileComplete);
    summary.put("family", family);
    summary.put("driveDay", settings.driveDay);
    summary.put("timeSlot", family == null ? "to be assigned" : family.timeSlot);
    summary.put("timeSlotStatus", (family == null || family.timeSlot == null || family.timeSlot.isBlank())
      ? "pending"
      : "assigned");
    summary.put("schools", settings.schools);
    summary.put("timeAvailability", settings.timeAvailability);

    ctx.json(summary);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.PUT, path = API_PORTAL_FORM)
  @RequirePermission("family_portal_access")
  public void upsertPortalForm(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family submittedFamily = validatePortalFormBody(ctx.bodyAsClass(Family.class));
    submittedFamily.ownerUserId = authContext.userId();
    submittedFamily.profileComplete = true;

    if (submittedFamily.timeSlot == null || submittedFamily.timeSlot.isBlank()) {
      submittedFamily.timeSlot = "to be assigned";
    }

    familyController.upsertByOwnerUserId(submittedFamily);
    usersService.updateUserEmailById(authContext.userId(), submittedFamily.email);

    ctx.status(HttpStatus.OK);
    ctx.json(Map.of("profileComplete", true));
  }

  @Route(method = HttpMethod.GET, path = API_PORTAL_CHECKLIST)
  @RequirePermission("family_portal_access")
  public void getPortalChecklist(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family family = familyController.getByOwnerUserId(authContext.userId());
    requireCompletedProfile(family);

    ctx.json(family.checklist);
    ctx.status(HttpStatus.OK);
  }

  @Route(method = HttpMethod.GET, path = API_PORTAL_DRIVE_DAY)
  @RequirePermission("family_portal_access")
  public void getPortalDriveDay(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family family = familyController.getByOwnerUserId(authContext.userId());
    requireCompletedProfile(family);

    Settings settings = settingsController.getSettingsDocument();

    Map<String, Object> response = new LinkedHashMap<>();
    response.put("driveDay", settings.driveDay);
    response.put("timeSlot", family.timeSlot);
    response.put("timeSlotStatus", (family.timeSlot == null || family.timeSlot.isBlank()) ? "pending" : "assigned");

    ctx.json(response);
    ctx.status(HttpStatus.OK);
  }

  private AuthContext requireGuardian(AuthContext authContext) {
    if (authContext.role() != Role.GUARDIAN) {
      throw new ForbiddenResponse("Family portal is for guardian accounts only");
    }
    return authContext;
  }

  private void requireCompletedProfile(Family family) {
    if (!family.profileComplete) {
      throw new ForbiddenResponse("Complete the family form before accessing this resource");
    }
  }

  private Family validatePortalFormBody(Family family) {
    if (family == null) {
      throw new io.javalin.http.BadRequestResponse("Family request body is required");
    }
    if (family.guardianName == null || family.guardianName.isBlank()) {
      throw new io.javalin.http.BadRequestResponse("Guardian name is required");
    }
    if (family.email == null || !family.email.matches(FamilyController.EMAIL_REGEX)) {
      throw new io.javalin.http.BadRequestResponse("Family must have a valid email");
    }
    if (family.address == null || family.address.isBlank()) {
      throw new io.javalin.http.BadRequestResponse("Address is required");
    }
    if (family.students == null || family.students.isEmpty()) {
      throw new io.javalin.http.BadRequestResponse("At least one student is required");
    }
    for (Family.StudentInfo student : family.students) {
      validatePortalStudent(student);
    }
    return family;
  }

  private void validatePortalStudent(Family.StudentInfo student) {
    if (student == null
        || student.name == null || student.name.isBlank()
        || student.grade == null || student.grade.isBlank()
        || student.school == null || student.school.isBlank()) {
      throw new io.javalin.http.BadRequestResponse("Each student must include name, grade, and school");
    }
  }
}
