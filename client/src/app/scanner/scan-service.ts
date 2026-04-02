
import { InventoryIndex } from "../inventory/inventory-index";
import { scanRequest, scanResult } from "./scanner";
import { Injectable, inject } from "@angular/core";

@Injectable({providedIn: 'root'})
export class ScanService {
  private inventoryIndex = inject(InventoryIndex);
  // sanatizes the barcodes as they are inputted
  // Converts to upperCase
  // converts any character not expected into nothing and trim all of the white space as well
  normalizeBarcode(barcode: string): string {
    return barcode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
  }

  scan(req: scanRequest): scanResult {
    const item = this.inventoryIndex.getByBarcode(req.barcode);
    if (item) {
      return {
        status: "FOUND",
        item,
      };
    } else {
      return {
        status: "NOT_FOUND",
        barcode: req.barcode, // returns the barcode that was scanned but not found
      };
    }
  }
}
