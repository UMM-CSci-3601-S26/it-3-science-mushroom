import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { Inventory } from '../app/inventory/inventory';
import { InventoryService } from 'src/app/inventory/inventory.service';

@Injectable({
  providedIn: AppComponent
})

export class MockInventoryService implements Pick<InventoryService, 'getInventory'> {
  static testInventory: Inventory[] = [
    {
      item: "Markers",
      brand: "Crayola",
      count: 8,
      size: "Wide",
      color: "N/A",
      type: "Washable",
      material: "N/A",
      description: "8 Pack of Washable Wide Markers",
      quantity: 0,
      maxQuantity: 0,
      minQuantity: 0,
      stockState: '',
      notes: "N/A"
    },
    {
      item: "Folder",
      brand: "N/A",
      count: 1,
      size: "N/A",
      color: "Red",
      type: "2 Prong",
      material: "Plastic",
      description: "Red 2 Prong Plastic Pocket Folder",
      quantity: 0,
      maxQuantity: 0,
      minQuantity: 0,
      stockState: '',
      notes: "N/A"
    },
    {
      item: "Notebook",
      brand: "Five Star",
      count: 1,
      size: "Wide Ruled",
      color: "Yellow",
      type: "Spiral",
      material: "N/A",
      description: "Yellow Wide Ruled Spiral Notebook",
      quantity: 0,
      maxQuantity: 0,
      minQuantity: 0,
      stockState: '',
      notes: "N/A"
    }
  ];

  /* eslint-disable @typescript-eslint/no-unused-vars */
  getInventory(_filters: { item?: string, brand?: string, color?: string, size?: string, type?: string, material?: string }): Observable<Inventory[]> {
    return of(MockInventoryService.testInventory);
  }
}
