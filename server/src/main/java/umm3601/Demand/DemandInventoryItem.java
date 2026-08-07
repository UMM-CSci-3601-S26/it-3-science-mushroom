package umm3601.Demand;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class DemandInventoryItem {
  public String inventoryId;
  public String internalId;
  public String item;
  public String description;
  public int quantityOnHand;
  public int totalNeeded;
  public int quantityToBuy;
  public String calculatedStockState;
  public List<DemandSupplyListItem> supplyListItems = List.of();
}
