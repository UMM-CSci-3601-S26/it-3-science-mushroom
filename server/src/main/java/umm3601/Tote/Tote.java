package umm3601.Tote;

import java.util.ArrayList;
import java.util.List;

import org.mongojack.Id;
import org.mongojack.ObjectId;

@SuppressWarnings({"VisibilityModifier"})
public class Tote {
  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String toteBarcode;
  public String name;
  public String notes;
  public List<ToteEntry> contents = new ArrayList<>();
}
