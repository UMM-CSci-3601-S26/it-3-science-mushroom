import { FormBuilder, FormControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';

import { Inventory } from './inventory';
import { ManualEntry, ManualEntryResult } from './manual-entry';
import { InventoryService } from './inventory.service';

describe('ManualEntry', () => {
  let component: ManualEntry;
  let inventoryServiceSpy: jasmine.SpyObj<InventoryService>;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<ManualEntry, ManualEntryResult>>;

  const itemA: Inventory = {
    internalID: 'inv-1',
    internalBarcode: 'ITEM-00001',
    externalBarcode: ['UPC-1', 'UPC-2'],
    item: 'Markers',
    description: 'Washable markers',
    brand: 'Crayola',
    color: 'Blue',
    packageSize: 8,
    size: 'Wide',
    type: 'Washable',
    material: 'Plastic',
    quantity: 5,
    notes: 'A',
    maxQuantity: 10,
    minQuantity: 1,
    stockState: 'stocked'
  };

  const itemB: Inventory = {
    internalID: 'inv-2',
    internalBarcode: 'ITEM-00002',
    externalBarcode: ['UPC-3'],
    item: 'Folders',
    description: 'Pocket folders',
    brand: 'Office Depot',
    color: 'Red',
    packageSize: 1,
    size: 'Letter',
    type: '2 Prong',
    material: 'Paper',
    quantity: 8,
    notes: 'B',
    maxQuantity: 12,
    minQuantity: 2,
    stockState: 'stocked'
  };

  function createComponent(data: { barcode: string; quantity: number } = { barcode: 'UPC-NEW', quantity: 3 }) {
    inventoryServiceSpy = jasmine.createSpyObj<InventoryService>('InventoryService', ['getInventory']);
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<ManualEntry, ManualEntryResult>>('MatDialogRef', ['close']);

    component = new ManualEntry(
      inventoryServiceSpy,
      new FormBuilder(),
      dialogRefSpy,
      data
    );
  }

  beforeEach(() => {
    createComponent();
  });

  it('loads inventory on init and refreshes filtered items on form changes', () => {
    inventoryServiceSpy.getInventory.and.returnValue(of([itemA, itemB]));

    component.ngOnInit();
    component.form.patchValue({ item: 'mark' });

    expect(inventoryServiceSpy.getInventory).toHaveBeenCalledWith({});
    expect(component.allInventory).toEqual([itemA, itemB]);
    expect(component.filteredItems).toEqual([itemA]);
  });

  it('clears inventory when loading inventory fails', () => {
    spyOn(console, 'error');
    inventoryServiceSpy.getInventory.and.returnValue(throwError(() => new Error('load failed')));

    component.loadInventory();

    expect(console.error).toHaveBeenCalled();
    expect(component.allInventory).toEqual([]);
    expect(component.filteredItems).toEqual([]);
  });

  it('returns control errors from validateInput', () => {
    const control = new FormControl('', { nonNullable: true });
    control.setErrors({ required: true } as ValidationErrors);

    expect(component.validateInput(control)).toEqual({ required: true });
  });

  it('selectExistingItem copies the selected item values into the form and preserves chosen quantity', () => {
    component.form.get('quantity')?.setValue(7);

    component.selectExistingItem(itemA);

    expect(component.selectedItem).toBe(itemA);
    expect(component.form.get('item')?.value).toBe('Markers');
    expect(component.form.get('brand')?.value).toBe('Crayola');
    expect(component.form.get('quantity')?.value).toBe(7);
  });

  it('clearSelectedItem resets the selected item and clears the form fields', () => {
    component.selectExistingItem(itemA);

    component.clearSelectedItem();

    expect(component.selectedItem).toBeNull();
    expect(component.form.get('item')?.value).toBe('');
    expect(component.form.get('brand')?.value).toBe('');
    expect(component.form.get('packageSize')?.value).toBe(0);
  });

  it('submits a match result when an existing item is selected', () => {
    component.selectedItem = itemA;
    component.form.get('quantity')?.setValue(0);

    component.submit();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      mode: 'match',
      selectedItem: itemA,
      quantity: 1
    });
  });

  it('submits a new item and saves the scanned barcode as an external barcode for non-internal scans', () => {
    component.form.patchValue({
      item: 'Glue',
      description: 'School glue',
      brand: 'Elmer',
      color: 'White',
      packageSize: 1,
      size: 'Small',
      type: 'Liquid',
      material: 'Glue',
      quantity: 4,
      notes: 'New',
      maxQuantity: 9,
      minQuantity: 1,
      stockState: 'low'
    });

    component.submit();

    expect(dialogRefSpy.close).toHaveBeenCalledWith({
      mode: 'new',
      newItem: {
        internalID: '',
        internalBarcode: '',
        externalBarcode: ['UPC-NEW'],
        item: 'Glue',
        description: 'School glue',
        brand: 'Elmer',
        color: 'White',
        packageSize: 1,
        size: 'Small',
        type: 'Liquid',
        material: 'Glue',
        quantity: 4,
        notes: 'New',
        maxQuantity: 9,
        minQuantity: 1,
        stockState: 'low'
      },
      quantity: 4
    });
  });

  it('does not save the scanned barcode as external when the scan is an internal barcode', () => {
    createComponent({ barcode: ' ITEM-00055 ', quantity: 2 });
    component.form.patchValue({ item: 'Tape', quantity: 2 });

    component.submit();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
      mode: 'new',
      newItem: jasmine.objectContaining({
        externalBarcode: []
      })
    }));
  });

  it('marks all controls as touched instead of closing when the form is invalid', () => {
    const markAllAsTouchedSpy = spyOn(component.form, 'markAllAsTouched');
    component.form.get('item')?.setValue('');

    component.submit();

    expect(markAllAsTouchedSpy).toHaveBeenCalled();
    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('closes the dialog with undefined on cancel', () => {
    component.cancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith(undefined);
  });

  it('filters inventory using the text fields', () => {
    component.allInventory = [itemA, itemB];
    component.form.patchValue({ item: 'mark', brand: 'cray', color: 'blu' });

    expect(component.getFilteredItems()).toEqual([itemA]);
  });

  it('matchesArray supports both arrays and strings', () => {
    expect(component['matchesArray'](['Alpha', 'Beta'], 'bet')).toBeTrue();
    expect(component['matchesArray']('Gamma', 'amm')).toBeTrue();
    expect(component['matchesArray'](['Alpha'], 'zzz')).toBeFalse();
    expect(component['matchesArray'](undefined, '')).toBeTrue();
  });

  it('stringifyExternalBarcode joins arrays and passes through strings', () => {
    expect(component.stringifyExternalBarcode(['A', 'B'])).toBe('A, B');
    expect(component.stringifyExternalBarcode('A')).toBe('A');
    expect(component.stringifyExternalBarcode(undefined)).toBe('');
  });

  it('trackByInternalID prefers internalID and falls back to item with index', () => {
    expect(component.trackByInternalID(0, itemA)).toBe('inv-1');
    expect(component.trackByInternalID(2, { ...itemA, internalID: '' })).toBe('Markers-2');
  });

  it('recognizes internal barcodes and reports display barcode text correctly', () => {
    expect(component.isInternalBarcode(' ITEM-123 ')).toBeTrue();
    expect(component.isInternalBarcode('UPC-123')).toBeFalse();
    expect(component.getDisplayExternalBarcode()).toBe('UPC-NEW');

    createComponent({ barcode: 'ITEM-00012', quantity: 1 });
    expect(component.getDisplayExternalBarcode()).toBe('Not saved from internal scan');

    createComponent({ barcode: '', quantity: 1 });
    expect(component.getDisplayExternalBarcode()).toBe('None');
  });
});
