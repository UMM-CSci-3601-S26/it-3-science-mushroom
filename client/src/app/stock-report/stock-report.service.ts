// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// RxJS Imports
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

// Family Imports
import { environment } from '../../environments/environment';
import { StockReport } from './stock-report';

@Injectable({
  providedIn: 'root'
})

export class StockReportService {
  private httpClient = inject(HttpClient);
  private reportSubject = new BehaviorSubject<StockReport[]>([]);
  readonly stockReportUrl: string = `${environment.apiUrl}stockreport`;

  reports$ = this.reportSubject.asObservable(); // Public observable for components to subscribe

  /**
   * Method to refresh list of reports when its updated.
   * @returns Observable of the updated list of Stock Reports
   */
  refreshReports(): Observable<StockReport[]> {
    return this.getReports().pipe(
      tap(reports => this.reportSubject.next(reports)), // Update the BehaviorSubject with new reports
      catchError(error => {
        console.error('Error fetching reports:', error);
        this.reportSubject.next([]);
        return of([]); // Return an empty array if there's an error
      })
    );
  }

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
