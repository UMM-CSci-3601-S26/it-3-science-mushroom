package umm3601.Auth;

import java.util.Map;

public final class AuthSession {
  private final String token;
  private final Map<String, Object> accessProfile;

  public AuthSession(String token, Map<String, Object> accessProfile) {
    this.token = token;
    this.accessProfile = accessProfile;
  }

  public String token() {
    return token;
  }

  public Map<String, Object> accessProfile() {
    return accessProfile;
  }
}
