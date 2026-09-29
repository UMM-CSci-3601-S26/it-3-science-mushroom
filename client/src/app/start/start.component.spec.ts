import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { InventoryService } from '../inventory/inventory.service';
import { Inventory } from '../inventory/inventory';
import { StartComponent } from './start.component';

describe('StartComponent', () => {
  let fixture: ComponentFixture<StartComponent>;
  let component: StartComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  const inventoryItem: Inventory = {
    internalID: '1',
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    size: 'Large',
    type: 'School',
    material: 'Plastic',
    quantity: 5,
    maxQuantity: 20,
    minQuantity: 1,
    calculatedMinQuantity: 0,
    stockState: 'In Stock',
    calculatedStockState: 'N/A',
    notes: 'Keep sealed'
  };

  beforeEach(async () => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventory']);
    inventoryService.getInventory.and.returnValue(of([inventoryItem]));

    await TestBed.configureTestingModule({
      imports: [StartComponent, NoopAnimationsModule],
      providers: [
        { provide: InventoryService, useValue: inventoryService }
      ]
    }).compileComponents();

  });

  function createComponent(): void {
    fixture = TestBed.createComponent(StartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  it('renders the start page scaffold', fakeAsync(() => {
    createComponent();
    tick(300);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Start');
  }));

  it('loads inventory data into the schema table', fakeAsync(() => {
    createComponent();
    tick(300);
    fixture.detectChanges();

    expect(inventoryService.getInventory).toHaveBeenCalledWith({});
    expect(fixture.nativeElement.textContent).toContain('Markers');
    expect(fixture.nativeElement.textContent).toContain('Crayola');
  }));

  it('requests filtered inventory when filter state changes', fakeAsync(() => {
    createComponent();
    tick(300);
    inventoryService.getInventory.calls.reset();

    component.onFilterChange({ item: 'Markers', brand: 'Crayola' });
    fixture.detectChanges();
    tick(300);

    expect(inventoryService.getInventory).toHaveBeenCalledWith({
      item: 'Markers',
      brand: 'Crayola'
    });
  }));
});
