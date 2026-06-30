package umm3601.Family;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;

import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class FamilyChecklistService {
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
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
  }

  public Family.FamilyChecklist generateChecklistSnapshot(Family family) {
    Family.FamilyChecklist checklist = new Family.FamilyChecklist();
    checklist.templateId = "family-help-session-v1";
    checklist.printableTitle = family.guardianName + " Checklist";
    checklist.snapshot = true;
    checklist.sections = new ArrayList<>();

    int studentIndex = 1;
    for (Family.StudentInfo student : family.students) {
      Family.ChecklistSection section = new Family.ChecklistSection();
      section.id = "student-" + studentIndex;
      section.title = hasText(student.name) ? student.name : "Student " + studentIndex;
      section.printableTitle = section.title;
      section.saved = false;
      section.items = buildChecklistItemsForStudent(student, section.id);
      checklist.sections.add(section);
      studentIndex++;
    }

    return checklist;
  }

  private List<Family.ChecklistItem> buildChecklistItemsForStudent(Family.StudentInfo student, String sectionId) {
    List<Family.ChecklistItem> checklistItems = new ArrayList<>();
    List<SupplyList> supplyLists = getSupplyListsForStudent(student);

    int itemIndex = 1;
    for (SupplyList supplyList : supplyLists) {
      Family.ChecklistItem item = buildChecklistItemSnapshot(supplyList, sectionId + "-item-" + itemIndex);
      checklistItems.add(item);
      itemIndex++;
    }

    return checklistItems;
  }

  private List<SupplyList> getSupplyListsForStudent(Family.StudentInfo student) {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    ArrayList<SupplyList> matching = new ArrayList<>();

    for (SupplyList supplyList : allSupplyLists) {
      if (!inventoryMatcher.supplyListMatchesStudent(supplyList, student)) {
        continue;
      }
      matching.add(supplyList);
    }

    matching.sort(Comparator.comparing(supplyList -> supplyList.toString().toLowerCase(Locale.US)));
    return matching;
  }

  private Family.ChecklistItem buildChecklistItemSnapshot(SupplyList supplyList, String itemId) {
    Family.ChecklistItem checklistItem = new Family.ChecklistItem();
    checklistItem.id = itemId;
    checklistItem.label = supplyList.toString();
    checklistItem.itemDescription = supplyList.toString();
    checklistItem.supplyListId = supplyList._id;
    checklistItem.requestedQuantity = supplyList.quantity == null || supplyList.quantity <= 0 ? 1 : supplyList.quantity;

    Inventory match = inventoryMatcher.findBestInventoryMatch(supplyList, checklistItem.requestedQuantity);
    checklistItem.available = match != null;
    checklistItem.selected = checklistItem.available;
    checklistItem.matchedInventoryId = match != null ? match.internalID : null;
    checklistItem.matchedInventoryItem = match != null ? match.item : null;
    checklistItem.matchedInventoryDescription = match != null ? bestInventoryDescription(match) : null;

    if (match == null) {
      Inventory substitution = inventoryMatcher.findBestSubstitutionMatch(supplyList, checklistItem.requestedQuantity);
      checklistItem.substituteInventoryId = substitution != null ? substitution.internalID : null;
      checklistItem.substituteBarcode = substitution != null ? substitution.internalBarcode : null;
      checklistItem.substituteItem = substitution != null ? substitution.item : null;
      checklistItem.substituteDescription = substitution != null ? bestInventoryDescription(substitution) : null;
    }

    return checklistItem;
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
