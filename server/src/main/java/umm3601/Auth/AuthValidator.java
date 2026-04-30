package umm3601.Auth;

import java.util.List;

import io.javalin.http.BadRequestResponse;
import umm3601.Users.UsersValidator;

public class AuthValidator {
  private static final int MIN_PASSWORD_LENGTH = 8;

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

  public Role signupSystemRole(Role requestedRole) {
    return requestedRole == Role.GUARDIAN ? Role.GUARDIAN : Role.VOLUNTEER;
  }

  public RoleConfig normalizeRoleConfig(RoleConfig raw) {
    if (raw == null) {
      throw new BadRequestResponse("Role config body is required");
    }
    RoleConfig config = new RoleConfig();
    config.permissions = raw.permissions == null ? List.of() : raw.permissions;
    config.inherits = raw.inherits == null ? List.of("volunteer_base") : raw.inherits;
    return config;
  }

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

  public String requireAssignedJobRole(AuthRequests.AssignJobRoleRequest req) {
    if (req == null || req.jobRole == null || req.jobRole.isBlank()) {
      throw new BadRequestResponse("jobRole is required");
    }
    return validateJobRoleName(req.jobRole);
  }
}
