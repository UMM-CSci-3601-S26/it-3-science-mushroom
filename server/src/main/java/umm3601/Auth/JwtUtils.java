// Package declaration
package umm3601.Auth;

// IO Imports
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.security.Keys;

// Java Imports
import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Utility class for creating and parsing JWTs for authentication.
 * This class provides methods to create a JWT with user information and to
 * parse a JWT to extract claims. The JWTs created by this class include the
 * user ID, system role, and job role (if applicable), and are signed using a
 * secret key. The tokens are set to expire after 8 hours.
 *
 * Functions provided by this class include:
 * createToken: Generates a JWT for a given user ID, system role, and optional job role, using a provided secret key.
 * parseToken: Validates and parses a JWT using the provided secret key, returning the claims contained in the token.
 *
 * Why use JWTs?
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * JSON Web Tokens (JWTs) provide a secure and compact way to transmit
 * information between parties as a JSON object.
 * They are widely used for authentication and authorization in web
 * applications. JWTs are self-contained, meaning they include all the
 * necessary information about the user, reducing the need for server-side
 * sessions. By signing the JWT with a secret key, we can ensure the
 * integrity and authenticity of the token, preventing tampering and forgery.
 */

public class JwtUtils {
  private static final long MILLIS_PER_SECOND = 1000L;
  private static final long SECONDS_PER_MINUTE = 60L;
  private static final long MINUTES_PER_HOUR = 60L;
  private static final long TOKEN_LIFETIME_HOURS = 8L;
  private static final long TOKEN_LIFETIME_MILLIS = MILLIS_PER_SECOND
      * SECONDS_PER_MINUTE
      * MINUTES_PER_HOUR
      * TOKEN_LIFETIME_HOURS;

  public static String createToken(String userId, Role systemRole, String jobRole, String secret) {
    // Create a SecretKey from the provided secret string using HMAC SHA-256
    // algorithm
    SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

    // Build and return the JWT with the specified claims and signing key
    return Jwts.builder()
        .subject(userId)
        .claim("systemRole", systemRole.dbName())
        .claim("jobRole", jobRole)
        .issuedAt(new Date())
        .expiration(new Date(System.currentTimeMillis() + TOKEN_LIFETIME_MILLIS))
        .signWith(key)
        .compact();
  }

  // Backward-compatible overload for callers that do not set a volunteer job role.
  public static String createToken(String userId, String systemRole, String secret) {
    // Delegate to the main createToken method with a null jobRole
    return createToken(userId, Role.fromString(systemRole), null, secret);
  }

  public static Claims parseToken(String token, String secret) {
    // Create a SecretKey from the provided secret string using HMAC SHA-256 algorithm
    SecretKey key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));

    // Parse the JWT, validate its signature and expiration, and return the claims
    // contained in the token
    return Jwts.parser()
        .verifyWith(key)
        .build()
        .parseSignedClaims(token)
        .getPayload();
  }
}
