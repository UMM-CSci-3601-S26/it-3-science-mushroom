import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { SupplyList } from './supplylist';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupplyListService {
  private httpClient = inject(HttpClient);

  readonly supplylistUrl: string = `${environment.apiUrl}supplylist`;

  private readonly schoolKey = 'school';
  private readonly gradeKey = 'grade';
  private readonly itemKey = 'item';
  private readonly brandKey = 'brand';
  private readonly colorKey = 'color';
  private readonly countKey = 'count';
  private readonly sizeKey = 'size';
  private readonly typeKey = 'type';
  private readonly materialKey = 'material';
  private readonly quantityKey = 'quantity';
  private readonly notesKey = 'notes';

  getSupplyList(filters?: {school?: string; grade?: string; item?: string; brand?: string; color?: string;
    count?: number; size?: string; type?: string; material?: string; quantity?: number; notes?: string}): Observable<SupplyList[]> {

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
    return this.httpClient.get<SupplyList[]>(this.supplylistUrl, { params: httpParams });
  }

  deleteSupplyList(id: string): Observable<unknown> {
    return this.httpClient.delete<void>(`${this.supplylistUrl}/${id}`);
  }

  addSupplyList(newItem: Partial<SupplyList>): Observable<void> {
    return this.httpClient.post<void>(this.supplylistUrl, newItem);
  }

  editSupplyList(id: string, updatedItem: Partial<SupplyList>): Observable<void> {
    return this.httpClient.put<void>(`${this.supplylistUrl}/${id}`, updatedItem);
  }
}
