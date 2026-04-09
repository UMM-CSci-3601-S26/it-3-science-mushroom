import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import { InventoryService } from './inventory.service';
import { Inventory } from './inventory';

describe('InventoryService', () => {
  let service: InventoryService;
  let httpMock: HttpTestingController;

  const itemA: Inventory = {
    internalID: '1',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['UPC-1'],
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    packageSize: 8,
    size: 'Large',
    type: 'School',
    material: 'Plastic',
    quantity: 5,
    notes: 'Keep sealed',
    maxQuantity: 20,
    minQuantity: 1,
    stockState: 'In Stock'
  };

  const itemB: Inventory = {
    internalID: '2',
    internalBarcode: 'ITEM-00002',
    externalBarcode: ['UPC-2'],
    item: 'Pencils',
    description: 'No. 2 pencils',
    brand: 'Ticonderoga',
    color: 'Yellow',
    packageSize: 12,
    size: 'Standard',
    type: 'Writing',
    material: 'Wood',
    quantity: 10,
    notes: 'Sharpened',
    maxQuantity: 30,
    minQuantity: 2,
    stockState: 'Low'
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        InventoryService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(InventoryService);
    httpMock = TestBed.inject(HttpTestingController);

    // constructor -> loadInventory()
    const initReq = httpMock.expectOne(service.inventoryUrl);
    expect(initReq.request.method).toBe('GET');
    initReq.flush([]);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should load inventory into the signal', () => {
    service.loadInventory();

    const req = httpMock.expectOne(service.inventoryUrl);
    expect(req.request.method).toBe('GET');

    req.flush([itemA, itemB]);

    expect(service.inventory()).toEqual([itemA, itemB]);
  });

  it('should pass filters through loadInventory/getInventory', () => {
    service.loadInventory({
      item: 'Markers',
      brand: 'Crayola',
      color: 'Blue',
      size: 'Large',
      type: 'School',
      material: 'Plastic'
    } as Inventory);

    const req = httpMock.expectOne(request =>
      request.url === service.inventoryUrl &&
      request.method === 'GET' &&
      request.params.get('item') === 'Markers' &&
      request.params.get('brand') === 'Crayola' &&
      request.params.get('color') === 'Blue' &&
      request.params.get('size') === 'Large' &&
      request.params.get('type') === 'School' &&
      request.params.get('material') === 'Plastic'
    );

    req.flush([itemA]);

    expect(service.inventory()).toEqual([itemA]);
  });

  it('should get inventory with no filters', () => {
    let response: Inventory[] | undefined;

    service.getInventory().subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(service.inventoryUrl);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().length).toBe(0);

    req.flush([itemA]);

    expect(response).toEqual([itemA]);
  });

  it('should look up an item by barcode', () => {
    let response: Inventory | undefined;

    service.lookUpByBarcode('UPC-1').subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(r => r.url.includes('/barcode/lookup/UPC-1'));
    expect(req.request.method).toBe('GET');

    req.flush(itemA);

    expect(response).toEqual(itemA);
  });

  it('should add an item manually', () => {
    let response: Inventory | undefined;

    service.addManually(itemA).subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(service.inventoryUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(itemA);

    req.flush(itemA);

    expect(response).toEqual(itemA);
  });

  it('should add inventory', () => {
    let response: Inventory | undefined;

    service.addInventory(itemB).subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(service.inventoryUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(itemB);

    req.flush(itemB);

    expect(response).toEqual(itemB);
  });

  it('should remove one item by identifier', () => {
    let response: Inventory | undefined;

    service.removeOne('1').subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(r => r.url.endsWith('/inventory/remove'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('id')).toBe('1');

    req.flush(itemA);

    expect(response).toEqual(itemA);
  });

  it('should update quantity with the default amount', () => {
    let response: Inventory | undefined;

    service.updateQuantity('ITEM-00001', 'add').subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(r => r.url.includes('/ITEM-00001/quantity'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'add', amount: 1 });

    req.flush(itemA);

    expect(response).toEqual(itemA);
  });

  it('should update quantity with a custom amount', () => {
    let response: Inventory | undefined;

    service.updateQuantity('ITEM-00001', 'remove', 4).subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(r => r.url.includes('/ITEM-00001/quantity'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ action: 'remove', amount: 4 });

    req.flush({ ...itemA, quantity: 1 });

    expect(response?.quantity).toBe(1);
  });

  it('should link an external barcode', () => {
    let response: Inventory | undefined;

    service.linkExternalBarcode('1', 'UPC-NEW', 3).subscribe(data => {
      response = data;
    });

    const req = httpMock.expectOne(r => r.url.includes('/1/link-barcode'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ barcode: 'UPC-NEW', quantity: 3 });

    req.flush({
      ...itemA,
      externalBarcode: ['UPC-1', 'UPC-NEW']
    });

    expect(response?.externalBarcode).toEqual(['UPC-1', 'UPC-NEW']);
  });

  it('should remove inventory by internal ID', () => {
    service.removeInventoryById('ID-0001', 3).subscribe();

    const removeReq = httpMock.expectOne(`${service.inventoryUrl}/remove`);
    expect(removeReq.request.method).toBe('POST');
    removeReq.flush({});

    const refreshReq = httpMock.expectOne(`${service.inventoryUrl}`);
    expect(refreshReq.request.method).toBe('GET');
    refreshReq.flush([]);
  });

  it('should remove an item from the signal when quantity becomes zero', () => {
    service.inventory.set([itemA, itemB]);

    service.removeOneAndUpdate('1');

    const req = httpMock.expectOne(r => r.url.endsWith('/inventory/remove'));
    expect(req.request.method).toBe('DELETE');
    expect(req.request.params.get('id')).toBe('1');

    req.flush({ ...itemA, quantity: 0 });

    expect(service.inventory()).toEqual([itemB]);
  });

  it('should update an existing item in the signal when quantity stays above zero', () => {
    service.inventory.set([itemA, itemB]);

    service.removeOneAndUpdate('1');

    const req = httpMock.expectOne(r => r.url.endsWith('/inventory/remove'));
    expect(req.request.method).toBe('DELETE');

    req.flush({ ...itemA, quantity: 2, notes: 'Updated' });

    expect(service.inventory()[0].quantity).toBe(2);
    expect(service.inventory()[0].notes).toBe('Updated');
    expect(service.inventory().length).toBe(2);
  });

  it('should add the item to the signal when syncing an item not already present', () => {
    service.inventory.set([itemA]);

    service.removeOneAndUpdate('2');

    const req = httpMock.expectOne(r => r.url.endsWith('/inventory/remove'));
    expect(req.request.method).toBe('DELETE');

    req.flush(itemB);

    expect(service.inventory().length).toBe(2);
    expect(service.inventory()).toContain(itemB);
  });

  it('should build unique string options and ignore blank strings', () => {
    const options = service.optionBuilder(
      [
        itemA,
        itemB,
        { ...itemB, internalID: '3', brand: 'Ticonderoga' },
        { ...itemA, internalID: '4', brand: '' }
      ],
      'brand'
    );

    expect(options).toEqual([
      { label: 'Crayola', value: 'Crayola' },
      { label: 'Ticonderoga', value: 'Ticonderoga' }
    ]);
  });

  it('should return no options for a non-string field', () => {
    const options = service.optionBuilder([itemA, itemB], 'quantity');

    expect(options).toEqual([]);
  });

  it('should compute all option signals from inventory data', () => {
    service.inventory.set([itemA, itemB]);

    expect(service.itemOptions()).toEqual([
      { label: 'Markers', value: 'Markers' },
      { label: 'Pencils', value: 'Pencils' }
    ]);

    expect(service.brandOptions()).toEqual([
      { label: 'Crayola', value: 'Crayola' },
      { label: 'Ticonderoga', value: 'Ticonderoga' }
    ]);

    expect(service.colorOptions()).toEqual([
      { label: 'Blue', value: 'Blue' },
      { label: 'Yellow', value: 'Yellow' }
    ]);

    expect(service.sizeOptions()).toEqual([
      { label: 'Large', value: 'Large' },
      { label: 'Standard', value: 'Standard' }
    ]);

    expect(service.typeOptions()).toEqual([
      { label: 'School', value: 'School' },
      { label: 'Writing', value: 'Writing' }
    ]);

    expect(service.materialOptions()).toEqual([
      { label: 'Plastic', value: 'Plastic' },
      { label: 'Wood', value: 'Wood' }
    ]);
  });
});
