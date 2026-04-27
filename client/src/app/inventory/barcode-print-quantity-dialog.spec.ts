import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BarcodePrintQuantityDialog } from './barcode-print-quantity-dialog';
import { Inventory } from './inventory';

describe('BarcodePrintQuantityDialog', () => {
  let fixture: ComponentFixture<BarcodePrintQuantityDialog>;
  let component: BarcodePrintQuantityDialog;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BarcodePrintQuantityDialog>>;

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

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<BarcodePrintQuantityDialog>>('MatDialogRef', ['close']);

    await TestBed.configureTestingModule({
      imports: [BarcodePrintQuantityDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { items: [itemA, itemB] } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BarcodePrintQuantityDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts each selected item with one copy', () => {
    expect(component.rows).toEqual([
      { item: itemA, quantity: 1 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('returns quantity selections when printing', () => {
    component.rows[0].quantity = 3;
    component.rows[1].quantity = 2;

    component.print();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 3 },
      { item: itemB, quantity: 2 },
    ]);
  });

  it('normalizes invalid quantities to one copy', () => {
    component.rows[0].quantity = 0;
    component.rows[1].quantity = -4;

    component.print();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 1 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('closes without selections when canceled', () => {
    component.cancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});
