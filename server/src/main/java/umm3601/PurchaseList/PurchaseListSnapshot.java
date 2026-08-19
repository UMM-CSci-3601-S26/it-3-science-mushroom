package umm3601.PurchaseList;

import java.util.List;

import org.mongojack.Id;

@SuppressWarnings({ "VisibilityModifier" })
public class PurchaseListSnapshot {
  @Id
  @SuppressWarnings({ "MemberName" })
  public String _id;

  public String generatedAt;
  public PurchaseListSummary summary;
  public List<PurchaseListItem> items = List.of();
}
