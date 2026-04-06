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

  lookUpByBarcode(barcode:string): Observable<Inventory> {
    return this.httpClient.get<Inventory>(`${environment.apiUrl}barcode/lookup/${barcode}`);
  }
  addManually(item: Inventory): Observable<Inventory> {
    return this.httpClient.post<Inventory>(this.inventoryUrl, item);
  }
  removeOne(identifier: string): Observable<Inventory> {
    return this.httpClient.delete<Inventory>(`${this.inventoryUrl}/remove`, { params: { id: identifier } });
  }
  addInventory(item: Inventory) {
    return this.httpClient.post('/api/inventory', item);
  }
  updateQuantity(barcode: string, action: 'add' | 'remove') {
    return this.httpClient.post<Inventory>(`/api/inventory/${barcode}/quantity`, { action: action });
  }

  // addByScanAndUpdate(barcode: string) {
  //   this.addByScan(barcode).subscribe(updatedItem => {
  //     this.syncItem(updatedItem);
  //   }, (err) => {
  //     if (err.status ===404) {
  //       this.openManualEntry(barcode);
  //     } else {
  //       console.error('Error adding item by scan:', err);
  //     }
  //   }
  //   );
  // }

  removeOneAndUpdate(identifier: string) {
    this.removeOne(identifier).subscribe(item => {
      if (item.quantity <= 0) {
        this.inventory.set(this.inventory().filter(i => i.internalID !== item.internalID))
      } else {
        this.syncItem(item);
      }
    });
  }

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
  }

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
