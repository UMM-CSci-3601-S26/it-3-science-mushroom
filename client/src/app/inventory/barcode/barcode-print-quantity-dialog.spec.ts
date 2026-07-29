import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { BarcodePrintQuantityDialog } from './barcode-print-quantity-dialog';
import { Inventory } from '../inventory';
import { DialogService } from '../../shared/dialog/dialog.service';

describe('BarcodePrintQuantityDialog', () => {
  let fixture: ComponentFixture<BarcodePrintQuantityDialog>;
  let component: BarcodePrintQuantityDialog;
  let dialogRefSpy: jasmine.SpyObj<MatDialogRef<BarcodePrintQuantityDialog>>;
  let dialogServiceSpy: jasmine.SpyObj<DialogService>;

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
    calculatedMinQuantity: 0,
    calculatedStockState: 'N/A',
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
    calculatedMinQuantity: 0,
    calculatedStockState: 'N/A',
    notes: 'B',
  };

  beforeEach(async () => {
    dialogRefSpy = jasmine.createSpyObj<MatDialogRef<BarcodePrintQuantityDialog>>('MatDialogRef', ['close']);
    dialogServiceSpy = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);
    dialogServiceSpy.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);

    await TestBed.configureTestingModule({
      imports: [BarcodePrintQuantityDialog, NoopAnimationsModule],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: { items: [itemA, itemB] } },
        { provide: MatDialogRef, useValue: dialogRefSpy },
        { provide: DialogService, useValue: dialogServiceSpy },
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
    component.rows[0].quantity = '3';
    component.rows[1].quantity = 2;

    component.print();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 3 },
      { item: itemB, quantity: 2 },
    ]);
  });

  it('normalizes invalid quantities to one copy', () => {
    component.rows[0].quantity = 'not-a-number';
    component.rows[1].quantity = -4;

    component.print();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 1 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('floors decimal quantities before printing', () => {
    component.rows[0].quantity = '2.9';

    component.print();

    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 2 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('asks for confirmation before printing more than the warning limit', () => {
    component.rows[0].quantity = 26;

    component.print();

    expect(dialogServiceSpy.openDialog).toHaveBeenCalledWith(
      {
        title: 'Large Label Quantity',
        message: 'You are printing more than 25 labels for: Markers (26). Continue?',
        buttonOne: 'Cancel',
        buttonTwo: 'Continue'
      },
      '560px',
      '230px'
    );
    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 26 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('does not close when printing over the warning limit is canceled', () => {
    dialogServiceSpy.openDialog.and.returnValue({
      afterClosed: () => of(false)
    } as never);
    component.rows[0].quantity = 26;

    component.print();

    expect(dialogRefSpy.close).not.toHaveBeenCalled();
  });

  it('lets the warning limit be changed before printing', () => {
    component.data.warningLimit = 30;
    component.rows[0].quantity = 26;

    component.print();

    expect(dialogServiceSpy.openDialog).not.toHaveBeenCalled();
    expect(dialogRefSpy.close).toHaveBeenCalledWith([
      { item: itemA, quantity: 26 },
      { item: itemB, quantity: 1 },
    ]);
  });

  it('falls back to the default warning limit when the saved setting is invalid', () => {
    dialogServiceSpy.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);
    component.data.warningLimit = 0;
    component.rows[0].quantity = 26;

    component.print();

    expect(dialogServiceSpy.openDialog).toHaveBeenCalledWith(
      {
        title: 'Large Label Quantity',
        message: 'You are printing more than 25 labels for: Markers (26). Continue?',
        buttonOne: 'Cancel',
        buttonTwo: 'Continue'
      },
      '560px',
      '230px'
    );
  });

  it('falls back to the default warning limit when the saved setting is missing', () => {
    dialogServiceSpy.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);
    component.data.warningLimit = undefined;
    component.rows[0].quantity = 26;

    component.print();

    expect(dialogServiceSpy.openDialog).toHaveBeenCalledWith(
      {
        title: 'Large Label Quantity',
        message: 'You are printing more than 25 labels for: Markers (26). Continue?',
        buttonOne: 'Cancel',
        buttonTwo: 'Continue'
      },
      '560px',
      '230px'
    );
  });

  it('tracks rows by internal ID', () => {
    expect(component.trackByInternalID(0, component.rows[0])).toBe('item-a');
  });

  it('closes without selections when canceled', () => {
    component.cancel();

    expect(dialogRefSpy.close).toHaveBeenCalledWith();
  });
});
