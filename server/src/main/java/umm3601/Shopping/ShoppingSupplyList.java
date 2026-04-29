package umm3601.Shopping;

import umm3601.SupplyList.SupplyList;

@SuppressWarnings({ "VisibilityModifier" })
public class ShoppingSupplyList {
  public SupplyList supplyList;
  public int totalNeeded;

  public ShoppingSupplyList(SupplyList supplyList, int totalNeeded) {
    this.supplyList = supplyList;
    this.totalNeeded = totalNeeded;
  }
}

