// Angular Imports
import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http'; //HttpParams
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';

// RxJS Imports
import { map, of } from 'rxjs';

// StockReport Imports
import { StockReport } from './stock-report';
import { StockReportService } from './stock-report.service';

describe('StockReportService', () => {
  // A small collection of test reports
  const testReports: StockReport[] = [
    {
      _id: 'john_id',
      reportData: 'SGVsbG8h', // Base64 for "Hello!"
      reportName: "John's Report",
      reportType: 'PDF'
    },
    {
      _id: 'jane_id',
      reportData: 'V29ybGQh', // Base64 for "World!"
      reportName: "Jane's Report",
      reportType: 'PDF'
    },
  ];

  let stockReportService: StockReportService;
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
    stockReportService = TestBed.inject(StockReportService);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });

  describe('When getReports() is called with no parameters', () => {
    it('calls `api/stockreports`', waitForAsync(() => {
      // Mock the `httpClient.get()` method, so that instead of making an HTTP request,
      // it just returns our test data.
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testReports));

      // Call `stockReportService.getReports()` and confirm that the correct call has
      // been made with the correct arguments.
      // We have to `subscribe()` to the `Observable` returned by `getReports()`.
      stockReportService.getReports().subscribe(() => {
        // The mocked method (`httpClient.get()`) should have been called
        // exactly one time.
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        // The mocked method should have been called with two arguments:
        //   * the appropriate URL
        //   * An options object containing an empty `HttpParams`
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(stockReportService.stockReportUrl, { params: new HttpParams() });
      });
    }));
  });

  describe('When getReports() is called with parameters, it correctly forms the HTTP request (Javalin/Server filtering)', () => {
    it('correctly calls api/stockreports with no parameters', () => {
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testReports));

      stockReportService.getReports().subscribe(() => {
        const [url, options] = mockedMethod.calls.argsFor(0);
        const calledHttpParams: HttpParams = (options ? options.params : new HttpParams()) as HttpParams;
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(url)
          .withContext('talks to the correct endpoint')
          .toEqual(stockReportService.stockReportUrl);
        expect(calledHttpParams.keys().length)
          .withContext('should have 0 params')
          .toEqual(0);
      });
    });
  });

  describe('When getStockReportById() is given an ID', () => {
    it('calls api/stockreports/id with the correct ID', waitForAsync(() => {
      // We're just picking a StockReport "at random" from our little
      // set of Reports up at the top.
      const targetStockReport: StockReport = testReports[1];
      const targetId: string = targetStockReport._id || 'default_id';

      // Mock the `httpClient.get()` method so that instead of making an HTTP request
      // it just returns one stockReport from our test data
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(targetStockReport));

      // Call `stockReportService.getStockReport()` and confirm that the correct call has
      // been made with the correct arguments.
      // We have to `subscribe()` to the `Observable` returned by `getStockReportById()`.
      // The `stockReport` argument in the function below is the thing of type StockReport returned by
      // the call to `getStockReportById()`.
      stockReportService.getReportById(targetId).subscribe(() => {
        // The `StockReport` returned by `getStockReportById()` should be targetStockReport, but
        // we don't bother with an `expect` here since we don't care what was returned.
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(`${stockReportService.stockReportUrl}/${targetId}`);
      });
    }));
  });

  describe('Adding a stockReport using `addNewReport()`', () => {
    it('talks to the right endpoint and is called once', waitForAsync(() => {
      const stockReport_id = 'john_id';
      const expected_http_response = { id: stockReport_id } ;

      const mockedMethod = spyOn(httpClient, 'post')
        .and
        .returnValue(of(expected_http_response));

      const formData = new FormData();
      stockReportService.addNewReport(formData).subscribe((new_stockReport_id) => {
        expect(new_stockReport_id).toBe(stockReport_id);
        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(stockReportService.stockReportUrl, formData);
      });
    }));
  });

  describe('Deleting a stockReport using `deleteStockReport()`', () => {
    it('talks to the right endpoint and is called once', waitForAsync(() => {
      const mockedMethod = spyOn(httpClient, 'delete').and.returnValue(of(void 0));

      stockReportService.deleteReport('john_id').subscribe((res) => {
        expect(res).toBeUndefined();

        expect(mockedMethod)
          .withContext('one call')
          .toHaveBeenCalledTimes(1);
        expect(mockedMethod)
          .withContext('talks to the correct endpoint')
          .toHaveBeenCalledWith(`${stockReportService.stockReportUrl}/john_id`);
      });
    }));

    it('returns void and completes successfully', waitForAsync(() => {
      const mockReport: StockReport = { _id: 'report_id', reportName: 'Report', reportType: 'PDF', reportData: 'SGVsbG8h' };
      spyOn(stockReportService, 'deleteReport').and.returnValue(of(void 0));
      spyOn(stockReportService, 'refreshReports').and.returnValue(of([]));

      stockReportService.deleteSingleReport(mockReport).subscribe((res) => {
        expect(res).toBeUndefined();
      });
    }));
  });

  describe('Deleting multiple stockReports using `deleteAllReports()`', () => {
    it('returns void immediately when given an empty array', waitForAsync(() => {
      stockReportService.deleteAllReports([]).subscribe((res) => {
        expect(res).toBeUndefined();
      });
    }));

    it('deletes all reports and refreshes the list', waitForAsync(() => {
      const mockedDelete = spyOn(httpClient, 'delete').and.returnValue(of(void 0));
      const mockedGet = spyOn(httpClient, 'get').and.returnValue(of([]));

      stockReportService.deleteAllReports(testReports).subscribe((res) => {
        expect(res).toBeUndefined();

        // Should call delete for each report
        expect(mockedDelete)
          .withContext('deletes both reports')
          .toHaveBeenCalledTimes(2);
        expect(mockedDelete)
          .withContext('deletes first report')
          .toHaveBeenCalledWith(`${stockReportService.stockReportUrl}/john_id`);
        expect(mockedDelete)
          .withContext('deletes second report')
          .toHaveBeenCalledWith(`${stockReportService.stockReportUrl}/jane_id`);

        // Should call get to refresh reports
        expect(mockedGet)
          .withContext('refreshes reports list')
          .toHaveBeenCalledWith(stockReportService.stockReportUrl, { params: new HttpParams() });
      });
    }));
  });

  describe('refreshReports() handles errors properly', () => {
    it('returns an empty array when getReports fails', waitForAsync(() => {
      spyOn(httpClient, 'get').and.returnValue(of(testReports).pipe(
        map(() => {
          throw new Error('Network error');
        })));

      stockReportService.refreshReports().subscribe((reports) => {
        expect(reports).toEqual([]);
      });
    }));
  });

  describe('Downloading reports from the server', () => {
    describe('getReportBytesById()', () => {
      it('should call the correct endpoint with the report ID', waitForAsync(() => {
        const mockBlob = new Blob(['PDF bytes'], { type: 'application/pdf' });
        const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(mockBlob));

        stockReportService.getReportBytesById('test_id').subscribe((blob) => {
          expect(mockedMethod)
            .withContext('one call')
            .toHaveBeenCalledTimes(1);
          expect(mockedMethod)
            .withContext('calls the correct endpoint')
            .toHaveBeenCalledWith(`${stockReportService.stockReportUrl}/test_id/bytes`,
              jasmine.objectContaining({ responseType: 'blob' }));
          expect(blob).toEqual(mockBlob);
        });
      }));
    });

    describe('downloadSingleReportBlob()', () => {
      it('should return a Observable of Blob when downloading a single report', () => {
        // Mock blob to be used
        const mockBlob = new Blob(['Test PDF content'], { type: 'application/pdf' });
        spyOn(httpClient, 'get').and.returnValue(of(mockBlob));

        // Call the method and confirm it returns the expected blob
        stockReportService.downloadSingleReportBlob({ _id: '1', reportName: 'Test Report', reportType: 'PDF', reportData: 'SGVsbG8h' }).subscribe((blob) => {
          expect(blob).toEqual(mockBlob);
        });
      });
    });

    describe('downloadAllReportsAsZip()', () => {
      it('should return an Observable of Blob when downloading all reports as a zip', waitForAsync(() => {
        // Mock blob to be used
        const mockBlob = new Blob(['Test ZIP content'], { type: 'application/zip' });
        spyOn(httpClient, 'get').and.returnValue(of(testReports));

        // Mock the convertBase64ToBlob method to return our mockBlob when called
        stockReportService.downloadAllReportsAsZip().subscribe((blob) => {
          expect(blob)
            .withContext('returns a Blob')
            .toBeInstanceOf(Blob);
          expect(blob.type)
            .withContext('keeps the expected blob type')
            .toBe(mockBlob.type);
        });
      }));

      it('should return an empty Blob when no reports are available', waitForAsync(() => {
        spyOn(httpClient, 'get').and.returnValue(of([]));

        stockReportService.downloadAllReportsAsZip().subscribe((blob) => {
          expect(blob).toBeInstanceOf(Blob);
          expect(blob.size).toBe(0);
        });
      }));

      it('should append numbers to duplicate report names when downloading all reports as a zip', waitForAsync(() => {
        const duplicateNameReports: StockReport[] = [
          { _id: '1', reportName: 'Report', reportType: 'PDF', reportData: 'SGVsbG8h' },
          { _id: '2', reportName: 'Report', reportType: 'PDF', reportData: 'V29ybGQh' },
          { _id: '3', reportName: 'Report', reportType: 'PDF', reportData: 'SGVsbG8h' },
        ];

        const mockBlob = new Blob(['PDF content'], { type: 'application/pdf' });

        // Mock getReports to return duplicate-named reports
        const getReportsSpy = spyOn(stockReportService, 'getReports').and.returnValue(of(duplicateNameReports));

        // Mock getReportBytesById to always return a blob
        const getBytesSpy = spyOn(stockReportService, 'getReportBytesById').and.returnValue(of(mockBlob));

        stockReportService.downloadAllReportsAsZip().subscribe((blob) => {
          // Verify that the zip was created successfully
          expect(blob).toBeInstanceOf(Blob);
          expect(blob.size).toBeGreaterThan(0);

          // Verify getReports was called once
          expect(getReportsSpy).toHaveBeenCalledTimes(1);

          // Verify getReportBytesById was called 3 times (once per report)
          expect(getBytesSpy).toHaveBeenCalledTimes(3);
        });
      }));
    });
  });
});
