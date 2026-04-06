// Packages
package umm3601.StockReport;

// Org Imports
import org.mongojack.Id;
import org.mongojack.ObjectId;

// Inventory Class
@SuppressWarnings({"VisibilityModifier"})
public class StockReport {

  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public byte[] stockReportPDF; // PDF file stored as byte array
  public String reportName; // Name of the report

  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof StockReport)) {
      return false;
    }
    StockReport other = (StockReport) obj;
    return _id != null && _id.equals(other._id);
  }

  @Override
  public int hashCode() {
    return _id == null ? 0 : _id.hashCode();
  }
}
