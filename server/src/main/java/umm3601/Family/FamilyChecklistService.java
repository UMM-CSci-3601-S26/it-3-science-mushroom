package umm3601.Family;

import static com.mongodb.client.model.Filters.eq;

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
import umm3601.Settings.Settings;
import umm3601.SupplyList.SupplyList;

public class FamilyChecklistService {
  private static final String SETTINGS_ID = "app-settings";
  private static final String STATUS_STAGED = "staged";
  private static final String STATUS_UNSTAGED = "unstaged";
  private static final String STATUS_NOT_GIVEN = "notGiven";
  private static final int STAGED_ORDER_BUCKET = 0;
  private static final int UNSTAGED_ORDER_BUCKET = 1;
  private static final int NOT_GIVEN_ORDER_BUCKET = 2;

  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final JacksonMongoCollection<Settings> settingsCollection;
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
    settingsCollection = JacksonMongoCollection.builder().build(
      database,
      "settings",
      Settings.class,
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
    List<DriveOrderEntry> driveOrder = driveOrderEntries(getSupplyOrder());
    int studentIndex = 1;
    for (Family.StudentInfo student : family.students) {
      Family.ChecklistSection section = new Family.ChecklistSection();
      section.id = "student-" + studentIndex;
      section.title = hasText(student.name) ? student.name : "Student " + studentIndex;
      section.printableTitle = section.title;
      section.saved = false;
      section.items = buildChecklistItemsForStudent(student, section.id, remainingStockByInventoryId, driveOrder);
      checklist.sections.add(section);
      studentIndex++;
    }

    return checklist;
  }

  private List<Family.ChecklistItem> buildChecklistItemsForStudent(
      Family.StudentInfo student,
      String sectionId,
      Map<String, Integer> remainingStockByInventoryId,
      List<DriveOrderEntry> driveOrder
  ) {
    List<Family.ChecklistItem> checklistItems = new ArrayList<>();
    List<SupplyList> supplyLists = getSupplyListsForStudent(student, driveOrder);

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
    return getSupplyListsForStudent(student, driveOrderEntries(getSupplyOrder()));
  }

  private List<SupplyList> getSupplyListsForStudent(Family.StudentInfo student, List<DriveOrderEntry> driveOrder) {
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
      if (isNotGiven(supplyList, driveOrder)) {
        continue;
      }
      matching.add(supplyList);
    }

    matching.sort(checklistSupplyListComparator(driveOrder));
    return matching;
  }

  private Comparator<SupplyList> checklistSupplyListComparator(List<DriveOrderEntry> driveOrder) {
    return Comparator
      .comparingInt((SupplyList supplyList) -> orderBucket(supplyList, driveOrder))
      .thenComparingInt(supplyList -> orderIndex(supplyList, driveOrder))
      .thenComparing(supplyList -> supplyList.toString().toLowerCase(Locale.US));
  }

  private boolean isNotGiven(SupplyList supplyList, List<DriveOrderEntry> driveOrder) {
    return orderBucket(supplyList, driveOrder) == NOT_GIVEN_ORDER_BUCKET;
  }

  private int orderBucket(SupplyList supplyList, List<DriveOrderEntry> driveOrder) {
    DriveOrderEntry order = driveOrderMatchFor(supplyList, driveOrder);
    if (order == null || STATUS_UNSTAGED.equals(order.status)) {
      return UNSTAGED_ORDER_BUCKET;
    }
    if (STATUS_STAGED.equals(order.status)) {
      return STAGED_ORDER_BUCKET;
    }
    if (STATUS_NOT_GIVEN.equals(order.status)) {
      return NOT_GIVEN_ORDER_BUCKET;
    }
    return UNSTAGED_ORDER_BUCKET;
  }

  private int orderIndex(SupplyList supplyList, List<DriveOrderEntry> driveOrder) {
    DriveOrderEntry order = driveOrderMatchFor(supplyList, driveOrder);
    return order == null ? Integer.MAX_VALUE : order.index;
  }

  private DriveOrderEntry driveOrderMatchFor(SupplyList supplyList, List<DriveOrderEntry> driveOrder) {
    for (DriveOrderEntry order : driveOrder) {
      if (supplyListMatchesOrderTerm(supplyList, order.itemTerm)) {
        return order;
      }
    }
    return null;
  }

  private boolean supplyListMatchesOrderTerm(SupplyList supplyList, String itemTerm) {
    if (supplyList.item == null || supplyList.item.isEmpty()) {
      return false;
    }
    for (String requestedItem : supplyList.item) {
      if (inventoryMatcher.nameEquivalent(requestedItem, itemTerm)) {
        return true;
      }
    }
    return false;
  }

  private List<Settings.SupplyItemOrder> getSupplyOrder() {
    Settings settings = settingsCollection.find(eq("_id", SETTINGS_ID)).first();
    if (settings == null || settings.supplyOrder == null) {
      return List.of();
    }
    return settings.supplyOrder;
  }

  private List<DriveOrderEntry> driveOrderEntries(List<Settings.SupplyItemOrder> supplyOrder) {
    List<DriveOrderEntry> entries = new ArrayList<>();
    int index = 0;
    for (Settings.SupplyItemOrder order : supplyOrder) {
      if (order != null && hasText(order.itemTerm)) {
        entries.add(new DriveOrderEntry(order.itemTerm, normalizedOrderStatus(order.status), index));
      }
      index++;
    }
    return entries;
  }

  private String normalizedOrderStatus(String status) {
    if (STATUS_STAGED.equals(status) || STATUS_UNSTAGED.equals(status) || STATUS_NOT_GIVEN.equals(status)) {
      return status;
    }
    return STATUS_UNSTAGED;
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

  private static class DriveOrderEntry {
    private final String itemTerm;
    private final String status;
    private final int index;

    DriveOrderEntry(String itemTerm, String status, int index) {
      this.itemTerm = itemTerm;
      this.status = status;
      this.index = index;
    }
  }
}
