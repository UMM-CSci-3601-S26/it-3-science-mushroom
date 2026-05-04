// Package
package umm3601.Users;

// Java imports
import java.util.List;

// Com imports
import com.mongodb.client.MongoDatabase;

// Javalin imports
import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;

// App imports
import umm3601.Auth.Role;

/**
 * Service for user-related business logic.
 * Controllers should depend on this class instead of talking to Mongo directly.
 * This is where cross-record rules live, such as keeping at least one admin in
 * the system.
 */
public class UsersService {
  private final UsersRepository repository;

  public UsersService(MongoDatabase db) {
    this(new UsersRepository(db));
  }

  public UsersService(UsersRepository repository) {
    this.repository = repository;
  }

  public List<Users> getManagedUsers() {
    return repository.findManagedUsers();
  }

  public Users findByUsername(String username) {
    return repository.findByUsername(username);
  }

  public Users findById(String userId) {
    return repository.findById(userId);
  }

  public void deleteUserById(String userId) {
    Users existing = repository.findById(userId);
    if (existing != null) {
      // Prevent deleting the final administrator before doing the destructive
      // database operation.
      ensureNotLastAdmin(existing.systemRole, null);
    }
    long deleted = repository.deleteById(userId);
    if (deleted == 0) {
      throw new NotFoundResponse("User not found");
    }
  }

  public void deleteUser(String username) {
    repository.deleteByUsername(username);
  }

  public long deleteGuardianById(String userId) {
    Users linkedUser = findById(userId);
    if (linkedUser == null || linkedUser.systemRole != Role.GUARDIAN) {
      return 0;
    }
    // Family deletion may clean up a linked guardian login, but it should never
    // delete a staff account by accident.
    return repository.deleteById(userId);
  }

  public void updateUserSystemRole(String username, Role newRole) {
    repository.updateSystemRole(username, newRole);
    if (newRole != Role.VOLUNTEER) {
      // Admins and guardians do not use volunteer job-role permissions.
      repository.updateJobRole(username, null);
    }
  }

  public void updateUserJobRole(String username, String jobRole) {
    repository.updateJobRole(username, jobRole);
  }

  public void updateUserPasswordHash(String username, String newPasswordHash) {
    repository.updatePasswordHash(username, newPasswordHash);
  }

  public void updateUserFullName(String username, String newFullName) {
    repository.updateFullName(username, newFullName);
  }

  public void updateUserEmail(String username, String email) {
    repository.updateEmail(username, email);
  }

  public void updateUserEmailById(String userId, String email) {
    repository.updateEmailById(userId, email);
  }

  public void replaceUser(String userId, Users user) {
    Users existing = repository.findById(userId);
    if (existing == null) {
      throw new NotFoundResponse("User not found");
    }
    ensureNotLastAdmin(existing.systemRole, user.systemRole);
    long updated = repository.replace(userId, user);
    if (updated == 0) {
      throw new NotFoundResponse("User not found");
    }
  }

  // Backward-compatible overload used by older tests/callers.
  public void createUser(String username, String passwordHash, String fullName, Role systemRole) {
    String defaultJobRole = (systemRole == Role.VOLUNTEER) ? "volunteer_base" : null;
    createUser(username, passwordHash, fullName, null, systemRole, defaultJobRole);
  }

  public void createUser(
      String username,
      String passwordHash,
      String fullName,
      String email,
      Role systemRole,
      String jobRole) {
    Users user = new Users();
    user.username = username;
    user.passwordHash = passwordHash;
    user.fullName = fullName;
    user.email = email;
    user.systemRole = systemRole;
    user.jobRole = jobRole;
    createUser(user);
  }

  public void createUser(Users user) {
    repository.insert(user);
  }

  private void ensureNotLastAdmin(Role currentRole, Role nextRole) {
    // Only matters when an existing admin is being deleted or changed to a
    // non-admin role.
    if (currentRole != Role.ADMIN) {
      return;
    }
    if (nextRole == Role.ADMIN) {
      return;
    }
    if (repository.countBySystemRole(Role.ADMIN) <= 1) {
      throw new BadRequestResponse("At least one admin account must remain in the system");
    }
  }
}
