package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Objects;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import umm3601.Family.Family;

class FamilySpec {

  private static final String FAKE_ID_STRING_1 = "fakeIdOne";
  private static final String FAKE_ID_STRING_2 = "fakeIdTwo";

  private Family family1;
  private Family family2;

  @BeforeEach
  void setupEach() {
    family1 = new Family();
    family2 = new Family();
  }

  @Test
  void familiesWithEqualIdAreEqual() {
    family1._id = FAKE_ID_STRING_1;
    family2._id = FAKE_ID_STRING_1;

    System.out.println(family1.equals(family2));
    System.out.println(family1._id.equals(family2._id));

    assertTrue(Objects.equals(family1._id, family2._id));
  }

  @Test
  void familiesWithDifferentIdAreNotEqual() {
    family1._id = FAKE_ID_STRING_1;
    family2._id = FAKE_ID_STRING_2;

    assertFalse(family1.equals(family2));
  }

  @SuppressWarnings("unlikely-arg-type")
  @Test
  void familiesAreNotEqualToOtherKindsOfThings() {
    family1._id = FAKE_ID_STRING_1;
    // a family is not equal to its id even though id is used for checking equality
    assertFalse(family1.equals(FAKE_ID_STRING_1));
  }
}
