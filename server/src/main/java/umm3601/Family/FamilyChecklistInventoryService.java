package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;
import static umm3601.Family.ChecklistItemRules.checklistItemQuantity;
import static umm3601.Family.ChecklistItemRules.fulfilledQuantity;
import static umm3601.Family.ChecklistItemRules.fulfillmentItemQuantity;
import static umm3601.Family.ChecklistItemRules.hasFulfillmentItemTargets;
import static umm3601.Family.ChecklistItemRules.hasText;
import static umm3601.Family.ChecklistItemRules.isChosenSubstitution;
import static umm3601.Family.ChecklistItemRules.isValidNotPickedUpReason;
import static umm3601.Family.ChecklistItemRules.notAvailableDidntReceiveReason;
import static umm3601.Family.ChecklistItemRules.quantityOrOne;
import static umm3601.Family.ChecklistItemRules.substitutedReason;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Updates;

import io.javalin.http.BadRequestResponse;
import io.javalin.http.NotFoundResponse;
import umm3601.Common.InventoryMatcher;
import umm3601.Inventory.Inventory;

public class FamilyChecklistInventoryService {
  private static final String SELECTED_ITEM_MISSING_INVENTORY_MATCH =
    "A selected checklist item is missing its inventory match.";
  private static final String REVERTED_ITEM_MISSING_INVENTORY_MATCH =
    "A reverted checklist item is missing its inventory match.";
  private static final String VALID_NOT_PICKED_UP_REASON_MESSAGE =
    "reason must be available_didnt_need, item_not_avaliable, not_available_didnt_receive, or substituted.";

  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final InventoryMatcher inventoryMatcher;

  public FamilyChecklistInventoryService(MongoDatabase database, InventoryMatcher inventoryMatcher) {
    this.inventoryMatcher = inventoryMatcher;
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public void commitSectionInventoryChanges(
      Family.ChecklistSection section,
      Family.ChecklistSection existingSection
  ) {
    Map<String, Integer> heldQuantityByInventoryId = heldReservationsForSections(List.of(existingSection));
    validateSectionsInventoryChanges(List.of(section), heldQuantityByInventoryId);
    releaseHeldReservations(heldQuantityByInventoryId);
    applySectionInventoryChanges(section);
  }

  Map<String, Integer> heldReservationsForSections(List<Family.ChecklistSection> sections) {
    Map<String, Integer> heldQuantityByInventoryId = new HashMap<>();

    for (Family.ChecklistSection section : sections) {
      if (section.items == null) {
        continue;
      }
      for (Family.ChecklistItem item : section.items) {
        addHeldReservationTarget(item, heldQuantityByInventoryId);
      }
    }

    return heldQuantityByInventoryId;
  }

  void releaseHeldReservations(Map<String, Integer> heldQuantityByInventoryId) {
    if (heldQuantityByInventoryId == null) {
      return;
    }

    for (Map.Entry<String, Integer> heldReservation : heldQuantityByInventoryId.entrySet()) {
      releaseInventory(heldReservation.getKey(), heldReservation.getValue());
    }
  }

  void releaseChecklistReservations(Family.FamilyChecklist checklist) {
    if (checklist == null || checklist.sections == null) {
      return;
    }

    Map<String, Integer> heldQuantityByInventoryId = new HashMap<>();
    for (Family.ChecklistSection section : checklist.sections) {
      if (section.saved || section.items == null) {
        continue;
      }
      for (Family.ChecklistItem item : section.items) {
        addHeldReservationTarget(item, heldQuantityByInventoryId);
      }
    }
    releaseHeldReservations(heldQuantityByInventoryId);
  }

  void restoreChecklistInventoryChanges(Family.FamilyChecklist checklist) {
    if (checklist == null || checklist.sections == null) {
      return;
    }

    for (Family.ChecklistSection section : checklist.sections) {
      if (section.items == null) {
        continue;
      }
      for (Family.ChecklistItem item : section.items) {
        restoreChecklistItemInventory(item);
      }
    }
  }

  void validateSectionsInventoryChanges(
      List<Family.ChecklistSection> sections,
      Map<String, Integer> heldQuantityByInventoryId
  ) {
    // Accumulate every target before mutating inventory so save-all cannot reuse one stock count across rows.
    Map<String, Integer> requestedQuantityByInventoryId = new HashMap<>();

    for (Family.ChecklistSection section : sections) {
      for (Family.ChecklistItem item : section.items) {
        validateChecklistItemForSave(item);
        addRequestedInventoryTarget(item, requestedQuantityByInventoryId);
      }
    }

    for (Map.Entry<String, Integer> request : requestedQuantityByInventoryId.entrySet()) {
      validateInventoryTargetQuantity(
        request.getKey(),
        request.getValue(),
        heldQuantityByInventoryId.getOrDefault(request.getKey(), 0));
    }
  }

  void applySectionInventoryChanges(Family.ChecklistSection section) {
    for (Family.ChecklistItem item : section.items) {
      if (hasFulfillmentItemTargets(item)) {
        consumeFulfillmentItems(item);
      } else if (isChosenSubstitution(item)) {
        Inventory substituteInventory = inventoryMatcher.findInventoryByBarcode(item.substituteBarcode);
        consumeInventory(substituteInventory.internalID, checklistItemQuantity(item));
        item.substituteInventoryId = substituteInventory.internalID;
        item.substituteItem = substituteInventory.item;
        item.substituteDescription = substituteInventory.description;
        item.notPickedUpReason = substitutedReason();
      } else if (item.selected) {
        consumeInventory(item.matchedInventoryId, checklistItemQuantity(item));
      }
    }
  }

  void consumeInventory(String internalId, int amount) {
    Inventory inventory = requireInventoryByInternalId(internalId, SELECTED_ITEM_MISSING_INVENTORY_MATCH);
    int quantityToConsume = quantityOrOne(amount);
    if (inventory.quantity < quantityToConsume) {
      throw new BadRequestResponse("Inventory quantity is too low to fulfill checklist item: " + internalId);
    }

    inventoryCollection.updateOne(
      eq("_id", new ObjectId(inventory._id)),
      Updates.set("quantity", inventory.quantity - quantityToConsume));
  }

  private void addHeldReservationTarget(Family.ChecklistItem item, Map<String, Integer> heldQuantityByInventoryId) {
    if (hasFulfillmentItemTargets(item)) {
      addHeldFulfillmentItemTargets(item, heldQuantityByInventoryId);
      return;
    }

    String heldInventoryId = heldInventoryIdForSave(item);
    if (hasText(heldInventoryId)) {
      heldQuantityByInventoryId.merge(heldInventoryId, checklistItemQuantity(item), Integer::sum);
    }
  }

  private void addHeldFulfillmentItemTargets(
      Family.ChecklistItem item,
      Map<String, Integer> heldQuantityByInventoryId
  ) {
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      String inventoryId = heldInventoryIdForFulfillmentItem(fulfillmentItem);
      if (hasText(inventoryId)) {
        heldQuantityByInventoryId.merge(inventoryId, fulfillmentItemQuantity(fulfillmentItem), Integer::sum);
      }
    }
  }

  private String heldInventoryIdForFulfillmentItem(Family.FulfillmentItem fulfillmentItem) {
    if (fulfillmentItem == null) {
      return null;
    }
    if (hasText(fulfillmentItem.inventoryId)) {
      return fulfillmentItem.inventoryId;
    }
    if (hasText(fulfillmentItem.barcode)) {
      Inventory inventory = inventoryMatcher.findInventoryByBarcode(fulfillmentItem.barcode);
      return inventory == null ? null : inventory.internalID;
    }
    return null;
  }

  private String heldInventoryIdForSave(Family.ChecklistItem item) {
    if (isChosenSubstitution(item)) {
      if (hasText(item.substituteInventoryId)) {
        return item.substituteInventoryId;
      }
      Inventory substituteInventory = inventoryMatcher.findInventoryByBarcode(item.substituteBarcode);
      return substituteInventory == null ? null : substituteInventory.internalID;
    }

    return hasText(item.substituteBarcode) || hasText(item.notPickedUpReason) ? null : item.matchedInventoryId;
  }

  private void restoreChecklistItemInventory(Family.ChecklistItem item) {
    if (hasFulfillmentItemTargets(item)) {
      restoreFulfillmentItems(item);
    } else if (isChosenSubstitution(item) && hasText(item.substituteInventoryId)) {
      restoreInventory(item.substituteInventoryId, checklistItemQuantity(item));
    } else if (isChosenSubstitution(item)) {
      restoreSubstituteInventory(item);
    } else if (item.selected) {
      restoreInventory(item.matchedInventoryId, checklistItemQuantity(item));
    }
  }

  private void restoreSubstituteInventory(Family.ChecklistItem item) {
    Inventory substituteInventory = inventoryMatcher.findInventoryByBarcode(item.substituteBarcode);
    if (substituteInventory == null) {
      throw new NotFoundResponse("No inventory item found for substitute barcode: " + item.substituteBarcode);
    }
    restoreInventory(substituteInventory.internalID, checklistItemQuantity(item));
    item.substituteInventoryId = substituteInventory.internalID;
  }

  private void addRequestedInventoryTarget(
      Family.ChecklistItem item,
      Map<String, Integer> requestedQuantityByInventoryId
  ) {
    if (hasFulfillmentItemTargets(item)) {
      addRequestedFulfillmentItemTargets(item, requestedQuantityByInventoryId);
      return;
    }

    String targetInventoryId = targetInventoryIdForSave(item);
    if (hasText(targetInventoryId)) {
      requestedQuantityByInventoryId.merge(targetInventoryId, checklistItemQuantity(item), Integer::sum);
    }
  }

  private void addRequestedFulfillmentItemTargets(
      Family.ChecklistItem item,
      Map<String, Integer> requestedQuantityByInventoryId
  ) {
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      Inventory inventory = requireInventoryForFulfillmentItem(item, fulfillmentItem);
      if (inventory != null) {
        requestedQuantityByInventoryId.merge(
          inventory.internalID,
          fulfillmentItemQuantity(fulfillmentItem),
          Integer::sum);
      }
    }
  }

  private String targetInventoryIdForSave(Family.ChecklistItem item) {
    if (isChosenSubstitution(item)) {
      Inventory substituteInventory = inventoryMatcher.findInventoryByBarcode(item.substituteBarcode);
      if (substituteInventory == null) {
        throw new NotFoundResponse("No inventory item found for substitute barcode: " + item.substituteBarcode);
      }
      if (!hasText(substituteInventory.internalID)) {
        throw new BadRequestResponse("A substitute checklist item is missing its inventory match.");
      }
      return substituteInventory.internalID;
    }
    if (item.selected) {
      if (!hasText(item.matchedInventoryId)) {
        throw new BadRequestResponse("A selected checklist item is missing its inventory match.");
      }
      return item.matchedInventoryId;
    }
    return null;
  }

  private Inventory requireInventoryForFulfillmentItem(
      Family.ChecklistItem item,
      Family.FulfillmentItem fulfillmentItem
  ) {
    if (fulfillmentItem == null) {
      return null;
    }

    Inventory inventory = null;
    if (hasText(fulfillmentItem.inventoryId)) {
      inventory = findInventoryByInternalId(fulfillmentItem.inventoryId);
      if (inventory == null) {
        throw new NotFoundResponse("No item found for internalID: " + fulfillmentItem.inventoryId);
      }
    } else if (hasText(fulfillmentItem.barcode)) {
      inventory = inventoryMatcher.findInventoryByBarcode(fulfillmentItem.barcode);
      if (inventory == null) {
        throw new NotFoundResponse(
          "No inventory item found for " + fulfillmentBarcodeLabel(item, fulfillmentItem)
            + ": " + fulfillmentItem.barcode);
      }
    }

    if (inventory != null && !hasText(inventory.internalID)) {
      throw new BadRequestResponse("A fulfillment checklist item is missing its inventory match.");
    }
    return inventory;
  }

  private String fulfillmentBarcodeLabel(Family.ChecklistItem item, Family.FulfillmentItem fulfillmentItem) {
    return isChosenSubstitution(item) && fulfillmentItem.barcode.equals(item.substituteBarcode)
      ? "substitute barcode"
      : "fulfillment barcode";
  }

  private void validateInventoryTargetQuantity(String internalId, int requestedQuantity, int heldQuantity) {
    Inventory inventory = requireInventoryByInternalId(internalId, SELECTED_ITEM_MISSING_INVENTORY_MATCH);
    int heldAvailableQuantity = Math.min(heldQuantity, inventory.reservedQuantity);
    int availableQuantity = inventoryMatcher.unreservedQuantity(inventory) + heldAvailableQuantity;
    if (availableQuantity < requestedQuantity) {
      throw new BadRequestResponse("Not enough unreserved stock available for inventory item: " + internalId);
    }
  }

  void validateChecklistItemForSave(Family.ChecklistItem item) {
    boolean hasSubstitution = isChosenSubstitution(item);
    boolean hasFulfillmentItems = hasFulfillmentItemTargets(item);
    if (hasFulfillmentItems) {
      validateFulfillmentQuantity(item);
    }

    if (item.selected && !item.available && !hasSubstitution && !hasFulfillmentItems) {
      throw new BadRequestResponse("Unavailable items cannot be saved as selected.");
    }

    if (!item.selected) {
      boolean hasReason = hasText(item.notPickedUpReason);

      if (!item.available && !hasReason && !hasSubstitution && !hasFulfillmentItems) {
        item.notPickedUpReason = notAvailableDidntReceiveReason();
        hasReason = true;
      }

      if (!hasSubstitution && !hasFulfillmentItems && !hasReason) {
        throw new BadRequestResponse("Unchecked items must include a reason or substitution barcode.");
      }

      if (hasReason) {
        validateNotPickedUpReason(item.notPickedUpReason);
      }
    }
  }

  private void validateFulfillmentQuantity(Family.ChecklistItem item) {
    int fulfilledQuantity = fulfilledQuantity(item);
    int requestedQuantity = checklistItemQuantity(item);
    if (fulfilledQuantity > requestedQuantity) {
      throw new BadRequestResponse("Fulfilled quantity cannot exceed requested quantity.");
    }
    if (fulfilledQuantity < requestedQuantity && !hasText(item.notPickedUpReason)) {
      throw new BadRequestResponse("Partially fulfilled items must include a reason.");
    }
    if (hasText(item.notPickedUpReason)) {
      validateNotPickedUpReason(item.notPickedUpReason);
    }
  }

  private void restoreFulfillmentItems(Family.ChecklistItem item) {
    applyFulfillmentItems(item, true);
  }

  private void consumeFulfillmentItems(Family.ChecklistItem item) {
    applyFulfillmentItems(item, false);
  }

  private void applyFulfillmentItems(Family.ChecklistItem item, boolean restoreQuantity) {
    Inventory primaryFulfillmentInventory = null;
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      Inventory inventory = requireInventoryForFulfillmentItem(item, fulfillmentItem);
      if (inventory == null) {
        continue;
      }

      if (restoreQuantity) {
        restoreInventory(inventory.internalID, fulfillmentItemQuantity(fulfillmentItem));
      } else {
        consumeInventory(inventory.internalID, fulfillmentItemQuantity(fulfillmentItem));
      }
      hydrateFulfillmentItem(fulfillmentItem, inventory);
      if (primaryFulfillmentInventory == null) {
        primaryFulfillmentInventory = inventory;
      }
    }

    syncLegacySubstitutionFields(item, primaryFulfillmentInventory);
  }

  private void syncLegacySubstitutionFields(Family.ChecklistItem item, Inventory inventory) {
    if (isChosenSubstitution(item) && inventory != null) {
      item.substituteInventoryId = inventory.internalID;
      item.substituteItem = inventory.item;
      item.substituteDescription = inventory.description;
      item.notPickedUpReason = substitutedReason();
    }
  }

  private void hydrateFulfillmentItem(Family.FulfillmentItem fulfillmentItem, Inventory inventory) {
    fulfillmentItem.inventoryId = inventory.internalID;
    if (!hasText(fulfillmentItem.barcode)) {
      fulfillmentItem.barcode = inventory.internalBarcode;
    }
    fulfillmentItem.item = inventory.item;
    fulfillmentItem.description = inventory.description;
  }

  private void releaseInventory(String internalId, int amount) {
    if (!hasText(internalId)) {
      return;
    }

    Inventory inventory = findInventoryByInternalId(internalId);
    if (inventory == null) {
      throw new NotFoundResponse("No item found for internalID: " + internalId);
    }

    int quantityToRelease = quantityOrOne(amount);
    int newReservedQuantity = Math.max(0, inventory.reservedQuantity - quantityToRelease);

    inventoryCollection.updateOne(eq("_id", new ObjectId(inventory._id)),
    Updates.set("reservedQuantity", newReservedQuantity));

    inventory.reservedQuantity = newReservedQuantity;
  }

  private void restoreInventory(String internalId, int amount) {
    Inventory inventory = requireInventoryByInternalId(internalId, REVERTED_ITEM_MISSING_INVENTORY_MATCH);
    int quantityToRestore = quantityOrOne(amount);
    inventoryCollection.updateOne(
      eq("_id", new ObjectId(inventory._id)),
      Updates.set("quantity", inventory.quantity + quantityToRestore));
  }

  private void validateNotPickedUpReason(String reason) {
    if (!isValidNotPickedUpReason(reason)) {
      throw new BadRequestResponse(VALID_NOT_PICKED_UP_REASON_MESSAGE);
    }
  }

  private Inventory requireInventoryByInternalId(String internalId, String missingInventoryMatchMessage) {
    if (!hasText(internalId)) {
      throw new BadRequestResponse(missingInventoryMatchMessage);
    }

    Inventory inventory = findInventoryByInternalId(internalId);
    if (inventory == null) {
      throw new NotFoundResponse("No item found for internalID: " + internalId);
    }
    return inventory;
  }

  private Inventory findInventoryByInternalId(String internalId) {
    return inventoryCollection.find(eq("internalID", internalId)).first();
  }
}
