import { TestBed } from '@angular/core/testing';

import { InventoryIndex } from '../inventory/inventory-index';
import { Inventory } from '../inventory/inventory';
import { ScanService } from './scan-service';

describe('ScanService', () => {
  let service: ScanService;
  let inventoryIndexSpy: jasmine.SpyObj<InventoryIndex>;

  const testItem: Inventory = {
    internalID: 'inv-1',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['UPC-1'],
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    packageSize: 8,
    size: 'Wide',
    type: 'Washable',
    material: 'Plastic',
    quantity: 4,
    notes: 'test',
    maxQuantity: 10,
    minQuantity: 1,
    stockState: 'stocked'
  };

  beforeEach(() => {
    inventoryIndexSpy = jasmine.createSpyObj<InventoryIndex>('InventoryIndex', ['getByBarcode']);

    TestBed.configureTestingModule({
      providers: [
        ScanService,
        { provide: InventoryIndex, useValue: inventoryIndexSpy }
      ]
    });

    service = TestBed.inject(ScanService);
  });

  it('normalizes barcode input by trimming, uppercasing, and removing invalid characters', () => {
    expect(service.normalizeBarcode('  ab-12 @#$ cd  ')).toBe('AB-12CD');
  });

  it('returns FOUND when the barcode exists in the inventory index', () => {
    inventoryIndexSpy.getByBarcode.and.returnValue(testItem);

    const result = service.scan({ barcode: 'ITEM-00001' });

    expect(inventoryIndexSpy.getByBarcode).toHaveBeenCalledWith('ITEM-00001');
    expect(result).toEqual({
      status: 'FOUND',
      item: testItem
    });
  });

  it('returns NOT_FOUND and echoes the barcode when nothing matches', () => {
    inventoryIndexSpy.getByBarcode.and.returnValue(null);

    const result = service.scan({ barcode: 'missing-code' });

    expect(result).toEqual({
      status: 'NOT_FOUND',
      barcode: 'missing-code'
    });
  });
});
