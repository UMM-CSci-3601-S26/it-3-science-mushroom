package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;
import static umm3601.Family.ChecklistItemRules.checklistItemQuantity;
import static umm3601.Family.ChecklistItemRules.fulfillmentItemQuantity;
import static umm3601.Family.ChecklistItemRules.hasFulfillmentItemTargets;
import static umm3601.Family.ChecklistItemRules.hasText;
import static umm3601.Family.ChecklistItemRules.isChosenSubstitution;
import static umm3601.Family.ChecklistItemRules.quantityOrOne;

import java.util.ArrayList;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Updates;

import io.javalin.http.BadRequestResponse;
import umm3601.Common.InventoryMatcher;
import umm3601.Inventory.Inventory;

public class InventoryReservationService {
  private static final String STATUS_HELPED = "helped";

  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final InventoryMatcher inventoryMatcher;

  public InventoryReservationService(MongoDatabase database) {
    this(database, new InventoryMatcher(database));
  }

  public InventoryReservationService(MongoDatabase database, InventoryMatcher inventoryMatcher) {
    this.inventoryMatcher = inventoryMatcher;
    familyCollection = JacksonMongoCollection.builder().build(
      database,
      "family",
      Family.class,
      UuidRepresentation.STANDARD
    );
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );
  }

  public void rebuildInventoryReservation() {
    rebuildInventoryReservationExcludingFamily(null);
  }

  public void rebuildInventoryReservationExcludingFamily(String excludedFamilyId) {
    inventoryCollection.updateMany(new Document(), Updates.set("reservedQuantity", 0));

    ArrayList<Family> families = familyCollection.find().into(new ArrayList<>());
    for (Family family : families) {
      if (isExcludedFamily(family, excludedFamilyId)) {
        continue;
      }
      if (!STATUS_HELPED.equals(determineStatus(family))) {
        reserveInventoryForFamily(family);
      }
    }
  }

  private boolean isExcludedFamily(Family family, String excludedFamilyId) {
    return family != null
      && hasText(excludedFamilyId)
      && excludedFamilyId.equals(family._id);
  }

  private void reserveInventoryForFamily(Family family) {
    if (family == null) {
      return;
    }

    if (family.checklist != null && family.checklist.sections != null) {
      reserveInventoryForChecklist(family.checklist);
    }
  }

  private void reserveInventoryForChecklist(Family.FamilyChecklist checklist) {
    for (Family.ChecklistSection section : checklist.sections) {
      if (section.saved || section.items == null) {
        continue;
      }

      for (Family.ChecklistItem item : section.items) {
        reserveChecklistItemMatch(item);
      }
    }
  }

  private void reserveChecklistItemMatch(Family.ChecklistItem item) {
    if (item == null) {
      return;
    }

    if (hasFulfillmentItemTargets(item)) {
      reserveFulfillmentItems(item);
      return;
    }

    String inventoryIdToReserve = inventoryIdToReserve(item);
    if (!hasText(inventoryIdToReserve)) {
      return;
    }

    int quantityToReserve = checklistItemQuantity(item);
    Inventory inventory = inventoryCollection.find(eq("internalID", inventoryIdToReserve)).first();

    if (inventory != null && inventoryMatcher.unreservedQuantity(inventory) >= quantityToReserve) {
      reserveInventory(inventory, quantityToReserve);
    }
  }

  private void reserveFulfillmentItems(Family.ChecklistItem item) {
    for (Family.FulfillmentItem fulfillmentItem : item.fulfillmentItems) {
      Inventory inventory = inventoryForFulfillmentItem(fulfillmentItem);
      int quantityToReserve = fulfillmentItemQuantity(fulfillmentItem);

      if (inventory != null && inventoryMatcher.unreservedQuantity(inventory) >= quantityToReserve) {
        reserveInventory(inventory, quantityToReserve);
      }
    }
  }

  private Inventory inventoryForFulfillmentItem(Family.FulfillmentItem fulfillmentItem) {
    if (fulfillmentItem == null) {
      return null;
    }
    if (hasText(fulfillmentItem.inventoryId)) {
      return inventoryCollection.find(eq("internalID", fulfillmentItem.inventoryId)).first();
    }
    if (hasText(fulfillmentItem.barcode)) {
      return inventoryMatcher.findInventoryByBarcode(fulfillmentItem.barcode);
    }
    return null;
  }

  private String inventoryIdToReserve(Family.ChecklistItem item) {
    if (isChosenSubstitution(item)) {
      if (hasText(item.substituteInventoryId)) {
        return item.substituteInventoryId;
      }
      Inventory substituteInventory = inventoryMatcher.findInventoryByBarcode(item.substituteBarcode);
      return substituteInventory == null ? null : substituteInventory.internalID;
    }

    if (hasText(item.substituteBarcode) || hasText(item.notPickedUpReason)) {
      return null;
    }

    return item.matchedInventoryId;
  }

  private void reserveInventory(Inventory inventory, int amount) {
    if (inventory == null) {
      return;
    }

    int quantityToReserve = quantityOrOne(amount);
    if (inventoryMatcher.unreservedQuantity(inventory) < quantityToReserve) {
      throw new BadRequestResponse("Not enough stock to reserve");
    }

    inventoryCollection.updateOne(eq("_id", new ObjectId(inventory._id)),
      Updates.set("reservedQuantity", inventory.reservedQuantity + quantityToReserve));
    inventory.reservedQuantity += quantityToReserve;
  }

  private String determineStatus(Family family) {
    if (family == null) {
      return "not_helped";
    }
    if (family.status != null && !family.status.isBlank()) {
      return family.status;
    }
    return family.helped ? STATUS_HELPED : "not_helped";
  }
}
