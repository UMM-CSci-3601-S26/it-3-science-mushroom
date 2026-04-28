package umm3601.Auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

public class PasswordUtilsSpec {
  private String password1;
  private String password2;

  @BeforeEach
  void setupEach() {
    password1 = "password123";
    password2 = "differentPassword456";
  }

  @Test
  void hashPasswordProducesDifferentHashEachTime() {
    String hash1 = PasswordUtils.hashPassword(password1);
    String hash2 = PasswordUtils.hashPassword(password1);

    assert (!hash1.equals(hash2));
  }

  @Test
  void checkPasswordReturnsTrueForCorrectPassword() {
    String hash = PasswordUtils.hashPassword(password1);
    assert (PasswordUtils.checkPassword(password1, hash));
  }

  @Test
  void checkPasswordReturnsFalseForIncorrectPassword() {
    String hash = PasswordUtils.hashPassword(password1);
    assert (!PasswordUtils.checkPassword(password2, hash));
  }

  @Test
  void checkPasswordReturnsFalseForCompletelyDifferentHash() {
    String hash = PasswordUtils.hashPassword(password1);
    String differentHash = PasswordUtils.hashPassword(password2);
    assert (!PasswordUtils.checkPassword(password1, differentHash));
    assert (!PasswordUtils.checkPassword(password2, hash));
  }
}
