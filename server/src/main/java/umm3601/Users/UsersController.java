// Package
package umm3601.Users;

// Java imports
import java.util.List;

// Javalin imports
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;

// App imports
import umm3601.Auth.HttpMethod;
import umm3601.Auth.PasswordUtils;
import umm3601.Auth.RequireRole;
import umm3601.Auth.Role;
import umm3601.Auth.Route;
import umm3601.Common.AuthContext;

/**
 * Admin-only API for managing internal user accounts.
 *
 * Guardian accounts are created through signup/family portal flows, while this
 * controller focuses on staff users and role assignment. Validation and
 * last-admin protection live in UsersValidator and UsersService.
 */
public class UsersController {
  private static final String API_USERS = "/api/users";
  private static final String API_USERS_BY_ID = "/api/users/{id}";

  private final UsersService service;
  private final UsersPolicy policy;
  private final UsersValidator validator;

  public UsersController(UsersService service, UsersPolicy policy, UsersValidator validator) {
    this.service = service;
    this.policy = policy;
    this.validator = validator;
  }

  /**
   * getUsers returns a list of all non-guardian users in the system. It is intended for use only by
   * admins to manage staff accounts, so it excludes guardians to keep the admin user list focused on
   * volunteers and staff.
   * @param ctx
   */
  @Route(method = HttpMethod.GET, path = API_USERS)
  @RequireRole(Role.ADMIN)
  public void getUsers(Context ctx) {
    policy.authorizeManage(AuthContext.from(ctx));
    // Managed users intentionally excludes guardians so the admin staff view
    // stays focused on volunteers and admins.
    List<UserAdminView> users = service.getManagedUsers().stream()
        .map(UserAdminView::from)
        .toList();
    ctx.json(users);
    ctx.status(HttpStatus.OK);
  }

  /**
   * createUser creates a new user account with the provided username, full name, email,
   * password, system role, and job role. The request body is validated to ensure all
   * required fields are present and meet the necessary criteria. The password is hashed
   * before being stored in the database.
   * @param ctx
   * @throws BadRequestResponse if the request body is missing required fields, if the username
   *                            already exists, or if any field fails validation criteria
   */
  @Route(method = HttpMethod.POST, path = API_USERS)
  @RequireRole(Role.ADMIN)
  public void createUser(Context ctx) {
    policy.authorizeManage(AuthContext.from(ctx));
    UserUpsertRequest request = ctx.bodyAsClass(UserUpsertRequest.class);

    String username = validator.requireUsername(request.username);
    String fullName = validator.requireFullName(request.fullName);
    String password = validator.requirePassword(request.password);
    Role systemRole = validator.requireSystemRole(request.systemRole);
    String email = validator.normalizeEmail(systemRole, request.email);
    String jobRole = validator.normalizeJobRole(systemRole, request.jobRole);

    // Usernames are the login identifier, so they must stay globally unique.
    if (service.findByUsername(username) != null) {
      throw new io.javalin.http.BadRequestResponse("Username already exists");
    }

    Users user = new Users();
    user.username = username;
    user.fullName = fullName;
    user.email = email;
    user.passwordHash = PasswordUtils.hashPassword(password);
    user.systemRole = systemRole;
    user.jobRole = jobRole;

    service.createUser(user);
    Users created = service.findByUsername(username);
    ctx.json(UserAdminView.from(created == null ? user : created));
    ctx.status(HttpStatus.CREATED);
  }

  /**
   * updateUser updates an existing user account identified by the provided ID with the new username,
   * full name, email, password, system role, and job role. The request body is validated to ensure all
   * required fields are present and meet the necessary criteria. The password is hashed before being
   * stored in the database.
   * @param ctx
   * @throws NotFoundResponse if no user with the specified ID exists
   * @throws BadRequestResponse if the request body is missing required fields, if the username already
   *                            exists for a different user, or if any field fails validation criteria
   */
  @Route(method = HttpMethod.PUT, path = API_USERS_BY_ID)
  @RequireRole(Role.ADMIN)
  public void updateUser(Context ctx) {
    policy.authorizeManage(AuthContext.from(ctx));
    String id = validator.validateId(ctx.pathParam("id"));
    UserUpsertRequest request = ctx.bodyAsClass(UserUpsertRequest.class);
    Users existing = service.findById(id);
    if (existing == null) {
      throw new NotFoundResponse("User not found");
    }

    String username = validator.requireUsername(request.username);
    String fullName = validator.requireFullName(request.fullName);
    Role systemRole = validator.requireSystemRole(request.systemRole);
    // Edits from the role-management UI may omit email/password when those
    // fields are not being changed. Preserve existing email unless a new one is
    // explicitly sent.
    String resolvedEmail = request.email != null ? request.email : existing.email;
    String email = (resolvedEmail == null || resolvedEmail.isBlank())
        ? null
        : validator.normalizeEmail(systemRole, resolvedEmail);
    String jobRole = validator.normalizeJobRole(systemRole, request.jobRole);
    String password = validator.optionalPassword(request.password);

    Users otherUser = service.findByUsername(username);
    if (otherUser != null && !otherUser._id.equals(existing._id)) {
      throw new io.javalin.http.BadRequestResponse("Username already exists");
    }

    existing.username = username;
    existing.fullName = fullName;
    existing.email = email;
    existing.systemRole = systemRole;
    existing.jobRole = jobRole;
    if (password != null) {
      // Only replace the password hash when the request includes a new password.
      existing.passwordHash = PasswordUtils.hashPassword(password);
    }

    service.replaceUser(id, existing);
    ctx.json(UserAdminView.from(existing));
    ctx.status(HttpStatus.OK);
  }

  /**
   * deleteUser deletes the user account identified by the provided ID.
   * @param ctx
   * @throws NotFoundResponse if no user with the specified ID exists
   */
  @Route(method = HttpMethod.DELETE, path = API_USERS_BY_ID)
  @RequireRole(Role.ADMIN)
  public void deleteUser(Context ctx) {
    policy.authorizeManage(AuthContext.from(ctx));
    String id = validator.validateId(ctx.pathParam("id"));
    service.deleteUserById(id);
    ctx.status(HttpStatus.OK);
  }

  @SuppressWarnings({ "VisibilityModifier" })
  public static class UserUpsertRequest {
    public String username;
    public String fullName;
    public String email;
    public String password;
    public Role systemRole;
    public String jobRole;
  }

  @SuppressWarnings({ "VisibilityModifier", "MemberName" })
  public static class UserAdminView {
    public String _id;
    public String username;
    public String fullName;
    public String email;
    public String systemRole;
    public String jobRole;

    // Do not expose passwordHash to the client.
    static UserAdminView from(Users user) {
      // Do not expose passwordHash to the client.
      UserAdminView view = new UserAdminView();
      view._id = user._id;
      view.username = user.username;
      view.fullName = user.fullName;
      view.email = user.email;
      view.systemRole = user.systemRole == null ? null : user.systemRole.name();
      view.jobRole = user.jobRole;
      return view;
    }
  }
}
