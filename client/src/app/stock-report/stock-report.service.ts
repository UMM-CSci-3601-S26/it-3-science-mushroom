// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// RxJS Imports
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
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
    // Get reports from server
    this.getReports().subscribe({
      next: (reports) => {
        this.reportSubject.next(reports); // Update the subject with new reports
      },
      error: (error) => {
        console.error('Error fetching reports:', error);
        this.reportSubject.next([]); // On error, emit an empty array
      }
    });
    return this.reports$; // Return the observable for components to subscribe to
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
