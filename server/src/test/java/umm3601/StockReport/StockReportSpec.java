// Packages
package umm3601.StockReport;

// Static Imports
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

// Org Imports
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

// StockReportSpec Class
public class StockReportSpec {
  private static final String FAKE_ID_STRING_1 = "fakeIdOne";
  private static final String FAKE_ID_STRING_2 = "fakeIdTwo";

  private StockReport report1;
  private StockReport report2;

  // -- Test Management -- \\

  @BeforeEach
  @SuppressWarnings({ "MagicNumber" })
  void setupEach() {
    report1 = new StockReport();
    report2 = new StockReport();

    report1.stockReportPDF = new byte[]{0x25, 0x50, 0x44, 0x46}; // PDF file header bytes
    report1.reportName = "Report 1";
  }

  // -- StockReport ID Tests -- \\

  @Test
  void reportsWithEqualIdAreEqual() {
    report1._id = FAKE_ID_STRING_1;
    report2._id = FAKE_ID_STRING_1;

    assertTrue(report1.equals(report2));
  }

  @Test
  void reportsWithDifferentIdAreNotEqual() {
    report1._id = FAKE_ID_STRING_1;
    report2._id = FAKE_ID_STRING_2;

    assertFalse(report1.equals(report2));
  }

  @Test
  void hashCodesAreBasedOnId() {
    report1._id = FAKE_ID_STRING_1;
    report2._id = FAKE_ID_STRING_1;

    assertTrue(report1.hashCode() == report2.hashCode());
  }

  @SuppressWarnings("unlikely-arg-type")
  @Test
  void reportsAreNotEqualToOtherKindsOfThings() {
    report1._id = FAKE_ID_STRING_1;
    // an StockReport is not equal to its id even though id is used for checking equality
    assertFalse(report1.equals(FAKE_ID_STRING_1));
  }

  @Test
  void nullId() {
    report1._id = null;
    report2._id = FAKE_ID_STRING_2;

    assertEquals(report1.hashCode(), 0);
    assertFalse(report1.equals(report2));
  }
}
