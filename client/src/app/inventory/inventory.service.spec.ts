import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { Inventory } from './inventory';
import { InventoryService } from './inventory.service';

describe('InventoryService', () => {
  // A small test inventory
  const testInventory: Inventory[] = [
    {
      item: "Markers",
      description: "8 Pack of Washable Wide Markers",
      brand: "Crayola",
      color: "Black",
      count: 8,
      size: "Wide",
      type: "Washable",
      material: "N/A",
      quantity: 0,
      notes: "N/A"
    },
    {
      item: "Folder",
      description: "Red 2 Prong Plastic Pocket Folder",
      brand: "N/A",
      color: "Red",
      count: 1,
      size: "N/A",
      type: "2 Prong",
      material: "Plastic",
      quantity: 0,
      notes: "N/A"
    },
    {
      item: "Notebook",
      description: "Yellow Wide Ruled Spiral Notebook",
      brand: "N/A",
      color: "Yellow",
      count: 1,
      size: "Wide Ruled",
      type: "Spiral",
      material: "N/A",
      quantity: 0,
      notes: "N/A"
    }
  ];

  let inventoryService: InventoryService;
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    // Set up the mock handling of the HTTP requests
    TestBed.configureTestingModule({
      imports: [],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    // Construct an instance of the service with the mock
    // HTTP client.
    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
    inventoryService = TestBed.inject(InventoryService);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });


  describe('When getInventory() is called with no parameters', () => {

    it('calls `api/inventories`', waitForAsync(() => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));
      inventoryService.getInventory().subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams() });
      });
    }));
  });

  describe('When getInventory() is called with parameters, it correctly forms the HTTP request (Javalin/Server filtering)', () => {

    it('correctly calls api/inventory with filter parameter \'item\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ item: 'Markers' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('item', 'Markers') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'brand\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ brand: 'Crayola' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('brand', 'Crayola') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'color\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ color: 'Black' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('color', 'Black') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'size\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ size: 'Regular' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('size', 'Regular') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'type\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ type: 'Spiral' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('type', 'Spiral') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'material\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ material: 'Plastic' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(inventoryService.inventoryUrl, { params: new HttpParams().set('material', 'Plastic') });
      });
    });

    it('correctly calls api/inventory with multiple filter parameters', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ item: 'Markers', color: 'Black' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(inventoryService.inventoryUrl);
        expect(calledHttpParams.keys().length)
          .withContext('should have 2 params')
          .toEqual(2);
        expect(calledHttpParams.get('item'))
          .withContext('item being Markers')
          .toEqual('Markers');
        expect(calledHttpParams.get('color'))
          .withContext('color being Black')
          .toEqual('Black');
      });
    });

    it('correctly calls api/inventory with multiple filter parameters', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ type: '2 prong', material: 'Plastic' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(inventoryService.inventoryUrl);
        expect(calledHttpParams.keys().length)
          .withContext('should have 2 params')
          .toEqual(2);
        expect(calledHttpParams.get('type'))
          .withContext('type being 2 prong')
          .toEqual('2 prong');
        expect(calledHttpParams.get('material'))
          .withContext('material being Plastic')
          .toEqual('Plastic');
      });
    });

    it('correctly calls api/inventory with multiple filter parameters', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testInventory));

      inventoryService.getInventory({ item: 'Notebook', color: 'Yellow', size: 'Wide Ruled', type: 'Spiral' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(inventoryService.inventoryUrl);
        expect(calledHttpParams.keys().length)
          .withContext('should have 4 params')
          .toEqual(4);
        expect(calledHttpParams.get('item'))
          .withContext('item being Notebook')
          .toEqual('Notebook');
        expect(calledHttpParams.get('color'))
          .withContext('color being Yellow')
          .toEqual('Yellow');
        expect(calledHttpParams.get('size'))
          .withContext('size being Wide Ruled')
          .toEqual('Wide Ruled');
        expect(calledHttpParams.get('type'))
          .withContext('type being Spiral')
          .toEqual('Spiral');
      });
    });
  });
})
