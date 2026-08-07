package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
import umm3601.SupplyList.SupplyList;

public class InventoryReservationService {
  private static final String STATUS_HELPED = "helped";

  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
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
    supplyListCollection = JacksonMongoCollection.builder().build(
      database,
      "supplylist",
      SupplyList.class,
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
    inventoryCollection.updateMany(new Document(), Updates.set("reservedQuantity", 0));

    ArrayList<Family> families = familyCollection.find().into(new ArrayList<>());
    for (Family family : families) {
      if (!STATUS_HELPED.equals(determineStatus(family))) {
        reserveInventoryForFamily(family);
      }
    }
  }

  private void reserveInventoryForFamily(Family family) {
    if (family == null) {
      return;
    }

    if (family.checklist != null && family.checklist.sections != null) {
      reserveInventoryForChecklist(family.checklist);
      return;
    }

    if (family.students == null) {
      return;
    }

    for (Family.StudentInfo student : family.students) {
      List<SupplyList> supplyLists = getSupplyListsForStudent(student);

      for (SupplyList supplyList : supplyLists) {
        int requestedQuantity = supplyList.quantity == null || supplyList.quantity <= 0 ? 1 : supplyList.quantity;
        Inventory match = inventoryMatcher.findBestInventoryMatch(supplyList, requestedQuantity);

        if (match != null) {
          reserveInventory(match, requestedQuantity);
        }
      }
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
    if (item == null || !hasText(item.matchedInventoryId)) {
      return;
    }

    if (hasText(item.substituteBarcode) || hasText(item.notPickedUpReason)) {
      return;
    }

    int quantityToReserve = item.requestedQuantity == null || item.requestedQuantity <= 0
      ? 1
      : item.requestedQuantity;
    Inventory inventory = inventoryCollection.find(eq("internalID", item.matchedInventoryId)).first();

    if (inventory != null && inventoryMatcher.unreservedQuantity(inventory) >= quantityToReserve) {
      reserveInventory(inventory, quantityToReserve);
    }
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

  private List<SupplyList> getSupplyListsForStudent(Family.StudentInfo student) {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    ArrayList<SupplyList> matching = new ArrayList<>();

    for (SupplyList supplyList : allSupplyLists) {
      if (!inventoryMatcher.supplyListMatchesStudent(
          supplyList,
          student.school,
          student.grade,
          student.teacher)) {
        continue;
      }
      matching.add(supplyList);
    }

    matching.sort(Comparator.comparing(supplyList -> supplyList.toString().toLowerCase(Locale.US)));
    return matching;
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
}
