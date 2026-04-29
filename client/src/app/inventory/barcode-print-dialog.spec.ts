import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Inventory } from './inventory';
import { BarcodePrintDialog } from './barcode-print-dialog';

describe('BarcodePrintDialog', () => {
  let fixture: ComponentFixture<BarcodePrintDialog>;
  let component: BarcodePrintDialog;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BarcodePrintDialog>>;

  const itemA: Inventory = {
    internalID: 'item-a',
    internalBarcode: 'ITEM-00001',
    item: 'Markers',
    brand: 'Crayola',
    description: 'Washable markers',
    color: 'Blue',
    size: 'Wide',
    type: 'Washable',
    material: 'Plastic',
    quantity: 5,
    maxQuantity: 10,
    minQuantity: 1,
    stockState: 'stocked',
    notes: 'A',
  };

  const itemB: Inventory = {
    internalID: 'item-b',
    internalBarcode: 'ITEM-00002',
    item: 'Folders',
    brand: 'Office Depot',
    description: 'Pocket folders',
    color: 'Red',
    size: 'Letter',
    type: 'Two pocket',
    material: 'Paper',
    quantity: 7,
    maxQuantity: 20,
    minQuantity: 2,
    stockState: 'stocked',
    notes: 'B',
  };

  const itemC: Inventory = {
    internalID: 'item-c',
    internalBarcode: 'ITEM-00003',
    item: 'Pencils',
    brand: 'Ticonderoga',
    description: undefined,
    color: 'Yellow',
    size: 'No. 2',
    type: 'Graphite',
    material: 'Wood',
    quantity: 12,
    maxQuantity: 50,
    minQuantity: 5,
    stockState: 'stocked',
    notes: 'C',
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<BarcodePrintDialog>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [BarcodePrintDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { items: [itemA, itemB, itemC] } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodePrintDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('filters visible items by description without matching missing descriptions', () => {
    component.descriptionFilter = ' marker ';

    expect(component.filteredItems()).toEqual([itemA]);
  });

  it('selects visible filtered items without duplicating existing selections', () => {
    component.selectedItems = [itemA];
    component.descriptionFilter = 'marker';

    component.selectAllVisibleItems();

    expect(component.selectedItems).toEqual([itemA]);
  });

  it('selects all items including items hidden by the description filter', () => {
    component.descriptionFilter = 'marker';

    component.selectAllItems();

    expect(component.selectedItems).toEqual([itemA, itemB, itemC]);
  });

  it('toggles, clears, and returns selected items', () => {
    component.toggleSelectedItems(itemA, true);
    component.toggleSelectedItems(itemB, true);
    component.toggleSelectedItems(itemA, false);

    expect(component.isSelected(itemA)).toBeFalse();
    expect(component.isSelected(itemB)).toBeTrue();

    component.printSelectedItems();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([itemB]);

    component.clearSelectedItems();

    expect(component.selectedItems).toEqual([]);
  });

  it('clears the description filter and closes without selected items on cancel', () => {
    component.descriptionFilter = 'folder';

    component.clearDescriptionFilter();
    component.cancel();

    expect(component.descriptionFilter).toBe('');
    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});
