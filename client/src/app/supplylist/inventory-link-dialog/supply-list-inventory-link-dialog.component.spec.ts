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

  it('ignores inventory items that do not have an internal ID', () => {
    component.toggleInventory({ ...markerInventory, internalID: '' }, true);

    expect(component.selectedInventoryIds()).toEqual(['inv-2']);
  });

  it('can select visible inventory and clear selected links', () => {
    fixture.detectChanges();

    component.selectVisibleInventory();
    expect(component.selectedInventoryIds()).toEqual(['inv-2', 'inv-1']);

    component.clearSelectedInventory();
    expect(component.selectedInventoryIds()).toEqual([]);
  });

  it('only selects visible inventory items that have internal IDs', () => {
    component.inventory.set([
      markerInventory,
      { ...markerInventory, internalID: '', description: 'Missing ID' },
      { ...markerInventory, internalID: 'inv-3', description: 'Extra markers' }
    ]);

    component.selectVisibleInventory();

    expect(component.selectedInventoryIds()).toEqual(['inv-2', 'inv-1', 'inv-3']);
  });

  it('labels selected inventory using the visible item description when available', () => {
    fixture.detectChanges();

    expect(component.selectedInventoryLabel('inv-1')).toBe('Crayola washable markers - inv-1');
  });

  it('falls back to the inventory ID when a selected item is not visible', () => {
    expect(component.selectedInventoryLabel('missing-id')).toBe('missing-id');
  });

  it('uses item and generic fallbacks for inventory descriptions', () => {
    expect(component.bestDescription({ ...markerInventory, description: '' })).toBe('Markers');
    expect(component.bestDescription({ ...markerInventory, description: '', item: '' })).toBe('Inventory item');
  });

  it('builds inventory details with and without package size counts', () => {
    expect(component.inventoryDetails(markerInventory)).toBe('inv-1 - 12 on hand - 8 count');
    expect(component.inventoryDetails({ ...markerInventory, packageSize: 1 })).toBe('inv-1 - 12 on hand');
    expect(component.inventoryDetails({ ...markerInventory, packageSize: 0 })).toBe('inv-1 - 12 on hand');
  });

  it('closes the dialog without selected IDs when cancelled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
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

  it('cleans blank and N/A filters before searching', () => {
    const helpers = component as unknown as {
      currentFilters(): {
        item?: string;
        brand?: string;
        color?: string;
        size?: string;
        type?: string;
        material?: string;
      };
      cleanFilter(value: string): string | undefined;
      sanitizeInventoryIds(ids: string[] | undefined): string[];
    };

    component.itemFilter = ' N/A ';
    component.brandFilter = ' ';
    component.colorFilter = ' Blue ';
    component.sizeFilter = ' Wide ';
    component.typeFilter = 'Washable';
    component.materialFilter = 'N/A';

    expect(helpers.currentFilters()).toEqual({
      item: undefined,
      brand: undefined,
      color: 'Blue',
      size: 'Wide',
      type: 'Washable',
      material: undefined
    });
    expect(helpers.cleanFilter(' Markers ')).toBe('Markers');
    expect(helpers.sanitizeInventoryIds(undefined)).toEqual([]);
  });
});

describe('SupplyListInventoryLinkDialogComponent with empty dialog data', () => {
  let component: SupplyListInventoryLinkDialogComponent;
  let inventoryService: jasmine.SpyObj<InventoryService>;

  beforeEach(async () => {
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventory']);
    inventoryService.getInventory.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        SupplyListInventoryLinkDialogComponent
      ],
      providers: [
        { provide: InventoryService, useValue: inventoryService },
        { provide: MatDialogRef, useValue: jasmine.createSpyObj('MatDialogRef', ['close']) },
        {
          provide: MAT_DIALOG_DATA,
          useValue: {
            requirementLabel: 'New supply list item',
            selectedInventoryIds: undefined,
            filters: {}
          } as SupplyListInventoryLinkDialogData
        }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(SupplyListInventoryLinkDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('defaults missing filters and selected IDs to empty values', () => {
    expect(component.itemFilter).toBe('');
    expect(component.brandFilter).toBe('');
    expect(component.colorFilter).toBe('');
    expect(component.sizeFilter).toBe('');
    expect(component.typeFilter).toBe('');
    expect(component.materialFilter).toBe('');
    expect(component.selectedInventoryIds()).toEqual([]);
    expect(inventoryService.getInventory).toHaveBeenCalledWith({
      item: undefined,
      brand: undefined,
      color: undefined,
      size: undefined,
      type: undefined,
      material: undefined
    });
  });
});
