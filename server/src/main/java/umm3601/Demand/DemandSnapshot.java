package umm3601.Demand;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class DemandSnapshot {
  public final DemandCalculationResult summary;
  public final List<DemandInventoryItem> items;
  public final List<DemandSupplyListItem> supplyListItems;

  public DemandSnapshot(
      DemandCalculationResult summary,
      List<DemandInventoryItem> items,
      List<DemandSupplyListItem> supplyListItems
  ) {
    this.summary = summary;
    this.items = List.copyOf(items);
    this.supplyListItems = List.copyOf(supplyListItems);
  }
}
