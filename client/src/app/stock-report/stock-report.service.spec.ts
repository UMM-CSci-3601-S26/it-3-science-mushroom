// // Angular Imports
// import { HttpClient, HttpParams, provideHttpClient } from '@angular/common/http'; //HttpParams
// import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
// import { TestBed, waitForAsync } from '@angular/core/testing';

// // RxJS Imports
// import { of } from 'rxjs';

// // Family Imports
// import { Family } from './stock-report';
// import { FamilyService } from './stock-report.service';

// describe('FamilyService', () => {
//   // A small collection of test families
//   const testFamilies: Family[] = [
//     {
//       _id: 'john_id',
//       guardianName: 'John Johnson',
//       email: 'jjohnson@email.com',
//       address: '713 Broadway',
//       timeSlot: '8:00-9:00',
//       students: [
//         {
//           name: 'John Jr.',
//           grade: '1',
//           school: "Morris Elementary",
//           requestedSupplies: ['pencils', 'markers']
//         },
//       ]
//     },
//     {
//       //family with two kids
//       _id: 'jane_id',
//       guardianName: 'Jane Doe',
//       email: 'janedoe@email.com',
//       address: '123 Street',
//       timeSlot: '10:00-11:00',
//       students: [
//         {
//           name: 'Jennifer',
//           grade: '6',
//           school: "Hancock Middle School",
//           requestedSupplies: ['headphones']
//         },
//         {
//           name: 'Jake',
//           grade: '8',
//           school: "Hancock Middle School",
//           requestedSupplies: ['calculator']
//         },
//       ]
//     },
//     {
//       //family with three kids
//       _id: 'george_id',
//       guardianName: 'George Peterson',
//       email: 'georgepeter@email.com',
//       address: '245 Acorn Way',
//       timeSlot: '1:00-2:00',
//       students: [
//         {
//           name: 'Harold',
//           grade: '11',
//           school: "Morris High School",
//           requestedSupplies: []
//         },
//         {
//           name: 'Thomas',
//           grade: '6',
//           school: "Morris High School",
//           requestedSupplies: ['headphones']
//         },
//         {
//           name: 'Emma',
//           grade: '2',
//           school: "Morris Elementary",
//           requestedSupplies: ['backpack', 'markers']
//         },
//       ]
//     },
//   ];

//   let familyService: FamilyService;
//   let httpClient: HttpClient;
//   let httpTestingController: HttpTestingController;

//   beforeEach(() => {
//     // Set up the mock handling of the HTTP requests
//     TestBed.configureTestingModule({
//       imports: [],
//       providers: [provideHttpClient(), provideHttpClientTesting()]
//     });
//     // Construct an instance of the service with the mock
//     // HTTP client.
//     httpClient = TestBed.inject(HttpClient);
//     httpTestingController = TestBed.inject(HttpTestingController);
//     familyService = TestBed.inject(FamilyService);
//   });

//   afterEach(() => {
//     // After every test, assert that there are no more pending requests.
//     httpTestingController.verify();
//   });

//   describe('When getFamilies() is called with no parameters', () => {
//     /* We really don't care what `getFamilies()` returns. Since all the
//       * filtering (when there is any) is happening on the server,
//       * `getFamilies()` is really just a "pass through" that returns whatever it receives,
//       * without any "post processing" or manipulation. The test in this
//       * `describe` confirms that the HTTP request is properly formed
//       * and sent out in the world, but we don't _really_ care about
//       * what `getFamilies()` returns as long as it's what the HTTP
//       * request returns.
//       *
//       * So in this test, we'll keep it simple and have
//       * the (mocked) HTTP request return the entire list `testFamilies`
//       * even though in "real life" we would expect the server to
//       * return return a filtered subset of the families. Furthermore, we
//       * won't actually check what got returned (there won't be an `expect`
//       * about the returned value). Since we don't use the returned value in this test,
//       * It might also be fine to not bother making the mock return it.
//       */
//     it('calls `api/families`', waitForAsync(() => {
//       // Mock the `httpClient.get()` method, so that instead of making an HTTP request,
//       // it just returns our test data.
//       const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testFamilies));

//       // Call `familyService.getFamilies()` and confirm that the correct call has
//       // been made with the correct arguments.
//       //
//       // We have to `subscribe()` to the `Observable` returned by `getFamilies()`.
//       // The `families` argument in the function is the array of Families returned by
//       // the call to `getFamilies()`.
//       familyService.getFamilies().subscribe(() => {
//         // The mocked method (`httpClient.get()`) should have been called
//         // exactly one time.
//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         // The mocked method should have been called with two arguments:
//         //   * the appropriate URL ('/api/families' defined in the `FamilyService`)
//         //   * An options object containing an empty `HttpParams`
//         expect(mockedMethod)
//           .withContext('talks to the correct endpoint')
//           .toHaveBeenCalledWith(familyService.familyUrl, { params: new HttpParams() });
//       });
//     }));
//   });

//   describe('When getFamilies() is called with parameters, it correctly forms the HTTP request (Javalin/Server filtering)', () => {
//     /*
//       * As in the test of `getFamilies()` that takes in no filters in the params,
//       * we really don't care what `getFamilies()` returns in the cases
//       * where the filtering is happening on the server. Since all the
//       * filtering is happening on the server, `getFamilies()` is really
//       * just a "pass through" that returns whatever it receives, without
//       * any "post processing" or manipulation. So the tests in this
//       * `describe` block all confirm that the HTTP request is properly formed
//       * and sent out in the world, but don't _really_ care about
//       * what `getFamilies()` returns as long as it's what the HTTP
//       * request returns.
//       *
//       * So in each of these tests, we'll keep it simple and have
//       * the (mocked) HTTP request return the entire list `testFamilies`
//       * even though in "real life" we would expect the server to
//       * return return a filtered subset of the families. Furthermore, we
//       * won't actually check what got returned (there won't be an `expect`
//       * about the returned value).
//       */

//     it('correctly calls api/families with no parameters', () => {
//       const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testFamilies));

//       familyService.getFamilies().subscribe(() => {
//         // This test checks that the call to `familyService.getFamilies()` does several things:
//         //   * It calls the mocked method (`HttpClient#get()`) exactly once.
//         //   * It calls it with the correct endpoint (`familyService.familyUrl`).
//         //   * It calls it with the correct parameters:
//         //      * There should be three parameters (this makes sure that there aren't extras).
//         //      * There should be a "role:editor" key-value pair.
//         //      * And a "company:IBM" pair.
//         //      * And a "age:37" pair.

//         // This gets the arguments for the first (and in this case only) call to the `mockMethod`.
//         const [url, options] = mockedMethod.calls.argsFor(0);
//         // Gets the `HttpParams` from the options part of the call.
//         // `options.param` can return any of a broad number of types;
//         // it is in fact an instance of `HttpParams`, and I need to use
//         // that fact, so I'm casting it (the `as HttpParams` bit).
//         const calledHttpParams: HttpParams = (options.params) as HttpParams;
//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         expect(url)
//           .withContext('talks to the correct endpoint')
//           .toEqual(familyService.familyUrl);
//         expect(calledHttpParams.keys().length)
//           .withContext('should have 0 params')
//           .toEqual(0);
//       });
//     });
//   });

//   describe('When getFamilyById() is given an ID', () => {
//     /* We really don't care what `getFamilyById()` returns. Since all the
//     * interesting work is happening on the server, `getFamilyById()`
//     * is really just a "pass through" that returns whatever it receives,
//     * without any "post processing" or manipulation. The test in this
//     * `describe` confirms that the HTTP request is properly formed
//     * and sent out in the world, but we don't _really_ care about
//     * what `getFamilyById()` returns as long as it's what the HTTP
//     * request returns.
//     *
//     * So in this test, we'll keep it simple and have
//     * the (mocked) HTTP request return the `targetFamily`
//     * Furthermore, we won't actually check what got returned (there won't be an `expect`
//     * about the returned value). Since we don't use the returned value in this test,
//     * It might also be fine to not bother making the mock return it.
//     */
//     it('calls api/families/id with the correct ID', waitForAsync(() => {
//       // We're just picking a Family "at random" from our little
//       // set of Families up at the top.
//       const targetFamily: Family = testFamilies[1];
//       const targetId: string = targetFamily._id;

//       // Mock the `httpClient.get()` method so that instead of making an HTTP request
//       // it just returns one family from our test data
//       const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(targetFamily));

//       // Call `familyService.getFamily()` and confirm that the correct call has
//       // been made with the correct arguments.
//       //
//       // We have to `subscribe()` to the `Observable` returned by `getFamilyById()`.
//       // The `family` argument in the function below is the thing of type Family returned by
//       // the call to `getFamilyById()`.
//       familyService.getFamilyById(targetId).subscribe(() => {
//         // The `Family` returned by `getFamilyById()` should be targetFamily, but
//         // we don't bother with an `expect` here since we don't care what was returned.
//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         expect(mockedMethod)
//           .withContext('talks to the correct endpoint')
//           .toHaveBeenCalledWith(`${familyService.familyUrl}/${targetId}`);
//       });
//     }));
//   });

//   describe('Adding a family using `addFamily()`', () => {
//     it('talks to the right endpoint and is called once', waitForAsync(() => {
//       const family_id = 'john_id';
//       const expected_http_response = { id: family_id } ;

//       const mockedMethod = spyOn(httpClient, 'post')
//         .and
//         .returnValue(of(expected_http_response));

//       familyService.addFamily(testFamilies[1]).subscribe((new_family_id) => {
//         expect(new_family_id).toBe(family_id);
//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         expect(mockedMethod)
//           .withContext('talks to the correct endpoint')
//           .toHaveBeenCalledWith(familyService.familyUrl, testFamilies[1]);
//       });
//     }));
//   });

//   describe('Deleting a family using `deleteFamily()`', () => {
//     it('talks to the right endpoint and is called once', waitForAsync(() => {
//       const mockedMethod = spyOn(httpClient, 'delete').and.returnValue(of(void 0));

//       familyService.deleteFamily('john_id').subscribe((res) => {
//         expect(res).toBeUndefined();

//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         expect(mockedMethod)
//           .withContext('talks to the correct endpoint')
//           .toHaveBeenCalledWith(`${familyService.familyUrl}/john_id`);
//       });
//     }));
//   });

//   describe('When getDashboardStats() is called with parameters, it correctly forms the HTTP request (Javalin/Server filtering)', () => {
//     it('correctly calls api/dashboard with no parameters', () => {
//       const mockedMethod = spyOn(httpClient, 'get').and.returnValue(of(testFamilies));

//       familyService.getDashboardStats().subscribe(() => {

//         const [url, options] = mockedMethod.calls.argsFor(0);
//         const calledHttpParams: HttpParams = (options.params) as HttpParams;
//         expect(mockedMethod)
//           .withContext('one call')
//           .toHaveBeenCalledTimes(1);
//         expect(url)
//           .withContext('talks to the correct endpoint')
//           .toEqual(familyService.dashboardUrl);
//         expect(calledHttpParams.keys().length)
//           .withContext('should have 0 params')
//           .toEqual(0);
//       });
//     });
//   });

//   it('should call GET /export and return Csv text', () => {
//     const mockCsv = `Guardian Name,Email,Address,Time Slot,Number of Students
//                      John Johnson,jjohnson@email.com,713 Broadway,8:00-9:00,1`;

//     familyService.exportFamilies().subscribe(response => {
//       expect(response).toBe(mockCsv);
//     });

//     const req = httpTestingController.expectOne(`${familyService['familyUrl']}/export`)

//     expect(req.request.method).toBe('GET');
//     expect(req.request.responseType).toBe('text');

//     req.flush(mockCsv);
//   });
// });
