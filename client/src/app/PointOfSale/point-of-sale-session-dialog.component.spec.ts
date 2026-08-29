import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';

import { Family, FamilyChecklist } from '../family/family';
import { FamilyService } from '../family/family.service';
import { Inventory } from '../inventory/inventory';
import { InventoryService } from '../inventory/inventory.service';
import { DialogService } from '../shared/dialog/dialog.service';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

describe('PointOfSaleSessionDialogComponent', () => {
  let fixture: ComponentFixture<PointOfSaleSessionDialogComponent>;
  let component: PointOfSaleSessionDialogComponent;
  let familyService: jasmine.SpyObj<FamilyService>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PointOfSaleSessionDialogComponent>>;
  let dialogService: jasmine.SpyObj<DialogService>;

  const checklist: FamilyChecklist = {
    templateId: 'family-1-session',
    printableTitle: 'Test Family',
    snapshot: true,
    sections: [
      {
        id: 'student-1',
        title: 'Sam',
        printableTitle: 'Sam',
        saved: false,
        items: [
          {
            id: 'student-1-item-1',
            label: 'Pencil',
            selected: false,
            available: true,
            matchedInventoryId: 'INV-1',
            matchedInventoryItem: 'Yellow Pencil',
            matchedInventoryDescription: 'Yellow #2 Pencil',
            requestedQuantity: 2
          },
          {
            id: 'student-1-item-2',
            label: 'Folder',
            selected: false,
            available: true,
            requestedQuantity: 1
          },
          {
            id: 'student-1-item-3',
            label: 'Markers',
            selected: false,
            available: false,
            requestedQuantity: 1,
            substituteBarcode: 'ITEM-00002',
            substituteInventoryId: 'INV-2',
            substituteItem: 'Marker',
            substituteDescription: 'Black Marker'
          }
        ]
      }
    ]
  };

  const family: Family = {
    _id: 'family-1',
    guardianName: 'Test Family',
    email: 'test@example.com',
    address: '123 Test Street',
    accommodations: 'None',
    needSpanishHelp: false,
    timeSlot: '9:00-10:00',
    students: [
      {
        name: 'Sam',
        grade: '3',
        school: 'Test Elementary',
        schoolAbbreviation: 'TE',
        teacher: 'Ms. Test',
        headphones: false,
        backpack: true
      }
    ],
    checklist
  };

  beforeEach(async () => {
    family._id = 'family-1';
    familyService = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'startFamilyHelpSession',
      'clearFamilyHelpSession',
      'updateFamilyChecklist',
      'saveFamilyHelpSessionAll'
    ]);
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', [
      'lookUpByBarcode',
      'refreshInventory'
    ]);
    const inventoryItems: Inventory[] = [
      {
        internalID: 'INV-2',
        internalBarcode: 'ITEM-00002',
        item: 'Marker',
        brand: 'Expo',
        size: '',
        color: 'Black',
        type: '',
        material: '',
        description: 'Black Marker',
        quantity: 4,
        reservedQuantity: 1,
        maxQuantity: 10,
        minQuantity: 0,
        calculatedMinQuantity: 0,
        stockState: 'Stocked',
        calculatedStockState: 'N/A',
        notes: '',
        externalBarcode: ['UPC-2']
      },
      {
        internalID: 'INV-3',
        internalBarcode: 'ITEM-00003',
        item: 'Marker',
        brand: 'Crayola',
        size: '',
        color: 'Blue',
        type: '',
        material: '',
        description: 'Blue Marker',
        quantity: 3,
        reservedQuantity: 3,
        maxQuantity: 10,
        minQuantity: 0,
        calculatedMinQuantity: 0,
        stockState: 'Stocked',
        calculatedStockState: 'N/A',
        notes: '',
        externalBarcode: ['UPC-3']
      },
      {
        internalID: 'INV-4',
        internalBarcode: 'ITEM-00004',
        item: 'Binder',
        brand: '',
        size: '',
        color: '',
        type: '',
        material: '',
        description: 'Wide Ruled Notebook',
        quantity: 5,
        reservedQuantity: 0,
        maxQuantity: 10,
        minQuantity: 0,
        calculatedMinQuantity: 0,
        stockState: 'Stocked',
        calculatedStockState: 'N/A',
        notes: '',
        externalBarcode: ['UPC-4']
      },
      {
        internalID: 'INV-5',
        internalBarcode: 'ITEM-00005',
        item: 'Marker Set',
        brand: '',
        size: '',
        color: '',
        type: '',
        material: '',
        description: 'Washable Marker Set',
        quantity: 5,
        reservedQuantity: 0,
        maxQuantity: 10,
        minQuantity: 0,
        calculatedMinQuantity: 0,
        stockState: 'Stocked',
        calculatedStockState: 'N/A',
        notes: '',
        externalBarcode: ['UPC-5']
      }
    ];
    Object.defineProperty(inventoryService, 'inventory', { value: signal(inventoryItems) });
    dialogRef = jasmine.createSpyObj<MatDialogRef<PointOfSaleSessionDialogComponent>>('MatDialogRef', ['close']);
    dialogService = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);

    familyService.startFamilyHelpSession.and.returnValue(of(family));
    familyService.clearFamilyHelpSession.and.returnValue(of(family));
    familyService.updateFamilyChecklist.and.returnValue(of(family));
    familyService.saveFamilyHelpSessionAll.and.returnValue(of(family));
    inventoryService.refreshInventory.and.returnValue(of(inventoryItems));
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);
    checklist.sections[0].items[0].label = 'Pencil';
    checklist.sections[0].items[0].available = true;
    checklist.sections[0].items[0].matchedInventoryId = 'INV-1';
    checklist.sections[0].items[0].matchedInventoryItem = 'Yellow Pencil';
    checklist.sections[0].items[0].matchedInventoryDescription = 'Yellow #2 Pencil';
    checklist.sections[0].items[0].requestedQuantity = 2;
    checklist.sections[0].items[0].selected = false;
    checklist.sections[0].items[0].notPickedUpReason = undefined;
    checklist.sections[0].items[0].substituteBarcode = undefined;
    checklist.sections[0].items[0].substituteInventoryId = undefined;
    checklist.sections[0].items[0].substituteItem = undefined;
    checklist.sections[0].items[0].substituteDescription = undefined;
    checklist.sections[0].items[0].fulfillmentItems = [];
    checklist.sections[0].items[1].label = 'Folder';
    checklist.sections[0].items[1].selected = false;
    checklist.sections[0].items[1].available = true;
    checklist.sections[0].items[1].requestedQuantity = 1;
    checklist.sections[0].items[1].notPickedUpReason = undefined;
    checklist.sections[0].items[1].substituteBarcode = undefined;
    checklist.sections[0].items[1].substituteInventoryId = undefined;
    checklist.sections[0].items[1].substituteItem = undefined;
    checklist.sections[0].items[1].substituteDescription = undefined;
    checklist.sections[0].items[1].fulfillmentItems = [];
    checklist.sections[0].items[2].label = 'Markers';
    checklist.sections[0].items[2].selected = false;
    checklist.sections[0].items[2].available = false;
    checklist.sections[0].items[2].requestedQuantity = 1;
    checklist.sections[0].items[2].notPickedUpReason = undefined;
    checklist.sections[0].items[2].substituteBarcode = 'ITEM-00002';
    checklist.sections[0].items[2].substituteInventoryId = 'INV-2';
    checklist.sections[0].items[2].substituteItem = 'Marker';
    checklist.sections[0].items[2].substituteDescription = 'Black Marker';
    checklist.sections[0].items[2].fulfillmentItems = [];
    inventoryService.lookUpByBarcode.and.returnValue(of({
      internalID: 'INV-2',
      internalBarcode: 'ITEM-00002',
      item: 'Marker',
      brand: 'Expo',
      size: '',
      color: 'Black',
      type: '',
      material: '',
      description: 'Black Marker',
      quantity: 4,
      reservedQuantity: 1,
      maxQuantity: 10,
      minQuantity: 0,
      calculatedMinQuantity: 0,
      stockState: 'Stocked',
      calculatedStockState: 'N/A',
      notes: '',
      externalBarcode: ['UPC-2']
    }));

    await TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: DialogService, useValue: dialogService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { family } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PointOfSaleSessionDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts a help session when opened', () => {
    expect(familyService.startFamilyHelpSession).toHaveBeenCalledOnceWith('family-1');
    expect(inventoryService.refreshInventory).toHaveBeenCalledTimes(1);
    expect(component.loading).toBeFalse();
    expect(component.sessionFamily).toEqual(family);
  });

  it('refreshes inventory before showing the started session', () => {
    const refreshDone = new Subject<Inventory[]>();
    familyService.startFamilyHelpSession.calls.reset();
    inventoryService.refreshInventory.calls.reset();
    inventoryService.refreshInventory.and.returnValue(refreshDone);
    component.sessionFamily = undefined;
    component.loading = true;

    component.ngOnInit();

    expect(familyService.startFamilyHelpSession).toHaveBeenCalledOnceWith('family-1');
    expect(inventoryService.refreshInventory).toHaveBeenCalledTimes(1);
    expect(component.sessionFamily).toBeUndefined();
    expect(component.loading).toBeTrue();

    refreshDone.next([]);
    refreshDone.complete();

    expect(component.sessionFamily).toEqual(family);
    expect(component.loading).toBeFalse();
  });

  it('reports empty generated checklists only when every section has no items', () => {
    expect(component.sessionHasNoChecklistItems(family)).toBeFalse();

    const emptyFamily = {
      ...family,
      checklist: {
        ...checklist,
        sections: [{ ...checklist.sections[0], items: [] }]
      }
    };

    expect(component.sessionHasNoChecklistItems(emptyFamily)).toBeTrue();
    expect(component.sessionHasNoChecklistItems({ ...family, checklist: undefined })).toBeFalse();
  });

  it('returns students by section index', () => {
    expect(component.studentForSection(0)?.name).toBe('Sam');
    expect(component.studentForSection(1)).toBeUndefined();
  });

  it('shows matched inventory only for available substitute-style matches', () => {
    const exactMatch = {
      ...checklist.sections[0].items[0],
      label: 'Yellow Pencil',
      matchedInventoryDescription: 'Yellow Pencil'
    };
    const unavailable = {
      ...checklist.sections[0].items[0],
      available: false
    };
    const unknown = {
      ...checklist.sections[0].items[0],
      matchedInventoryDescription: undefined,
      matchedInventoryItem: undefined
    };

    expect(component.shouldShowMatchedInventory(checklist.sections[0].items[0])).toBeTrue();
    expect(component.shouldShowMatchedInventory(exactMatch)).toBeFalse();
    expect(component.shouldShowMatchedInventory(unavailable)).toBeFalse();
    expect(component.shouldShowMatchedInventory(unknown)).toBeFalse();
    expect(component.matchedInventoryDisplay(unknown)).toBe('Unknown inventory item');
  });

  it('uses substitute and matched inventory display fallbacks', () => {
    expect(component.substituteDisplay({
      ...checklist.sections[0].items[0],
      substituteDescription: undefined,
      substituteItem: 'Crayons',
      substituteBarcode: 'UPC-CRAYON'
    })).toBe('Crayons');
    expect(component.substituteDisplay({
      ...checklist.sections[0].items[0],
      substituteDescription: undefined,
      substituteItem: undefined,
      substituteBarcode: 'UPC-CRAYON'
    })).toBe('UPC-CRAYON');
    expect(component.substituteDisplay({
      ...checklist.sections[0].items[0],
      substituteDescription: undefined,
      substituteItem: undefined,
      substituteBarcode: undefined
    })).toBe('Unknown substitute item');

    expect(component.shouldShowMatchedInventory({
      ...checklist.sections[0].items[0],
      label: '',
      itemDescription: 'Pencil',
      matchedInventoryDescription: '',
      matchedInventoryItem: 'Pencil'
    })).toBeFalse();
  });

  it('labels substitute matches as suggestions until they are selected', () => {
    expect(component.substituteMatchLabel({
      ...checklist.sections[0].items[0],
      selected: false,
      substituteBarcode: 'UPC-2'
    })).toBe('Suggested substitute');
    expect(component.substituteMatchLabel({
      ...checklist.sections[0].items[0],
      selected: true,
      substituteBarcode: 'UPC-2'
    })).toBe('Replacing with');
  });

  it('labels selected substituted items separately from normal availability', () => {
    expect(component.itemStatusLabel({
      ...checklist.sections[0].items[0],
      selected: true,
      substituteBarcode: 'UPC-2'
    })).toBe('Substituted');
    expect(component.itemStatusLabel({
      ...checklist.sections[0].items[0],
      selected: false,
      substituteBarcode: 'UPC-2'
    })).toBe('Available');
    expect(component.itemStatusLabel({
      ...checklist.sections[0].items[0],
      available: false,
      selected: false,
      substituteBarcode: undefined
    })).toBe('Needs review');
  });

  it('saves the current checklist as a draft when closing', () => {
    component.closeAndSaveDraft();

    const savedChecklist = familyService.updateFamilyChecklist.calls.mostRecent().args[1];
    const savedItems = savedChecklist.sections[0].items;
    expect(savedItems.find(item => item.id === 'student-1-item-2')?.notPickedUpReason).toBeUndefined();
    expect(savedItems.find(item => item.id === 'student-1-item-3')?.notPickedUpReason).toBeUndefined();
    expect(dialogRef.close).toHaveBeenCalledWith({ draftSaved: true });
  });

  it('saves linked substitute items in the draft payload', () => {
    const item = checklist.sections[0].items[0];
    component.applySubstituteBarcode(item, 'UPC-2');

    component.closeAndSaveDraft();

    const savedChecklist = familyService.updateFamilyChecklist.calls.mostRecent().args[1];
    const savedItem = savedChecklist.sections[0].items[0];
    expect(savedItem.selected).toBeTrue();
    expect(savedItem.notPickedUpReason).toBe('substituted');
    expect(savedItem.substituteInventoryId).toBe('INV-2');
    expect(savedItem.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        barcode: 'UPC-2',
        quantity: 2
      })
    ]);
  });

  it('does not save a draft when linked substitutes exceed unreserved inventory across the session', () => {
    checklist.sections[0].items[0].fulfillmentItems = [{
      inventoryId: 'INV-2',
      barcode: 'UPC-2',
      item: 'Marker',
      description: 'Black Marker',
      quantity: 2
    }];
    checklist.sections[0].items[1].fulfillmentItems = [{
      inventoryId: 'INV-2',
      barcode: 'UPC-2',
      item: 'Marker',
      description: 'Black Marker',
      quantity: 2
    }];

    component.closeAndSaveDraft();

    expect(familyService.updateFamilyChecklist).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('Reduce linked substitute "Black Marker" to 3 or less');
  });

  it('closes without saving a draft if the family id or checklist is missing', () => {
    component.sessionFamily = { ...family, checklist: undefined };

    component.closeAndSaveDraft();

    expect(familyService.updateFamilyChecklist).toHaveBeenCalledTimes(0);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('closes without saving a draft if the family id is missing', () => {
    component.data.family._id = undefined;

    component.closeAndSaveDraft();

    expect(familyService.updateFamilyChecklist).toHaveBeenCalledTimes(0);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('shows a useful error when saving a draft fails', () => {
    familyService.updateFamilyChecklist.and.returnValue(throwError(() => new Error('draft failed')));

    component.closeAndSaveDraft();

    expect(component.saving).toBeFalse();
    expect(component.errorMessage).toContain('Failed to save session draft');
  });

  it('can close without clearing or saving a stale session', () => {
    const closeButton = fixture.nativeElement.querySelector('.close-session-button') as HTMLButtonElement;

    closeButton.click();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledTimes(0);
    expect(familyService.updateFamilyChecklist).toHaveBeenCalledTimes(0);
    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
    expect(dialogRef.close).toHaveBeenCalledWith({ refresh: true });
  });

  it('clears a session when the user confirms the x action', () => {
    component.clearSessionAndClose();

    expect(dialogService.openDialog).toHaveBeenCalledWith({
      title: 'Clear Session',
      message: 'Clear this help session and discard the current checklist snapshot?',
      buttonOne: 'Cancel',
      buttonTwo: 'Clear Session'
    }, '520px', '230px');
    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledWith('family-1');
    expect(dialogRef.close).toHaveBeenCalledWith({ cleared: true });
  });

  it('does not clear a session when the user cancels the x action', () => {
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(false)
    } as never);

    component.clearSessionAndClose();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledTimes(0);
  });

  it('closes without clearing if the family id is missing', () => {
    component.data.family._id = undefined;

    component.clearSessionAndClose();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledTimes(0);
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('shows a useful error when clearing a session fails', () => {
    familyService.clearFamilyHelpSession.and.returnValue(throwError(() => new Error('clear failed')));

    component.clearSessionAndClose();

    expect(component.saving).toBeFalse();
    expect(component.errorMessage).toContain('Failed to clear session');
  });

  it('saves a completed session when the user confirms', () => {
    checklist.sections[0].items[0].selected = true;
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.saveCompletedSession();

    expect(dialogService.openDialog).toHaveBeenCalledWith({
      title: 'Complete Family Session',
      message: 'Are you sure you are done helping this family? This will remove selected item quantities from inventory.',
      buttonOne: 'Cancel',
      buttonTwo: 'Complete'
    }, '560px', '230px');
    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledWith('family-1', jasmine.any(Object));
    expect(dialogRef.close).toHaveBeenCalledWith({ completed: true });
  });

  it('requires a reason before finalizing unchecked available items', () => {
    component.saveCompletedSession();

    expect(component.errorMessage).toContain('Choose why');
    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
  });

  it('keeps reason controls visible after an unchecked item validation error', () => {
    component.saveCompletedSession();
    fixture.detectChanges();

    const errorText = fixture.nativeElement.querySelector('.session-error')?.textContent;
    const reasonSelect = fixture.nativeElement.querySelector('.reason-field mat-select');

    expect(errorText).toContain('Choose why');
    expect(reasonSelect).not.toBeNull();
  });

  it('clears the validation message when the user picks a reason', () => {
    const item = checklist.sections[0].items[1];
    component.saveCompletedSession();

    component.setNotPickedUpReason(item, 'available_didnt_need');

    expect(component.errorMessage).toBe('');
    expect(item.notPickedUpReason).toBe('available_didnt_need');
  });

  it('does not save a completed session when the user cancels', () => {
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(false)
    } as never);
    checklist.sections[0].items[0].selected = true;
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.saveCompletedSession();

    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
  });

  it('does not save a completed session if the family id or checklist is missing', () => {
    component.data.family._id = undefined;
    component.saveCompletedSession();
    component.data.family._id = 'family-1';
    component.sessionFamily = { ...family, checklist: undefined };
    component.saveCompletedSession();

    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
  });

  it('shows a useful error when saving a completed session fails', () => {
    familyService.saveFamilyHelpSessionAll.and.returnValue(throwError(() => new Error('save failed')));
    checklist.sections[0].items[0].selected = true;
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.saveCompletedSession();

    expect(component.saving).toBeFalse();
    expect(component.errorMessage).toContain('Failed to save completed session');
  });

  it('applies a scanned substitute item and marks the checklist item as substituted', () => {
    const item = checklist.sections[0].items[0];

    component.applySubstituteBarcode(item, 'UPC-2');

    expect(inventoryService.lookUpByBarcode).toHaveBeenCalledWith('UPC-2');
    expect(item.selected).toBeTrue();
    expect(item.substituteBarcode).toBe('UPC-2');
    expect(item.substituteInventoryId).toBe('INV-2');
    expect(item.substituteItem).toBe('Marker');
    expect(item.notPickedUpReason).toBe('substituted');
    expect(item.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        barcode: 'UPC-2',
        item: 'Marker',
        description: 'Black Marker',
        quantity: 2
      })
    ]);
    expect(component.substituteDisplay(item)).toBe('Black Marker');
  });

  it('links multiple substitute inventory items with separate quantities', () => {
    const item = checklist.sections[0].items[0];
    item.label = 'Markers';
    item.requestedQuantity = 3;

    component.applySubstituteBarcode(item, 'UPC-2');

    expect(component.fulfilledQuantity(item)).toBe(3);
    component.setFulfillmentItemQuantity(item, item.fulfillmentItems![0], {
      target: { value: '1' }
    } as unknown as Event);
    component.applySubstituteOption(
      item,
      inventoryService.inventory().find(inventory => inventory.internalID === 'INV-5')!
    );

    expect(item.selected).toBeTrue();
    expect(item.notPickedUpReason).toBe('substituted');
    expect(item.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        quantity: 1
      }),
      jasmine.objectContaining({
        inventoryId: 'INV-5',
        quantity: 2
      })
    ]);
    expect(component.fulfilledQuantity(item)).toBe(3);
    expect(component.linkedFulfillmentItemCount(item)).toBe(2);
    expect(component.substituteDisplay(item)).toBe('Quantity: 3, linked: 2, requested: 3');
  });

  it('caps linked substitute quantities at unreserved inventory while allowing more than requested', () => {
    const item = checklist.sections[0].items[0];
    item.requestedQuantity = 1;

    component.applySubstituteBarcode(item, 'UPC-2');
    component.setFulfillmentItemQuantity(item, item.fulfillmentItems![0], {
      target: { value: '9' }
    } as unknown as Event);

    expect(component.maxFulfillmentItemQuantity(item.fulfillmentItems![0])).toBe(3);
    expect(component.fulfillmentInventoryAvailableDisplay(item.fulfillmentItems![0])).toBe('3');
    expect(item.fulfillmentItems![0].quantity).toBe(3);
    expect(component.fulfilledQuantity(item)).toBe(3);
    expect(component.substituteDisplay(item)).toBe('Black Marker');
  });

  it('caps repeated links to the same substitute at unreserved inventory', () => {
    const item = checklist.sections[0].items[0];
    item.requestedQuantity = 10;

    component.applySubstituteBarcode(item, 'UPC-2');
    component.applySubstituteBarcode(item, 'UPC-2');

    expect(item.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        quantity: 3
      })
    ]);
    expect(component.fulfilledQuantity(item)).toBe(3);
  });

  it('does not change a linked substitute quantity when no unreserved inventory is available', () => {
    const item = checklist.sections[0].items[0];
    item.fulfillmentItems = [{
      inventoryId: 'INV-3',
      barcode: 'UPC-3',
      item: 'Marker',
      description: 'Blue Marker',
      quantity: 1
    }];
    const input = { value: '2' } as HTMLInputElement;

    component.setFulfillmentItemQuantity(item, item.fulfillmentItems[0], {
      target: input
    } as unknown as Event);

    expect(component.maxFulfillmentItemQuantity(item.fulfillmentItems[0])).toBe(0);
    expect(item.fulfillmentItems[0].quantity).toBe(1);
    expect(input.value).toBe('1');
    expect(component.errorMessage).toContain('No unreserved quantity');
  });

  it('uses the fulfillment inventory id as the source of truth for inventory quantity caps', () => {
    expect(component.maxFulfillmentItemQuantity({
      inventoryId: 'INV-5',
      barcode: 'UPC-2',
      quantity: 1
    })).toBe(5);
  });

  it('shows the unreserved inventory cap for linked substitute rows', () => {
    const item = checklist.sections[0].items[0];
    item.requestedQuantity = 1;

    component.applySubstituteBarcode(item, 'UPC-2');
    fixture.detectChanges();

    const inventoryLabel = fixture.nativeElement.querySelector('.fulfillment-copy span:last-child') as HTMLElement;
    const quantityInput = fixture.nativeElement.querySelector('.fulfillment-quantity input') as HTMLInputElement;
    expect(inventoryLabel.textContent?.trim()).toBe('Unreserved: 3');
    expect(quantityInput.getAttribute('max')).toBe('3');
  });

  it('allows adding more substitute items after the requested amount is met', () => {
    const item = checklist.sections[0].items[0];
    item.label = 'Markers';
    item.requestedQuantity = 1;

    component.applySubstituteBarcode(item, 'UPC-2');
    component.applySubstituteOption(
      item,
      inventoryService.inventory().find(inventory => inventory.internalID === 'INV-5')!
    );

    expect(item.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        quantity: 1
      }),
      jasmine.objectContaining({
        inventoryId: 'INV-5',
        quantity: 1
      })
    ]);
    expect(component.fulfilledQuantity(item)).toBe(2);
    expect(component.linkedFulfillmentItemCount(item)).toBe(2);
    expect(component.substituteDisplay(item)).toBe('Quantity: 2, linked: 2, requested: 1');
  });

  it('allows finalizing linked substitute quantities above the requested amount', () => {
    const item = checklist.sections[0].items[0];
    item.requestedQuantity = 1;
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.applySubstituteBarcode(item, 'UPC-2');
    component.setFulfillmentItemQuantity(item, item.fulfillmentItems![0], {
      target: { value: '12' }
    } as unknown as Event);

    component.saveCompletedSession();

    const savedChecklist = familyService.saveFamilyHelpSessionAll.calls.mostRecent().args[1];
    expect(savedChecklist.sections[0].items[0].fulfillmentItems![0].quantity).toBe(3);
    expect(component.errorMessage).toBe('');
  });

  it('handles substitution scanner toggles, blank scans, and lookup failures', () => {
    const item = checklist.sections[0].items[2];
    inventoryService.lookUpByBarcode.and.returnValue(throwError(() => new Error('missing')));

    component.toggleSubstitutionScanner(item);
    expect(component.activeSubstitutionItemId).toBe(item.id);
    component.toggleSubstitutionScanner(item);
    expect(component.activeSubstitutionItemId).toBe('');

    component.applySubstituteBarcode(item, '   ');
    expect(inventoryService.lookUpByBarcode).toHaveBeenCalledTimes(0);

    component.applySubstituteBarcode(item, 'UPC-MISSING');
    expect(component.substituteErrorMessage).toContain('UPC-MISSING');
  });

  it('keeps suggested items eligible for substitution after clearing the current substitute', () => {
    const item = checklist.sections[0].items[2];

    expect(component.canSubstitute(item)).toBeTrue();

    component.clearSubstitution(item);

    expect(component.hasSubstitute(item)).toBeFalse();
    expect(component.canSubstitute(item)).toBeTrue();
  });

  it('opens the substitution workflow for items without a suggestion', () => {
    const item = checklist.sections[0].items[1];

    component.toggleSubstitutionPanel(item);

    expect(component.canSubstitute(item)).toBeTrue();
    expect(component.substitutionOptionsFor(item)).toEqual([]);
    expect(component.activeSubstitutionItemId).toBe(item.id);
  });

  it('allows matched inventory items to be substituted', () => {
    const item = checklist.sections[0].items[0];

    component.toggleSubstitutionPanel(item);

    expect(component.canSubstitute(item)).toBeTrue();
    expect(component.activeSubstitutionItemId).toBe(item.id);
  });

  it('removes substitution access after an item is confirmed selected', () => {
    const item = checklist.sections[0].items[0];

    component.toggleSubstitutionPanel(item);
    component.substituteErrorMessage = 'Scan failed';

    expect(component.activeSubstitutionItemId).toBe(item.id);

    component.setItemSelected(item, true);

    expect(component.canSubstitute(item)).toBeFalse();
    expect(component.activeSubstitutionItemId).toBe('');
    expect(component.substituteErrorMessage).toBe('');
  });

  it('lists related substitution options from unreserved inventory', () => {
    const item = checklist.sections[0].items[2];

    const options = component.substitutionOptionsFor(item);

    expect(options.map(option => option.internalID)).toEqual(['INV-2', 'INV-5']);
    expect(component.unreservedQuantity(options[0])).toBe(3);
  });

  it('keeps substitution matching related but allows partial item tokens', () => {
    const options = component.substitutionOptionsFor({
      id: 'manual-marker-item',
      label: 'Markers',
      selected: false,
      available: true,
      requestedQuantity: 1
    });

    expect(options.map(option => option.internalID)).toEqual(['INV-2', 'INV-5']);
  });

  it('ignores quantity and size-only token matches in substitution options', () => {
    const options = component.substitutionOptionsFor({
      id: 'manual-tissue-item',
      label: '1 Pack of Tissues',
      selected: false,
      available: false,
      requestedQuantity: 1
    });

    expect(options.map(option => option.internalID)).not.toContain('INV-4');
    expect(options).toEqual([]);
  });

  it('filters substitution options by description search', () => {
    const item = checklist.sections[0].items[2];
    component.setSubstitutionDescriptionSearch(item, {
      target: { value: 'blue' }
    } as unknown as Event);

    expect(component.substitutionDescriptionSearchFor(item)).toBe('blue');
    expect(component.substitutionOptionsFor(item)).toEqual([]);

    component.setSubstitutionDescriptionSearch(item, {
      target: { value: 'black' }
    } as unknown as Event);

    expect(component.substitutionOptionsFor(item).map(option => option.internalID)).toEqual(['INV-2']);
  });

  it('applies a substitute from the suggestions list', () => {
    const item = checklist.sections[0].items[2];
    component.clearSubstitution(item);

    component.applySubstituteOption(item, component.substitutionOptionsFor(item)[0]);

    expect(item.selected).toBeTrue();
    expect(item.substituteBarcode).toBe('ITEM-00002');
    expect(item.substituteInventoryId).toBe('INV-2');
    expect(item.substituteItem).toBe('Marker');
    expect(item.substituteDescription).toBe('Black Marker');
    expect(item.notPickedUpReason).toBe('substituted');
    expect(item.fulfillmentItems).toEqual([
      jasmine.objectContaining({
        inventoryId: 'INV-2',
        barcode: 'ITEM-00002',
        quantity: 1
      })
    ]);
  });

  it('clears substitution data when a substituted item is selected again', () => {
    const item = checklist.sections[0].items[0];
    item.selected = false;
    item.notPickedUpReason = 'substituted';
    item.substituteBarcode = 'UPC-2';
    item.substituteInventoryId = 'INV-2';
    item.substituteItem = 'Marker';
    item.substituteDescription = 'Black Marker';

    expect(component.hasSubstitute(item)).toBeTrue();
    expect(component.needsReason(item)).toBeFalse();

    component.setItemSelected(item, true);

    expect(item.selected).toBeTrue();
    expect(component.hasSubstitute(item)).toBeFalse();
    expect(item.fulfillmentItems).toEqual([]);
    expect(item.notPickedUpReason).toBeUndefined();
  });

  it('clears substitution data directly', () => {
    const item = checklist.sections[0].items[0];
    item.notPickedUpReason = 'substituted';
    item.substituteBarcode = 'UPC-2';
    item.substituteInventoryId = 'INV-2';
    item.substituteItem = 'Marker';
    item.substituteDescription = 'Black Marker';

    component.clearSubstitution(item);

    expect(item.substituteBarcode).toBeUndefined();
    expect(item.substituteInventoryId).toBeUndefined();
    expect(item.substituteItem).toBeUndefined();
    expect(item.substituteDescription).toBeUndefined();
    expect(item.fulfillmentItems).toEqual([]);
    expect(item.notPickedUpReason).toBeUndefined();
  });

  it('regenerates a session by clearing before starting again', () => {
    component.restartSession();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledWith('family-1');
    expect(familyService.startFamilyHelpSession).toHaveBeenCalledTimes(2);
  });

  it('shows a useful error if regenerating a session fails', () => {
    familyService.clearFamilyHelpSession.and.returnValue(throwError(() => new Error('regenerate failed')));

    component.restartSession();

    expect(component.loading).toBeFalse();
    expect(component.errorMessage).toContain('Failed to regenerate help session');
  });

  it('shows a useful error if a session fails to start', () => {
    TestBed.resetTestingModule();
    familyService.startFamilyHelpSession.and.returnValue(throwError(() => new Error('server down')));

    TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { family } }
      ]
    });

    const errorFixture = TestBed.createComponent(PointOfSaleSessionDialogComponent);
    const errorComponent = errorFixture.componentInstance;
    errorFixture.detectChanges();

    expect(errorComponent.loading).toBeFalse();
    expect(errorComponent.errorMessage).toContain('Failed to start help session');
  });

  it('handles missing family ids without calling the service', () => {
    TestBed.resetTestingModule();

    TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: InventoryService, useValue: inventoryService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { family: { ...family, _id: undefined } } }
      ]
    });

    const missingIdFixture = TestBed.createComponent(PointOfSaleSessionDialogComponent);
    const missingIdComponent = missingIdFixture.componentInstance;
    missingIdFixture.detectChanges();

    expect(missingIdComponent.loading).toBeFalse();
    expect(missingIdComponent.errorMessage).toContain('missing an ID');
  });
});
