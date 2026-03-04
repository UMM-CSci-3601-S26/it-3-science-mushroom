import { ComponentFixture, TestBed, waitForAsync, tick, fakeAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable} from 'rxjs';
import { MockSupplyListService } from 'src/testing/supplylist.service.mock'
import { SupplyList } from './supplylist';
import { SupplyListComponent } from './supplylist.component';
import { SupplyListService } from './supplylist.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('SupplyList Table', () => {
  let supplylistTable: SupplyListComponent;
  let fixture: ComponentFixture<SupplyListComponent>
  let supplylistService: SupplyListService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SupplyListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: SupplyListService, useClass: MockSupplyListService },
        provideRouter([])
      ],
    });
  });

  beforeEach(waitForAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(SupplyListComponent);
      supplylistTable = fixture.componentInstance;
      supplylistService = TestBed.inject(SupplyListService);
      fixture.detectChanges();
    });
  }));

  it('should create the component', () => {
    expect(supplylistTable).toBeTruthy();
  });

  it('should initialize with serverFilteredTable available', () => {
    const SupplyList = supplylistTable.serverFilteredSupplyList();
    expect(SupplyList).toBeDefined();
    expect(Array.isArray(SupplyList)).toBe(true);
  });

  it('should call getSupplyList() when School signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.school.set('Herman');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: 'Herman', grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when grade signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.grade.set('PreK');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: 'PreK', item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when item signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Markers');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: 'Markers', brand: undefined, color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when brand signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: 'Crayola', color: undefined, size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when color signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.color.set('Red');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: 'Red', size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when size signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.size.set('Wide Ruled');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: 'Wide Ruled', type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when type signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should call getSupplyList() when material signal changes', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.material.set('Plastic');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: undefined, color: undefined, size: undefined, type: undefined, material: 'Plastic' });
  }));

  it('should call getSupplyList() when brand and color signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.color.set('Black');
    supplylistTable.brand.set('Crayola');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: undefined, brand: 'Crayola', color: 'Black', size: undefined, type: undefined, material: undefined });
  }));

  it('should call getSupplyList() when item, brand, color, and material signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Notebook');
    supplylistTable.brand.set('Five Star');
    supplylistTable.color.set('Yellow');
    supplylistTable.type.set('Spiral');
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: undefined, grade: undefined, item: 'Notebook', brand: 'Five Star', color: 'Yellow', size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should call getSupplyList() when item, brand, color, material, school and grade signals change', fakeAsync(() => {
    const spy = spyOn(supplylistService, 'getSupplyList').and.callThrough();
    supplylistTable.item.set('Notebook');
    supplylistTable.brand.set('Five Star');
    supplylistTable.color.set('Yellow');
    supplylistTable.type.set('Spiral');
    supplylistTable.school.set('MHS')
    supplylistTable.grade.set("PreK")
    fixture.detectChanges();
    tick(300);
    expect(spy).toHaveBeenCalledWith({ school: "MHS", grade: "PreK", item: 'Notebook', brand: 'Five Star', color: 'Yellow', size: undefined, type: 'Spiral', material: undefined });
  }));

  it('should not show error message on successful load', () => {
    expect(supplylistTable.errMsg()).toBeUndefined();
  });
});

describe('Misbehaving SupplyList Table', () => {
  let supplylistTable: SupplyListComponent;
  let fixture: ComponentFixture<SupplyListComponent>;

  let supplylistServiceStub: {
    getSupplyList: () => Observable<SupplyList[]>;
    //filterSupplyList: () => SupplyList[];
  };

  beforeEach(() => {
    supplylistServiceStub = {
      getSupplyList: () =>
        new Observable((observer) => {
          observer.error('getSupplyList() Observer generates an error');
        }),
      //filterSupplyList: () => []
    };
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        SupplyListComponent
      ],
      providers: [{
        provide: SupplyListService,
        useValue: supplylistServiceStub
      }, provideRouter([])],
    })
      .compileComponents();
  }));

  beforeEach(fakeAsync(() => {
    fixture = TestBed.createComponent(SupplyListComponent);
    supplylistTable = fixture.componentInstance;
    tick(300);
    fixture.detectChanges();
  }));

  it("generates an error if we don't set up a SupplyListService", () => {
    expect(supplylistTable.serverFilteredSupplyList())
      .withContext("service can't give values to the list if it's not there")
      .toEqual([]);
    expect(supplylistTable.errMsg())
      .withContext('the error message will be')
      .toContain('Problem contacting the server - Error Code:');
  });
});
