import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';

import {
  PurchaseListFulfillmentAllocationDialogComponent,
  PurchaseListFulfillmentAllocationDialogData
} from './purchase-list-fulfillment-allocation-dialog.component';

describe('PurchaseListFulfillmentAllocationDialogComponent', () => {
  let fixture: ComponentFixture<PurchaseListFulfillmentAllocationDialogComponent>;
  let component: PurchaseListFulfillmentAllocationDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PurchaseListFulfillmentAllocationDialogComponent>>;

  const data: PurchaseListFulfillmentAllocationDialogData = {
    itemDescription: 'Blue markers',
    totalNeeded: 20,
    options: [
      {
        internalId: 'ID-00001',
        inventoryId: 'inventory-1',
        item: 'Marker',
        description: 'Marker pack',
        quantityOnHand: 8
      },
      {
        internalId: 'ID-00002',
        inventoryId: 'inventory-2',
        item: 'Writing Tool',
        description: 'Writing tool pack',
        quantityOnHand: 10
      }
    ],
    existingAllocations: []
  };

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj<MatDialogRef<PurchaseListFulfillmentAllocationDialogComponent>>(
      'MatDialogRef',
      ['close']);

    await TestBed.configureTestingModule({
      imports: [
        PurchaseListFulfillmentAllocationDialogComponent,
        NoopAnimationsModule
      ],
      providers: [
        { provide: MAT_DIALOG_DATA, useValue: data },
        { provide: MatDialogRef, useValue: dialogRef }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PurchaseListFulfillmentAllocationDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('splits the needed quantity across selected options by default', () => {
    expect(component.rows.map(row => row.quantity)).toEqual([10, 10]);
    expect(component.allocatedTotal()).toBe(20);
  });

  it('returns allocations when the entered quantities match the needed total', () => {
    component.rows[0].quantity = 14;
    component.rows[1].quantity = 6;

    component.save();

    expect(dialogRef.close).toHaveBeenCalledWith([
      { internalId: 'ID-00001', quantity: 14 },
      { internalId: 'ID-00002', quantity: 6 }
    ]);
  });

  it('closes without allocations when canceled', () => {
    component.cancel();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('requires each selected option to have a positive quantity', () => {
    component.rows[0].quantity = 0;
    component.rows[1].quantity = 20;

    component.save();

    expect(component.error).toBe('Each selected item needs a quantity.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('treats non-number quantities as zero', () => {
    component.rows[0].quantity = 'not a number';
    component.rows[1].quantity = 20;

    expect(component.allocatedTotal()).toBe(20);

    component.save();

    expect(component.error).toBe('Each selected item needs a quantity.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('clears the current validation error when the quantity changes', () => {
    component.error = 'Allocated quantity must equal 20.';

    component.clearError();

    expect(component.error).toBe('');
  });

  it('does not close when quantities do not match the needed total', () => {
    component.rows[0].quantity = 14;
    component.rows[1].quantity = 5;

    component.save();

    expect(component.error).toBe('Allocated quantity must equal 20.');
    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
