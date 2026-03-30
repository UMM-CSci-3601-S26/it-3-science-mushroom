
import { InventoryIndex } from "./inventory-index";
import { scanRequest, scanResult } from "./inventory";
import { Injectable, inject } from "@angular/core";

@Injectable({providedIn: 'root'})

export class ScanService {
  private inventoryIndex = inject(InventoryIndex);

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
