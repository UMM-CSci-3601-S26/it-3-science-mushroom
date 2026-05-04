// Package
package umm3601.Auth;

// Java imports
import java.util.Map;

/**
 * AuthSession is the return type of AuthService methods that create or validate
 * sessions. It contains the JWT token string and the access profile map that
 * gets sent to the client.
 */
public final class AuthSession {
  private final String token;
  private final Map<String, Object> accessProfile;

  public AuthSession(String token, Map<String, Object> accessProfile) {
    this.token = token;
    this.accessProfile = accessProfile;
  }

  // Getters for the token and access profile
  public String token() {
    return token;
  }

  // The access profile is a map that contains the user's permissions and other
  // relevant information for the client to use.
  public Map<String, Object> accessProfile() {
    return accessProfile;
  }
}
