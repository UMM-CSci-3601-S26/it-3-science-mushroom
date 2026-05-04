// Package
package umm3601.Auth;

// Java imports
import java.util.List;

// Javalin imports
import io.javalin.http.BadRequestResponse;

// App imports
import umm3601.Users.UsersValidator;

/**
 * Validation and normalization for auth request bodies.
 *
 * Keeping this outside AuthController makes the HTTP handlers easier to read
 * and lets AuthService rely on normalized role/email/job-role data.
 */
public class AuthValidator {
  private static final int MIN_PASSWORD_LENGTH = 8; // Minimum password length requirement

  /**
   * validateLogin ensures that the login request body contains a username and password.
   * @param req the login request body
   * @throws BadRequestResponse if the request body is null or missing required fields
   */
  public void validateLogin(AuthRequests.LoginRequest req) {
    if (req == null) {
      throw new BadRequestResponse("Login body is required");
    }
    if (req.username == null || req.username.trim().isEmpty()) {
      throw new BadRequestResponse("Username is required");
    }
    if (req.password == null || req.password.isEmpty()) {
      throw new BadRequestResponse("Password is required");
    }
  }

  /**
   * validateSignup ensures that the signup request body contains a username, password, and
   * full name, and that the password meets the minimum length requirement. The email field
   * is optional and will be validated separately if provided.
   * @param req the signup request body
   * @throws BadRequestResponse if the request body is null or missing required fields, or if
   * the password does not meet the minimum length requirement
   */
  public void validateSignup(AuthRequests.SignupRequest req) {
    if (req == null) {
      throw new BadRequestResponse("Signup body is required");
    }
    if (req.username == null || req.username.trim().isEmpty()) {
      throw new BadRequestResponse("Username is required");
    }
    if (req.password == null || req.password.length() < MIN_PASSWORD_LENGTH) {
      throw new BadRequestResponse("Password must be at least " + MIN_PASSWORD_LENGTH + " characters");
    }
    if (req.fullName == null || req.fullName.trim().isEmpty()) {
      throw new BadRequestResponse("Full name is required");
    }
  }

  /**
   * normalizeSignupEmail takes the raw email from the signup request and normalizes it by trimming whitespace.
   * It also validates that the email is in a proper format if it's provided. If the email is blank and
   * the requested system role is GUARDIAN, it returns null since guardians are not required to have an
   * email. For any other system role, a valid email is required.
   * @param systemRole the system role requested in the signup, used to determine if email is required
   * @param email the raw email from the signup request
   * @return the normalized email, or null if the email is not required for the given system role
   * @throws BadRequestResponse if the email is required but not provided, or if the provided email
   *                            is not in a valid format
   */
  public String normalizeSignupEmail(Role systemRole, String email) {
    String normalized = email == null ? "" : email.trim();
    if (normalized.isBlank()) {
      if (systemRole == Role.GUARDIAN) {
        return null;
      }
      throw new BadRequestResponse("Email is required");
    }
    if (!normalized.matches(UsersValidator.EMAIL_REGEX)) {
      throw new BadRequestResponse("Email must be valid");
    }
    return normalized;
  }

  /**
   * signupSystemRole determines the system role to assign to a new user based on the requested role
   * in the signup request. To prevent privilege escalation, it only allows users to sign up as GUARDIAN
   * or VOLUNTEER. If the requested role is GUARDIAN, it returns GUARDIAN; for any other requested role
   * (including ADMIN), it defaults to VOLUNTEER.
   * @param requestedRole the system role requested in the signup request
   * @return the system role that should be assigned to the new user, which will be either GUARDIAN or VOLUNTEER
   */
  public Role signupSystemRole(Role requestedRole) {
    // Never allow public signup to create admins. Anything except explicit
    // guardian signup becomes a volunteer account.
    return requestedRole == Role.GUARDIAN ? Role.GUARDIAN : Role.VOLUNTEER;
  }

  /**
   * normalizeRoleConfig takes a raw RoleConfig object from the request body and normalizes
   * it by ensuring that the permissions list is not null (defaulting to an empty list if it is)
   * and that the inherits list is not null (defaulting to a list containing "volunteer_base"
   * if it is). This ensures that the role config has valid data for the AuthService to work with,
   * and also provides a default inheritance for new custom volunteer job roles.
   * @param raw the raw RoleConfig object from the request body
   * @return a normalized RoleConfig object with non-null permissions and inherits lists
   * @throws BadRequestResponse if the raw RoleConfig is null
   */
  public RoleConfig normalizeRoleConfig(RoleConfig raw) {
    if (raw == null) {
      throw new BadRequestResponse("Role config body is required");
    }
    RoleConfig config = new RoleConfig();
    config.permissions = raw.permissions == null ? List.of() : raw.permissions;
    // New custom volunteer job roles inherit volunteer_base unless the admin
    // explicitly sends another inheritance list.
    config.inherits = raw.inherits == null ? List.of("volunteer_base") : raw.inherits;
    return config;
  }

  /**
   * validateJobRoleName ensures that a job role name is provided and does not use reserved
   * system role names. This is used to validate the job role name when creating or updating
   * custom volunteer job roles. The method checks that the job role name is not null or blank,
   * and that it does not match any of the system role names (admin, guardian, volunteer) to
   * prevent confusion and potential security issues with overlapping role names.
   * @param jobRole the job role name to validate
   * @return the validated job role name if it is valid
   * @throws BadRequestResponse if the job role name is null, blank, or matches a reserved system role name
   */
  public String validateJobRoleName(String jobRole) {
    if (jobRole == null || jobRole.isBlank()) {
      throw new BadRequestResponse("Job role name is required");
    }
    if ("admin".equalsIgnoreCase(jobRole)
        || "guardian".equalsIgnoreCase(jobRole)
        || "volunteer".equalsIgnoreCase(jobRole)) {
      throw new BadRequestResponse("System roles cannot be used as job role names");
    }
    return jobRole;
  }

  /**
   * requireAssignedJobRole validates the job role name provided in the AssignJobRoleRequest
   * body when assigning a job role to a user. It ensures that the job role name is present
   * and valid according to the rules defined in validateJobRoleName. This method is used in
   * the route handler for assigning a job role to ensure that the request contains a valid
   * job role name before proceeding with the assignment.
   * @param req the AssignJobRoleRequest containing the job role name to validate
   * @return the validated job role name if it is valid
   * @throws BadRequestResponse if the request body is null, or if the job role name is missing or invalid
   */
  public String requireAssignedJobRole(AuthRequests.AssignJobRoleRequest req) {
    if (req == null || req.jobRole == null || req.jobRole.isBlank()) {
      throw new BadRequestResponse("jobRole is required");
    }
    return validateJobRoleName(req.jobRole);
  }
}
