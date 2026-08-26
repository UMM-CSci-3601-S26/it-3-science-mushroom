package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;

import java.util.ArrayList;
import java.util.Locale;

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

    String inventoryIdToReserve = inventoryIdToReserve(item);
    if (!hasText(inventoryIdToReserve)) {
      return;
    }

    int quantityToReserve = item.requestedQuantity == null || item.requestedQuantity <= 0
      ? 1
      : item.requestedQuantity;
    Inventory inventory = inventoryCollection.find(eq("internalID", inventoryIdToReserve)).first();

    if (inventory != null && inventoryMatcher.unreservedQuantity(inventory) >= quantityToReserve) {
      reserveInventory(inventory, quantityToReserve);
    }
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

  private boolean isChosenSubstitution(Family.ChecklistItem item) {
    return hasText(item.substituteBarcode)
      && (item.selected || "substituted".equals(normalizeReason(item.notPickedUpReason)));
  }

  private void reserveInventory(Inventory inventory, int amount) {
    if (inventory == null) {
      return;
    }

    int quantityToReserve = amount <= 0 ? 1 : amount;
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

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
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
}
