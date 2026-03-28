// Angular Imports
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';

// RxJS Imports
import { Observable, of } from 'rxjs';

// Family Imports
import { MockFamilyService } from 'src/testing/family.service.mock';
import { Family } from './family';
import { FamilyListComponent } from './family-list.component';
import { FamilyService } from './family.service';
import { DashboardStats } from '../family/family';

describe('Family list', () => {
  let familyList: FamilyListComponent;
  let fixture: ComponentFixture<FamilyListComponent>;
  let familyService: FamilyService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [FamilyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: FamilyService, useClass: MockFamilyService },
        provideRouter([])
      ],
    });
  });

  beforeEach(waitForAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(FamilyListComponent);
      familyList = fixture.componentInstance;
      familyService = TestBed.inject(FamilyService);
      fixture.detectChanges();
    });
  }));

  it('should create the component', () => {
    expect(familyList).toBeTruthy();
  });

  it('should load families from service', () => {
    const families = familyList.families();
    // There are 3 families
    expect(families.length).toBe(3);
    // The first family's guardian is John Johnson
    expect(families[0].guardianName).toBe('John Johnson');
  });

  it('exportFamilies() should be called when CSV is downloaded', () => {
    spyOn(familyService, 'exportFamilies').and.returnValue(of('csv-data'));

    spyOn(URL, 'createObjectURL').and.returnValue('blob-url');
    spyOn(URL, 'revokeObjectURL');

    const click = jasmine.createSpy('click');
    spyOn(document, 'createElement').and.returnValue({ click } as undefined);

    familyList.downloadCSV();
    expect(familyService.exportFamilies).toHaveBeenCalled();
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(click).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob-url');
  });
});

/*
* This test is a little odd, but illustrates how we can use stubs
* to create mock objects (a service in this case) that be used for
* testing. Here we set up the mock FamilyService (familyServiceStub) so that
* _always_ fails (throws an exception) when you request a set of families.
*/
describe('Misbehaving Family List', () => {
  let familyList: FamilyListComponent;
  let fixture: ComponentFixture<FamilyListComponent>;

  let familyServiceStub: {
    getFamilies: () => Observable<Family[]>;
    getDashboardStats: () => Observable<DashboardStats>;
    exportFamilies: () => Observable<string>;
  };

  beforeEach(() => {
    // stub FamilyService for test purposes
    familyServiceStub = {
      getFamilies: () =>
        new Observable((observer) => {
          observer.error('getFamilies() Observer generates an error');
        }),
      getDashboardStats: () =>
        new Observable((observer) => {
          observer.error('getDashboardStats() Observer generates an error');
        }),
      exportFamilies: () => of('')
    };
  });

  // Construct the `familyList` used for the testing in the `it` statement
  // below.
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        FamilyListComponent
      ],
      providers: [{
        provide: FamilyService,
        useValue: familyServiceStub
      }, provideRouter([])],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(FamilyListComponent);
    familyList = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('it will return an empty array when the service experiences an error', () => {
    expect(familyList.families()).toEqual([]); // familyList should return an empty array
  });
});

describe('FamilyDash', () => {
  let component: FamilyListComponent;
  let fixture: ComponentFixture<FamilyListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FamilyListComponent],
      providers: [
        { provide: FamilyService, useClass: MockFamilyService },
        provideRouter([])
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(FamilyListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set dashboardStats to undefined when getDashboardStats fails', () => {
    spyOn(MockFamilyService.prototype, 'getDashboardStats')
      .and.returnValue(throwError(() => new Error('Dashboard request failed')));

    const errorFixture = TestBed.createComponent(FamilyListComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.dashboardStats()).toBeUndefined();
  });
});
