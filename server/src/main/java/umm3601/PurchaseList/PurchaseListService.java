package umm3601.PurchaseList;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.mongodb.client.MongoDatabase;

import umm3601.Demand.DemandInventoryItem;
import umm3601.Demand.DemandService;
import umm3601.Demand.DemandSnapshot;
import umm3601.Demand.DemandSupplyListItem;

public class PurchaseListService {
  private static final int PERCENT_SCALE = 100;
  private static final String FULFILLED_STATUS = "fulfilled";
  private static final String PARTIAL_STATUS = "partial";
  private static final String UNFULFILLED_STATUS = "unfulfilled";

  private final DemandService demandService;

  public PurchaseListService(MongoDatabase database) {
    this(new DemandService(database));
  }

  public PurchaseListService(DemandService demandService) {
    this.demandService = demandService;
  }

  public PurchaseListSnapshot getCurrentPurchaseList() {
    DemandSnapshot demandSnapshot = demandService.calculateCurrentDemand();
    List<PurchaseListItem> items = purchaseListDemandItems(demandSnapshot).stream()
      .map(this::toPurchaseListItem)
      .toList();

    PurchaseListSnapshot snapshot = new PurchaseListSnapshot();
    snapshot.generatedAt = Instant.now().toString();
    snapshot.summary = toPurchaseListSummary(items);
    snapshot.items = items;
    return snapshot;
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

  private PurchaseListItem toPurchaseListItem(DemandInventoryItem demandItem) {
    PurchaseListItem item = new PurchaseListItem();
    item.inventoryId = fallback(demandItem.inventoryId);
    item.internalId = fallback(demandItem.internalId);
    item.item = fallback(demandItem.item);
    item.description = fallback(demandItem.description, item.item);
    item.totalNeeded = demandItem.totalNeeded;
    item.quantityOnHand = demandItem.quantityOnHand;
    item.quantityToBuy = demandItem.quantityToBuy;
    item.fulfillmentPercent = fulfillmentPercent(item.quantityOnHand, item.totalNeeded);
    item.fulfillmentStatus = fulfillmentStatus(item.quantityOnHand, item.totalNeeded);
    item.sources = supplyListItems(demandItem).stream()
      .map(this::toPurchaseListSource)
      .toList();
    item.linkedInventoryIds = linkedInventoryIds(demandItem);
    return item;
  }

  private PurchaseListSource toPurchaseListSource(DemandSupplyListItem demandSource) {
    PurchaseListSource source = new PurchaseListSource();
    source.supplyListId = fallback(demandSource.supplyListId);
    source.school = fallback(demandSource.school);
    source.grade = fallback(demandSource.grade);
    source.teacher = demandSource.teacher;
    source.requestedItems = demandSource.requestedItems == null
      ? List.of()
      : List.copyOf(demandSource.requestedItems);
    source.studentCount = demandSource.studentCount;
    source.quantityPerStudent = demandSource.quantityPerStudent;
    source.totalNeeded = demandSource.totalNeeded;
    return source;
  }

  private List<String> linkedInventoryIds(DemandInventoryItem demandItem) {
    Set<String> linkedInventoryIds = new LinkedHashSet<>();
    addIfPresent(linkedInventoryIds, demandItem.internalId);

    for (DemandSupplyListItem source : supplyListItems(demandItem)) {
      for (String linkedInventoryId : linkedInventoryIds(source)) {
        addIfPresent(linkedInventoryIds, linkedInventoryId);
      }
    }

    return new ArrayList<>(linkedInventoryIds);
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

  private void addIfPresent(Set<String> values, String value) {
    if (value != null && !value.isBlank()) {
      values.add(value);
    }
  }

  private String fallback(String value) {
    return fallback(value, "");
  }

  private String fallback(String value, String fallback) {
    return value == null ? fallback : value;
  }

  private List<DemandInventoryItem> purchaseListDemandItems(DemandSnapshot demandSnapshot) {
    return demandSnapshot.items == null ? List.of() : demandSnapshot.items;
  }

  private List<DemandSupplyListItem> supplyListItems(DemandInventoryItem demandItem) {
    return demandItem.supplyListItems == null ? List.of() : demandItem.supplyListItems;
  }

  private List<String> linkedInventoryIds(DemandSupplyListItem source) {
    return source.linkedInventoryIds == null ? List.of() : source.linkedInventoryIds;
  }
}
