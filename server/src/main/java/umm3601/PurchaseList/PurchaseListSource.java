package umm3601.PurchaseList;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class PurchaseListSource {
  public String supplyListId;
  public String school;
  public String grade;
  public String teacher;
  public List<String> requestedItems = List.of();
  public int studentCount;
  public int quantityPerStudent;
  public int totalNeeded;
  public String supplyListDescription;
}
