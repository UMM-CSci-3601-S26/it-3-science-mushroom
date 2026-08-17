package umm3601.PurchaseList;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class PurchaseListItem {
  public String inventoryId;
  public String internalId;
  public String item;
  public String description;
  public int totalNeeded;
  public int quantityOnHand;
  public int quantityToBuy;
  public int fulfillmentPercent;
  public String fulfillmentStatus;
  public List<String> linkedInventoryIds = List.of();
  public List<String> selectedFulfillmentInventoryIds = List.of();
  public List<PurchaseListFulfillmentOption> fulfillmentOptions = List.of();
  public List<PurchaseListSource> sources = List.of();
}
