/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';

import { ReportGeneratorComponent } from './report-generator.component';
import { StockReportService } from '../stock-report.service';
import { InventoryService } from '../../inventory/inventory.service';
import { of, throwError } from 'rxjs';
import { Inventory } from '../../inventory/inventory';
import { StockReport } from '../stock-report';

describe('ReportGeneratorComponent', () => {
  let component: ReportGeneratorComponent;
  let fixture: ComponentFixture<ReportGeneratorComponent>;
  let stockReportService: StockReportService;
  let inventoryService: InventoryService;
  let matSnackBar: MatSnackBar;
  let matDialog: MatDialog;

  const mockInventory: Inventory[] = [
    { item: 'Shirt', description: 'Stocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', count: 1, quantity: 10, maxQuantity: 10, minQuantity: 0, stockState: "Stocked", notes: '' },
    { item: 'Pants', description: 'Understocked Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', count: 2, quantity: 5, maxQuantity: 10, minQuantity: 7, stockState: "Under-Stocked", notes: '' },
    { item: 'Shirt', description: 'Overstocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', count: 1, quantity: 12, maxQuantity: 10, minQuantity: 0, stockState: "Over-Stocked", notes: '' },
    { item: 'Pants', description: 'Out of Stock Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', count: 2, quantity: 0, maxQuantity: 10, minQuantity: 7, stockState: "Out of Stock", notes: '' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportGeneratorComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockReportService,
        InventoryService,
        MatSnackBar,
        MatDialog
      ]
    }).compileComponents();

    stockReportService = TestBed.inject(StockReportService);
    inventoryService = TestBed.inject(InventoryService);
    matSnackBar = TestBed.inject(MatSnackBar);
    matDialog = TestBed.inject(MatDialog);

    // Mock the inventory service
    spyOn(inventoryService, 'getInventory').and.returnValue(of(mockInventory));

    fixture = TestBed.createComponent(ReportGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Inventory Signals', () => {
    it('should load inventory data', () => {
      expect(component.inventory()).toEqual(mockInventory);
    });

    it('should filter stocked items correctly', () => {
      const stockedItems = component.stockedItems();
      expect(stockedItems.length).toBe(1);
      expect(stockedItems[0]).toEqual(['Stocked Shirt', 10, 10, 0, '']);
    });

    it('should filter out of stock items correctly', () => {
      const outOfStockItems = component.outOfStockItems();
      expect(outOfStockItems.length).toBe(1);
      expect(outOfStockItems[0]).toEqual(['Out of Stock Pants', 0, 10, 7, '']);
    });

    it('should filter overstocked items correctly', () => {
      const overstockedItems = component.overstockedItems();
      expect(overstockedItems.length).toBe(1);
      expect(overstockedItems[0]).toEqual(['Overstocked Shirt', 12, 10, 0, '']);
    });

    it('should filter understocked items correctly', () => {
      const understockedItems = component.understockedItems();
      expect(understockedItems.length).toBe(1);
      expect(understockedItems[0]).toEqual(['Understocked Pants', 5, 10, 7, '']);
    });
  });

  describe('Date and Time Formatting', () => {
    it('should format AM times correctly', () => {
      const testDate = new Date(2026, 3, 5, 9, 30); // April 5, 2026 at 9:30 AM
      const result = (component as any).formatDateTime(testDate);
      expect(result).toBe('4-5-2026_9:30 AM');
    });

    it('should format PM times correctly (not noon or midnight)', () => {
      const testDate = new Date(2026, 3, 5, 14, 45); // April 5, 2026 at 2:45 PM
      const result = (component as any).formatDateTime(testDate);
      expect(result).toBe('4-5-2026_2:45 PM');
    });

    it('should format noon correctly', () => {
      const testDate = new Date(2026, 3, 5, 12, 0); // April 5, 2026 at 12:00 PM (noon)
      const result = (component as any).formatDateTime(testDate);
      expect(result).toBe('4-5-2026_12:00 PM');
    });

    it('should format midnight correctly', () => {
      const testDate = new Date(2026, 3, 5, 0, 15); // April 5, 2026 at 12:15 AM (midnight)
      const result = (component as any).formatDateTime(testDate);
      expect(result).toBe('4-5-2026_12:15 AM');
    });

    it('should add leading zero to minutes less than 10', () => {
      const testDate = new Date(2026, 3, 5, 3, 5); // April 5, 2026 at 3:05 AM
      const result = (component as any).formatDateTime(testDate);
      expect(result).toBe('4-5-2026_3:05 AM');
    });

    it('should handle month correctly (accounting for zero-indexing)', () => {
      const testDate = new Date(2026, 0, 15, 10, 30); // January 15, 2026
      const result = (component as any).formatDateTime(testDate);
      expect(result).toContain('1-15-2026');
    });
  });

  describe('PDF Generation', () => {
    it('should download PDF when savePdf is false', () => {
      spyOn(component as any, 'generatePDF').and.callThrough();
      component.downloadNewPdfReport();
      expect((component as any).generatePDF).toHaveBeenCalledWith(false);
    });

    it('should save PDF when savePdf is true', () => {
      spyOn(component as any, 'generatePDF').and.callThrough();
      component.savePdfReport();
      expect((component as any).generatePDF).toHaveBeenCalledWith(true);
    });

    it('should call addNewReport when saving PDF to server', () => {
      const addNewReportSpy = spyOn(stockReportService, 'addNewReport').and.returnValue(of('123'));
      spyOn(matSnackBar, 'open');

      component.savePdfReport();

      expect(addNewReportSpy).toHaveBeenCalled();
      expect(addNewReportSpy).toHaveBeenCalledWith(jasmine.any(FormData));
    });

    it('should show error snackbar when saving PDF to server fails', () => {
      const addNewReportSpy = spyOn(stockReportService, 'addNewReport').and.returnValue(
        throwError(() => new Error('Server error'))
      );
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.savePdfReport();

      expect(addNewReportSpy).toHaveBeenCalled();
      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Error generating / saving report'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show success snackbar when PDF is saved to server', () => {
      spyOn(stockReportService, 'addNewReport').and.returnValue(of('123'));
      spyOn(stockReportService, 'refreshReports').and.returnValue(of([]));
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.savePdfReport();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Generating and downloading report'),
        'Okay',
        { duration: 2000 }
      );
    });
  });

  describe('Single Report Download', () => {
    it('should download single PDF report correctly', () => {
      const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });
      const mockReport: StockReport = { _id: '1', reportName: 'Test Report.pdf', stockReportPDF: 'base64data' };

      spyOn(stockReportService, 'downloadSingleReportBlob').and.returnValue(of(mockBlob));
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');

      component.downloadSinglePdfReport(mockReport);

      expect(stockReportService.downloadSingleReportBlob).toHaveBeenCalledWith(mockReport);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should show error snackbar when single report download fails', () => {
      const mockReport: StockReport = { _id: '1', reportName: 'Test Report.pdf', stockReportPDF: 'base64data' };

      spyOn(stockReportService, 'downloadSingleReportBlob').and.returnValue(
        throwError(() => new Error('Download error'))
      );
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.downloadSinglePdfReport(mockReport);

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Error downloading report'),
        'Okay',
        { duration: 2000 }
      );
    });
  });

  describe('All Reports Download', () => {
    it('should download all reports as ZIP correctly', () => {
      const mockZipBlob = new Blob(['ZIP content'], { type: 'application/zip' });

      spyOn(stockReportService, 'downloadAllReportsAsZip').and.returnValue(of(mockZipBlob));
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:mock-url');
      spyOn(window.URL, 'revokeObjectURL');
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.downloadAllPdfReports();

      expect(stockReportService.downloadAllReportsAsZip).toHaveBeenCalled();
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(mockZipBlob);
      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Downloaded all report'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show message when no reports available for download', () => {
      const emptyBlob = new Blob([], { type: 'application/zip' });

      spyOn(stockReportService, 'downloadAllReportsAsZip').and.returnValue(of(emptyBlob));
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.downloadAllPdfReports();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('No reports available'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show error snackbar when all reports download fails', () => {
      spyOn(stockReportService, 'downloadAllReportsAsZip').and.returnValue(
        throwError(() => new Error('Download error'))
      );
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.downloadAllPdfReports();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Failed to download PDF'),
        'Okay',
        { duration: 2000 }
      );
    });
  });

  describe('Delete Operations', () => {
    it('should delete single PDF report successfully', () => {
      const mockReport: StockReport = { _id: '1', reportName: 'Test Report', stockReportPDF: 'base64data' };
      const deleteSpy = spyOn(stockReportService, 'deleteSingleReport').and.returnValue(of(void 0));
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteSinglePdfReport(mockReport);

      expect(deleteSpy).toHaveBeenCalledWith(mockReport);
      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('deleted successfully'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show error snackbar when single report deletion fails', () => {
      const mockReport: StockReport = { _id: '1', reportName: 'Test Report', stockReportPDF: 'base64data' };

      spyOn(stockReportService, 'deleteSingleReport').and.returnValue(
        throwError(() => new Error('Delete error'))
      );
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteSinglePdfReport(mockReport);

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Error deleting report'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should delete all reports after user confirmation', () => {
      const mockReports: StockReport[] = [
        { _id: '1', reportName: 'Report 1', stockReportPDF: 'base64data' },
        { _id: '2', reportName: 'Report 2', stockReportPDF: 'base64data' }
      ];

      spyOn(stockReportService, 'getReports').and.returnValue(of(mockReports));
      const deleteAllSpy = spyOn(stockReportService, 'deleteAllReports').and.returnValue(of(void 0));
      const dialogSpy = spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as any);
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteAllReports();

      expect(dialogSpy).toHaveBeenCalled();
      expect(deleteAllSpy).toHaveBeenCalledWith(mockReports);
      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('2 report(s) deleted successfully'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should not delete all reports if user cancels dialog', () => {
      const mockReports: StockReport[] = [
        { _id: '1', reportName: 'Report 1', stockReportPDF: 'base64data' }
      ];

      spyOn(stockReportService, 'getReports').and.returnValue(of(mockReports));
      const deleteAllSpy = spyOn(stockReportService, 'deleteAllReports').and.returnValue(of(void 0));
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(false)
      } as any);

      component.deleteAllReports();

      expect(deleteAllSpy).not.toHaveBeenCalled();
    });

    it('should show message when no reports available for deletion', () => {
      spyOn(stockReportService, 'getReports').and.returnValue(of([]));
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteAllReports();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('no reports available'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show error message when deleting all reports fails', () => {
      const mockReports: StockReport[] = [
        { _id: '1', reportName: 'Report 1', stockReportPDF: 'base64data' }
      ];

      spyOn(stockReportService, 'getReports').and.returnValue(of(mockReports));
      spyOn(stockReportService, 'deleteAllReports').and.returnValue(
        throwError(() => new Error('Delete error'))
      );
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as any);
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteAllReports();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Error deleting reports'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should show error message when fetching reports for deletion fails', () => {
      spyOn(stockReportService, 'getReports').and.returnValue(
        throwError(() => new Error('Fetch error'))
      );
      const snackBarSpy = spyOn(matSnackBar, 'open');

      component.deleteAllReports();

      expect(snackBarSpy).toHaveBeenCalledWith(
        jasmine.stringContaining('Error fetching reports'),
        'Okay',
        { duration: 2000 }
      );
    });
  });
});
