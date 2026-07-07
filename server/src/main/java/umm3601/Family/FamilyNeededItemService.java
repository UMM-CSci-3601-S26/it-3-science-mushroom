package umm3601.Family;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class FamilyNeededItemService {
  private static final String REASON_NOT_AVAILABLE_DIDNT_RECEIVE = "not_available_didnt_receive";

  public List<NeededItem> recordNeededButNotAcquiredItems(Family family) {
    List<NeededItem> neededItems = new ArrayList<>();
    if (family == null || family.checklist == null || family.checklist.sections == null) {
      return neededItems;
    }

    for (Family.ChecklistSection section : family.checklist.sections) {
      if (section.items == null) {
        continue;
      }

      for (Family.ChecklistItem item : section.items) {
        if (isNeededButNotAcquired(item)) {
          neededItems.add(new NeededItem(family, section, item));
        }
      }
    }

    return neededItems;
  }

  private boolean isNeededButNotAcquired(Family.ChecklistItem item) {
    return item != null
      && !item.selected
      && REASON_NOT_AVAILABLE_DIDNT_RECEIVE.equals(normalizeReason(item.notPickedUpReason));
  }

  private String normalizeReason(String reason) {
    if (reason == null) {
      return null;
    }
    return reason.trim()
      .toLowerCase(Locale.US)
      .replace("'", "")
      .replaceAll("[\\s-]+", "_");
  }

  public static class NeededItem {
    private final String familyId;
    private final String guardianName;
    private final String sectionId;
    private final String sectionTitle;
    private final String itemId;
    private final String label;
    private final Integer requestedQuantity;
    private final String reason;

    NeededItem(Family family, Family.ChecklistSection section, Family.ChecklistItem item) {
      familyId = family._id;
      guardianName = family.guardianName;
      sectionId = section.id;
      sectionTitle = section.printableTitle != null ? section.printableTitle : section.title;
      itemId = item.id;
      label = item.label != null ? item.label : item.itemDescription;
      requestedQuantity = item.requestedQuantity;
      reason = item.notPickedUpReason;
    }

    public String getFamilyId() {
      return familyId;
    }

    public String getGuardianName() {
      return guardianName;
    }

    public String getSectionId() {
      return sectionId;
    }

    public String getSectionTitle() {
      return sectionTitle;
    }

    public String getItemId() {
      return itemId;
    }

    public String getLabel() {
      return label;
    }

    public Integer getRequestedQuantity() {
      return requestedQuantity;
    }

    public String getReason() {
      return reason;
    }
  }
}
