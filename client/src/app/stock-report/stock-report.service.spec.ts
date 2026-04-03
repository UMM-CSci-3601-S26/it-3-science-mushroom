// Angular Imports
import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http'; //HttpParams
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed, waitForAsync } from '@angular/core/testing';

// RxJS Imports
import { of } from 'rxjs';

// StockReport Imports
import { StockReport } from './stock-report';
import { StockReportService } from './stock-report.service';

describe('StockReportService', () => {
  // A small collection of test reports
  const testReports: StockReport[] = [
    {
      _id: 'john_id',
      stockReportPDF: 'john_report.pdf',
      reportName: "John's Report"
    },
    {
      _id: 'jane_id',
      stockReportPDF: 'jane_report.pdf',
      reportName: "Jane's Report"
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
      //
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
        const calledHttpParams: HttpParams = (options.params) as HttpParams;
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
      const targetId: string = targetStockReport._id;

      // Mock the `httpClient.get()` method so that instead of making an HTTP request
      // it just returns one stockReport from our test data
      const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(targetStockReport));

      // Call `stockReportService.getStockReport()` and confirm that the correct call has
      // been made with the correct arguments.
      //
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
  });
});
