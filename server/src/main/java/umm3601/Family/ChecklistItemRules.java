package umm3601.Family;

import java.util.Locale;

final class ChecklistItemRules {
  private static final String REASON_AVAILABLE_DIDNT_NEED = "available_didnt_need";
  private static final String REASON_ITEM_NOT_AVALIABLE = "item_not_avaliable";
  private static final String REASON_ITEM_NOT_AVAILABLE = "item_not_available";
  private static final String REASON_NOT_AVAILABLE_DIDNT_RECEIVE = "not_available_didnt_receive";
  private static final String REASON_SUBSTITUTED = "substituted";

  private ChecklistItemRules() {
  }

  static boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  static String notAvailableDidntReceiveReason() {
    return REASON_NOT_AVAILABLE_DIDNT_RECEIVE;
  }

  static String substitutedReason() {
    return REASON_SUBSTITUTED;
  }

  static String normalizeReason(String reason) {
    if (reason == null) {
      return null;
    }
    return reason.trim()
      .toLowerCase(Locale.US)
      .replace("'", "")
      .replaceAll("[\\s-]+", "_");
  }

  static boolean isChosenSubstitution(Family.ChecklistItem item) {
    return item != null
      && hasText(item.substituteBarcode)
      && (item.selected || REASON_SUBSTITUTED.equals(normalizeReason(item.notPickedUpReason)));
  }

  static boolean isServedToFamily(Family.ChecklistItem item) {
    return item != null
      && (item.selected || isChosenSubstitution(item) || hasFulfillmentItemTargets(item));
  }

  static boolean isValidNotPickedUpReason(String reason) {
    String normalizedReason = normalizeReason(reason);
    return REASON_AVAILABLE_DIDNT_NEED.equals(normalizedReason)
      || REASON_ITEM_NOT_AVALIABLE.equals(normalizedReason)
      || REASON_NOT_AVAILABLE_DIDNT_RECEIVE.equals(normalizedReason)
      || REASON_SUBSTITUTED.equals(normalizedReason);
  }

  static boolean isNeededButNotAcquiredReason(String reason) {
    String normalizedReason = normalizeReason(reason);
    return REASON_ITEM_NOT_AVALIABLE.equals(normalizedReason)
      || REASON_ITEM_NOT_AVAILABLE.equals(normalizedReason)
      || REASON_NOT_AVAILABLE_DIDNT_RECEIVE.equals(normalizedReason);
  }

  static boolean hasFulfillmentItemTargets(Family.ChecklistItem item) {
    if (item == null || item.fulfillmentItems == null) {
      return false;
    }

    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      if (hasFulfillmentItemTarget(fulfillmentItem)) {
        return true;
      }
    }
    return false;
  }

  static boolean hasFulfillmentItemTarget(Family.FulfillmentItem fulfillmentItem) {
    return fulfillmentItem != null
      && (hasText(fulfillmentItem.inventoryId) || hasText(fulfillmentItem.barcode));
  }

  static int fulfilledQuantity(Family.ChecklistItem item) {
    if (item == null || item.fulfillmentItems == null) {
      return 0;
    }

    int quantity = 0;
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      if (hasFulfillmentItemTarget(fulfillmentItem)) {
        quantity += fulfillmentItemQuantity(fulfillmentItem);
      }
    }
    return quantity;
  }

  static int checklistItemQuantity(Family.ChecklistItem item) {
    return item == null ? 1 : quantityOrOne(item.requestedQuantity);
  }

  static int fulfillmentItemQuantity(Family.FulfillmentItem fulfillmentItem) {
    return fulfillmentItem == null ? 1 : quantityOrOne(fulfillmentItem.quantity);
  }

  static int quantityOrOne(Integer quantity) {
    return quantity == null || quantity <= 0 ? 1 : quantity;
  }

  static int quantityOrOne(int quantity) {
    return quantity <= 0 ? 1 : quantity;
  }
}
