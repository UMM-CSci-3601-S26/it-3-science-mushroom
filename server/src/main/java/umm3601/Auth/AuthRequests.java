package umm3601.Auth;

public final class AuthRequests {
  private AuthRequests() {
  }

  @SuppressWarnings({ "VisibilityModifier" })
  public static class LoginRequest {
    public String username;
    public String password;
  }

  @SuppressWarnings({ "VisibilityModifier" })
  public static class SignupRequest {
    public String username;
    public String password;
    public String fullName;
    public String email;
    public Role systemRole;
  }

  @SuppressWarnings({ "VisibilityModifier" })
  public static class AssignJobRoleRequest {
    public String jobRole;
  }
}
