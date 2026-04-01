import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AppComponent } from 'src/app/app.component';
import { StockReport } from '../app/stock-report/stock-report';
import { StockReportService } from 'src/app/stock-report/stock-report.service';

@Injectable({
  providedIn: AppComponent
})
export class MockStockReportService implements Pick<StockReportService, 'getReportById' | 'getReports' | 'addNewReport' | 'deleteReport'> {
  static testReports: StockReport[] = [
    {
      //stockReport with one kid
      _id: 'john_id',
      stockReportPDF: 'john_report.pdf',
      reportName: "John's Report"
    },
  ];

  getReports(): Observable<StockReport[]> {
    return of(MockStockReportService.testReports);
  }

  getReportById(id: string): Observable<StockReport> | null {
    if (id === MockStockReportService.testReports[0]._id) {
      return of(MockStockReportService.testReports[0]);
    } else if (id === MockStockReportService.testReports[1]._id) {
      return of(MockStockReportService.testReports[1]);
    } else {
      return of(null);
    }
  }

  addNewReport(formData: FormData): Observable<string> {
    console.log('addNewReport called with', formData);
    return of('1');
  }

  deleteReport(id: string): Observable<void> {
    console.log('deleteReport called with', id);
    return of(void 0);
  }
}
