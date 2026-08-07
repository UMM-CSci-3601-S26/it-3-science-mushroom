package umm3601.PurchaseList;

import java.util.List;

@SuppressWarnings({ "VisibilityModifier" })
public class PurchaseListSnapshot {
  public String generatedAt;
  public PurchaseListSummary summary;
  public List<PurchaseListItem> items = List.of();
}
