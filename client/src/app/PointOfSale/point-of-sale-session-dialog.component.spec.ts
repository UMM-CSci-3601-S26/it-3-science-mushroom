import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { Family, FamilyChecklist } from '../family/family';
import { FamilyService } from '../family/family.service';
import { InventoryService } from '../inventory/inventory.service';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

describe('PointOfSaleSessionDialogComponent', () => {
  let fixture: ComponentFixture<PointOfSaleSessionDialogComponent>;
  let component: PointOfSaleSessionDialogComponent;
  let familyService: jasmine.SpyObj<FamilyService>;
  let inventoryService: jasmine.SpyObj<InventoryService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PointOfSaleSessionDialogComponent>>;

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
            selected: true,
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
            requestedQuantity: 1
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
    inventoryService = jasmine.createSpyObj<InventoryService>('InventoryService', ['lookUpByBarcode']);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PointOfSaleSessionDialogComponent>>('MatDialogRef', ['close']);

    familyService.startFamilyHelpSession.and.returnValue(of(family));
    familyService.clearFamilyHelpSession.and.returnValue(of(family));
    familyService.updateFamilyChecklist.and.returnValue(of(family));
    familyService.saveFamilyHelpSessionAll.and.returnValue(of(family));
    checklist.sections[0].items[0].selected = true;
    checklist.sections[0].items[0].notPickedUpReason = undefined;
    checklist.sections[0].items[0].substituteBarcode = undefined;
    checklist.sections[0].items[0].substituteInventoryId = undefined;
    checklist.sections[0].items[0].substituteItem = undefined;
    checklist.sections[0].items[0].substituteDescription = undefined;
    checklist.sections[0].items[1].notPickedUpReason = undefined;
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
      maxQuantity: 10,
      minQuantity: 0,
      stockState: 'Stocked',
      notes: '',
      externalBarcode: ['UPC-2']
    }));

    await TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
        { provide: InventoryService, useValue: inventoryService },
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
    expect(component.loading).toBeFalse();
    expect(component.sessionFamily).toEqual(family);
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

  it('saves the current checklist as a draft when closing', () => {
    component.closeAndSaveDraft();

    const savedChecklist = familyService.updateFamilyChecklist.calls.mostRecent().args[1];
    const savedItems = savedChecklist.sections[0].items;
    expect(savedItems.find(item => item.id === 'student-1-item-2')?.notPickedUpReason).toBeUndefined();
    expect(savedItems.find(item => item.id === 'student-1-item-3')?.notPickedUpReason).toBeUndefined();
    expect(dialogRef.close).toHaveBeenCalledWith({ draftSaved: true });
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

  it('clears a session when the user confirms the x action', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.clearSessionAndClose();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledWith('family-1');
    expect(dialogRef.close).toHaveBeenCalledWith({ cleared: true });
  });

  it('does not clear a session when the user cancels the x action', () => {
    spyOn(window, 'confirm').and.returnValue(false);

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
    spyOn(window, 'confirm').and.returnValue(true);
    familyService.clearFamilyHelpSession.and.returnValue(throwError(() => new Error('clear failed')));

    component.clearSessionAndClose();

    expect(component.saving).toBeFalse();
    expect(component.errorMessage).toContain('Failed to clear session');
  });

  it('saves a completed session when the user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.saveCompletedSession();

    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledWith('family-1', jasmine.any(Object));
    expect(dialogRef.close).toHaveBeenCalledWith({ completed: true });
  });

  it('requires a reason before finalizing unchecked available items', () => {
    component.saveCompletedSession();

    expect(component.errorMessage).toContain('Choose why');
    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
  });

  it('does not save a completed session when the user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);
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
    spyOn(window, 'confirm').and.returnValue(true);
    familyService.saveFamilyHelpSessionAll.and.returnValue(throwError(() => new Error('save failed')));
    checklist.sections[0].items[1].notPickedUpReason = 'available_didnt_need';

    component.saveCompletedSession();

    expect(component.saving).toBeFalse();
    expect(component.errorMessage).toContain('Failed to save completed session');
  });

  it('applies a scanned substitute item and marks the checklist item as substituted', () => {
    const item = checklist.sections[0].items[0];

    component.applySubstituteBarcode(item, 'UPC-2');

    expect(inventoryService.lookUpByBarcode).toHaveBeenCalledWith('UPC-2');
    expect(item.selected).toBeFalse();
    expect(item.substituteBarcode).toBe('UPC-2');
    expect(item.substituteInventoryId).toBe('INV-2');
    expect(item.substituteItem).toBe('Marker');
    expect(item.notPickedUpReason).toBe('substituted');
    expect(component.substituteDisplay(item)).toBe('Black Marker');
  });

  it('handles substitution scanner toggles, blank scans, and lookup failures', () => {
    const item = checklist.sections[0].items[0];
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
