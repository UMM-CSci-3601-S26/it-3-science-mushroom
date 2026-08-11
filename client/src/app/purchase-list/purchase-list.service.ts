import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { PurchaseListSnapshot } from './purchase-list';

@Injectable({
  providedIn: 'root'
})
export class PurchaseListService {
  private httpClient = inject(HttpClient);

  readonly purchaseListUrl: string = `${environment.apiUrl}purchase-list/current`;
  readonly calculatePurchaseListUrl: string = `${environment.apiUrl}purchase-list/calculate`;

  getPurchaseList(): Observable<PurchaseListSnapshot> {
    return this.httpClient.get<PurchaseListSnapshot>(this.purchaseListUrl);
  }

  calculatePurchaseList(): Observable<PurchaseListSnapshot> {
    return this.httpClient.post<PurchaseListSnapshot>(this.calculatePurchaseListUrl, {});
  }
}
