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
 * AttributeOptions fields support both required traits (allOf) and acceptable
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
  public ColorAttributeOptions color;
  public AttributeOptions size;
  public AttributeOptions type;
  public AttributeOptions material;
  public Integer packageSize;
  public Integer quantity;
  public String notes;

  public static class AttributeOptions {
    public String allOf;
    public List<String> anyOf;
  }

  // Color stores allOf as a list because users commonly enter several colors.
  public static class ColorAttributeOptions {
    public List<String> allOf;
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

    // Format allOf/anyOf for each attribute
    String allOfStr = formatAllOf(type, "");
    allOfStr += formatAllOf(color, allOfStr.isEmpty() ? "" : ", ");
    allOfStr += formatAllOf(brand, allOfStr.isEmpty() ? "" : ", ");
    allOfStr += formatAllOf(material, allOfStr.isEmpty() ? "" : ", ");
    allOfStr += formatAllOf(size, allOfStr.isEmpty() ? "" : ", ");
    if (!allOfStr.isEmpty()) {
      sb.append(allOfStr);
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

  // Helper to format allOf as comma-separated with 'and' before last
  private String formatAllOf(AttributeOptions attr, String prefix) {
    if (attr == null || attr.allOf == null || attr.allOf.isEmpty()) {
      return "";
    }
    return prefix + attr.allOf;
  }

  // Color allOf is a list, so format with commas and 'and'
  private String formatAllOf(ColorAttributeOptions attr, String prefix) {
    if (attr == null || attr.allOf == null || attr.allOf.isEmpty()) {
      return "";
    }
    StringBuilder sb = new StringBuilder(prefix);
    int n = attr.allOf.size();
    for (int i = 0; i < n; i++) {
      sb.append(attr.allOf.get(i));
      if (i < n - 2) {
        sb.append(", ");
      } else if (i == n - 2) {
        sb.append(", and ");
      }
    }
    return sb.toString();
  }

  // Helper to format anyOf as (a, b, or c) per category
  private String formatAnyOf(AttributeOptions attr) {
    if (attr == null) {
      return "";
    }
    return formatAnyOf(attr.anyOf);
  }

  // Helper to format anyOf as (a, b, or c) per category
  private String formatAnyOf(ColorAttributeOptions attr) {
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

