// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';

// Inventory Imports
import { Inventory } from './inventory';
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
}
