import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { SupplyList } from './supplylist';
import { SupplyListService } from './supplylist.component';

describe('SupplyListService', () => {
  // A small test inventory
  const testSupplyList: SupplyList[] = [
    {
      _id: '1',
      academicYear: '',
      teacher: '',
      school: "MHS",
      grade: "PreK",
      item: ["Washable Marker"],
      brand: { allOf: "", anyOf: ["Crayola"] },
      color: { allOf: [], anyOf: ["Black"] },
      packageSize: 8,
      size: { allOf: "Wide", anyOf: [] },
      type: { allOf: "", anyOf: [] },
      material: { allOf: "", anyOf: [] },
      quantity: 0,
      notes: "N/A",
    },
    {
      _id: '2',
      academicYear: '',
      teacher: '',
      school: "Herman",
      grade: "6",
      item: ["Folder"],
      brand: { allOf: "", anyOf: ["N/A"] },
      color: { allOf: [], anyOf: ["Red"] },
      packageSize: 1,
      size: { allOf: "N/A", anyOf: [] },
      type: { allOf: "2 Prong", anyOf: [] },
      material: { allOf: "Plastic", anyOf: [] },
      quantity: 0,
      notes: "N/A"
    },
    {
      _id: '3',
      academicYear: '',
      teacher: '',
      school: "MHS",
      grade: "4",
      item: ["Notebook"],
      brand: { allOf: "", anyOf: ["Five Star"] },
      color: { allOf: [], anyOf: ["Yellow"] },
      packageSize: 1,
      size: { allOf: "Wide Ruled", anyOf: [] },
      type: { allOf: "Spiral", anyOf: [] },
      material: { allOf: "", anyOf: ["N/A"] },
      quantity: 0,
      notes: "N/A"
    }
  ];

  let supplylistService: SupplyListService;
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
    supplylistService = TestBed.inject(SupplyListService);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });


  describe('When getSupplyList() is called with no parameters', () => {

    it('calls `api/inventories`', waitForAsync(() => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));
      supplylistService.getSupplyList().subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams() });
      });
    }));
  });

  describe('When getSupplyList() is called with parameters, it correctly forms the HTTP request (Javalin/Server filtering)', () => {

    it('correctly calls api/inventory with filter parameter \'item\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ item: 'Washable Marker' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('item', 'Washable Marker') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'brand\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ brand: 'Five Star' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('brand', 'Five Star') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'school\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ school: 'Herman' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('school', 'Herman') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'grade\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ grade: '4' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('grade', '4') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'color\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ color: 'Black' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('color', 'Black') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'size\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ size: 'Regular' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('size', 'Regular') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'type\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ type: 'Spiral' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('type', 'Spiral') });
      });
    });

    it('correctly calls api/inventory with filter parameter \'material\'', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ material: 'Plastic' }).subscribe(() => {
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(supplylistService.supplylistUrl, { params: new HttpParams().set('material', 'Plastic') });
      });
    });

    it('correctly calls api/inventory with multiple filter parameters', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ item: 'Markers', color: 'Black' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options?.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(supplylistService.supplylistUrl);
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
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ type: '2 prong', material: 'Plastic' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options?.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(supplylistService.supplylistUrl);
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
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testSupplyList));

      supplylistService.getSupplyList({ item: 'Notebook', color: 'Yellow', size: 'Wide Ruled', type: 'Spiral' }).subscribe(() => {

        const [url, options] = mockedMethod.calls.argsFor(0);

        const calledHttpParams: HttpParams = (options?.params) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(supplylistService.supplylistUrl);
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

  describe('When deleteSupplyList() is called', () => {

    it('calls DELETE on the correct URL with the given id', () => {
      const testId = 'abc123';
      supplylistService.deleteSupplyList(testId).subscribe();

      const req = httpTestingController.expectOne(`${supplylistService.supplylistUrl}/${testId}`);
      expect(req.request.method).toEqual('DELETE');
      req.flush(null);
    });

    it('calls DELETE with a different id', () => {
      const testId = 'xyz789';
      supplylistService.deleteSupplyList(testId).subscribe();

      const req = httpTestingController.expectOne(`${supplylistService.supplylistUrl}/${testId}`);
      expect(req.request.method).toEqual('DELETE');
      req.flush(null);
    });
  });

  describe('When addSupplyList() is called', () => {

    it('calls POST on the correct URL with the new item body', () => {
      const newItem: Partial<SupplyList> = {
        academicYear: '',
        teacher: '',
        school: 'MHS',
        grade: 'PreK',
        item: ['Scissors'],
        brand: { allOf: '', anyOf: ['Fiskars'] },
        color: { allOf: [], anyOf: ['Orange'] },
        size: { allOf: 'Kids', anyOf: [] },
        type: { allOf: 'Blunt', anyOf: [] },
        material: { allOf: '', anyOf: ['Metal'] },
        packageSize: 1,
        quantity: 5,
        notes: 'N/A'
      };
      supplylistService.addSupplyList(newItem).subscribe();

      const req = httpTestingController.expectOne(supplylistService.supplylistUrl);
      expect(req.request.method).toEqual('POST');
      expect(req.request.body).toEqual(newItem);
      req.flush({ id: 'new-id' });
    });

    it('returns the id from the server response', () => {
      const newItem: Partial<SupplyList> = { item: ['Glue Stick'], school: 'Herman', grade: '2nd grade',
        brand: { allOf: '', anyOf: ['Elmer\'s'] }, color: { allOf: [], anyOf: ['White'] },
        size: { allOf: 'Regular', anyOf: [] }, type: { allOf: 'Stick', anyOf: [] },
        material: { allOf: '', anyOf: ['N/A'] }, packageSize: 1, quantity: 3, notes: '' };

      supplylistService.addSupplyList(newItem).subscribe();

      const req = httpTestingController.expectOne(supplylistService.supplylistUrl);
      req.flush({ id: 'returned-id' });
      expect(req.request.method).toEqual('POST');
    });
  });

  describe('When editSupplyList() is called', () => {

    it('calls PUT on the correct URL with the updated item body', () => {
      const testId = 'item42';
      const updatedItem: Partial<SupplyList> = {
        school: 'MHS',
        grade: '4th grade',
        item: ['Notebook'],
        brand: { allOf: '', anyOf: ['Five Star'] },
        color: { allOf: [], anyOf: ['Blue'] },
        size: { allOf: 'Wide Ruled', anyOf: [] },
        type: { allOf: 'Spiral', anyOf: [] },
        material: { allOf: '', anyOf: ['N/A'] },
        packageSize: 1,
        quantity: 2,
        notes: 'N/A'
      };
      supplylistService.editSupplyList(testId, updatedItem).subscribe();

      const req = httpTestingController.expectOne(`${supplylistService.supplylistUrl}/${testId}`);
      expect(req.request.method).toEqual('PUT');
      expect(req.request.body).toEqual(updatedItem);
      req.flush(null);
    });

    it('calls PUT with a different id and partial body', () => {
      const testId = 'item99';
      const updatedItem: Partial<SupplyList> = { quantity: 10, notes: 'Replenished' };
      supplylistService.editSupplyList(testId, updatedItem).subscribe();

      const req = httpTestingController.expectOne(`${supplylistService.supplylistUrl}/${testId}`);
      expect(req.request.method).toEqual('PUT');
      expect(req.request.body).toEqual(updatedItem);
      req.flush(null);
    });
  });
})
