// Package
package umm3601.Family;

// Java imports
import java.util.LinkedHashMap;
import java.util.Map;

// Javalin imports
import io.javalin.http.Context;
import io.javalin.http.ForbiddenResponse;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// App imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.RequirePermission;
import umm3601.Auth.Route;
import umm3601.Auth.Role;
import umm3601.Common.AuthContext;
import umm3601.Settings.Settings;
import umm3601.Settings.SettingsController;
import umm3601.Users.UsersService;

/**
 * Guardian-only endpoints for the family portal.
 *
 * These routes reuse FamilyController and SettingsController instead of
 * duplicating family/settings persistence. The extra checks here make sure a
 * guardian can only read or update the family profile linked to their own user
 * account.
 */
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

  /**
   * The getPortalSummary method handles GET requests to the family portal summary endpoint.
   * It retrieves the authenticated user's family profile and relevant settings, and returns a summary of the family's portal information.
   * If the user does not have a family profile, it returns a summary with default values indicating an incomplete profile.
   * @param ctx
   */
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

    // The summary is intentionally broad: it lets the portal home and form
    // initialize from one request without exposing other families.
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

  /**
   * The upsertPortalForm method handles PUT requests to the family portal form endpoint.
   * It validates the submitted family profile data, ensures that the authenticated user is a guardian, and then creates or updates the family profile associated with the user's account.
   * The method also keeps the user's email in sync between their login account and their family profile. Finally, it returns a response indicating that the profile is complete.
   * @param ctx
   */
  @Route(method = HttpMethod.PUT, path = API_PORTAL_FORM)
  @RequirePermission("family_portal_access")
  public void upsertPortalForm(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family submittedFamily = validatePortalFormBody(ctx.bodyAsClass(Family.class));
    // Ownership is always derived from the authenticated user, never from the
    // request body, so guardians cannot submit data for someone else's account.
    submittedFamily.ownerUserId = authContext.userId();
    submittedFamily.profileComplete = true;

    if (submittedFamily.timeSlot == null || submittedFamily.timeSlot.isBlank()) {
      submittedFamily.timeSlot = "to be assigned";
    }

    familyController.upsertByOwnerUserId(submittedFamily);
    // Keep the login account email in sync with the portal profile email.
    usersService.updateUserEmailById(authContext.userId(), submittedFamily.email);

    ctx.status(HttpStatus.OK);
    ctx.json(Map.of("profileComplete", true));
  }

  /**
   * The getPortalChecklist method handles GET requests to the family portal checklist endpoint.
   * It retrieves the authenticated user's family profile and returns the checklist information for that family.
   * If the user does not have a family profile or if the profile is not complete, it returns an appropriate error response.
   * @param ctx
   */
  @Route(method = HttpMethod.GET, path = API_PORTAL_CHECKLIST)
  @RequirePermission("family_portal_access")
  public void getPortalChecklist(Context ctx) {
    AuthContext authContext = requireGuardian(AuthContext.from(ctx));

    Family family = familyController.getByOwnerUserId(authContext.userId());
    requireCompletedProfile(family);

    ctx.json(family.checklist);
    ctx.status(HttpStatus.OK);
  }

  /**
   * The getPortalDriveDay method handles GET requests to the family portal drive day endpoint.
   * It retrieves the authenticated user's family profile and the relevant settings, and returns the drive day information for that family.
   * If the user does not have a family profile or if the profile is not complete, it returns an appropriate error response.
   * @param ctx
   */
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

  // Helper methods for the family portal controller
  private AuthContext requireGuardian(AuthContext authContext) {
    // The permission check allows access to the portal surface. This role check
    // keeps admins/volunteers from accidentally using guardian-only endpoints.
    if (authContext.role() != Role.GUARDIAN) {
      throw new ForbiddenResponse("Family portal is for guardian accounts only");
    }
    return authContext;
  }

  // The family portal checklist and drive day details depend on a submitted profile, so requireCompletedProfile enforces that before allowing access to those endpoints.
  private void requireCompletedProfile(Family family) {
    // Checklist and drive-day details depend on a submitted profile.
    if (!family.profileComplete) {
      throw new ForbiddenResponse("Complete the family form before accessing this resource");
    }
  }

  /**
   * validatePortalFormBody checks that the submitted family profile contains all required fields and that they are in the correct format.
   * It ensures that the guardian name, email, address, and student information are provided and valid before allowing the profile to be
   * created or updated. If any validation checks fail, it throws a BadRequestResponse with an appropriate error message.
   * @param family the family profile submitted in the request body
   * @return the validated family profile if all checks pass
   * @throws BadRequestResponse if the family profile is missing required fields or contains invalid data
   */
  private Family validatePortalFormBody(Family family) {
    // FamilyController handles persistence, but the portal owns these stricter
    // guardian-facing required fields before it forwards the family document.
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

  // Each student must have a name, grade, and school to ensure the family profile is complete enough for portal use and drive day logistics.
  private void validatePortalStudent(Family.StudentInfo student) {
    if (student == null
        || student.name == null || student.name.isBlank()
        || student.grade == null || student.grade.isBlank()
        || student.school == null || student.school.isBlank()) {
      throw new io.javalin.http.BadRequestResponse("Each student must include name, grade, and school");
    }
  }
}
