// Angular Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

// RxJS Imports
import { of } from 'rxjs';

// Stock Report Imports
import { StockReport } from './stock-report';
import { StockReportService } from './stock-report.service';
import { StockReportComponent } from './stock-report.component';

// Inventory Imports
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';

describe('StockReportComponent', () => {
  let component: StockReportComponent;
  let fixture: ComponentFixture<StockReportComponent>;
  let inventoryService: InventoryService;
  let stockReportService: StockReportService;
  let matDialog: MatDialog;
  let matSnackBar: MatSnackBar;

  // Mock Inventory
  const mockInventory: Inventory[] = [
    { internalID: "1", internalBarcode: "ITEM-00001", item: 'Shirt', description: 'Stocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', packageSize: 1, quantity: 10, maxQuantity: 10, minQuantity: 0, stockState: "Stocked", notes: '' },
    { internalID: "2", internalBarcode: "ITEM-00002", item: 'Pants', description: 'Understocked Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', packageSize: 2, quantity: 5, maxQuantity: 10, minQuantity: 7, stockState: "Understocked", notes: '' },
    { internalID: "3", internalBarcode: "ITEM-00003", item: 'Shirt', description: 'Overstocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', packageSize: 1, quantity: 12, maxQuantity: 10, minQuantity: 0, stockState: "Overstocked", notes: '' },
    { internalID: "4", internalBarcode: "ITEM-00004", item: 'Pants', description: 'Out of Stock Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', packageSize: 2, quantity: 0, maxQuantity: 10, minQuantity: 7, stockState: "Out of Stock", notes: '' },
  ];

  // Mock Reports
  const mockReports: StockReport[] = [
    { _id: '1', reportType: 'PDF', reportData: 'pdfdata1', reportName: 'Report 1' },
    { _id: '2', reportType: 'PDF', reportData: 'pdfdata2', reportName: 'Report 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockReportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockReportService,
        InventoryService,
        MatDialog,
        MatSnackBar
      ]
    }).compileComponents();

    // Service and dependency injection
    inventoryService = TestBed.inject(InventoryService);
    stockReportService = TestBed.inject(StockReportService);
    matDialog = TestBed.inject(MatDialog);
    matSnackBar = TestBed.inject(MatSnackBar);

    // Mock the inventory service
    spyOn(inventoryService, 'getInventory').and.returnValue(of(mockInventory));

    // Mock the stock report service
    spyOn(stockReportService, 'getReports').and.returnValue(of(mockReports));

    fixture = TestBed.createComponent(StockReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('StockNode Conversions', () => {
    it('should load inventory data', () => {
      expect(component.inventory()).toEqual(mockInventory);
    });

    it('should properly compute stocked items', () => {
      const stockedItems = component.stockedItems();
      expect(stockedItems.length).toBe(1);
      expect(stockedItems[0].item).toEqual('Shirt');
      expect(stockedItems[0].children?.length).toBe(1);
      expect(stockedItems[0].children?.[0].description).toEqual('Stocked Shirt');
      expect(stockedItems[0].children?.[0].children?.length).toBe(3);
    });

    it('should properly compute out of stock items', () => {
      const outOfStockItems = component.outOfStockItems();
      expect(outOfStockItems.length).toBe(1);
      expect(outOfStockItems[0].item).toEqual('Pants');
      expect(outOfStockItems[0].children?.length).toBe(1);
      expect(outOfStockItems[0].children?.[0].description).toEqual('Out of Stock Pants');
      expect(outOfStockItems[0].children?.[0].children?.length).toBe(3);
    });

    it('should properly compute overstocked items', () => {
      const overStockedItems = component.overStockedItems();
      expect(overStockedItems.length).toBe(1);
      expect(overStockedItems[0].item).toEqual('Shirt');
      expect(overStockedItems[0].children?.length).toBe(1);
      expect(overStockedItems[0].children?.[0].description).toEqual('Overstocked Shirt');
      expect(overStockedItems[0].children?.[0].children?.length).toBe(3);
    });

    it('should properly compute understocked items', () => {
      const underStockedItems = component.underStockedItems();
      expect(underStockedItems.length).toBe(1);
      expect(underStockedItems[0].item).toEqual('Pants');
      expect(underStockedItems[0].children?.length).toBe(1);
      expect(underStockedItems[0].children?.[0].description).toEqual('Understocked Pants');
      expect(underStockedItems[0].children?.[0].children?.length).toBe(3);
    });
  });

  describe('Download Single Report', () => {
    it('should load reports data', () => {
      expect(component.reports()).toEqual(mockReports);
    });

    it('should call downloadSingleReport with the correct report', () => {
      const mockReport: StockReport = { _id: '1', reportType: 'PDF', reportData: 'pdfdata', reportName: 'Report 1' };
      spyOn(component.reportGenerator, 'downloadSinglePdfReport');
      component.downloadSingleReport(mockReport);
      expect(component.reportGenerator.downloadSinglePdfReport).toHaveBeenCalledWith(mockReport);
    });
  });

  describe('Delete Single Report', () => {
    it('should open dialog with correct data when deleting a report', () => {
      const mockReport: StockReport = { _id: '1', reportType: 'PDF', reportData: 'pdfdata', reportName: 'Test Report' };
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(false)
      } as MatDialogRef<unknown>);

      component.deleteSingleReport(mockReport);

      expect(matDialog.open).toHaveBeenCalledWith(
        jasmine.anything(),
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            reportName: 'Test Report',
            message: jasmine.stringContaining('Test Report')
          })
        })
      );
    });

    it('should delete report when user confirms in dialog', () => {
      const mockReport: StockReport = { _id: '1', reportType: 'PDF', reportData: 'pdfdata', reportName: 'Test Report' };
      spyOn(component.reportGenerator, 'deleteSinglePdfReport');
      spyOn(stockReportService, 'refreshReports').and.returnValue(of([]));
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);
      spyOn(matSnackBar, 'open');

      component.deleteSingleReport(mockReport);

      expect(component.reportGenerator.deleteSinglePdfReport).toHaveBeenCalledWith(mockReport);
      expect(matSnackBar.open).toHaveBeenCalledWith(
        jasmine.stringContaining('Deleting report Test Report...'),
        'Okay',
        { duration: 2000 }
      );
    });

    it('should not delete report when user cancels dialog', () => {
      const mockReport: StockReport = { _id: '1', reportType: 'PDF', reportData: 'pdfdata', reportName: 'Test Report' };
      spyOn(component.reportGenerator, 'deleteSinglePdfReport');
      spyOn(stockReportService, 'refreshReports').and.returnValue(of([]));
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(false)
      } as MatDialogRef<unknown>);
      spyOn(matSnackBar, 'open');

      component.deleteSingleReport(mockReport);

      expect(component.reportGenerator.deleteSinglePdfReport).not.toHaveBeenCalled();
      expect(stockReportService.refreshReports).not.toHaveBeenCalled();
      expect(matSnackBar.open).not.toHaveBeenCalled();
    });

    it('should return early if reportGenerator is not defined', () => {
      const mockReport: StockReport = { _id: '1', reportType: 'PDF', reportData: 'pdfdata', reportName: 'Test Report' };
      component.reportGenerator = undefined;
      spyOn(stockReportService, 'refreshReports').and.returnValue(of([]));
      spyOn(matDialog, 'open').and.returnValue({
        afterClosed: () => of(true)
      } as MatDialogRef<unknown>);
      spyOn(matSnackBar, 'open');

      component.deleteSingleReport(mockReport);

      expect(stockReportService.refreshReports).not.toHaveBeenCalled();
      expect(matSnackBar.open).not.toHaveBeenCalled();
    });
  });
});
