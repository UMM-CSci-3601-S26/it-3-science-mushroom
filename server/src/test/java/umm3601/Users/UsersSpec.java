package umm3601.Users;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@SuppressWarnings({ "MagicNumber" })
public class UsersSpec {
  private String fakeIdString1 = "fakeIdOne";
  private String fakeIdString2 = "fakeIdTwo";

  private Users user1;
  private Users user2;

  @BeforeEach
  void setupEach() {
    user1 = new Users();
    user2 = new Users();

    user1.username = "sampleUser";
    user1.passwordHash = "sampleHash";
    user1.fullName = "Sample User";

    user2.username = "anotherUser";
    user2.passwordHash = "anotherHash";
    user2.fullName = "Another User";
  }

  @Test
  void usersWithEqualIdAreEqual() {
    user1._id = fakeIdString1;
    user2._id = fakeIdString1;

    assert (user1.equals(user2));
  }

  @Test
  void usersWithDifferentIdAreNotEqual() {
    user1._id = fakeIdString1;
    user2._id = fakeIdString2;

    assert (!user1.equals(user2));
  }
}
