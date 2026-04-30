import { FormBuilder, FormControl, ValidationErrors } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { Inventory } from '../inventory';
import { ManualEntry, ManualEntryResult } from './manual-entry';
import { InventoryService } from '../inventory.service';

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
    expect(component.form.get('packageSize')?.value).toBe(1);
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

  describe('ManualEntry branch coverage', () => {
    const existingItem: Inventory = {
      internalID: 'abc123',
      internalBarcode: 'ITEM-00001',
      externalBarcode: ['UPC-111'],
      item: 'Markers',
      description: 'Washable markers',
      brand: 'Crayola',
      color: 'Blue',
      packageSize: 8,
      size: 'Large',
      type: 'School',
      material: 'Plastic',
      quantity: 4,
      notes: 'Keep sealed',
      maxQuantity: 20,
      minQuantity: 2,
      stockState: 'Stocked'
    };

    it('should clear inventory lists when loadInventory fails', () => {
      inventoryServiceSpy.getInventory.and.returnValue(
        throwError(() => new Error('load failed'))
      )

      component.allInventory = [existingItem];
      component.filteredItems = [existingItem];

      component.loadInventory();

      expect(component.allInventory).toEqual([]);
      expect(component.filteredItems).toEqual([]);
    });

    it('should close with match result when selectedItem exists', () => {
      component.selectedItem = existingItem;
      component.form.get('quantity')?.setValue(3);

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        mode: 'match',
        selectedItem: existingItem,
        quantity: 3
      });
    });

    it('should create a new item and save scanned external barcode for non-internal scans', () => {
      component.selectedItem = null;
      component.data.barcode = '04940308';

      component.form.patchValue({
        item: 'Notebook',
        description: 'Wide ruled notebook',
        brand: 'Five Star',
        color: 'Yellow',
        packageSize: 1,
        size: 'Wide Ruled',
        type: 'Spiral',
        material: 'Paper',
        quantity: 2,
        notes: 'new',
        maxQuantity: 10,
        minQuantity: 1,
        stockState: 'Stocked'
      });

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        jasmine.objectContaining({
          mode: 'new',
          quantity: 2,
          newItem: jasmine.objectContaining({
            item: 'Notebook',
            externalBarcode: ['04940308'],
            quantity: 2
          })
        })
      );
    });

    it('should not save external barcode when scanned barcode is internal', () => {
      component.selectedItem = null;
      component.data.barcode = 'ITEM-00077';

      component.form.patchValue({
        item: 'Folder',
        quantity: 1
      });

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(
        jasmine.objectContaining({
          mode: 'new',
          newItem: jasmine.objectContaining({
            externalBarcode: []
          })
        })
      );
    });

    it('should default invalid quantity to 1 for selected item submit', () => {
      component.selectedItem = existingItem;
      component.form.get('quantity')?.setValue(0);

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith({
        mode: 'match',
        selectedItem: existingItem,
        quantity: 1
      });
    });

    it('should mark form as touched when submitting invalid new item', () => {
      component.selectedItem = null;
      component.form.patchValue({
        item: '',
        quantity: 1
      });

      const markSpy = spyOn(component.form, 'markAllAsTouched');

      component.submit();

      expect(markSpy).toHaveBeenCalled();
      expect(dialogRefSpy.close).not.toHaveBeenCalled();
    });

    it('should reset selected item and form values in clearSelectedItem', () => {
      component.selectedItem = existingItem;
      component.form.patchValue({
        item: 'Something',
        brand: 'Brand',
        color: 'Red',
        packageSize: 5,
        notes: 'x'
      });

      component.clearSelectedItem();

      expect(component.selectedItem).toBeNull();
      expect(component.form.get('item')?.value).toBe('');
      expect(component.form.get('brand')?.value).toBe('');
      expect(component.form.get('color')?.value).toBe('');
      expect(component.form.get('packageSize')?.value).toBe(1);
      expect(component.form.get('notes')?.value).toBe('');
    });

    it('should filter items by multiple fields', () => {
      component.allInventory = [
        existingItem,
        {
          ...existingItem,
          internalID: 'other',
          item: 'Folder',
          brand: 'OfficeCo',
          color: 'Red',
          size: 'Small',
          type: 'Pocket',
          material: 'Paper'
        }
      ];

      component.form.patchValue({
        item: 'mark',
        brand: 'cray',
        color: 'blu',
        size: 'lar',
        type: 'sch',
        material: 'plas'
      });

      const results = component.getFilteredItems();

      expect(results.length).toBe(1);
      expect(results[0].item).toBe('Markers');
    });

    it('should cover matchesArray for blank filter, array values, and string values', () => {
      const access = component as unknown as {
        matchesArray: (values: string[] | string | undefined, filter: string) => boolean;
      };

      expect(access.matchesArray(['A', 'B'], '')).toBeTrue();
      expect(access.matchesArray(['UPC-111', 'UPC-222'], '222')).toBeTrue();
      expect(access.matchesArray('ITEM-00001', '00001')).toBeTrue();
      expect(access.matchesArray(undefined, 'zzz')).toBeFalse();
    });

    it('should stringify external barcode arrays and strings', () => {
      expect(component.stringifyExternalBarcode(['A', 'B'])).toBe('A, B');
      expect(component.stringifyExternalBarcode('ABC')).toBe('ABC');
      expect(component.stringifyExternalBarcode(undefined)).toBe('');
    });

    it('should track by internalID or fall back to item-index', () => {
      expect(component.trackByInternalID(0, existingItem)).toBe('abc123');

      const noIdItem: Inventory = { ...existingItem, internalID: '' };
      expect(component.trackByInternalID(2, noIdItem)).toBe('Markers-2');
    });

    it('should identify internal barcodes correctly', () => {
      expect(component.isInternalBarcode('ITEM-12345')).toBeTrue();
      expect(component.isInternalBarcode(' item-9 ')).toBeTrue();
      expect(component.isInternalBarcode('04940308')).toBeFalse();
      expect(component.isInternalBarcode(undefined)).toBeFalse();
    });

    it('should return proper display external barcode text', () => {
      component.data.barcode = '';
      expect(component.getDisplayExternalBarcode()).toBe('None');

      component.data.barcode = 'ITEM-00011';
      expect(component.getDisplayExternalBarcode()).toBe('Not saved from internal scan');

      component.data.barcode = '04940308';
      expect(component.getDisplayExternalBarcode()).toBe('04940308');
    });

    it('should default form quantity to data.quantity when data.quantity is provided', () => {
      createComponent({ barcode: 'UPC-TEST', quantity: 5 });
      expect(component.form.get('quantity')?.value).toBe(5);
    });

    it('should default form quantity to 1 when data.quantity is undefined', () => {
      createComponent({ barcode: 'UPC-TEST', quantity: undefined as unknown as number });
      expect(component.form.get('quantity')?.value).toBe(1);
    });

    it('should use fallback values when selecting an item with null/undefined fields', () => {
      const itemWithNulls: Inventory = {
        internalID: 'null-test',
        internalBarcode: 'ITEM-NULL',
        externalBarcode: [],
        item: null as unknown as string,
        description: undefined as unknown as string,
        brand: null as unknown as string,
        color: undefined as unknown as string,
        packageSize: null as unknown as number,
        size: '',
        type: null as unknown as string,
        material: undefined as unknown as string,
        quantity: 1,
        notes: null as unknown as string,
        maxQuantity: null as unknown as number,
        minQuantity: undefined as unknown as number,
        stockState: null as unknown as string
      };

      component.selectExistingItem(itemWithNulls);

      expect(component.form.get('item')?.value).toBe('');
      expect(component.form.get('description')?.value).toBe('');
      expect(component.form.get('brand')?.value).toBe('');
      expect(component.form.get('packageSize')?.value).toBe(1);
      expect(component.form.get('notes')?.value).toBe('');
      expect(component.form.get('maxQuantity')?.value).toBe(0);
      expect(component.form.get('minQuantity')?.value).toBe(0);
    });

    it('should trim and handle empty string barcode data', () => {
      createComponent({ barcode: '   ', quantity: 1 });
      component.form.patchValue({ item: 'Test' });

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
        newItem: jasmine.objectContaining({
          externalBarcode: []
        })
      }));
    });

    it('should fallback to an empty string when matches() receives undefined value', () => {
      const access = component as unknown as {
        matches: (value: string | undefined, filter: string) => boolean;
      };

      expect(access.matches(undefined, 'test')).toBeFalse();
      expect(access.matches(undefined, '')).toBeTrue();
    });

    it('should handle submitting new item with null fields', () => {
      component.form.patchValue({
        item: 'Pen',
        description: null,
        brand: undefined,
        color: null,
        packageSize: null,
        size: '',
        type: undefined,
        material: null,
        quantity: 1,
        notes: null,
        maxQuantity: null,
        minQuantity: undefined,
        stockState: null
      });

      component.submit();

      expect(dialogRefSpy.close).toHaveBeenCalledWith(jasmine.objectContaining({
        newItem: jasmine.objectContaining({
          item: 'Pen',
          description: '',
          brand: '',
          color: '',
          packageSize: 1,
          size: '',
          type: '',
          material: '',
          notes: '',
          maxQuantity: 0,
          minQuantity: 0,
          stockState: ''
        })
      }));
    });
  });
});
