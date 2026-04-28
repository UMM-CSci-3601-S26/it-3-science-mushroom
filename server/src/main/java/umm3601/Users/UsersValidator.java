package umm3601.Users;

import org.bson.types.ObjectId;
import io.javalin.http.BadRequestResponse;
import umm3601.Auth.PermissionsService;
import umm3601.Auth.Role;

public class UsersValidator {
  public static final String EMAIL_REGEX = "^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$";
  private final PermissionsService permissionsService;

  public UsersValidator(PermissionsService permissionsService) {
    this.permissionsService = permissionsService;
  }

  public String validateId(String id) {
    try {
      return new ObjectId(id).toHexString();
    } catch (IllegalArgumentException e) {
      throw new BadRequestResponse("The requested user id wasn't a legal Mongo Object ID.");
    }
  }

  public String requireUsername(String username) {
    if (username == null || username.isBlank()) {
      throw new BadRequestResponse("Username is required");
    }
    return username.trim();
  }

  public String requireFullName(String fullName) {
    if (fullName == null || fullName.isBlank()) {
      throw new BadRequestResponse("Full name is required");
    }
    return fullName.trim();
  }

  public String normalizeEmail(Role systemRole, String email) {
    String normalized = email == null ? "" : email.trim();
    if (normalized.isBlank()) {
      if (systemRole == Role.GUARDIAN) {
        return null;
      }
      throw new BadRequestResponse("Email is required");
    }
    if (!normalized.matches(EMAIL_REGEX)) {
      throw new BadRequestResponse("Email must be valid");
    }
    return normalized;
  }

  @SuppressWarnings("MagicNumber")
  public String requirePassword(String password) {
    if (password == null || password.length() < 8) {
      throw new BadRequestResponse("Password must be at least 8 characters");
    }
    return password;
  }

  @SuppressWarnings("MagicNumber")
  public String optionalPassword(String password) {
    if (password == null || password.isBlank()) {
      return null;
    }
    if (password.length() < 8) {
      throw new BadRequestResponse("Password must be at least 8 characters");
    }
    return password;
  }

  public Role requireSystemRole(Role systemRole) {
    if (systemRole == null) {
      throw new BadRequestResponse("System role is required");
    }
    return systemRole;
  }

  public String normalizeJobRole(Role systemRole, String jobRole) {
    if (systemRole != Role.VOLUNTEER) {
      return null;
    }

    String normalized = (jobRole == null || jobRole.isBlank()) ? "volunteer_base" : jobRole.trim();
    if (!permissionsService.roleExists(normalized)) {
      throw new BadRequestResponse("Unknown volunteer job role: " + normalized);
    }
    return normalized;
  }
}
