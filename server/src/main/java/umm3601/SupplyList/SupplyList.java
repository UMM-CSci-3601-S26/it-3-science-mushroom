package umm3601.supplylist;

import org.mongojack.Id;
import org.mongojack.ObjectId;


@SuppressWarnings({"VisibilityModifier"})
public class SupplyList {

  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String school;
  public String grade;
  public String teacher;
  public String item;
  public String brand;
  public int count;
  public String size;
  public String color;
  public String type;
  public String material;
  public String description;
  public int quantity;
  public String notes;

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

  @Override
  public String toString() {
    return item + " " + brand + " " + description;
  }
}
