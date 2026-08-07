package umm3601.Demand;

import static com.mongodb.client.model.Filters.eq;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.bson.Document;
import org.bson.UuidRepresentation;
import org.bson.types.ObjectId;
import org.mongojack.JacksonMongoCollection;

import com.mongodb.client.MongoDatabase;
import com.mongodb.client.model.Updates;

import umm3601.Common.InventoryMatcher;
import umm3601.Family.Family;
import umm3601.Inventory.Inventory;
import umm3601.SupplyList.SupplyList;

public class DemandService {
  private static final int NO_DEMAND_MIN_QUANTITY = 0;
  private static final int NOT_CALCULATED_PERCENTAGE_FILLED = -1;
  private static final int INVALID_LINK_PERCENTAGE_FILLED = -2;
  private static final int PERCENT_SCALE = 100;
  private static final String INTERNAL_INVENTORY_ID_PATTERN = "^ID-\\d{4,5}$";
  private static final String UNKNOWN_CALCULATED_STOCK_STATE = "Unknown";
  private static final String MATCHED_STATUS = "matched";
  private static final String INVALID_LINK_STATUS = "invalid-link";
  private static final String MISSING_INVENTORY_STATUS = "missing-inventory";
  private static final String NO_STUDENT_DEMAND_STATUS = "no-student-demand";
  private static final String UNKNOWN_SCHOOL = "Unknown School";
  private static final String UNKNOWN_GRADE = "Unknown Grade";
  private static final String UNKNOWN_TEACHER = "Unknown Teacher";

  private final JacksonMongoCollection<Inventory> inventoryCollection;
  private final JacksonMongoCollection<Family> familyCollection;
  private final JacksonMongoCollection<SupplyList> supplyListCollection;
  private final InventoryMatcher inventoryMatcher;

  public DemandService(MongoDatabase database) {
    this(database, new InventoryMatcher(database));
  }

  public DemandService(MongoDatabase database, InventoryMatcher inventoryMatcher) {
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
  }

  /**
   * Builds the current demand picture without changing inventory or supply-list documents.
   *
   * @return current demand grouped by linked inventory item, plus source supply-list rows
   */
  @SuppressWarnings({ "checkstyle:MethodLength" })
  public DemandSnapshot calculateCurrentDemand() {
    ArrayList<SupplyList> allSupplyLists = supplyListCollection.find().into(new ArrayList<>());
    List<Family.StudentInfo> students = getStudents();
    Map<String, Inventory> inventoryByInternalId = getInventoryByInternalId();
    Map<String, DemandAccumulator> demandByInternalId = new LinkedHashMap<>();
    List<DemandSupplyListItem> supplyListItems = new ArrayList<>();

    long totalSupplyLists = supplyListCollection.countDocuments();
    long validInvIDCount = 0;
    long invalidInvIDCount = 0;
    long bestMatchNullCount = 0;
    long schoolCount = 0;

    for (SupplyList supplyList : allSupplyLists) {
      if (supplyList.school == null || supplyList.grade == null) {
        continue;
      }

      List<String> linkedInventoryIds = validInternalIds(supplyList);
      int studentCount = studentCountForSupplyList(supplyList, students);

      if (linkedInventoryIds.isEmpty()) {
        invalidInvIDCount++;
        supplyListItems.add(buildSupplyListItem(
          supplyList,
          linkedInventoryIds,
          null,
          INVALID_LINK_STATUS,
          studentCount,
          inventoryByInternalId));
        continue;
      }

      validInvIDCount++;
      String primaryInternalId = linkedInventoryIds.get(0);
      Inventory primaryInventory = inventoryByInternalId.get(primaryInternalId);

      if (primaryInventory == null) {
        bestMatchNullCount++;
        supplyListItems.add(buildSupplyListItem(
          supplyList,
          linkedInventoryIds,
          primaryInternalId,
          MISSING_INVENTORY_STATUS,
          studentCount,
          inventoryByInternalId));
        continue;
      }

      if (studentCount <= 0) {
        supplyListItems.add(buildSupplyListItem(
          supplyList,
          linkedInventoryIds,
          primaryInternalId,
          NO_STUDENT_DEMAND_STATUS,
          studentCount,
          inventoryByInternalId));
        continue;
      }

      schoolCount++;
      DemandSupplyListItem supplyListItem = buildSupplyListItem(
        supplyList,
        linkedInventoryIds,
        primaryInternalId,
        MATCHED_STATUS,
        studentCount,
        inventoryByInternalId);

      supplyListItems.add(supplyListItem);
      DemandAccumulator accumulator = demandByInternalId.computeIfAbsent(
        primaryInternalId,
        key -> new DemandAccumulator(primaryInventory));
      accumulator.add(supplyListItem);
    }

    DemandCalculationResult summary = new DemandCalculationResult(
      totalSupplyLists,
      validInvIDCount,
      invalidInvIDCount,
      bestMatchNullCount,
      schoolCount
    );

    List<DemandInventoryItem> inventoryItems = demandByInternalId.values().stream()
      .map(DemandAccumulator::toDemandInventoryItem)
      .toList();

    return new DemandSnapshot(summary, inventoryItems, supplyListItems);
  }

  /**
   * Calculates demand and persists the stock-report fields that are derived from it.
   *
   * @return summary counts for the demand calculation run
   */
  public DemandCalculationResult calculatePredictedStockStates() {
    DemandSnapshot snapshot = calculateCurrentDemand();
    resetPersistedDemandFields();
    persistSupplyListDemand(snapshot);
    persistInventoryDemand(snapshot);
    return snapshot.summary;
  }

  public int calculateQuantityToBuy(int quantityOnHand, int totalNeeded) {
    return Math.max(0, totalNeeded - quantityOnHand);
  }

  public String calculateStockState(int quantityOnHand, int totalNeeded) {
    int itemDiff = quantityOnHand - totalNeeded;

    if (itemDiff == 0) {
      return "Stocked";
    } else if (itemDiff < 0) {
      return "Understocked";
    } else {
      return "Overstocked";
    }
  }

  private void persistSupplyListDemand(DemandSnapshot snapshot) {
    for (DemandSupplyListItem supplyListItem : snapshot.supplyListItems) {
      if (supplyListItem.percentageFilled == null) {
        continue;
      }

      supplyListCollection.updateOne(
        eq("_id", new ObjectId(supplyListItem.supplyListId)),
        Updates.set("percentageFilled", supplyListItem.percentageFilled));
    }
  }

  private void resetPersistedDemandFields() {
    supplyListCollection.updateMany(
      new Document(),
      Updates.set("percentageFilled", NOT_CALCULATED_PERCENTAGE_FILLED));
    inventoryCollection.updateMany(
      new Document(),
      Updates.combine(
        Updates.set("calculatedMinQuantity", NO_DEMAND_MIN_QUANTITY),
        Updates.set("calculatedStockState", UNKNOWN_CALCULATED_STOCK_STATE)));
  }

  private void persistInventoryDemand(DemandSnapshot snapshot) {
    for (DemandInventoryItem inventoryItem : snapshot.items) {
      inventoryCollection.updateOne(
        eq("_id", new ObjectId(inventoryItem.inventoryId)),
        Updates.combine(
          Updates.set("calculatedMinQuantity", inventoryItem.totalNeeded),
          Updates.set("calculatedStockState", inventoryItem.calculatedStockState)));
    }
  }

  private DemandSupplyListItem buildSupplyListItem(
      SupplyList supplyList,
      List<String> linkedInventoryIds,
      String primaryInternalId,
      String status,
      int studentCount,
      Map<String, Inventory> inventoryByInternalId
  ) {
    DemandSupplyListItem supplyListItem = new DemandSupplyListItem();
    supplyListItem.supplyListId = supplyList._id;
    supplyListItem.school = supplyList.school;
    supplyListItem.grade = supplyList.grade;
    supplyListItem.teacher = supplyList.teacher;
    supplyListItem.requestedItems = requestedItems(supplyList);
    supplyListItem.linkedInventoryIds = List.copyOf(linkedInventoryIds);
    supplyListItem.primaryInternalId = primaryInternalId;
    supplyListItem.status = status;
    supplyListItem.studentCount = studentCount;
    supplyListItem.quantityPerStudent = quantityPerStudent(supplyList);
    supplyListItem.totalNeeded = studentCount * supplyListItem.quantityPerStudent;
    supplyListItem.linkedQuantityOnHand = linkedQuantityOnHand(linkedInventoryIds, inventoryByInternalId);
    supplyListItem.percentageFilled = percentageFilledForStatus(supplyListItem);
    return supplyListItem;
  }

  private Map<String, Inventory> getInventoryByInternalId() {
    ArrayList<Inventory> inventories = inventoryCollection.find().into(new ArrayList<>());
    Map<String, Inventory> inventoryByInternalId = new HashMap<>();

    for (Inventory inventory : inventories) {
      if (inventory != null && inventory.internalID != null) {
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
        if (student == null) {
          continue;
        }

        students.add(student);
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
    return student.school != null ? student.school : UNKNOWN_SCHOOL;
  }

  private String studentGrade(Family.StudentInfo student) {
    return student.grade != null ? student.grade : UNKNOWN_GRADE;
  }

  private String studentTeacher(Family.StudentInfo student) {
    return student.teacher != null ? student.teacher : UNKNOWN_TEACHER;
  }

  private int quantityPerStudent(SupplyList supplyList) {
    return supplyList.quantity != null ? supplyList.quantity : 1;
  }

  private int linkedQuantityOnHand(
      List<String> linkedInventoryIds,
      Map<String, Inventory> inventoryByInternalId
  ) {
    int linkedQuantity = 0;
    for (String internalId : linkedInventoryIds) {
      Inventory inventory = inventoryByInternalId.get(internalId);
      if (inventory != null) {
        linkedQuantity += inventory.quantity;
      }
    }
    return linkedQuantity;
  }

  private Integer calculatePercentageFilled(int linkedQuantityOnHand, int totalNeeded) {
    if (linkedQuantityOnHand <= 0 || totalNeeded <= 0) {
      return 0;
    }

    return (int) Math.round((double) linkedQuantityOnHand / totalNeeded * PERCENT_SCALE);
  }

  private Integer percentageFilledForStatus(DemandSupplyListItem supplyListItem) {
    if (INVALID_LINK_STATUS.equals(supplyListItem.status)) {
      return INVALID_LINK_PERCENTAGE_FILLED;
    }
    if (MATCHED_STATUS.equals(supplyListItem.status)) {
      return calculatePercentageFilled(supplyListItem.linkedQuantityOnHand, supplyListItem.totalNeeded);
    }
    return null;
  }

  private List<String> requestedItems(SupplyList supplyList) {
    return supplyList.item == null ? List.of() : List.copyOf(supplyList.item);
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

  private class DemandAccumulator {
    private final Inventory inventory;
    private final List<DemandSupplyListItem> supplyListItems;
    private int totalNeeded;

    DemandAccumulator(Inventory inventory) {
      this.inventory = inventory;
      supplyListItems = new ArrayList<>();
    }

    void add(DemandSupplyListItem supplyListItem) {
      totalNeeded += supplyListItem.totalNeeded;
      supplyListItems.add(supplyListItem);
    }

    DemandInventoryItem toDemandInventoryItem() {
      DemandInventoryItem inventoryItem = new DemandInventoryItem();
      inventoryItem.inventoryId = inventory._id;
      inventoryItem.internalId = inventory.internalID;
      inventoryItem.item = inventory.item;
      inventoryItem.description = inventory.description;
      inventoryItem.quantityOnHand = inventory.quantity;
      inventoryItem.totalNeeded = totalNeeded;
      inventoryItem.quantityToBuy = calculateQuantityToBuy(inventory.quantity, totalNeeded);
      inventoryItem.calculatedStockState = calculateStockState(inventory.quantity, totalNeeded);
      inventoryItem.supplyListItems = List.copyOf(supplyListItems);
      return inventoryItem;
    }
  }
}
