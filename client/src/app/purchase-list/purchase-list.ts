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
  sources: PurchaseListSource[];
}

export interface PurchaseListSource {
  supplyListId: string;
  school: string;
  grade: string;
  teacher?: string;
  requestedItems: string[];
  supplyListDescription: string;
  studentCount: number;
  quantityPerStudent: number;
  totalNeeded: number;
}
