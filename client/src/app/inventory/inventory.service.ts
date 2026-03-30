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
  private readonly descriptionKey = 'description';
  private readonly brandKey = 'brand';
  private readonly colorKey = 'color';
  private readonly countKey = 'count';
  private readonly sizeKey = 'size';
  private readonly typeKey = 'type';
  private readonly materialKey = 'material';
  private readonly quantityKey = 'quantity';
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
