// Packages
package umm3601.Inventory;

// Org Imports
import org.mongojack.Id;
import org.mongojack.ObjectId;
// Java Imports
import java.util.List;
import java.util.StringJoiner;

// Inventory Class
@SuppressWarnings({"VisibilityModifier"})
public class Inventory {

  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String item;
  public String brand;
  public int packageSize;
  public String size;
  public String color;
  public String type;
  public String material;
  public String description;
  public int quantity;
  public int maxQuantity;
  public int minQuantity;
  public String stockState; // "Stocked", "Under-Stocked", "Over-Stocked", "Out of Stock"
  public String notes;
  public String internalID;
  public String internalBarcode;
  public List<String> externalBarcode;

  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof Inventory)) {
      return false;
    }
    Inventory other = (Inventory) obj;
    return _id != null && _id.equals(other._id);
  }

  @Override
  public int hashCode() {
    return _id == null ? 0 : _id.hashCode();
  }

  public String buildDescription() {
    StringJoiner mainParts = new StringJoiner(" ");
    addIfPresent(mainParts, brand);
    addIfPresent(mainParts, color);
    addIfPresent(mainParts, item);

    StringJoiner detailParts = new StringJoiner(", ");
    addIfPresent(detailParts, type);
    addIfPresent(detailParts, size);
    addIfPresent(detailParts, material);

    if (packageSize > 0) {
      detailParts.add("package size " + packageSize);
    }

    String main = mainParts.toString().trim();
    String details = detailParts.toString().trim();

    if (!main.isEmpty() && !details.isEmpty()) {
      return main + " (" + details + ")";
    }
    if (!main.isEmpty()) {
      return main;
    }
    if (!details.isEmpty()) {
      return details;
    }

    return "";
  }

  public void refreshDescription() {
    this.description = buildDescription();
  }

  private void addIfPresent(StringJoiner joiner, String value) {
    if (hasValue(value)) {
      joiner.add(value.trim());
    }
  }

  private boolean hasValue(String value) {
    return value != null
      && !value.trim().isEmpty()
      && !value.trim().equalsIgnoreCase("N/A");
  }

  @Override
  public String toString() {
    return buildDescription();
  }
}
