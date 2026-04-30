package umm3601.Auth;

import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

public class JwtUtilsSpec {
  private String secret;

  @BeforeEach
  void setupEach() {
    secret = "mySuperSecretKeyThatShouldBeLongEnough";
  }

  @Test
  void createTokenReturnsNonNullToken() {
    String token = JwtUtils.createToken("user123", "admin", secret);
    assertNotNull(token);
    assertFalse(token.isBlank());
  }

  @Test
  void parsedTokenHasCorrectSubject() {
    String token = JwtUtils.createToken("user123", "admin", secret);
    Claims claims = JwtUtils.parseToken(token, secret);
    assertEquals("user123", claims.getSubject());
  }

  @Test
  void parsedTokenHasCorrectRole() {
    String token = JwtUtils.createToken("user123", "admin", secret);
    Claims claims = JwtUtils.parseToken(token, secret);
    assertEquals("admin", claims.get("systemRole", String.class));
  }

  @Test
  void tokenWithWrongSecretFailsToParse() {
    String token = JwtUtils.createToken("user123", "admin", secret);
    assertThrows(Exception.class, () -> JwtUtils.parseToken(token, "wrong-secret-key-that-is-long-enough!"));
  }
}
