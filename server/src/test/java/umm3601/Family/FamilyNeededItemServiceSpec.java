package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class FamilyNeededItemServiceSpec {
  private FamilyNeededItemService familyNeededItemService;

  @BeforeEach
  void setUp() {
    familyNeededItemService = new FamilyNeededItemService();
  }

  @Test
  void recordNeededButNotAcquiredItemsReturnsMatchingChecklistItems() {
    Family family = buildFamilyWithChecklist();
    FamilyNeededItemService.NeededItem selectedItem;

    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Pencils",
      false,
      "not_available_didnt_receive"));
    family.checklist.sections.get(0).items.add(buildItem(
      "item-2",
      "Markers",
      true,
      null));

    List<FamilyNeededItemService.NeededItem> neededItems =
      familyNeededItemService.recordNeededButNotAcquiredItems(family);
    selectedItem = neededItems.get(0);

    assertEquals(1, neededItems.size());
    assertEquals("family-1", selectedItem.getFamilyId());
    assertEquals("Sam Supplies", selectedItem.getSectionTitle());
    assertEquals("item-1", selectedItem.getItemId());
    assertEquals("Pencils", selectedItem.getLabel());
    assertEquals(2, selectedItem.getRequestedQuantity());
  }

  @Test
  void recordNeededButNotAcquiredItemsNormalizesReasonFormatting() {
    Family family = buildFamilyWithChecklist();
    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Crayons",
      false,
      "Not Available Didn't Receive"));

    List<FamilyNeededItemService.NeededItem> neededItems =
      familyNeededItemService.recordNeededButNotAcquiredItems(family);

    assertEquals(1, neededItems.size());
  }

  @Test
  void recordNeededButNotAcquiredItemsIgnoresOtherNotGivenReasons() {
    Family family = buildFamilyWithChecklist();
    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Folders",
      false,
      "available_didnt_need"));

    assertTrue(familyNeededItemService.recordNeededButNotAcquiredItems(family).isEmpty());
  }

  @Test
  void removeNeededButNotAcquiredItemLogsReturnsMatchingChecklistItems() {
    Family family = buildFamilyWithChecklist();
    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Glue",
      false,
      "not_available_didnt_receive"));

    List<FamilyNeededItemService.NeededItem> removedLogs =
      familyNeededItemService.removeNeededButNotAcquiredItemLogs(family);

    assertEquals(1, removedLogs.size());
    assertEquals("item-1", removedLogs.get(0).getItemId());
  }

  private Family buildFamilyWithChecklist() {
    Family family = new Family();
    family._id = "family-1";
    family.guardianName = "Jordan Smith";
    family.checklist = new Family.FamilyChecklist();

    Family.ChecklistSection section = new Family.ChecklistSection();
    section.id = "student-1";
    section.title = "Sam";
    section.printableTitle = "Sam Supplies";
    family.checklist.sections.add(section);

    return family;
  }

  private Family.ChecklistItem buildItem(String id, String label, boolean selected, String reason) {
    Family.ChecklistItem item = new Family.ChecklistItem();
    item.id = id;
    item.label = label;
    item.selected = selected;
    item.requestedQuantity = 2;
    item.notPickedUpReason = reason;
    return item;
  }
}
