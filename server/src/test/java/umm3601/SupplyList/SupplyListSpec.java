// Packages
package umm3601.SupplyList;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Org Imports
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


public class SupplyListSpec {
  private static final String FAKE_ID_STRING_1 = "fakeIdOne";
  private static final String FAKE_ID_STRING_2 = "fakeIdTwo";

  private SupplyList inv1;
  private SupplyList inv2;

  // -- Test Management -- \\

  @BeforeEach
  void setupEach() {
    inv1 = new SupplyList();
    inv2 = new SupplyList();

    inv1.school = "MHS";
    inv1.grade = "PreK";
    inv1.item = "Pencil";
    inv1.brand = "Ticonderoga";
    inv1.description = "Ticonderoga Pencil";
  }

  // -- Supply List ID Tests -- \\

  @Test
  void supplyListWithEqualIdAreEqual() {
    inv1._id = FAKE_ID_STRING_1;
    inv2._id = FAKE_ID_STRING_1;

    assertTrue(inv1.equals(inv2));
  }

  @Test
  void supplylistWithDifferentIdAreNotEqual() {
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
  void supplylistAreNotEqualToOtherKindsOfThings() {
    inv1._id = FAKE_ID_STRING_1;
    // an Inventory is not equal to its id even though id is used for checking equality
    assertFalse(inv1.equals(FAKE_ID_STRING_1));
  }

  @Test
  void nullId() {
    inv1._id = null;
    inv2._id = FAKE_ID_STRING_2;

    assertEquals(inv1.hashCode(), 0);
    assertFalse(inv1.equals(inv2));
  }

  // -- Misc Supply List Tests -- \\

  @Test
  void listToString() {
    assertEquals(inv1.toString(), "Pencil Ticonderoga Ticonderoga Pencil");
  }
}
