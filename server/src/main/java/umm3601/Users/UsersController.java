package umm3601.Users;

import java.util.List;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import io.javalin.http.NotFoundResponse;
import umm3601.Auth.HttpMethod;
import umm3601.Auth.PasswordUtils;
import umm3601.Auth.RequireRole;
import umm3601.Auth.Role;
import umm3601.Auth.Route;
import umm3601.Common.AuthContext;

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

  @Route(method = HttpMethod.GET, path = API_USERS)
  @RequireRole(Role.ADMIN)
  public void getUsers(Context ctx) {
    policy.authorizeManage(AuthContext.from(ctx));
    List<UserAdminView> users = service.getManagedUsers().stream()
        .map(UserAdminView::from)
        .toList();
    ctx.json(users);
    ctx.status(HttpStatus.OK);
  }

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
      existing.passwordHash = PasswordUtils.hashPassword(password);
    }

    service.replaceUser(id, existing);
    ctx.json(UserAdminView.from(existing));
    ctx.status(HttpStatus.OK);
  }

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

    static UserAdminView from(Users user) {
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
