// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal, computed } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';

// Inventory Imports
import { Inventory, SelectOption } from './inventory';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private httpClient = inject(HttpClient);

  readonly inventoryUrl: string = `${environment.apiUrl}inventory`;

  private readonly itemKey = 'item';
  private readonly brandKey = 'brand';
  private readonly countKey = 'count';
  private readonly sizeKey = 'size';
  private readonly colorKey = 'color';
  private readonly typeKey = 'type';
  private readonly materialKey = 'material';
  private readonly descriptionKey = 'description';
  private readonly quantityKey = 'quantity';
  private readonly maxQuantityKey = 'maxQuantity';
  private readonly minQuantityKey = 'minQuantity';
  private readonly stockStateKey = 'stockState';
  private readonly notesKey = 'notes';

  constructor() {
    this.loadInventory();
  }

  inventory = signal<Inventory[]>([]);

  loadInventory(filters?: Inventory): void {
    this.getInventory(filters).subscribe(data => {
      this.inventory.set(data);
    });
  }

  itemOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'item')
  );

  brandOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'brand')
  )

  colorOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'color')
  )

  sizeOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'size')
  )

  typeOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'type')
  )

  materialOptions = computed(() =>
    this.optionBuilder(this.inventory(), 'material')
  )

  /**
   * Look up an inventory item by its barcode
   * @param barcode Barcode to look up in inventory
   * @returns Observable of the inventory item
   */
  lookUpByBarcode(barcode:string): Observable<Inventory> {
    return this.httpClient.get<Inventory>(`${environment.apiUrl}barcode/lookup/${barcode}`);
  }

  /**
   * Add an inventory item manually
   * @param item Item to add to inventory
   * @returns Observable of the added inventory item
   */
  addManually(item: Inventory): Observable<Inventory> {
    return this.httpClient.post<Inventory>(this.inventoryUrl, item);
  }

  /**
   * Add an inventory item to the inventory
   * @param item Item to add to inventory
   * @returns Observable of the added inventory item
   */
  addInventory(item: Inventory): Observable<Inventory> {
    return this.httpClient.post<Inventory>(this.inventoryUrl, item);
  }

  /**
   * Update the quantity of an inventory item by adding or removing a specified amount
   * @param barcode Barcode of the item to update
   * @param action Action to perform ('add' or 'remove')
   * @param amount Amount of quantity to add or remove
   * @returns Observable of the updated inventory item
   */
  updateQuantity(barcode: string, action: 'add' | 'remove', amount: number = 1): Observable<Inventory> {
    return this.httpClient.post<Inventory>(`${this.inventoryUrl}/${barcode}/quantity`, { action, amount });
  }

  /**
   * Link an external barcode to an inventory item
   * @param internalID Internal ID of the item to link the barcode to
   * @param barcode Barcode to link
   * @param quantity Quantity of the item
   * @returns Observable of the updated inventory item
   */
  linkExternalBarcode(internalID: string, barcode: string, quantity: number = 1): Observable<Inventory> {
    return this.httpClient.patch<Inventory>(`${this.inventoryUrl}/${internalID}/link-barcode`, { barcode, quantity });
  }

  /**
   * Remove a specified amount of inventory from an item, referenced by its internal ID.
   * @param internalID Internal ID of item to remove amount from
   * @param amount Amount of quantity to remove
   * @returns Observable of the updated inventory item
   */
  removeItemQuantityById(internalID: string, amount: number): Observable<unknown> {
    return new Observable(observer => {
      this.httpClient.post(`${this.inventoryUrl}/removeQuantity`, { internalID, amount }).subscribe({
        next: (result) => {
          this.loadInventory();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /**
   * Delete a specified amount of inventory from an item, referenced by its internalID
   * @param internalID Internal ID of item to delete amount from
   * @param amount Amount of quantity to delete
   * @returns Observable of the updated inventory item
   */
  deleteInventoryById(internalID: string): Observable<unknown> {
    return new Observable(observer => {
      this.httpClient.delete(`${this.inventoryUrl}/${internalID}`).subscribe({
        next: (result) => {
          this.loadInventory();
          observer.next(result);
          observer.complete();
        },
        error: (err) => observer.error(err)
      });
    });
  }

  /* These methods are currently unused and thus commented out. Their tests (if they have any) are also commented out.
  addByScanAndUpdate(barcode: string) {
    this.addByScan(barcode).subscribe(updatedItem => {
      this.syncItem(updatedItem);
    }, (err) => {
      if (err.status ===404) {
        this.openManualEntry(barcode);
      } else {
        console.error('Error adding item by scan:', err);
      }
    }
    );
  }

  /**
   * Remove one unit of an item from inventory
   * @param identifier Identifier of the item to remove one unit from (can be internal ID or barcode)
   * @returns Observable of the updated inventory item after removal
   *
  removeOne(identifier: string): Observable<Inventory> {
    return this.httpClient.delete<Inventory>(`${this.inventoryUrl}/removeQuantity`, { params: { id: identifier } });
  }

  /**
   * Remove one unit of an item from inventory and update the inventory state
   * @param identifier Identifier of the item to remove one unit from (can be internal ID or barcode)
   *
  removeOneAndUpdate(identifier: string) {
    this.removeOne(identifier).subscribe(item => {
      if (item.quantity <= 0) {
        this.inventory.set(this.inventory().filter(i => i.internalID !== item.internalID))
      } else {
        this.syncItem(item);
      }
    });
  }


  /**
   * Sync the inventory state with an updated item. If it exists, it is updated. If it does not, it is added.
   * @param updatedItem Inventory item with updated information to sync with the inventory state

  private syncItem(updatedItem: Inventory) {
    const currentInventory = this.inventory();
    const index = currentInventory.findIndex(item => item.internalID === updatedItem.internalID);
    if (index !== -1) {
      const newInventory = [...currentInventory];
      newInventory[index] = updatedItem;
      this.inventory.set(newInventory);
    } else {
      this.inventory.set([...currentInventory, updatedItem]);
    }
  }*/

  /**
   * Get inventory from the server, filtered by optional parameters
   * @param filters Filters to apply to the API call
   * @returns The inventory items that match the filters as an Observable
   */
  getInventory(filters?: {item?: string; description?: string; brand?: string; color?: string;
    count?: number; size?: string; type?: string; material?: string; quantity?: number; notes?: string}): Observable<Inventory[]> {

    let httpParams: HttpParams = new HttpParams();
    if (filters) {
      if (filters.item) {
        httpParams = httpParams.set(this.itemKey, filters.item);
      }
      if (filters.brand) {
        httpParams = httpParams.set(this.brandKey, filters.brand);
      }
      if (filters.color) {
        httpParams = httpParams.set(this.colorKey, filters.color);
      }
      if (filters.size) {
        httpParams = httpParams.set(this.sizeKey, filters.size);
      }
      if (filters.type) {
        httpParams = httpParams.set(this.typeKey, filters.type);
      }
      if (filters.material) {
        httpParams = httpParams.set(this.materialKey, filters.material);
      }

    }
    return this.httpClient.get<Inventory[]>(this.inventoryUrl, { params: httpParams });
  }

  optionBuilder(data: Inventory[], key: keyof Inventory): SelectOption[] {
    return [...new Set(
      data.map(item => item[key]).filter((v): v is string => typeof v === 'string' && v.trim() !== '')
    )].map(value => ({
      label: value,
      value: value
    }));
  }

}
