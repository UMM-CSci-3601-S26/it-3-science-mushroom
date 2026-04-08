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

    if (item.internalBarcode) {
      this.internalBarcodeMap.set(item.internalBarcode, item.internalID);
    }

    for (const ext of item.externalBarcode ?? []) {
      if (ext) {
        this.externalBarcodeMap.set(ext, item.internalID)
      }
    }
  }
  unregisterItem(internalID: string) {
    const item = this.itemMap.get(internalID);
    if (!item) {
      return;
    }
    this.itemMap.delete(internalID);

    if (item.internalBarcode) {
      this.internalBarcodeMap.delete(item.internalBarcode);
    }

    for (const ext of item.externalBarcode ?? []) {
      if (ext) {
        this.externalBarcodeMap.delete(ext);
      }
    }
  }
  clear() {
    this.internalBarcodeMap.clear();
    this.externalBarcodeMap.clear();
    this.itemMap.clear();
  }
}
