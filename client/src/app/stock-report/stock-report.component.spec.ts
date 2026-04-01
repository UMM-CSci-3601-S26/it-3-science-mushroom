
// Angular Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';

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

  const mockInventory: Inventory[] = [
    { item: 'Shirt', description: 'Stocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', count: 1, quantity: 10, maxQuantity: 10, minQuantity: 0, stockState: "Stocked", notes: '' },
    { item: 'Pants', description: 'Understocked Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', count: 2, quantity: 5, maxQuantity: 10, minQuantity: 7, stockState: "Under-Stocked", notes: '' },
    { item: 'Shirt', description: 'Overstocked Shirt', brand: 'Nike', color: 'Red', size: 'M', type: 'Top', material: 'Cotton', count: 1, quantity: 12, maxQuantity: 10, minQuantity: 0, stockState: "Over-Stocked", notes: '' },
    { item: 'Pants', description: 'Out of Stock Pants', brand: 'Adidas', color: 'Blue', size: 'L', type: 'Bottom', material: 'Polyester', count: 2, quantity: 0, maxQuantity: 10, minQuantity: 7, stockState: "Out of Stock", notes: '' },
  ];

  const mockReports: StockReport[] = [
    { _id: '1', stockReportPDF: 'pdfdata1', reportName: 'Report 1' },
    { _id: '2', stockReportPDF: 'pdfdata2', reportName: 'Report 2' },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StockReportComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        StockReportService,
        InventoryService
      ]
    }).compileComponents();

    inventoryService = TestBed.inject(InventoryService);
    stockReportService = TestBed.inject(StockReportService);

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
      expect(stockedItems[0]).toEqual({
        description: 'Stocked Shirt',
        children: [
          { quantity: 10, label: '- Current Quantity' },
          { maxQuantity: 10, label: '- Max Quantity' },
          { minQuantity: 0, label: '- Min Quantity' },
        ]
      });
    });

    it('should properly compute out of stock items', () => {
      const outOfStockitems = component.outOfStockItems();
      expect(outOfStockitems.length).toBe(1);
      expect(outOfStockitems[0]).toEqual({
        description: 'Out of Stock Pants',
        children: [
          { quantity: 0, label: '- Current Quantity' },
          { maxQuantity: 10, label: '- Max Quantity' },
          { minQuantity: 7, label: '- Min Quantity' },
        ]
      });
    });

    it('should properly compute overstocked items', () => {
      const overStockedItems = component.overStockedItems();
      expect(overStockedItems.length).toBe(1);
      expect(overStockedItems[0]).toEqual({
        description: 'Overstocked Shirt',
        children: [
          { quantity: 12, label: '- Current Quantity' },
          { maxQuantity: 10, label: '- Max Quantity' },
          { minQuantity: 0, label: '- Min Quantity' },
        ]
      });
    });

    it('should properly compute understocked items', () => {
      const underStockedItems = component.underStockedItems();
      expect(underStockedItems.length).toBe(1);
      expect(underStockedItems[0]).toEqual({
        description: 'Understocked Pants',
        children: [
          { quantity: 5, label: '- Current Quantity' },
          { maxQuantity: 10, label: '- Max Quantity' },
          { minQuantity: 7, label: '- Min Quantity' },
        ]
      });
    });
  });

  describe('Download Single Report', () => {
    it('should load reports data', () => {
      expect(component.reports()).toEqual(mockReports);
    });

    it('should call downloadSingleReport with the correct report', () => {
      const mockReport: StockReport = { _id: '1', stockReportPDF: 'pdfdata', reportName: 'Report 1' };
      spyOn(component.reportGenerator, 'downloadSinglePdfReport');
      component.downloadSingleReport(mockReport);
      expect(component.reportGenerator.downloadSinglePdfReport).toHaveBeenCalledWith(mockReport);
    });
  });
});
