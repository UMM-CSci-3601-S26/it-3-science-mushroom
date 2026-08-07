package umm3601.Demand;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class DemandSupplyListItem {
  public String supplyListId;
  public String school;
  public String grade;
  public String teacher;
  public List<String> requestedItems = List.of();
  public List<String> linkedInventoryIds = List.of();
  public String primaryInternalId;
  public String status;
  public int studentCount;
  public int quantityPerStudent;
  public int totalNeeded;
  public int linkedQuantityOnHand;
  public Integer percentageFilled;
}
