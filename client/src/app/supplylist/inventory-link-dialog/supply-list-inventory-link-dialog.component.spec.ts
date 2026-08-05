import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';
import { Inventory } from '../../inventory/inventory';
import { InventoryService } from '../../inventory/inventory.service';
import {
  SupplyListInventoryLinkDialogComponent,
  SupplyListInventoryLinkDialogData
} from './supply-list-inventory-link-dialog.component';

describe('SupplyListInventoryLinkDialogComponent', () => {
  let component: SupplyListInventoryLinkDialogComponent;
  let fixture: ComponentFixture<SupplyListInventoryLinkDialogComponent>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<SupplyListInventoryLinkDialogComponent, string[]>>;

  const markerInventory: Inventory = {
    internalID: 'inv-1',
    internalBarcode: 'ITEM-00001',
    item: 'Markers',
    brand: 'Crayola',
    packageSize: 8,
    size: 'Wide',
    color: 'Blue',
    type: 'Washable',
    material: 'Plastic',
    description: 'Crayola washable markers',
    quantity: 12,
    maxQuantity: 20,
    minQuantity: 2,
    calculatedMinQuantity: 0,
    stockState: 'stocked',
    calculatedStockState: 'stocked',
    notes: ''
  };

  const dialogData: SupplyListInventoryLinkDialogData = {
    requirementLabel: '2x 8ct. Markers Crayola Blue',
    selectedInventoryIds: [' inv-2 ', 'inv-2'],
    filters: {
      item: 'Markers',
      brand: 'Crayola',
      color: 'Blue'
    }
  };

  beforeEach(async () => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventory']);
    inventoryService.getInventory.and.returnValue(of([markerInventory]));
    dialogRef = jasmine.createSpyObj<MatDialogRef<SupplyListInventoryLinkDialogComponent, string[]>>(
      'MatDialogRef',
      ['close']
    );

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        SupplyListInventoryLinkDialogComponent
      ],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: dialogData }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SupplyListInventoryLinkDialogComponent);
    component = fixture.componentInstance;
  });

  it('prefills filters and searches inventory on init', () => {
    fixture.detectChanges();

    expect(component.itemFilter).toBe('Markers');
    expect(component.brandFilter).toBe('Crayola');
    expect(component.colorFilter).toBe('Blue');
    expect(inventoryService.getInventory).toHaveBeenCalledWith(jasmine.objectContaining({
      item: 'Markers',
      brand: 'Crayola',
      color: 'Blue'
    }));
    expect(component.inventory()).toEqual([markerInventory]);
  });

  it('deduplicates selected IDs from dialog data and saves them', () => {
    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith(['inv-2']);
  });

  it('adds and removes selected inventory items', () => {
    fixture.detectChanges();

    component.toggleInventory(markerInventory, true);
    expect(component.selectedInventoryIds()).toEqual(['inv-2', 'inv-1']);

    component.toggleInventory(markerInventory, false);
    expect(component.selectedInventoryIds()).toEqual(['inv-2']);
  });

  it('can select visible inventory and clear selected links', () => {
    fixture.detectChanges();

    component.selectVisibleInventory();
    expect(component.selectedInventoryIds()).toEqual(['inv-2', 'inv-1']);

    component.clearSelectedInventory();
    expect(component.selectedInventoryIds()).toEqual([]);
  });

  it('clears filters before searching', () => {
    fixture.detectChanges();
    inventoryService.getInventory.calls.reset();

    component.clearFilters();

    expect(component.itemFilter).toBe('');
    expect(component.brandFilter).toBe('');
    expect(inventoryService.getInventory).toHaveBeenCalledWith(jasmine.objectContaining({
      item: undefined,
      brand: undefined,
      color: undefined
    }));
  });

  it('shows an error message when inventory search fails', () => {
    inventoryService.getInventory.and.returnValue(throwError(() => new Error('search failed')));

    fixture.detectChanges();

    expect(component.inventory()).toEqual([]);
    expect(component.error()).toBe('Inventory search failed.');
  });
});
