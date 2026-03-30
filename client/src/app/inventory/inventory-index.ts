import { Inventory } from './inventory';
import { Injectable } from "@angular/core";

@Injectable({providedIn: 'root'})

export class InventoryIndex {
  private internalBarcodeMap = new Map<string, string>(); // barcode -> internalID
  private externalBarcodeMap = new Map<string, string>(); // barcode -> internalID
  private itemMap = new Map<string, Inventory>(); // internalID -> Item

  getByBarcode(barcode: string): Inventory | null {
    const internalID = this.internalBarcodeMap.get(barcode) || this.externalBarcodeMap.get(barcode);
    if (!internalID) {
      return null; // No item found with this barcode
    }
    return this.itemMap.get(internalID) ?? null;
  }

  registerItem(item: Inventory) {
    this.itemMap.set(item.internalID, item);
    this.internalBarcodeMap.set(item.internalBarcode, item.internalID);

    for (const ext of item.externalBarcode ?? []) {
      this.externalBarcodeMap.set(ext, item.internalID);
    }
  }
}
