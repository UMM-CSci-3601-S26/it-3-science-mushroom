package umm3601.Family;

import org.mongojack.Id;
import org.mongojack.ObjectId;

@SuppressWarnings({"VisibilityModifier"})
public class NeededItemLog {
  @ObjectId @Id
  @SuppressWarnings({"MemberName"})
  public String _id;

  public String familyId;
  public String guardianName;
  public String sectionId;
  public String sectionTitle;
  public String itemId;
  public String label;
  public Integer requestedQuantity;
  public String reason;
  public String createdAt;

  public static NeededItemLog from(FamilyNeededItemService.NeededItem neededItem, String createdAt) {
    NeededItemLog log = new NeededItemLog();
    log.familyId = neededItem.getFamilyId();
    log.guardianName = neededItem.getGuardianName();
    log.sectionId = neededItem.getSectionId();
    log.sectionTitle = neededItem.getSectionTitle();
    log.itemId = neededItem.getItemId();
    log.label = neededItem.getLabel();
    log.requestedQuantity = neededItem.getRequestedQuantity();
    log.reason = neededItem.getReason();
    log.createdAt = createdAt;
    return log;
  }
}
