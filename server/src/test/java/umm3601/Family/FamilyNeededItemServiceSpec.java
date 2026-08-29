package umm3601.Family;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.List;

import org.bson.conversions.Bson;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.model.ReplaceOptions;

class FamilyNeededItemServiceSpec {
  private FamilyNeededItemService familyNeededItemService;
  private JacksonMongoCollection<NeededItemLog> neededItemLogCollection;

  @BeforeEach
  @SuppressWarnings("unchecked")
  void setUp() {
    neededItemLogCollection = mock(JacksonMongoCollection.class);
    familyNeededItemService = new FamilyNeededItemService(neededItemLogCollection);
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
  void recordNeededButNotAcquiredItemsUpsertsMatchingChecklistItemLogs() {
    Family family = buildFamilyWithChecklist();
    ArgumentCaptor<NeededItemLog> logCaptor = ArgumentCaptor.forClass(NeededItemLog.class);
    ArgumentCaptor<ReplaceOptions> optionsCaptor = ArgumentCaptor.forClass(ReplaceOptions.class);
    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Pencils",
      false,
      "not_available_didnt_receive"));

    familyNeededItemService.recordNeededButNotAcquiredItems(family);

    verify(neededItemLogCollection).replaceOne(any(Bson.class), logCaptor.capture(), optionsCaptor.capture());
    assertTrue(optionsCaptor.getValue().isUpsert());
    assertEquals("family-1", logCaptor.getValue().familyId);
    assertEquals("student-1", logCaptor.getValue().sectionId);
    assertEquals("item-1", logCaptor.getValue().itemId);
    assertEquals("Pencils", logCaptor.getValue().label);
    assertEquals(2, logCaptor.getValue().requestedQuantity);
  }

  @Test
  void recordNeededButNotAcquiredItemsIgnoresSubstitutedItems() {
    Family family = buildFamilyWithChecklist();
    Family.ChecklistItem item = buildItem(
      "item-1",
      "Dry-erase markers",
      false,
      "substituted");
    item.substituteBarcode = "inventory-barcode-1";
    family.checklist.sections.get(0).items.add(item);

    assertTrue(familyNeededItemService.recordNeededButNotAcquiredItems(family).isEmpty());
  }

  @Test
  void recordNeededButNotAcquiredItemsIgnoresFulfillmentItems() {
    Family family = buildFamilyWithChecklist();
    Family.ChecklistItem item = buildItem(
      "item-1",
      "Dry-erase markers",
      false,
      "item_not_avaliable");
    item.fulfillmentItems = List.of(fulfillmentItem("inventory-1"));
    family.checklist.sections.get(0).items.add(item);

    assertTrue(familyNeededItemService.recordNeededButNotAcquiredItems(family).isEmpty());
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
  void recordNeededButNotAcquiredItemsIncludesItemNotAvailableReason() {
    Family family = buildFamilyWithChecklist();
    family.checklist.sections.get(0).items.add(buildItem(
      "item-1",
      "Crayons",
      false,
      "item_not_avaliable"));

    List<FamilyNeededItemService.NeededItem> neededItems =
      familyNeededItemService.recordNeededButNotAcquiredItems(family);

    assertEquals(1, neededItems.size());
  }

  @Test
  void recordNeededButNotAcquiredItemsFallsBackToSectionTitleAndItemDescription() {
    Family family = buildFamilyWithChecklist();
    Family.ChecklistSection section = family.checklist.sections.get(0);
    Family.ChecklistItem item = buildItem(
      "item-1",
      null,
      false,
      "not_available_didnt_receive");
    section.printableTitle = null;
    item.itemDescription = "Wide-ruled notebook";
    section.items.add(item);

    List<FamilyNeededItemService.NeededItem> neededItems =
      familyNeededItemService.recordNeededButNotAcquiredItems(family);

    assertEquals(1, neededItems.size());
    assertEquals("Sam", neededItems.get(0).getSectionTitle());
    assertEquals("Wide-ruled notebook", neededItems.get(0).getLabel());
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
    verify(neededItemLogCollection).deleteOne(any(Bson.class));
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

  private Family.FulfillmentItem fulfillmentItem(String inventoryId) {
    Family.FulfillmentItem fulfillmentItem = new Family.FulfillmentItem();
    fulfillmentItem.inventoryId = inventoryId;
    return fulfillmentItem;
  }
}
