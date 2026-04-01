import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ReportGeneratorComponent } from './report-generator.component';
import { StockReportService } from '../stock-report.service';
import { MockStockReportService } from 'src/testing/stock-report.service.mock'

describe('ReportGeneratorComponent', () => {
  let component: ReportGeneratorComponent;
  let fixture: ComponentFixture<ReportGeneratorComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportGeneratorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});



describe('generatePDF', () => {
  let component: ReportGeneratorComponent;
  let fixture: ComponentFixture<ReportGeneratorComponent>;
  let httpTestingController: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReportGeneratorComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
      .compileComponents();

    httpTestingController = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ReportGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    location = TestBed.inject(Location);
  });

  afterEach(() => {
    // After every test, assert that there are no more pending requests.
    httpTestingController.verify();
  });


  it('should make a POST request to generate a PDF report', () => {
    const mockResponse = new Blob(['PDF content'], { type: 'application/pdf' });

    component.generatePDF(true);

    const req = httpTestingController.expectOne('/api/stockreport/addReport');
    expect(req.request.method).toEqual('POST');
    req.flush(mockResponse);
  });

  it('should call addNewReport() and handle error response', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 500, message: 'Server error' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addReportSpy = spyOn(stockReportService, 'addNewReport')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call addFamily() and handle error response for illegal family', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 400, message: 'Illegal family error' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should call addFamily() and handle unexpected error response if it arises', () => {
    // Save the original path so we can check that it doesn't change.
    const path = location.path();
    // A canned error response to be returned by the spy.
    const errorResponse = { status: 404, message: 'Not found' };
    // "Spy" on the `.addFamily()` method in the family service. Here we basically
    // intercept any calls to that method and return the error response
    // defined above.
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and
      .returnValue(throwError(() => errorResponse));
    component.submitForm();
    // Check that `.addFamily()` was called with the form's values which we set
    // up above.
    expect(addFamilySpy).toHaveBeenCalledWith(component.addFamilyForm.value);
    // Confirm that we're still at the same path.
    expect(location.path()).toBe(path);
  });

  it('should transform requestedSupplies string into trimmed array', () => {
    const studentsArray = component.addFamilyForm.get('students') as FormArray;

    studentsArray.push(new FormGroup({
      name: new FormControl(''),
      grade: new FormControl(''),
      school: new FormControl(''),
      requestedSupplies: new FormControl('')
    }));

    component.addFamilyForm.patchValue({
      students: [{
        name: 'John',
        grade: '5',
        school: 'ABC',
        requestedSupplies: 'pencil, eraser , notebook '
      }]
    });
    const addFamilySpy = spyOn(familyService, 'addFamily')
      .and.returnValue(of('1'));
    component.submitForm();
    expect(addFamilySpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        students: [
          jasmine.objectContaining({
            requestedSupplies: ['pencil', 'eraser', 'notebook']
          })
        ]
      })
    );
  });
});
