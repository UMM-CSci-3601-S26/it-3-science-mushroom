package umm3601.Inventory;

import org.mongojack.Id;
import org.mongojack.ObjectId;


@SuppressWarnings({"VisibilityModifier"})
public class Inventory {

  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String school;
  public String grade;
  public String description;
  public int quantity;
  public String[] properties;
  public String item;
  public String notes;

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

  @Override
  public String toString() {
    return school + " " + grade + " " + description;
  }
}
