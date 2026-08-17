export type FulfillmentStatus = 'fulfilled' | 'partial' | 'unfulfilled';

export interface PurchaseListSummary {
  totalDemandedItems: number;
  itemsNeedingPurchase: number;
  totalUnitsNeeded: number;
  totalUnitsOnHand: number;
  totalUnitsToBuy: number;
}

export interface PurchaseListSnapshot {
  generatedAt: string;
  summary: PurchaseListSummary;
  items: PurchaseListItem[];
  resolvedItems: PurchaseListItem[];
}

export interface PurchaseListItem {
  inventoryId: string;
  internalId: string;
  item: string;
  description: string;
  totalNeeded: number;
  quantityOnHand: number;
  quantityToBuy: number;
  fulfillmentPercent: number;
  fulfillmentStatus: FulfillmentStatus;
  linkedInventoryIds: string[];
  selectedFulfillmentInventoryIds: string[];
  selectedFulfillmentAllocations: PurchaseListFulfillmentAllocation[];
  fulfillmentOptions: PurchaseListFulfillmentOption[];
  sources: PurchaseListSource[];
}

export interface PurchaseListSource {
  supplyListId: string;
  school: string;
  grade: string;
  teacher?: string;
  requestedItems: string[];
  studentCount: number;
  quantityPerStudent: number;
  totalNeeded: number;
}

export interface PurchaseListFulfillmentOption {
  internalId: string;
  inventoryId: string;
  item: string;
  description: string;
  quantityOnHand: number;
}

export interface PurchaseListFulfillmentAllocation {
  internalId: string;
  quantity: number;
}
