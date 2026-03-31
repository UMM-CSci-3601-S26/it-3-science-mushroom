// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Family Imports
import { environment } from '../../environments/environment';
import { StockReport } from './stock-report';

@Injectable({
  providedIn: 'root'
})

export class StockReportService {
  private httpClient = inject(HttpClient);

  readonly stockReportUrl: string = `${environment.apiUrl}stockreport`;

  getReports(): Observable<StockReport[]> {
    const httpParams: HttpParams = new HttpParams();
    return this.httpClient.get<StockReport[]>(this.stockReportUrl, {
      params: httpParams,
    });
  }

  getReportById(id: string): Observable<StockReport> {
    return this.httpClient.get<StockReport>(`${this.stockReportUrl}/${id}`);
  }

  addNewReport(formData: FormData): Observable<string> {
    return this.httpClient.post<{id: string}>(this.stockReportUrl, formData).pipe(map(response => response.id));
  }

  deleteReport(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.stockReportUrl}/${id}`);
  }

  // Keeping for now since I might add CSV exporting for Stock Reports
  // exportFamilies(): Observable<string> {
  //   return this.httpClient.get(`${this.stockReportUrl}/export`, {
  //     responseType: 'text'
  //   });
  // }
}
