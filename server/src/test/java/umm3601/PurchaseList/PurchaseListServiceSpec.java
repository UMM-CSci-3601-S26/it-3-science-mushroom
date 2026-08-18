package umm3601.PurchaseList;

import static org.junit.jupiter.api.Assertions.assertAll;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertIterableEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import org.bson.Document;
import org.bson.types.ObjectId;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.mongodb.MongoClientSettings;
import com.mongodb.ServerAddress;
import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoClients;
import com.mongodb.client.MongoDatabase;

@SuppressWarnings({ "MagicNumber" })
class PurchaseListServiceSpec {
  private static final String SCHOOL = "Morris Elementary";
  private static final String TEACHER = "Ms. Doe";

  private static MongoClient mongoClient;
  private static MongoDatabase db;

  private PurchaseListService purchaseListService;

  @BeforeAll
  static void setupAll() {
    String mongoAddr = System.getenv().getOrDefault("MONGO_ADDR", "localhost");

    mongoClient = MongoClients.create(
      MongoClientSettings.builder()
        .applyToClusterSettings(builder -> builder.hosts(Arrays.asList(new ServerAddress(mongoAddr))))
        .build());
    db = mongoClient.getDatabase("test");
  }

  @AfterAll
  static void teardown() {
    db.drop();
    mongoClient.close();
  }

  @BeforeEach
  void setupEach() {
    db.getCollection("inventory").drop();
    db.getCollection("family").drop();
    db.getCollection("supplylist").drop();
    db.getCollection("purchaseListSnapshots").drop();
    purchaseListService = new PurchaseListService(db);
  }

  @Test
  void getCurrentPurchaseListReturnsEmptySnapshotWhenNoSnapshotExists() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Backpack", 2));

    PurchaseListSnapshot snapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals("", snapshot.generatedAt);
    assertEquals(0, snapshot.summary.totalDemandedItems);
    assertEquals(0, snapshot.summary.itemsNeedingPurchase);
    assertEquals(0, snapshot.summary.totalUnitsNeeded);
    assertEquals(0, snapshot.summary.totalUnitsOnHand);
    assertEquals(0, snapshot.summary.totalUnitsToBuy);
    assertEquals(List.of(), snapshot.items);
  }

  @Test
  void calculateNewPurchaseListPersistsSnapshotForLaterReads() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Backpack", 2));

    PurchaseListSnapshot calculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    db.getCollection("family").drop();
    db.getCollection("supplylist").drop();

    PurchaseListSnapshot currentSnapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals(calculatedSnapshot.generatedAt, currentSnapshot.generatedAt);
    assertEquals(1, currentSnapshot.items.size());
    assertEquals(2, currentSnapshot.summary.totalUnitsNeeded);
    assertEquals(2, currentSnapshot.summary.totalUnitsToBuy);
  }

  @Test
  void saveCurrentPurchaseListPersistsResolvedItemsAndRebuildsSummary() {
    PurchaseListItem activeItem = purchaseListItem("ID-00030", "Marker", 8, 3);
    PurchaseListItem resolvedItem = purchaseListItem("ID-00031", "Ambiguous marker", 4, 0);
    resolvedItem.linkedInventoryIds = List.of("ID-00030", "ID-00031");
    resolvedItem.selectedFulfillmentInventoryIds = List.of("ID-00030");

    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.generatedAt = "2026-08-08T12:00:00.000Z";
    snapshot.summary = new PurchaseListSummary();
    snapshot.summary.totalUnitsToBuy = 999;
    snapshot.items = List.of(activeItem);
    snapshot.resolvedItems = List.of(resolvedItem);

    PurchaseListSnapshot savedSnapshot = purchaseListService.saveCurrentPurchaseList(snapshot);
    PurchaseListSnapshot currentSnapshot = purchaseListService.getCurrentPurchaseList();

    assertEquals("latest-purchase-list", savedSnapshot._id);
    assertEquals(1, currentSnapshot.items.size());
    assertEquals(1, currentSnapshot.resolvedItems.size());
    assertIterableEquals(
      List.of("ID-00030"),
      currentSnapshot.resolvedItems.get(0).selectedFulfillmentInventoryIds);
    assertEquals(1, currentSnapshot.summary.totalDemandedItems);
    assertEquals(8, currentSnapshot.summary.totalUnitsNeeded);
    assertEquals(3, currentSnapshot.summary.totalUnitsOnHand);
    assertEquals(5, currentSnapshot.summary.totalUnitsToBuy);
  }

  @Test
  void saveCurrentPurchaseListNormalizesMissingSnapshotCollections() {
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.generatedAt = null;
    snapshot.summary = null;
    snapshot.items = null;
    snapshot.resolvedItems = null;

    PurchaseListSnapshot savedSnapshot = purchaseListService.saveCurrentPurchaseList(snapshot);

    assertAll(
      () -> assertEquals("latest-purchase-list", savedSnapshot._id),
      () -> assertNotNull(savedSnapshot.generatedAt),
      () -> assertEquals(List.of(), savedSnapshot.items),
      () -> assertEquals(List.of(), savedSnapshot.resolvedItems),
      () -> assertNotNull(savedSnapshot.summary),
      () -> assertEquals(0, savedSnapshot.summary.totalDemandedItems),
      () -> assertEquals(0, savedSnapshot.summary.itemsNeedingPurchase),
      () -> assertEquals(0, savedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(0, savedSnapshot.summary.totalUnitsOnHand),
      () -> assertEquals(0, savedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void calculateNewPurchaseListPreservesResolvedFulfillmentSelections() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 12),
      inventoryDoc("ID-00021", "Pencil", 2)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem markerItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem ambiguousItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    ambiguousItem.selectedFulfillmentInventoryIds = List.of("ID-00020");

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(markerItem);
    savedSnapshot.resolvedItems = List.of(ambiguousItem);
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem recalculatedMarkerItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();

    assertAll(
      () -> assertEquals(1, recalculatedSnapshot.items.size()),
      () -> assertEquals(1, recalculatedSnapshot.resolvedItems.size()),
      () -> assertIterableEquals(
        List.of("ID-00020"),
        recalculatedSnapshot.resolvedItems.get(0).selectedFulfillmentInventoryIds),
      () -> assertEquals(10, recalculatedMarkerItem.totalNeeded),
      () -> assertEquals(12, recalculatedMarkerItem.quantityOnHand),
      () -> assertEquals(0, recalculatedMarkerItem.quantityToBuy),
      () -> assertEquals(2, recalculatedMarkerItem.sources.size()),
      () -> assertEquals(1, recalculatedSnapshot.summary.totalDemandedItems),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(0, recalculatedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void calculateNewPurchaseListPreservesMultipleResolvedFulfillmentAllocations() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 4),
      inventoryDoc("ID-00021", "Pencil", 1)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem markerItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem ambiguousItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    ambiguousItem.selectedFulfillmentInventoryIds = List.of("ID-00020", "ID-00021");
    ambiguousItem.selectedFulfillmentAllocations = List.of(
      fulfillmentAllocation("ID-00020", 3),
      fulfillmentAllocation("ID-00021", 2));

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(markerItem);
    savedSnapshot.resolvedItems = List.of(ambiguousItem);
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem recalculatedMarkerItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem recalculatedPencilItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00021")))
      .findFirst()
      .orElseThrow();

    assertAll(
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertEquals(1, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals(8, recalculatedMarkerItem.totalNeeded),
      () -> assertEquals(4, recalculatedMarkerItem.quantityOnHand),
      () -> assertEquals(4, recalculatedMarkerItem.quantityToBuy),
      () -> assertEquals(2, recalculatedPencilItem.totalNeeded),
      () -> assertEquals(1, recalculatedPencilItem.quantityOnHand),
      () -> assertEquals(1, recalculatedPencilItem.quantityToBuy),
      () -> assertIterableEquals(
        List.of("ID-00020", "ID-00021"),
        recalculatedSnapshot.resolvedItems.get(0).selectedFulfillmentInventoryIds),
      () -> assertEquals(
        3,
        recalculatedSnapshot.resolvedItems.get(0).selectedFulfillmentAllocations.get(0).quantity),
      () -> assertEquals(
        2,
        recalculatedSnapshot.resolvedItems.get(0).selectedFulfillmentAllocations.get(1).quantity),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(5, recalculatedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void calculateNewPurchaseListKeepsPartialFulfillmentPreferenceActiveWithRemainder() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Green Folder", 2),
      inventoryDoc("ID-00021", "Red Folder", 1)));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1, List.of("ID-00020", "ID-00021")));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem folderItem = initialSnapshot.items.get(0);
    folderItem.selectedFulfillmentInventoryIds = List.of("ID-00020");
    folderItem.selectedFulfillmentAllocations = List.of(fulfillmentAllocation("ID-00020", 2));

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(folderItem);
    savedSnapshot.resolvedItems = List.of();
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem greenFolderPreference = recalculatedSnapshot.items.get(0);
    PurchaseListItem unresolvedFolderDemand = recalculatedSnapshot.items.get(1);

    assertAll(
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals("Green Folder", greenFolderPreference.description),
      () -> assertEquals(2, greenFolderPreference.totalNeeded),
      () -> assertIterableEquals(List.of("ID-00020"), greenFolderPreference.selectedFulfillmentInventoryIds),
      () -> assertEquals(2, greenFolderPreference.selectedFulfillmentAllocations.get(0).quantity),
      () -> assertEquals("1x Folder (linked to Green Folder)", unresolvedFolderDemand.description),
      () -> assertEquals(3, unresolvedFolderDemand.totalNeeded),
      () -> assertIterableEquals(List.of(), unresolvedFolderDemand.selectedFulfillmentInventoryIds),
      () -> assertEquals(5, recalculatedSnapshot.summary.totalUnitsNeeded));
  }

  @Test
  void calculateNewPurchaseListMergesPartialPreferenceIntoMatchingActiveItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Green Folder", 2),
      inventoryDoc("ID-00021", "Red Folder", 1)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Green Folder", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem ambiguousFolderItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    ambiguousFolderItem.selectedFulfillmentInventoryIds = List.of("ID-00020");
    ambiguousFolderItem.selectedFulfillmentAllocations = List.of(fulfillmentAllocation("ID-00020", 2));

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = initialSnapshot.items;
    savedSnapshot.resolvedItems = List.of();
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem mergedGreenFolderItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem unresolvedFolderDemand = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();

    assertAll(
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals("1x Green Folder", mergedGreenFolderItem.description),
      () -> assertEquals(7, mergedGreenFolderItem.totalNeeded),
      () -> assertIterableEquals(List.of("ID-00020"), mergedGreenFolderItem.selectedFulfillmentInventoryIds),
      () -> assertEquals(2, mergedGreenFolderItem.selectedFulfillmentAllocations.get(0).quantity),
      () -> assertIterableEquals(
        sourceIds(ambiguousFolderItem),
        mergedGreenFolderItem.selectedFulfillmentAllocations.get(0).sourceIds),
      () -> assertEquals(2, mergedGreenFolderItem.sources.size()),
      () -> assertEquals("1x Folder (linked to Green Folder)", unresolvedFolderDemand.description),
      () -> assertEquals(3, unresolvedFolderDemand.totalNeeded),
      () -> assertIterableEquals(List.of(), unresolvedFolderDemand.selectedFulfillmentInventoryIds),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded));
  }

  @Test
  void calculateNewPurchaseListCollapsesDuplicatePartialPreferencesForSameSource() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Green Folder", 2),
      inventoryDoc("ID-00021", "Red Folder", 1)));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1, List.of("ID-00020", "ID-00021")));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem folderItem = initialSnapshot.items.get(0);
    List<String> folderSourceIds = sourceIds(folderItem);
    PurchaseListItem firstPreference = savedPreferenceItem(folderItem, "ID-00020", "Green Folder", 2);
    PurchaseListItem secondPreference = savedPreferenceItem(folderItem, "ID-00020", "Green Folder", 1);

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(firstPreference, secondPreference);
    savedSnapshot.resolvedItems = List.of();
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem greenFolderPreference = recalculatedSnapshot.items.get(0);
    PurchaseListItem unresolvedFolderDemand = recalculatedSnapshot.items.get(1);

    assertAll(
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals("Green Folder", greenFolderPreference.description),
      () -> assertEquals(3, greenFolderPreference.totalNeeded),
      () -> assertEquals(1, greenFolderPreference.selectedFulfillmentAllocations.size()),
      () -> assertEquals(3, greenFolderPreference.selectedFulfillmentAllocations.get(0).quantity),
      () -> assertIterableEquals(
        folderSourceIds,
        greenFolderPreference.selectedFulfillmentAllocations.get(0).sourceIds),
      () -> assertEquals(2, unresolvedFolderDemand.totalNeeded));
  }

  @Test
  void calculateNewPurchaseListUsesOriginalTotalWhenDuplicatePreferencesResolveSource() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Green Folder", 2),
      inventoryDoc("ID-00021", "Red Folder", 1)));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1, List.of("ID-00020", "ID-00021")));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem folderItem = initialSnapshot.items.get(0);
    PurchaseListItem firstPreference = savedPreferenceItem(folderItem, "ID-00020", "Green Folder", 2);
    PurchaseListItem secondPreference = savedPreferenceItem(folderItem, "ID-00020", "Green Folder", 3);

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(firstPreference, secondPreference);
    savedSnapshot.resolvedItems = List.of();
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem resolvedFolderDemand = recalculatedSnapshot.resolvedItems.get(0);

    assertAll(
      () -> assertEquals(1, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals("1x Folder (linked to Green Folder)", resolvedFolderDemand.description),
      () -> assertEquals(5, resolvedFolderDemand.totalNeeded),
      () -> assertEquals(1, resolvedFolderDemand.selectedFulfillmentAllocations.size()),
      () -> assertEquals(5, resolvedFolderDemand.selectedFulfillmentAllocations.get(0).quantity));
  }

  @Test
  void calculateNewPurchaseListKeepsMultiplePartialFulfillmentPreferencesActive() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 8));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Green Folder", 2),
      inventoryDoc("ID-00021", "Red Folder", 2)));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1, List.of("ID-00020", "ID-00021")));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem folderItem = initialSnapshot.items.get(0);
    folderItem.selectedFulfillmentInventoryIds = List.of("ID-00020", "ID-00021");
    folderItem.selectedFulfillmentAllocations = List.of(
      fulfillmentAllocation("ID-00020", 2),
      fulfillmentAllocation("ID-00021", 3));

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(folderItem);
    savedSnapshot.resolvedItems = List.of();
    PurchaseListSnapshot savedPartialSnapshot = purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(3, savedPartialSnapshot.items.size()),
      () -> assertEquals(3, recalculatedSnapshot.items.size()),
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals("Green Folder", recalculatedSnapshot.items.get(0).description),
      () -> assertEquals(2, recalculatedSnapshot.items.get(0).totalNeeded),
      () -> assertIterableEquals(
        List.of("ID-00020"),
        recalculatedSnapshot.items.get(0).selectedFulfillmentInventoryIds),
      () -> assertEquals("Red Folder", recalculatedSnapshot.items.get(1).description),
      () -> assertEquals(3, recalculatedSnapshot.items.get(1).totalNeeded),
      () -> assertIterableEquals(
        List.of("ID-00021"),
        recalculatedSnapshot.items.get(1).selectedFulfillmentInventoryIds),
      () -> assertEquals("1x Folder (linked to Green Folder)", recalculatedSnapshot.items.get(2).description),
      () -> assertEquals(3, recalculatedSnapshot.items.get(2).totalNeeded),
      () -> assertIterableEquals(List.of(), recalculatedSnapshot.items.get(2).selectedFulfillmentInventoryIds),
      () -> assertEquals(8, recalculatedSnapshot.summary.totalUnitsNeeded));
  }

  @Test
  void calculateNewPurchaseListFiltersInvalidSavedResolvedAllocations() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 4),
      inventoryDoc("ID-00021", "Pencil", 1)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem markerItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem ambiguousItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    ambiguousItem.selectedFulfillmentInventoryIds = List.of("", "ID-00020", "ID-00020");

    List<PurchaseListFulfillmentAllocation> savedAllocations = new ArrayList<>();
    savedAllocations.add(null);
    savedAllocations.add(fulfillmentAllocation("", 3));
    savedAllocations.add(fulfillmentAllocation("ID-00020", 0));
    savedAllocations.add(fulfillmentAllocation("ID-00020", 3));
    ambiguousItem.selectedFulfillmentAllocations = savedAllocations;

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(markerItem);
    savedSnapshot.resolvedItems = List.of(ambiguousItem);
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem mergedMarkerItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020"))
        && !item.selectedFulfillmentInventoryIds.isEmpty())
      .findFirst()
      .orElseThrow();
    PurchaseListItem unresolvedWritingToolItem = recalculatedSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();

    assertAll(
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertIterableEquals(
        List.of("ID-00020"),
        mergedMarkerItem.selectedFulfillmentInventoryIds),
      () -> assertEquals(1, mergedMarkerItem.selectedFulfillmentAllocations.size()),
      () -> assertEquals(3, mergedMarkerItem.selectedFulfillmentAllocations.get(0).quantity),
      () -> assertEquals(8, mergedMarkerItem.totalNeeded),
      () -> assertEquals(4, mergedMarkerItem.quantityToBuy),
      () -> assertEquals(2, unresolvedWritingToolItem.totalNeeded),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(4, recalculatedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void calculateNewPurchaseListIgnoresUnusableSavedResolvedItems() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 4),
      inventoryDoc("ID-00021", "Pencil", 1)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem unresolvedSavedItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem staleSavedItem = purchaseListItem("ID-99999", "Stale saved item", 2, 0);
    staleSavedItem.selectedFulfillmentInventoryIds = List.of("ID-99999");

    List<PurchaseListItem> savedResolvedItems = new ArrayList<>();
    savedResolvedItems.add(null);
    savedResolvedItems.add(unresolvedSavedItem);
    savedResolvedItems.add(staleSavedItem);

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = initialSnapshot.items;
    savedSnapshot.resolvedItems = savedResolvedItems;
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(2, recalculatedSnapshot.items.size()),
      () -> assertEquals(0, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(1, recalculatedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void calculateNewPurchaseListSkipsResolvedSelectionThatNoLongerMatchesAnOption() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 4),
      inventoryDoc("ID-00021", "Pencil", 1)));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021")));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem ambiguousItem = initialSnapshot.items.get(0);
    ambiguousItem.selectedFulfillmentInventoryIds = List.of("ID-99999");
    ambiguousItem.selectedFulfillmentAllocations = List.of(fulfillmentAllocation("ID-99999", 5));

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of();
    savedSnapshot.resolvedItems = List.of(ambiguousItem);
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(0, recalculatedSnapshot.items.size()),
      () -> assertEquals(1, recalculatedSnapshot.resolvedItems.size()),
      () -> assertIterableEquals(
        List.of("ID-99999"),
        recalculatedSnapshot.resolvedItems.get(0).selectedFulfillmentInventoryIds),
      () -> assertEquals(0, recalculatedSnapshot.summary.totalDemandedItems),
      () -> assertEquals(0, recalculatedSnapshot.summary.totalUnitsNeeded));
  }

  @Test
  void calculateNewPurchaseListMergesResolvedFulfillmentIntoOverlappingActiveRows() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 4),
      inventoryDoc("ID-00021", "Pencil", 1),
      inventoryDoc("ID-00022", "Highlighter", 2)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Classroom Tool", 1, List.of("ID-00020", "ID-00022"))));

    PurchaseListSnapshot initialSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem resolvedSourceItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00021")))
      .findFirst()
      .orElseThrow();
    PurchaseListItem overlappingActiveItem = initialSnapshot.items.stream()
      .filter(item -> item.linkedInventoryIds.equals(List.of("ID-00020", "ID-00022")))
      .findFirst()
      .orElseThrow();
    resolvedSourceItem.selectedFulfillmentInventoryIds = List.of("ID-00020");

    PurchaseListSnapshot savedSnapshot = new PurchaseListSnapshot();
    savedSnapshot.generatedAt = initialSnapshot.generatedAt;
    savedSnapshot.summary = initialSnapshot.summary;
    savedSnapshot.items = List.of(overlappingActiveItem);
    savedSnapshot.resolvedItems = List.of(resolvedSourceItem);
    purchaseListService.saveCurrentPurchaseList(savedSnapshot);

    PurchaseListSnapshot recalculatedSnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem recalculatedActiveItem = recalculatedSnapshot.items.get(0);

    assertAll(
      () -> assertEquals(1, recalculatedSnapshot.items.size()),
      () -> assertEquals(List.of("ID-00020", "ID-00022"), recalculatedActiveItem.linkedInventoryIds),
      () -> assertEquals(10, recalculatedActiveItem.totalNeeded),
      () -> assertEquals(6, recalculatedActiveItem.quantityOnHand),
      () -> assertEquals(4, recalculatedActiveItem.quantityToBuy),
      () -> assertEquals(2, recalculatedActiveItem.sources.size()),
      () -> assertEquals(1, recalculatedSnapshot.resolvedItems.size()),
      () -> assertEquals(1, recalculatedSnapshot.summary.totalDemandedItems),
      () -> assertEquals(10, recalculatedSnapshot.summary.totalUnitsNeeded),
      () -> assertEquals(4, recalculatedSnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void includesUnlinkedSupplyListDemandWhenInventoryHasNoMatch() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Backpack", 2));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(1, snapshot.summary.totalDemandedItems);
    assertEquals(1, snapshot.summary.itemsNeedingPurchase);
    assertEquals(2, snapshot.summary.totalUnitsNeeded);
    assertEquals(0, snapshot.summary.totalUnitsOnHand);
    assertEquals(2, snapshot.summary.totalUnitsToBuy);

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Backpack", item.item);
    assertEquals("2x Backpacks", item.description);
    assertEquals(2, item.totalNeeded);
    assertEquals(0, item.quantityOnHand);
    assertEquals(2, item.quantityToBuy);
    assertEquals(0, item.fulfillmentPercent);
    assertEquals("unfulfilled", item.fulfillmentStatus);
    assertEquals(List.of(), item.linkedInventoryIds);
    assertEquals(1, item.sources.size());
    assertEquals(1, item.sources.get(0).studentCount);
    assertEquals(2, item.sources.get(0).quantityPerStudent);
  }

  @Test
  void recalculatingAfterAddingMatchingInventoryImprovesPurchaseListFulfillment() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 4));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Pencil", 1));

    PurchaseListSnapshot beforeInventorySnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem beforeInventoryItem = beforeInventorySnapshot.items.get(0);

    db.getCollection("inventory").insertOne(inventoryDoc("ID-00013", "Pencil", 2));

    PurchaseListSnapshot afterInventorySnapshot = purchaseListService.calculateNewPurchaseList();
    PurchaseListItem afterInventoryItem = afterInventorySnapshot.items.get(0);

    assertAll(
      () -> assertEquals(4, beforeInventoryItem.totalNeeded),
      () -> assertEquals(0, beforeInventoryItem.quantityOnHand),
      () -> assertEquals(4, beforeInventoryItem.quantityToBuy),
      () -> assertEquals(0, beforeInventoryItem.fulfillmentPercent),
      () -> assertEquals("unfulfilled", beforeInventoryItem.fulfillmentStatus),
      () -> assertEquals(4, afterInventoryItem.totalNeeded),
      () -> assertEquals(2, afterInventoryItem.quantityOnHand),
      () -> assertEquals(2, afterInventoryItem.quantityToBuy),
      () -> assertEquals(50, afterInventoryItem.fulfillmentPercent),
      () -> assertEquals("partial", afterInventoryItem.fulfillmentStatus),
      () -> assertEquals(2, afterInventorySnapshot.summary.totalUnitsOnHand),
      () -> assertEquals(2, afterInventorySnapshot.summary.totalUnitsToBuy));
  }

  @Test
  void matchesUnlinkedSupplyListDemandToInventoryWithoutEnoughStock() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00001", "Glue Stick", 3));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Glue Stick", 2));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Glue Stick", item.item);
    assertEquals("2x Glue Sticks", item.description);
    assertEquals(4, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(1, item.quantityToBuy);
    assertEquals(75, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00001"), item.linkedInventoryIds);
  }

  @Test
  void usesLinkedInventoryAsManagerFulfillmentIntent() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 3));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00002", "Disinfectant Wipe", 7));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Sanitizing Wipes", 1, List.of("ID-00002")));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Sanitizing Wipes", item.item);
    assertEquals("1x Sanitizing Wipes (linked to Disinfectant Wipe)", item.description);
    assertEquals(3, item.totalNeeded);
    assertEquals(7, item.quantityOnHand);
    assertEquals(0, item.quantityToBuy);
    assertEquals(100, item.fulfillmentPercent);
    assertEquals("fulfilled", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00002"), item.linkedInventoryIds);
  }

  @Test
  void aggregatesMultipleSupplyListRowsAgainstOneInventoryItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "2", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00003", "Notebook", 3));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Notebook", 1),
      supplyListDoc(SCHOOL, "2", TEACHER, "Notebook", 2)));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Notebook", item.item);
    assertEquals(4, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(1, item.quantityToBuy);
    assertEquals(75, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertEquals(2, item.sources.size());
  }

  @Test
  void countsOnlyMatchingTeacherFromGroupedStudentDemand() {
    db.getCollection("family").insertMany(List.of(
      familyDoc(SCHOOL, "1st Grade", TEACHER, 2),
      familyDoc(SCHOOL, "1st Grade", "Mr. Roe", 3),
      familyDoc(SCHOOL, "2nd Grade", TEACHER, 4)));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Pencil", 1));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals(2, item.totalNeeded);
    assertEquals(2, item.quantityToBuy);
    assertEquals(1, item.sources.size());
    assertEquals(2, item.sources.get(0).studentCount);
  }

  @Test
  void countsAllTeachersForGradeLevelSupplyListWithoutTeacher() {
    db.getCollection("family").insertMany(List.of(
      familyDoc(SCHOOL, "1", TEACHER, 2),
      familyDoc(SCHOOL, "1", "Mr. Roe", 3),
      familyDoc(SCHOOL, "2", TEACHER, 4),
      familyDoc("Other Elementary", "1", TEACHER, 5)));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", "N/A", "Pencil", 1));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals(5, item.totalNeeded);
    assertEquals(5, item.quantityToBuy);
    assertEquals(1, item.sources.size());
    assertEquals(5, item.sources.get(0).studentCount);
  }

  @Test
  void aggregatesLinkedAndAutoMatchedSupplyListRowsAgainstSameInventoryItem() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 2));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00006", "Disinfectant Wipe", 3));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Disinfectant Wipe", 2),
      supplyListDoc(SCHOOL, "1", TEACHER, "Sanitizing Wipes", 1, List.of("ID-00006"))));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(1, snapshot.items.size()),
      () -> assertEquals(1, snapshot.summary.totalDemandedItems),
      () -> assertEquals(6, snapshot.summary.totalUnitsNeeded),
      () -> assertEquals(3, snapshot.summary.totalUnitsOnHand),
      () -> assertEquals(3, snapshot.summary.totalUnitsToBuy));

    PurchaseListItem item = snapshot.items.get(0);
    assertEquals("Sanitizing Wipes", item.item);
    assertEquals("1x Sanitizing Wipes (linked to Disinfectant Wipe)", item.description);
    assertEquals(6, item.totalNeeded);
    assertEquals(3, item.quantityOnHand);
    assertEquals(3, item.quantityToBuy);
    assertEquals(50, item.fulfillmentPercent);
    assertEquals("partial", item.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00006"), item.linkedInventoryIds);
    assertEquals(2, item.sources.size());
  }

  @Test
  void keepsOverlappingLinkedInventorySetsAsSeparatePurchaseListItems() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00010", "Marker", 3),
      inventoryDoc("ID-00011", "Writing Tool", 4),
      inventoryDoc("ID-00012", "Pencil", 5)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 2, List.of("ID-00010", "ID-00011")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Pencil", 2, List.of("ID-00011", "ID-00012"))));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(2, snapshot.items.size()),
      () -> assertEquals(2, snapshot.summary.totalDemandedItems),
      () -> assertEquals(20, snapshot.summary.totalUnitsNeeded),
      () -> assertEquals(16, snapshot.summary.totalUnitsOnHand),
      () -> assertEquals(4, snapshot.summary.totalUnitsToBuy));

    PurchaseListItem markerItem = snapshot.items.get(0);
    assertEquals(10, markerItem.totalNeeded);
    assertEquals(7, markerItem.quantityOnHand);
    assertEquals(3, markerItem.quantityToBuy);
    assertEquals(70, markerItem.fulfillmentPercent);
    assertEquals("partial", markerItem.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00010", "ID-00011"), markerItem.linkedInventoryIds);
    assertEquals(1, markerItem.sources.size());

    PurchaseListItem pencilItem = snapshot.items.get(1);
    assertEquals(10, pencilItem.totalNeeded);
    assertEquals(9, pencilItem.quantityOnHand);
    assertEquals(1, pencilItem.quantityToBuy);
    assertEquals(90, pencilItem.fulfillmentPercent);
    assertEquals("partial", pencilItem.fulfillmentStatus);
    assertIterableEquals(List.of("ID-00011", "ID-00012"), pencilItem.linkedInventoryIds);
    assertEquals(1, pencilItem.sources.size());
  }

  @Test
  void keepsSingularLinkedDemandGroupedByExactInventoryItemAndAmbiguousDemandSeparate() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 5));
    db.getCollection("inventory").insertMany(List.of(
      inventoryDoc("ID-00020", "Marker", 12),
      inventoryDoc("ID-00021", "Pencil", 2)));
    db.getCollection("supplylist").insertMany(List.of(
      supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Dry Erase Marker", 2, List.of("ID-00020")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Pencil", 1, List.of("ID-00021")),
      supplyListDoc(SCHOOL, "1", TEACHER, "Writing Tool", 1, List.of("ID-00020", "ID-00021"))));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertAll(
      () -> assertEquals(3, snapshot.items.size()),
      () -> assertEquals(3, snapshot.summary.totalDemandedItems),
      () -> assertEquals(25, snapshot.summary.totalUnitsNeeded));

    PurchaseListItem markerItem = snapshot.items.get(0);
    assertEquals(15, markerItem.totalNeeded);
    assertEquals(12, markerItem.quantityOnHand);
    assertEquals(3, markerItem.quantityToBuy);
    assertIterableEquals(List.of("ID-00020"), markerItem.linkedInventoryIds);
    assertEquals(2, markerItem.sources.size());

    PurchaseListItem pencilItem = snapshot.items.get(1);
    assertEquals(5, pencilItem.totalNeeded);
    assertEquals(2, pencilItem.quantityOnHand);
    assertEquals(3, pencilItem.quantityToBuy);
    assertIterableEquals(List.of("ID-00021"), pencilItem.linkedInventoryIds);
    assertEquals(1, pencilItem.sources.size());

    PurchaseListItem ambiguousItem = snapshot.items.get(2);
    assertEquals(5, ambiguousItem.totalNeeded);
    assertEquals(14, ambiguousItem.quantityOnHand);
    assertEquals(0, ambiguousItem.quantityToBuy);
    assertIterableEquals(List.of("ID-00020", "ID-00021"), ambiguousItem.linkedInventoryIds);
    assertEquals(2, ambiguousItem.fulfillmentOptions.size());
    assertEquals("ID-00020", ambiguousItem.fulfillmentOptions.get(0).internalId);
    assertEquals("Marker", ambiguousItem.fulfillmentOptions.get(0).description);
    assertEquals(12, ambiguousItem.fulfillmentOptions.get(0).quantityOnHand);
    assertEquals("ID-00021", ambiguousItem.fulfillmentOptions.get(1).internalId);
    assertEquals("Pencil", ambiguousItem.fulfillmentOptions.get(1).description);
    assertEquals(2, ambiguousItem.fulfillmentOptions.get(1).quantityOnHand);
    assertEquals(1, ambiguousItem.sources.size());
  }

  @Test
  void usesInventoryIdentityWhenMatchedSupplyListItemIsGeneric() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00004", "Marker", 1)
      .append("brand", "Crayola")
      .append("color", "Blue")
      .append("type", "Washable")
      .append("material", "Plastic")
      .append("packageSize", 8));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals("8 Pack of Blue Washable Crayola Marker (Plastic)", snapshot.items.get(0).description);
  }

  @Test
  void displaysStructuredSupplyListDetailsForUnmatchedItems() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Marker", 1)
      .append("packageSize", 24)
      .append("color", attributeExactly("Blue"))
      .append("type", attributeExactly("Washable"))
      .append("size", attributeExactly("Wide"))
      .append("brand", attributeAnyOf("Crayola", "RoseArt"))
      .append("material", attributeExactly("Plastic"))
      .append("notes", "primary classroom"));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(
      "1x 24ct Blue Washable Wide Crayola/RoseArt Marker (Plastic, primary classroom)",
      snapshot.items.get(0).description);
  }

  @Test
  void usesStoredInventoryDescriptionWhenLinkedInventoryHasNoStructuredDisplay() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("inventory").insertOne(inventoryDoc("ID-00005", "", 1)
      .append("description", "Reusable school pouch"));
    db.getCollection("supplylist").insertOne(
      supplyListDoc(SCHOOL, "1", TEACHER, "Binder Pencil bag", 1, List.of("ID-00005")));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals(
      "1x Binder Pencil bag (linked to Reusable school pouch)",
      snapshot.items.get(0).description);
  }

  @Test
  void ignoresGenericValuesWhenBuildingSupplyListDisplay() {
    db.getCollection("family").insertOne(familyDoc(SCHOOL, "1", TEACHER, 1));
    db.getCollection("supplylist").insertOne(supplyListDoc(SCHOOL, "1", TEACHER, "Folder", 1)
      .append("brand", attributeAnyOf("N/A"))
      .append("material", attributeExactly("N/A"))
      .append("notes", "N/A"));

    PurchaseListSnapshot snapshot = purchaseListService.calculateNewPurchaseList();

    assertEquals(1, snapshot.items.size());
    assertEquals("1x Folder", snapshot.items.get(0).description);
  }

  private Document inventoryDoc(String internalId, String item, int quantity) {
    return new Document()
      .append("_id", new ObjectId())
      .append("item", item)
      .append("description", item)
      .append("quantity", quantity)
      .append("reservedQuantity", 0)
      .append("packageSize", 1)
      .append("internalID", internalId)
      .append("internalBarcode", internalId);
  }

  private PurchaseListItem purchaseListItem(
      String internalId,
      String description,
      int totalNeeded,
      int quantityOnHand
  ) {
    PurchaseListItem item = new PurchaseListItem();
    item.inventoryId = internalId;
    item.internalId = internalId;
    item.item = description;
    item.description = description;
    item.totalNeeded = totalNeeded;
    item.quantityOnHand = quantityOnHand;
    item.quantityToBuy = Math.max(0, totalNeeded - quantityOnHand);
    item.fulfillmentPercent = totalNeeded <= 0
      ? 100
      : Math.min(100, (int) Math.round((double) quantityOnHand / totalNeeded * 100));
    item.fulfillmentStatus = quantityOnHand >= totalNeeded ? "fulfilled" : "partial";
    item.linkedInventoryIds = List.of(internalId);
    item.selectedFulfillmentInventoryIds = List.of();
    item.selectedFulfillmentAllocations = List.of();
    item.fulfillmentOptions = List.of();
    item.sources = List.of();
    return item;
  }

  private PurchaseListFulfillmentAllocation fulfillmentAllocation(String internalId, int quantity) {
    PurchaseListFulfillmentAllocation allocation = new PurchaseListFulfillmentAllocation();
    allocation.internalId = internalId;
    allocation.quantity = quantity;
    return allocation;
  }

  private PurchaseListItem savedPreferenceItem(
      PurchaseListItem sourceItem,
      String internalId,
      String description,
      int quantity
  ) {
    PurchaseListItem preferenceItem = purchaseListItem(internalId, description, quantity, quantity);
    preferenceItem.sources = sourceItem.sources;
    preferenceItem.selectedFulfillmentInventoryIds = List.of(internalId);
    preferenceItem.selectedFulfillmentAllocations = List.of(
      fulfillmentAllocation(internalId, quantity, sourceIds(sourceItem)));
    return preferenceItem;
  }

  private PurchaseListFulfillmentAllocation fulfillmentAllocation(
      String internalId,
      int quantity,
      List<String> sourceIds
  ) {
    PurchaseListFulfillmentAllocation allocation = fulfillmentAllocation(internalId, quantity);
    allocation.sourceIds = sourceIds;
    return allocation;
  }

  private List<String> sourceIds(PurchaseListItem item) {
    return item.sources.stream()
      .map(source -> source.supplyListId)
      .sorted()
      .toList();
  }

  private Document supplyListDoc(
      String school,
      String grade,
      String teacher,
      String item,
      int quantity
  ) {
    return supplyListDoc(school, grade, teacher, item, quantity, List.of());
  }

  private Document supplyListDoc(
      String school,
      String grade,
      String teacher,
      String item,
      int quantity,
      List<String> invIDs
  ) {
    return new Document()
      .append("_id", new ObjectId())
      .append("school", school)
      .append("grade", grade)
      .append("teacher", teacher)
      .append("item", List.of(item))
      .append("quantity", quantity)
      .append("invIDs", invIDs);
  }

  private Document attributeExactly(String value) {
    return new Document()
      .append("exactly", value)
      .append("anyOf", List.of());
  }

  private Document attributeAnyOf(String... values) {
    return new Document()
      .append("exactly", "")
      .append("anyOf", List.of(values));
  }

  private Document familyDoc(String school, String grade, String teacher, int studentCount) {
    List<Document> students = new ArrayList<>();
    for (int index = 1; index <= studentCount; index++) {
      students.add(new Document()
        .append("name", "Student " + index)
        .append("school", school)
        .append("grade", grade)
        .append("teacher", teacher));
    }

    return new Document()
      .append("_id", new ObjectId())
      .append("guardianName", "Guardian")
      .append("students", students);
  }
}
