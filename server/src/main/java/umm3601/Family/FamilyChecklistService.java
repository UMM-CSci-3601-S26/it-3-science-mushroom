package umm3601.Family;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;

import umm3601.Common.InventoryMatcher;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class FamilyChecklistService {
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final InventoryMatcher inventoryMatcher;

  public FamilyChecklistService(MongoDatabase database) {
    this(database, new InventoryMatcher(database));
  }

  public FamilyChecklistService(MongoDatabase database, InventoryMatcher inventoryMatcher) {
    this.inventoryMatcher = inventoryMatcher;
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

  public Family.FamilyChecklist generateChecklistSnapshot(Family family) {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    checklist.templateId = "family-help-session-v1";
    checklist.printableTitle = family.guardianName + " Checklist";
    checklist.snapshot = true;
    checklist.sections = new ArrayList<>();

    Map<String, Integer> remainingStockByInventoryId = buildRemainingStockByInventoryId();
    int studentIndex = 1;
    for (Family.StudentInfo student : family.students) {
      Family.ChecklistSection section = new Family.ChecklistSection();
      section.id = "student-" + studentIndex;
      section.title = hasText(student.name) ? student.name : "Student " + studentIndex;
      section.printableTitle = section.title;
      section.saved = false;
      section.items = buildChecklistItemsForStudent(student, section.id, remainingStockByInventoryId);
      checklist.sections.add(section);
      studentIndex++;
    }

    return checklist;
  }

  private List<Family.ChecklistItem> buildChecklistItemsForStudent(
      Family.StudentInfo student,
      String sectionId,
      Map<String, Integer> remainingStockByInventoryId
  ) {
    List<Family.ChecklistItem> checklistItems = new ArrayList<>();
    List<SupplyList> supplyLists = getSupplyListsForStudent(student);

    int itemIndex = 1;
    for (SupplyList supplyList : supplyLists) {
      Family.ChecklistItem item = buildChecklistItemSnapshot(
        supplyList,
        sectionId + "-item-" + itemIndex,
        remainingStockByInventoryId);
      checklistItems.add(item);
      itemIndex++;
    }

    return checklistItems;
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

  private Family.ChecklistItem buildChecklistItemSnapshot(SupplyList supplyList, String itemId) {
    return buildChecklistItemSnapshot(supplyList, itemId, buildRemainingStockByInventoryId());
  }

  private Family.ChecklistItem buildChecklistItemSnapshot(
      SupplyList supplyList,
      String itemId,
      Map<String, Integer> remainingStockByInventoryId
  ) {
    Family.ChecklistItem checklistItem = new Family.ChecklistItem();
    checklistItem.id = itemId;
    checklistItem.label = supplyList.toString();
    checklistItem.itemDescription = supplyList.toString();
    checklistItem.supplyListId = supplyList._id;
    checklistItem.requestedQuantity = supplyList.quantity == null || supplyList.quantity <= 0 ? 1 : supplyList.quantity;

    Inventory match = inventoryMatcher.findBestInventoryMatch(
      supplyList,
      inventory -> hasEnoughRemaining(inventory, checklistItem.requestedQuantity, remainingStockByInventoryId));
    checklistItem.available = match != null;
    checklistItem.selected = false;
    checklistItem.matchedInventoryId = match != null ? match.internalID : null;
    checklistItem.matchedInventoryItem = match != null ? match.item : null;
    checklistItem.matchedInventoryDescription = match != null ? bestInventoryDescription(match) : null;
    spendRemaining(match, checklistItem.requestedQuantity, remainingStockByInventoryId);

    if (match == null) {
      Inventory substitution = inventoryMatcher.findBestSubstitutionMatch(
        supplyList,
        inventory -> hasEnoughRemaining(inventory, checklistItem.requestedQuantity, remainingStockByInventoryId));
      checklistItem.substituteInventoryId = substitution != null ? substitution.internalID : null;
      checklistItem.substituteItem = substitution != null ? substitution.item : null;
      checklistItem.substituteDescription = substitution != null ? bestInventoryDescription(substitution) : null;
    }

    return checklistItem;
  }

  private Map<String, Integer> buildRemainingStockByInventoryId() {
    Map<String, Integer> remainingStockByInventoryId = new HashMap<>();
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());

    for (Inventory inventory : inventories) {
      if (hasText(inventory.internalID)) {
        remainingStockByInventoryId.put(inventory.internalID, inventoryMatcher.unreservedQuantity(inventory));
      }
    }

    return remainingStockByInventoryId;
  }

  private boolean hasEnoughRemaining(
      Inventory inventory,
      int requestedQuantity,
      Map<String, Integer> remainingStockByInventoryId
  ) {
    return inventory != null
      && hasText(inventory.internalID)
      && remainingStockByInventoryId.getOrDefault(inventory.internalID, 0) >= requestedQuantity;
  }

  private void spendRemaining(
      Inventory inventory,
      int requestedQuantity,
      Map<String, Integer> remainingStockByInventoryId
  ) {
    if (inventory == null || !hasText(inventory.internalID)) {
      return;
    }

    int remainingQuantity = remainingStockByInventoryId.getOrDefault(inventory.internalID, 0);
    remainingStockByInventoryId.put(inventory.internalID, Math.max(0, remainingQuantity - requestedQuantity));
  }

  private String bestInventoryDescription(Inventory inventory) {
    if (hasText(inventory.description)) {
      return inventory.description;
    }
    return inventory.toString();
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }
}
