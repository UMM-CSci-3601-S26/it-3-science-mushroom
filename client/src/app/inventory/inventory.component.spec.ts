import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable } from 'rxjs';
import { MockInventoryService } from 'src/testing/inventory.service.mock';
import { Inventory } from './inventory';
import { InventoryComponent } from './inventory.component';
import { InventoryService } from './inventory.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MatPaginatorHarness } from '@angular/material/paginator/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatTableHarness } from '@angular/material/table/testing';
import { HarnessLoader } from '@angular/cdk/testing';;


describe('Inventory Table', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let inventoryService: InventoryService;
  let loader: HarnessLoader

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [InventoryComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: InventoryService, useClass: MockInventoryService },
        provideRouter([])
      ],
    });
  });

  beforeEach(waitForAsync(() => {
    TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(InventoryComponent);
      inventoryTable = fixture.componentInstance;
      inventoryService = TestBed.inject(InventoryService);
      loader = TestbedHarnessEnvironment.loader(fixture);
      fixture.detectChanges();
    });
  }));

  it('should create the component', () => {
    expect(inventoryTable).toBeTruthy();
  });

  it('should initialize with serverFilteredTable available', () => {
    const inventory = inventoryTable.serverFilteredInventory();
    expect(inventory).toBeDefined();
    expect(Array.isArray(inventory)).toBe(true);
  });

  it('should load all paginator harnesses', async () => {
    const paginators = await loader.getAllHarnesses(MatPaginatorHarness);
    expect(paginators.length).toBe(1);
  });

  it('should load harness for a table', async () => {
    const tables = await loader.getAllHarnesses(MatTableHarness);
    expect(tables.length).toBe(1);
  });

  it('should not show error message on successful load', () => {
    expect(inventoryTable.errMsg()).toBeUndefined();
  });
});

describe('Misbehaving Inventory Table', () => {
  let inventoryTable: InventoryComponent;
  let fixture: ComponentFixture<InventoryComponent>;

  let inventoryServiceStub: {
    getInventory: () => Observable<Inventory[]>;
    filterInventory: () => Inventory[];
  };

  beforeEach(() => {
    inventoryServiceStub = {
      getInventory: () =>
        new Observable((observer) => {
          observer.error('getInventory() Observer generates an error');
        }),
      filterInventory: () => []
    };
  });

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        InventoryComponent
      ],
      providers: [{
        provide: InventoryService,
        useValue: inventoryServiceStub
      }, provideRouter([])],
    })
      .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InventoryComponent);
    inventoryTable = fixture.componentInstance;
    fixture.detectChanges();
  });

  it("generates an error if we don't set up a InventoryService", () => {
    expect(inventoryTable.serverFilteredInventory())
      .withContext("service can't give values to the list if it's not there")
      .toEqual([]);
    expect(inventoryTable.errMsg())
      .withContext('the error message will be')
      .toContain('Problem contacting the server');
  });
});
