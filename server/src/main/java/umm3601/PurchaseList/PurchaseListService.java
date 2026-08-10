package umm3601.PurchaseList;

import static com.mongodb.client.model.Filters.eq;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.StringJoiner;

import org.bson.UuidRepresentation;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.ReplaceOptions;

import umm3601.Common.InventoryMatcher;
import umm3601.Family.Family;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class PurchaseListService {
  private static final String LATEST_SNAPSHOT_ID = "latest-purchase-list";
  private static final int PERCENT_SCALE = 100;
  private static final String FULFILLED_STATUS = "fulfilled";
  private static final String PARTIAL_STATUS = "partial";
  private static final String UNFULFILLED_STATUS = "unfulfilled";
  private static final String INTERNAL_INVENTORY_ID_PATTERN = "^ID-\\d{4,5}$";
  private static final String UNKNOWN_SCHOOL = "Unknown School";
  private static final String UNKNOWN_GRADE = "Unknown Grade";
  private static final String UNKNOWN_TEACHER = "Unknown Teacher";
  private static final String UNKNOWN_ITEM = "Unknown Item";

  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final JacksonMongoCollection<PurchaseListSnapshot> purchaseListSnapshotCollection;
  private final InventoryMatcher inventoryMatcher;

  public PurchaseListService(MongoDatabase database) {
    this(database, new InventoryMatcher(database));
  }

  public PurchaseListService(MongoDatabase database, InventoryMatcher inventoryMatcher) {
    this.inventoryMatcher = inventoryMatcher;
    inventoryCollection = JacksonMongoCollection.builder().build(
      database,
      "inventory",
      Inventory.class,
      UuidRepresentation.STANDARD
    );

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

    purchaseListSnapshotCollection = JacksonMongoCollection.builder().build(
      database,
      "purchaseListSnapshots",
      PurchaseListSnapshot.class,
      UuidRepresentation.STANDARD
    );
  }

  public PurchaseListSnapshot getCurrentPurchaseList() {
    PurchaseListSnapshot snapshot = purchaseListSnapshotCollection.find(eq("_id", LATEST_SNAPSHOT_ID)).first();
    return snapshot == null ? emptyPurchaseListSnapshot() : normalizeSnapshot(snapshot);
  }

  public PurchaseListSnapshot calculateNewPurchaseList() {
    List<PurchaseListItem> items = calculatePurchaseListItems();
    PurchaseListSnapshot snapshot = buildSnapshot(items);

    purchaseListSnapshotCollection.replaceOne(
      eq("_id", LATEST_SNAPSHOT_ID),
      snapshot,
      new ReplaceOptions().upsert(true));

    return snapshot;
  }

  private PurchaseListSnapshot buildSnapshot(List<PurchaseListItem> items) {
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot._id = LATEST_SNAPSHOT_ID;
    snapshot.generatedAt = Instant.now().toString();
    snapshot.summary = toPurchaseListSummary(items);
    snapshot.items = items;
    return snapshot;
  }

  private PurchaseListSnapshot emptyPurchaseListSnapshot() {
    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot._id = LATEST_SNAPSHOT_ID;
    snapshot.generatedAt = "";
    snapshot.summary = toPurchaseListSummary(List.of());
    snapshot.items = List.of();
    return snapshot;
  }

  private PurchaseListSnapshot normalizeSnapshot(PurchaseListSnapshot snapshot) {
    if (snapshot.summary == null) {
      snapshot.summary = toPurchaseListSummary(List.of());
    }
    if (snapshot.items == null) {
      snapshot.items = List.of();
    }
    return snapshot;
  }

  private List<PurchaseListItem> calculatePurchaseListItems() {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    List<Family.StudentInfo> students = getStudents();
    Map<String, Inventory> inventoryByInternalId = getInventoryByInternalId();
    List<PurchaseListAccumulator> demandByFulfillmentTarget = new ArrayList<>();

    for (SupplyList supplyList : allSupplyLists) {
      if (!hasDemandInputs(supplyList)) {
        continue;
      }

      int studentCount = studentCountForSupplyList(supplyList, students);
      if (studentCount <= 0) {
        continue;
      }

      int quantityPerStudent = quantityPerStudent(supplyList);
      int totalNeeded = studentCount * quantityPerStudent;
      InventoryFulfillment fulfillment = resolveInventoryFulfillment(supplyList, inventoryByInternalId);

      PurchaseListAccumulator accumulator = accumulatorForFulfillmentTarget(
        demandByFulfillmentTarget,
        supplyList,
        fulfillment);
      accumulator.add(supplyList, fulfillment, studentCount, quantityPerStudent, totalNeeded);
    }

    return demandByFulfillmentTarget.stream()
      .map(accumulator -> accumulator.toPurchaseListItem(inventoryByInternalId))
      .toList();
  }

  private PurchaseListAccumulator accumulatorForFulfillmentTarget(
      List<PurchaseListAccumulator> accumulators,
      SupplyList supplyList,
      InventoryFulfillment fulfillment
  ) {
    List<PurchaseListAccumulator> matchingAccumulators = new ArrayList<>();
    for (PurchaseListAccumulator accumulator : accumulators) {
      if (accumulator.matches(fulfillment)) {
        matchingAccumulators.add(accumulator);
      }
    }

    if (matchingAccumulators.isEmpty()) {
      PurchaseListAccumulator accumulator = new PurchaseListAccumulator(supplyList, fulfillment);
      accumulators.add(accumulator);
      return accumulator;
    }

    PurchaseListAccumulator target = matchingAccumulators.get(0);
    for (int index = 1; index < matchingAccumulators.size(); index++) {
      PurchaseListAccumulator duplicate = matchingAccumulators.get(index);
      target.mergeFrom(duplicate);
      accumulators.remove(duplicate);
    }

    return target;
  }

  private PurchaseListSummary toPurchaseListSummary(List<PurchaseListItem> items) {
    PurchaseListSummary summary = new PurchaseListSummary();
    summary.totalDemandedItems = items.size();

    for (PurchaseListItem item : items) {
      if (item.quantityToBuy > 0) {
        summary.itemsNeedingPurchase++;
      }
      summary.totalUnitsNeeded += item.totalNeeded;
      summary.totalUnitsOnHand += item.quantityOnHand;
      summary.totalUnitsToBuy += item.quantityToBuy;
    }

    return summary;
  }

  private InventoryFulfillment resolveInventoryFulfillment(
      SupplyList supplyList,
      Map<String, Inventory> inventoryByInternalId
  ) {
    List<String> linkedInventoryIds = validInternalIds(supplyList);
    if (!linkedInventoryIds.isEmpty()) {
      return new InventoryFulfillment(
        inventoryGroupKey(linkedInventoryIds),
        linkedInventoryIds,
        firstInventory(linkedInventoryIds, inventoryByInternalId),
        true);
    }

    Inventory matchedInventory = inventoryMatcher.findBestDemandMatch(supplyList);
    if (matchedInventory != null) {
      return new InventoryFulfillment(
        matchedInventoryKey(matchedInventory, supplyList),
        matchedInventoryIds(matchedInventory),
        matchedInventory,
        false);
    }

    return new InventoryFulfillment(
      supplyDemandKey(supplyList),
      List.of(),
      null,
      false);
  }

  private boolean hasDemandInputs(SupplyList supplyList) {
    return supplyList != null
      && hasText(supplyList.school)
      && hasText(supplyList.grade)
      && !requestedItems(supplyList).isEmpty();
  }

  private Map<String, Inventory> getInventoryByInternalId() {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    Map<String, Inventory> inventoryByInternalId = new HashMap<>();

    for (Inventory inventory : inventories) {
      if (inventory != null && hasText(inventory.internalID)) {
        inventoryByInternalId.put(inventory.internalID, inventory);
      }
    }

    return inventoryByInternalId;
  }

  private List<Family.StudentInfo> getStudents() {
    ArrayList<Family> families = familyCollection.find().into(new ArrayList<>());
    List<Family.StudentInfo> students = new ArrayList<>();

    for (Family family : families) {
      if (family == null || family.students == null) {
        continue;
      }

      for (Family.StudentInfo student : family.students) {
        if (student != null) {
          students.add(student);
        }
      }
    }

    return students;
  }

  private int studentCountForSupplyList(SupplyList supplyList, List<Family.StudentInfo> students) {
    int studentCount = 0;
    for (Family.StudentInfo student : students) {
      if (inventoryMatcher.supplyListMatchesStudent(
          supplyList,
          studentSchool(student),
          studentGrade(student),
          studentTeacher(student))) {
        studentCount++;
      }
    }

    return studentCount;
  }

  private String studentSchool(Family.StudentInfo student) {
    return hasText(student.school) ? student.school : UNKNOWN_SCHOOL;
  }

  private String studentGrade(Family.StudentInfo student) {
    return hasText(student.grade) ? student.grade : UNKNOWN_GRADE;
  }

  private String studentTeacher(Family.StudentInfo student) {
    return hasText(student.teacher) ? student.teacher : UNKNOWN_TEACHER;
  }

  private int quantityPerStudent(SupplyList supplyList) {
    return supplyList.quantity == null || supplyList.quantity <= 0 ? 1 : supplyList.quantity;
  }

  private int quantityOnHand(
      Set<String> linkedInventoryIds,
      Inventory primaryInventory,
      Map<String, Inventory> inventoryByInternalId
  ) {
    if (linkedInventoryIds.isEmpty()) {
      return primaryInventory == null ? 0 : primaryInventory.quantity;
    }

    int linkedQuantity = 0;
    for (String internalId : linkedInventoryIds) {
      Inventory inventory = inventoryByInternalId.get(internalId);
      if (inventory != null) {
        linkedQuantity += inventory.quantity;
      }
    }
    return linkedQuantity;
  }

  private int fulfillmentPercent(int quantityOnHand, int totalNeeded) {
    if (totalNeeded <= 0) {
      return PERCENT_SCALE;
    }
    return Math.min(
      PERCENT_SCALE,
      (int) Math.round((double) quantityOnHand / totalNeeded * PERCENT_SCALE));
  }

  private String fulfillmentStatus(int quantityOnHand, int totalNeeded) {
    if (totalNeeded <= 0 || quantityOnHand >= totalNeeded) {
      return FULFILLED_STATUS;
    }
    return quantityOnHand <= 0 ? UNFULFILLED_STATUS : PARTIAL_STATUS;
  }

  private PurchaseListSource toPurchaseListSource(
      SupplyList supplyList,
      int studentCount,
      int quantityPerStudent,
      int totalNeeded
  ) {
    PurchaseListSource source = new PurchaseListSource();
    source.supplyListId = fallback(supplyList._id);
    source.school = fallback(supplyList.school);
    source.grade = fallback(supplyList.grade);
    source.teacher = supplyList.teacher;
    source.requestedItems = requestedItems(supplyList);
    source.studentCount = studentCount;
    source.quantityPerStudent = quantityPerStudent;
    source.totalNeeded = totalNeeded;
    return source;
  }

  private String supplyItemLabel(SupplyList supplyList, Inventory inventory) {
    List<String> requestedItems = requestedItems(supplyList);
    if (!requestedItems.isEmpty()) {
      return String.join(" / ", requestedItems);
    }
    return inventory != null && hasText(inventory.item) ? inventory.item : UNKNOWN_ITEM;
  }

  private String supplyItemDescription(SupplyList supplyList, Inventory inventory, String itemLabel) {
    String supplyDescription = supplyListItemDisplay(supplyList, itemLabel);
    String inventoryDescription = inventoryItemDisplay(inventory);

    if (shouldUseInventoryDescription(supplyList, inventory, inventoryDescription, itemLabel)) {
      return inventoryDescription;
    }
    if (shouldIncludeLinkedDescription(supplyList, inventory, inventoryDescription, itemLabel)) {
      return supplyDescription + " (linked to " + inventoryDescription + ")";
    }
    return hasText(supplyDescription) ? supplyDescription : fallback(inventoryDescription, itemLabel);
  }

  private String inventoryGroupKey(List<String> inventoryIds) {
    return "inventory:" + String.join("|", inventoryIds.stream().sorted().toList());
  }

  private String matchedInventoryKey(Inventory inventory, SupplyList supplyList) {
    if (hasText(inventory.internalID)) {
      return inventoryGroupKey(List.of(inventory.internalID));
    }
    if (hasText(inventory._id)) {
      return "inventory:" + inventory._id;
    }
    return supplyDemandKey(supplyList);
  }

  private List<String> matchedInventoryIds(Inventory inventory) {
    if (!hasText(inventory.internalID)) {
      return List.of();
    }
    return List.of(inventory.internalID);
  }

  private String supplyDemandKey(SupplyList supplyList) {
    List<String> itemParts = requestedItems(supplyList).stream()
      .map(this::normalizeKey)
      .sorted()
      .toList();
    return "supply:" + String.join("|",
      String.join("/", itemParts),
      optionKey(supplyList.brand),
      optionKey(supplyList.color),
      optionKey(supplyList.size),
      optionKey(supplyList.type),
      optionKey(supplyList.material),
      String.valueOf(supplyList.packageSize == null ? 0 : supplyList.packageSize));
  }

  private String optionKey(SupplyList.AttributeOptions options) {
    if (options == null) {
      return "";
    }
    if (hasText(options.exactly)) {
      return "exact:" + normalizeKey(options.exactly);
    }
    if (options.anyOf == null || options.anyOf.isEmpty()) {
      return "";
    }
    return options.anyOf.stream()
      .filter(this::hasText)
      .map(this::normalizeKey)
      .sorted()
      .reduce((left, right) -> left + "/" + right)
      .orElse("");
  }

  private Inventory firstInventory(
      List<String> linkedInventoryIds,
      Map<String, Inventory> inventoryByInternalId
  ) {
    for (String linkedInventoryId : linkedInventoryIds) {
      Inventory inventory = inventoryByInternalId.get(linkedInventoryId);
      if (inventory != null) {
        return inventory;
      }
    }
    return null;
  }

  private List<String> requestedItems(SupplyList supplyList) {
    if (supplyList.item == null) {
      return List.of();
    }
    return supplyList.item.stream()
      .filter(this::hasText)
      .map(String::trim)
      .toList();
  }

  private List<String> validInternalIds(SupplyList supplyList) {
    List<String> validIds = new ArrayList<>();

    for (String invID : inventoryIds(supplyList)) {
      if (isInternalInventoryId(invID) && !validIds.contains(invID)) {
        validIds.add(invID);
      }
    }

    return validIds;
  }

  private List<String> inventoryIds(SupplyList supplyList) {
    return supplyList.invIDs == null ? List.of() : supplyList.invIDs;
  }

  private boolean isInternalInventoryId(String invID) {
    return invID != null && invID.matches(INTERNAL_INVENTORY_ID_PATTERN);
  }

  private String normalizeKey(String value) {
    return value == null ? "" : value.trim().toLowerCase(Locale.US).replaceAll("[^a-z0-9]+", "");
  }

  private String supplyListItemDisplay(SupplyList supplyList, String itemLabel) {
    StringJoiner mainParts = new StringJoiner(" ");
    int quantityPerStudent = quantityPerStudent(supplyList);
    if (quantityPerStudent > 0) {
      mainParts.add(quantityPerStudent + "x");
    }
    if (supplyList.packageSize != null && supplyList.packageSize > 1) {
      mainParts.add(supplyList.packageSize + "ct");
    }
    addIfPresent(mainParts, attributeDisplay(supplyList.color));
    addIfPresent(mainParts, attributeDisplay(supplyList.type));
    addIfPresent(mainParts, attributeDisplay(supplyList.size));
    addIfPresent(mainParts, attributeDisplay(supplyList.brand));
    mainParts.add(pluralizedItemLabel(supplyList, itemLabel, quantityPerStudent));

    StringJoiner detailParts = new StringJoiner(", ");
    addIfPresent(detailParts, attributeDisplay(supplyList.material));
    addIfPresent(detailParts, supplyList.notes);

    String main = mainParts.toString().trim();
    String details = detailParts.toString().trim();
    if (hasText(main) && hasText(details)) {
      return main + " (" + details + ")";
    }
    return hasText(main) ? main : details;
  }

  private String inventoryItemDisplay(Inventory inventory) {
    if (inventory == null) {
      return "";
    }

    String generatedDescription = inventory.buildDescription();
    if (hasText(generatedDescription)) {
      return generatedDescription;
    }
    if (hasText(inventory.description)) {
      return inventory.description;
    }
    return fallback(inventory.item);
  }

  private boolean shouldUseInventoryDescription(
      SupplyList supplyList,
      Inventory inventory,
      String inventoryDescription,
      String itemLabel
  ) {
    return inventory != null
      && !hasSupplyListDetails(supplyList)
      && inventoryMatcher.nameEquivalent(itemLabel, inventory.item)
      && hasRicherDescription(inventoryDescription, itemLabel);
  }

  private boolean shouldIncludeLinkedDescription(
      SupplyList supplyList,
      Inventory inventory,
      String inventoryDescription,
      String itemLabel
  ) {
    return inventory != null
      && !hasSupplyListDetails(supplyList)
      && !inventoryMatcher.nameEquivalent(itemLabel, inventory.item)
      && hasRicherDescription(inventoryDescription, itemLabel);
  }

  private boolean hasRicherDescription(String description, String itemLabel) {
    return hasText(description) && !normalizeKey(description).equals(normalizeKey(itemLabel));
  }

  private boolean hasSupplyListDetails(SupplyList supplyList) {
    return supplyList.quantity != null && supplyList.quantity > 1
      || supplyList.packageSize != null && supplyList.packageSize > 1
      || hasAttributeDisplay(supplyList.brand)
      || hasAttributeDisplay(supplyList.color)
      || hasAttributeDisplay(supplyList.size)
      || hasAttributeDisplay(supplyList.type)
      || hasAttributeDisplay(supplyList.material)
      || hasMeaningfulValue(supplyList.notes);
  }

  private boolean hasAttributeDisplay(SupplyList.AttributeOptions options) {
    return hasText(attributeDisplay(options));
  }

  private String attributeDisplay(SupplyList.AttributeOptions options) {
    if (options == null) {
      return "";
    }
    if (hasMeaningfulValue(options.exactly)) {
      return options.exactly.trim();
    }
    if (options.anyOf == null || options.anyOf.isEmpty()) {
      return "";
    }
    List<String> values = options.anyOf.stream()
      .filter(this::hasMeaningfulValue)
      .map(String::trim)
      .toList();
    return String.join("/", values);
  }

  private String pluralizedItemLabel(SupplyList supplyList, String itemLabel, int quantityPerStudent) {
    if (quantityPerStudent <= 1 || requestedItems(supplyList).size() != 1 || itemLabel.endsWith("s")) {
      return itemLabel;
    }
    return itemLabel + "s";
  }

  private void addIfPresent(StringJoiner joiner, String value) {
    if (hasMeaningfulValue(value)) {
      joiner.add(value.trim());
    }
  }

  private String fallback(String value, String defaultValue) {
    return hasText(value) ? value : defaultValue;
  }

  private String fallback(String value) {
    return hasText(value) ? value : "";
  }

  private boolean hasMeaningfulValue(String value) {
    return hasText(value) && !"n/a".equalsIgnoreCase(value.trim());
  }

  private boolean hasText(String value) {
    return value != null && !value.isBlank();
  }

  private class PurchaseListAccumulator {
    private final String groupKey;
    private String item;
    private String description;
    private final Set<String> linkedInventoryIds;
    private final List<PurchaseListSource> sources;
    private Inventory primaryInventory;
    private int totalNeeded;
    private boolean usesManualLinkIdentity;

    PurchaseListAccumulator(SupplyList supplyList, InventoryFulfillment fulfillment) {
      groupKey = fulfillment.groupKey;
      item = supplyItemLabel(supplyList, fulfillment.primaryInventory);
      description = supplyItemDescription(supplyList, fulfillment.primaryInventory, item);
      primaryInventory = fulfillment.primaryInventory;
      linkedInventoryIds = new LinkedHashSet<>();
      sources = new ArrayList<>();
      usesManualLinkIdentity = fulfillment.manuallyLinked;
    }

    boolean matches(InventoryFulfillment fulfillment) {
      if (fulfillment.linkedInventoryIds.isEmpty()) {
        return groupKey.equals(fulfillment.groupKey);
      }

      return overlapsLinkedInventory(fulfillment.linkedInventoryIds);
    }

    void add(
        SupplyList supplyList,
        InventoryFulfillment fulfillment,
        int studentCount,
        int quantityPerStudent,
        int sourceTotalNeeded
    ) {
      totalNeeded += sourceTotalNeeded;
      linkedInventoryIds.addAll(fulfillment.linkedInventoryIds);
      if (primaryInventory == null && fulfillment.primaryInventory != null) {
        primaryInventory = fulfillment.primaryInventory;
      }
      if (fulfillment.manuallyLinked && !usesManualLinkIdentity) {
        item = supplyItemLabel(supplyList, fulfillment.primaryInventory);
        description = supplyItemDescription(supplyList, fulfillment.primaryInventory, item);
        primaryInventory = fulfillment.primaryInventory;
        usesManualLinkIdentity = true;
      }
      sources.add(toPurchaseListSource(supplyList, studentCount, quantityPerStudent, sourceTotalNeeded));
    }

    void mergeFrom(PurchaseListAccumulator other) {
      totalNeeded += other.totalNeeded;
      linkedInventoryIds.addAll(other.linkedInventoryIds);
      if (primaryInventory == null && other.primaryInventory != null) {
        primaryInventory = other.primaryInventory;
      }
      if (other.usesManualLinkIdentity && !usesManualLinkIdentity) {
        item = other.item;
        description = other.description;
        primaryInventory = other.primaryInventory;
        usesManualLinkIdentity = true;
      }
      sources.addAll(other.sources);
    }

    PurchaseListItem toPurchaseListItem(Map<String, Inventory> inventoryByInternalId) {
      int currentQuantityOnHand = quantityOnHand(linkedInventoryIds, primaryInventory, inventoryByInternalId);

      PurchaseListItem itemSnapshot = new PurchaseListItem();
      itemSnapshot.inventoryId = primaryInventory == null ? "" : fallback(primaryInventory._id);
      itemSnapshot.internalId = linkedInventoryIds.isEmpty()
        ? inventoryInternalId(primaryInventory)
        : linkedInventoryIds.iterator().next();
      itemSnapshot.item = item;
      itemSnapshot.description = description;
      itemSnapshot.totalNeeded = totalNeeded;
      itemSnapshot.quantityOnHand = currentQuantityOnHand;
      itemSnapshot.quantityToBuy = Math.max(0, totalNeeded - currentQuantityOnHand);
      itemSnapshot.fulfillmentPercent = fulfillmentPercent(currentQuantityOnHand, totalNeeded);
      itemSnapshot.fulfillmentStatus = fulfillmentStatus(currentQuantityOnHand, totalNeeded);
      itemSnapshot.linkedInventoryIds = new ArrayList<>(linkedInventoryIds);
      itemSnapshot.sources = List.copyOf(sources);
      return itemSnapshot;
    }

    private String inventoryInternalId(Inventory inventory) {
      return inventory == null ? "" : fallback(inventory.internalID);
    }

    private boolean overlapsLinkedInventory(List<String> inventoryIds) {
      for (String inventoryId : inventoryIds) {
        if (linkedInventoryIds.contains(inventoryId)) {
          return true;
        }
      }
      return false;
    }
  }

  private static class InventoryFulfillment {
    private final String groupKey;
    private final List<String> linkedInventoryIds;
    private final Inventory primaryInventory;
    private final boolean manuallyLinked;

    InventoryFulfillment(
        String groupKey,
        List<String> linkedInventoryIds,
        Inventory primaryInventory,
        boolean manuallyLinked
    ) {
      this.groupKey = groupKey;
      this.linkedInventoryIds = List.copyOf(linkedInventoryIds);
      this.primaryInventory = primaryInventory;
      this.manuallyLinked = manuallyLinked;
    }
  }
}
