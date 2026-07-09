// Package
package umm3601.SupplyList;

// Java imports
import java.util.List;

// Org Imports
import org.mongojack.Id;
import org.mongojack.ObjectId;

/**
 * Mongo-backed school supply-list item.
 *
 * AttributeOptions fields support both required traits (exactly) and acceptable
 * alternatives (anyOf), which lets a list say things like "blue and plastic" or
 * "Crayola or RoseArt".
 */
@SuppressWarnings({ "VisibilityModifier" })
public class SupplyList {

  @ObjectId @Id
  @SuppressWarnings({ "MemberName" })
  public String _id; // MongoDB ObjectId stored as a string

  // Supply list fields
  public String district;
  public String school;
  public String grade;
  public String teacher;
  public String academicYear;
  public List<String> item;
  public AttributeOptions brand;
  public AttributeOptions color;
  public AttributeOptions size;
  public AttributeOptions type;
  public AttributeOptions material;
  public Integer packageSize;
  public Integer quantity;
  public String notes;
  public String supplyID; // ID of the supply item in the supply collection
  public String[] invIDs; // Array of inventory IDs associated with this supply list item

  public static class AttributeOptions {
    public String exactly;
    public List<String> anyOf;
  }

  // Equality is based on Mongo identity so tests and collection operations treat
  // two copies of the same database document as the same item.
  @Override
  public boolean equals(Object obj) {
    if (!(obj instanceof SupplyList)) {
      return false;
    }
    SupplyList other = (SupplyList) obj;
    return _id != null && _id.equals(other._id);
  }

  @Override
  public int hashCode() {
    return _id == null ? 0 : _id.hashCode();
  }

  // Human-readable label used by debugging/tests and mirrored by the Angular UI.
  @Override
  public String toString() {
    StringBuilder sb = new StringBuilder();

    // Quantity
    if (quantity != null && quantity > 0) {
      sb.append(quantity).append(" ");
    }

    // Count (e.g., 24ct)
    if (packageSize != null && packageSize > 1) {
      sb.append(packageSize).append("ct ");
    }

    // Item (pluralize if quantity > 1)
    if (item != null && !item.isEmpty()) {
      sb.append(String.join(" or ", item));
      // Pluralize if needed
      if (quantity != null && quantity > 1 && item.size() == 1 && !item.get(0).endsWith("s")) {
        sb.append("s");
      }
      sb.append(" ");
    }

    // Format exactly/anyOf for each attribute
    String exactlyStr = formatExactly(type, "");
    exactlyStr += formatExactly(color, exactlyStr.isEmpty() ? "" : ", ");
    exactlyStr += formatExactly(brand, exactlyStr.isEmpty() ? "" : ", ");
    exactlyStr += formatExactly(material, exactlyStr.isEmpty() ? "" : ", ");
    exactlyStr += formatExactly(size, exactlyStr.isEmpty() ? "" : ", ");
    if (!exactlyStr.isEmpty()) {
      sb.append(exactlyStr);
    }

    // Format anyOf for each attribute (grouped by category)
    String anyOfStr = formatAnyOf(type);
    anyOfStr += formatAnyOf(color);
    anyOfStr += formatAnyOf(brand);
    anyOfStr += formatAnyOf(material);
    anyOfStr += formatAnyOf(size);
    if (!anyOfStr.isEmpty()) {
      sb.append(anyOfStr);
    }

    // Notes
    if (notes != null && !notes.isEmpty()) {
      sb.append(" (").append(notes).append(")");
    }

    return sb.toString().trim();
  }

  // Helper to format exactly as comma-separated with 'and' before last
  private String formatExactly(AttributeOptions attr, String prefix) {
    if (attr == null || attr.exactly == null || attr.exactly.isEmpty()) {
      return "";
    }
    return prefix + attr.exactly;
  }

  // Helper to format anyOf as (a, b, or c) per category
  private String formatAnyOf(AttributeOptions attr) {
    if (attr == null) {
      return "";
    }
    return formatAnyOf(attr.anyOf);
  }

  private String formatAnyOf(List<String> anyOf) {
    if (anyOf == null || anyOf.isEmpty()) {
      return "";
    }
    StringBuilder sb = new StringBuilder(" (");
    int n = anyOf.size();
    for (int i = 0; i < n; i++) {
      sb.append(anyOf.get(i));
      if (i < n - 2) {
        sb.append(", ");
      } else if (i == n - 2) {
        sb.append(", or ");
      }
    }
    sb.append(")");
    return sb.toString();
  }
}

