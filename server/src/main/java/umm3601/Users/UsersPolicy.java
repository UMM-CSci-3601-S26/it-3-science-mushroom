package umm3601.Users;

import io.javalin.http.ForbiddenResponse;
import umm3601.Auth.Role;
import umm3601.Common.AuthContext;

public class UsersPolicy {
  public void authorizeManage(AuthContext auth) {
    if (auth.role() != Role.ADMIN) {
      throw new ForbiddenResponse("Only admins can manage users");
    }
  }
}
