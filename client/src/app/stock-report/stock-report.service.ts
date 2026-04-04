// Angular Imports
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

// RxJS Imports
import { Observable, of, forkJoin } from 'rxjs';
import { catchError, map, tap, switchMap } from 'rxjs/operators';
import { BehaviorSubject } from 'rxjs';

// JS Imports
import JSZip from 'jszip';

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

  /**
   * Converts base64 into a Blob for downloading files off of the server. Currently only handles PDFs.
   * @param base64String The base64 string to convert to a Blob
   * @returns The converted Blob
   */
  public convertBase64ToBlob(base64String: string): Blob {
    const binaryString = atob(base64String); // Decode Base64
    const bytes = new Uint8Array(binaryString.length);
    // Fill byte array with the decoded b64
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    // Make and return Blob
    const blob = new Blob([bytes], { type: 'application/pdf' });
    return blob;
  }

  /**
   * Call the endpoint to get all Stock Reports
   * @returns httpParams of the server's response
   */
  getReports(): Observable<StockReport[]> {
    const httpParams: HttpParams = new HttpParams();
    return this.httpClient.get<StockReport[]>(this.stockReportUrl, {
      params: httpParams,
    });
  }

  /**
   * Call the endpoint to get a single Stock Report by ID
   * @param id ID of report to get
   * @returns StockReport with the given ID, as returned by the server
   */
  getReportById(id: string): Observable<StockReport> {
    return this.httpClient.get<StockReport>(`${this.stockReportUrl}/${id}`);
  }

  /**
   * Call endpoint to add a new Stock Report
   * @param formData Data of the new report to add, containing the report name and data for the report file (PDF or CSV)
   * @returns Response from the server, which should be the ID of the newly created report
   */
  addNewReport(formData: FormData): Observable<string> {
    return this.httpClient.post<{id: string}>(this.stockReportUrl, formData).pipe(map(response => response.id));
  }

  /**
   * Calls the delete endpoint for a given report ID
   * @param id ID of report to delete
   * @returns A void Observable when deletion is complete
   */
  deleteReport(id: string): Observable<void> {
    return this.httpClient.delete<void>(`${this.stockReportUrl}/${id}`);
  }

  /**
   * Delete a single report and refresh the reports list.
   * @param report The report to delete
   * @returns Observable that completes when delete and refresh are done
   */
  deleteSingleReport(report: StockReport): Observable<void> {
    return this.deleteReport(report._id!).pipe(
      switchMap(() => this.refreshReports()),
      switchMap(() => of(void 0)) // Convert to void observable
    );
  }

  /**
   * Delete multiple reports and refresh the reports list.
   * @param reports The reports to delete
   * @returns Observable that completes when all deletes and refresh are done
   */
  deleteAllReports(reports: StockReport[]): Observable<void> {
    if (reports.length === 0) {
      return of(void 0);
    }

    // Create an observable for each delete
    const deleteObservables = reports.map(report =>
      this.deleteReport(report._id!)
    );

    // Execute all deletes in parallel, then refresh once, return void
    return forkJoin(deleteObservables).pipe(
      switchMap(() => this.refreshReports()),
      switchMap(() => of(void 0))
    );
  }

  /**
   * Get blob for a single PDF report.
   * @param report The report to download
   * @returns Observable of the PDF blob
   */
  downloadSingleReportBlob(report: StockReport): Observable<Blob> {
    const pdfBlob = this.convertBase64ToBlob(report.stockReportPDF);
    return of(pdfBlob);
  }

  /**
   * Get ZIP blob containing all PDF reports.
   * @returns Observable of the ZIP blob containing all reports
   */
  downloadAllReportsAsZip(): Observable<Blob> {
    return this.getReports().pipe(
      switchMap(reports => {
        if (reports.length === 0) {
          return of(new Blob()); // Return empty blob if no reports
        }

        const zip = new JSZip();
        const usedFilenames = new Set<string>();

        // Add each report to the ZIP
        for (const report of reports) {
          const pdfBlob = this.convertBase64ToBlob(report.stockReportPDF);
          let finalFilename = report.reportName;

          // Handle duplicate filenames
          if (usedFilenames.has(finalFilename)) {
            const parts = finalFilename.split('.');
            const extension = parts.pop();
            const nameWithoutExt = parts.join('.');

            let counter = 1;
            while (usedFilenames.has(`${nameWithoutExt} (${counter}).${extension}`)) {
              counter++;
            }
            finalFilename = `${nameWithoutExt} (${counter}).${extension}`;
          }

          usedFilenames.add(finalFilename);
          zip.file(finalFilename, pdfBlob);
        }

        // Generate and return the ZIP as a blob
        return zip.generateAsync({ type: 'blob' });
      })
    );
  }
}
