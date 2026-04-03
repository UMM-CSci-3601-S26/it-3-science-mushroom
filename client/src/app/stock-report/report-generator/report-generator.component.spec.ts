/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {  provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ReportGeneratorComponent } from './report-generator.component';
import { StockReportService } from '../stock-report.service';
import { InventoryService } from '../../inventory/inventory.service';
import { of } from 'rxjs';
import { Inventory } from '../../inventory/inventory';
import { StockReport } from '../stock-report';

describe('ReportGeneratorComponent', () => {
  let component: ReportGeneratorComponent;
  let fixture: ComponentFixture<ReportGeneratorComponent>;
  let stockReportService: StockReportService;
  let inventoryService: InventoryService;

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
        InventoryService
      ]
    }).compileComponents();

    stockReportService = TestBed.inject(StockReportService);
    inventoryService = TestBed.inject(InventoryService);

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
      expect(stockedItems[0]).toEqual(['Stocked Shirt', 10, 10, 0]);
    });

    it('should filter out of stock items correctly', () => {
      const outOfStockItems = component.outOfStockItems();
      expect(outOfStockItems.length).toBe(1);
      expect(outOfStockItems[0]).toEqual(['Out of Stock Pants', 0, 10, 7]);
    });

    it('should filter overstocked items correctly', () => {
      const overstockedItems = component.overstockedItems();
      expect(overstockedItems.length).toBe(1);
      expect(overstockedItems[0]).toEqual(['Overstocked Shirt', 12, 10, 0]);
    });

    it('should filter understocked items correctly', () => {
      const understockedItems = component.understockedItems();
      expect(understockedItems.length).toBe(1);
      expect(understockedItems[0]).toEqual(['Understocked Pants', 5, 10, 7]);
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
      component.savePdfReport();

      expect(addNewReportSpy).toHaveBeenCalled();
      expect(addNewReportSpy).toHaveBeenCalledWith(jasmine.any(FormData));
    });
  });

  describe('Server Downloading', () => {
    it('should convert base64 to blob correctly', () => {
      const base64String = 'SGVsbG8h'; // Base64 for "Hello!"
      const blob = component.convertBase64ToBlob(base64String);

      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/pdf');
    });

    it('should properly convert blob to URL and trigger download', () => {
      const base64String = 'SGVsbG8h'; // Base64 for "Hello!"
      const blob = component.convertBase64ToBlob(base64String);
      const url = URL.createObjectURL(blob);

      spyOn(document, 'createElement').and.callThrough();
      spyOn(document.body, 'appendChild').and.callThrough();
      spyOn(document.body, 'removeChild').and.callThrough();

      component.downloadSinglePdfReport({ reportName: 'Test Report' });

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(document.body.appendChild).toHaveBeenCalled();
      expect(document.body.removeChild).toHaveBeenCalled();
    });

    it('should call deleteReport when deleting a single PDF report', () => {
      // Spy on deleteReport and mock its return value
      const deleteReportSpy = spyOn(stockReportService, 'deleteReport').and.returnValue(of(void 0));
      // Make a mock report to delete
      const mockReport: StockReport = { _id: '1', reportName: 'Test Report' };
      component.deleteSinglePdfReport(mockReport);

      expect(deleteReportSpy).toHaveBeenCalledWith('1');
    });

    it('should call deleteReport for each report when deleting all PDF reports', () => {
      // Spy on deleteReport and mock its return value
      const deleteReportSpy = spyOn(stockReportService, 'deleteReport').and.returnValue(of(void 0));
      // Make mock reports to delete
      const mockReports: StockReport[] = [
        { _id: '1', reportName: 'Test Report 1' },
        { _id: '2', reportName: 'Test Report 2' }
      ];

      component.deleteAllReports();

      expect(deleteReportSpy).toHaveBeenCalledTimes(2);
      expect(deleteReportSpy).toHaveBeenCalledWith('1');
      expect(deleteReportSpy).toHaveBeenCalledWith('2');
    });

  });
});
