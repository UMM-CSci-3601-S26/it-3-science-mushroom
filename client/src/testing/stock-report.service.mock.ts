// Angular Imports
import { Injectable } from '@angular/core';
import { Observable, of, throwError } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { StockReport } from '../app/stock-report/stock-report';
import { StockReportService } from 'src/app/stock-report/stock-report.service';

@Injectable({
  providedIn: AppComponent
})
export class MockStockReportService implements Pick<StockReportService,
 'getReportById' | 'getReports' | 'addNewPdfReport' | 'deleteReport' |
 'getReportBytesById' | 'generateAndDownloadXlsxReport' | 'generateNewXlsxReport'> {

  generateAndDownloadXlsxReport(): Observable<Blob> {
    throw new Error('Method not implemented.');
  }
  generateNewXlsxReport(): Observable<string> {
    throw new Error('Method not implemented.');
  }
  static testReports: StockReport[] = [
    {
      _id: 'john_id',
      reportType: 'PDF',
      reportData: 'john_report.pdf',
      reportName: "John's Report"
    },
    {
      _id: 'jane_id',
      reportType: 'PDF',
      reportData: 'jane_report.pdf',
      reportName: "Jane's Report"
    },
  ];

  getReports(): Observable<StockReport[]> {
    return of(MockStockReportService.testReports);
  }

  getReportById(id: string): Observable<StockReport> {
    const report = MockStockReportService.testReports.find(r => r._id === id);
    if (report) {
      return of(report);
    } else {
      return throwError(() => new Error(`Report with id ${id} not found`));
    }
  }

  getReportBytesById(id: string): Observable<Blob> {
    const report = MockStockReportService.testReports.find(r => r._id === id);
    if (report) {
      // Return a mock blob for testing
      return of(new Blob(['mock pdf content'], { type: 'application/pdf' }));
    } else {
      return throwError(() => new Error(`Report with id ${id} not found`));
    }
  }

  addNewPdfReport(formData: FormData): Observable<string> {
    console.log('addNewPdfReport called with', formData);
    return of('1');
  }

  deleteReport(id: string): Observable<void> {
    console.log('deleteReport called with', id);
    return of(void 0);
  }
}
