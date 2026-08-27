package umm3601.Common;

import java.util.ArrayList;
import java.util.List;

public final class InventoryIds {
  private static final String INTERNAL_INVENTORY_ID_PATTERN = "^ID-\\d{4,5}$";

  private InventoryIds() {
  }

  public static List<String> validInternalIds(List<String> inventoryIds) {
    List<String> validIds = new ArrayList<>();

    for (String inventoryId : nullSafeList(inventoryIds)) {
      if (isInternalInventoryId(inventoryId) && !validIds.contains(inventoryId)) {
        validIds.add(inventoryId);
      }
    }

    return validIds;
  }

  public static boolean isInternalInventoryId(String inventoryId) {
    return inventoryId != null && inventoryId.matches(INTERNAL_INVENTORY_ID_PATTERN);
  }

  private static List<String> nullSafeList(List<String> values) {
    return values == null ? List.of() : values;
  }
}
