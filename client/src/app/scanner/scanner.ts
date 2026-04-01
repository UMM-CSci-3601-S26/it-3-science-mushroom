import { Inventory } from '../inventory/inventory'; // Update the path to where Inventory is defined

export interface scanRequest {
  barcode: string;
  scanOptions?: "inventory";
  action?: "add" | "remove"; // Optional field to specify the action to take on the inventory item (e.g., add to inventory, remove from inventory)
  // This serves as the input for a scan operation,
  //  which could be either an internal barcode (e.g., "ITEM-00000") or an external barcode (e.g., "MFG-XYZ123").
}

export type scanResult = {
  status: "FOUND"
  item: Inventory;
} | {
  status: "NOT_FOUND"
  barcode: string; // returns the barcode that was scanned but not found
}
