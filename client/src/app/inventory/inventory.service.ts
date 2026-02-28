import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Inventory } from './inventory';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class InventoryService {
  private httpClient = inject(HttpClient);

  readonly inventoryUrl: string = `${environment.apiUrl}inventory`;

  private readonly schoolKey = 'school';
  private readonly gradeKey = 'grade';
  private readonly itemKey = 'item';
  private readonly descriptionKey = 'description';
  private readonly quantityKey = 'quantity';
  private readonly propertiesKey = 'properties';

  getInventory(filters?: { school?: string; grade?: string; item?: string; description?: string; quantity?: number; properties?: string[] }): Observable<Inventory[]> {
    let httpParams: HttpParams = new HttpParams();
    if (filters) {
      if (filters.school) {
        httpParams = httpParams.set(this.schoolKey, filters.school);
      }
      if (filters.grade) {
        httpParams = httpParams.set(this.gradeKey, filters.grade);
      }
      if (filters.item) {
        httpParams = httpParams.set(this.itemKey, filters.item);
      }
      if (filters.description) {
        httpParams = httpParams.set(this.descriptionKey, filters.description);
      }
      if (filters.quantity !== undefined) {
        httpParams = httpParams.set(this.quantityKey, filters.quantity.toString());
      }
      if (filters.properties && filters.properties.length > 0) {
        httpParams = httpParams.set(this.propertiesKey, filters.properties.join(','));
      }
    }
    return this.httpClient.get<Inventory[]>(this.inventoryUrl, { params: httpParams });
  }
}
