package umm3601.Inventory;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
public class InventorySpec {
  private static final String FAKE_ID_STRING_1 = "fakeIdOne";
  private static final String FAKE_ID_STRING_2 = "fakeIdTwo";

  private Inventory inv1;
  private Inventory inv2;

  @BeforeEach
  void setupEach() {
    inv1 = new Inventory();
    inv2 = new Inventory();
  }

  @Test
  void inventoriesWithEqualIdAreEqual() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_1;

    assertTrue(inv1.equals(inv2));
  }

  @Test
  void inventoriesWithDifferentIdAreNotEqual() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_2;

    assertFalse(inv1.equals(inv2));
  }

  @Test
  void hashCodesAreBasedOnId() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_1;

    assertTrue(inv1.hashCode() == inv2.hashCode());
  }

  @SuppressWarnings("unlikely-arg-type")
  @Test
  void inventoriesAreNotEqualToOtherKindsOfThings() {
    inv1._id = FAKE_ID_STRING_1;
    // an Inventory is not equal to its id even though id is used for checking equality
    assertFalse(inv1.equals(FAKE_ID_STRING_1));
  }
}
