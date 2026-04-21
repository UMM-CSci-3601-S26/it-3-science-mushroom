import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { Family, FamilyChecklist } from '../family/family';
import { FamilyService } from '../family/family.service';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

describe('PointOfSaleSessionDialogComponent', () => {
  let fixture: ComponentFixture<PointOfSaleSessionDialogComponent>;
  let component: PointOfSaleSessionDialogComponent;
  let familyService: jasmine.SpyObj<FamilyService>;
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
    familyService = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'startFamilyHelpSession',
      'clearFamilyHelpSession',
      'updateFamilyChecklist',
      'saveFamilyHelpSessionAll'
    ]);
    dialogRef = jasmine.createSpyObj<MatDialogRef<PointOfSaleSessionDialogComponent>>('MatDialogRef', ['close']);

    familyService.startFamilyHelpSession.and.returnValue(of(family));
    familyService.clearFamilyHelpSession.and.returnValue(of(family));
    familyService.updateFamilyChecklist.and.returnValue(of(family));
    familyService.saveFamilyHelpSessionAll.and.returnValue(of(family));

    await TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
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

  it('saves the current checklist as a draft when closing', () => {
    component.closeAndSaveDraft();

    expect(familyService.updateFamilyChecklist).toHaveBeenCalledWith('family-1', jasmine.objectContaining({
      sections: [
        jasmine.objectContaining({
          items: jasmine.arrayContaining([
            jasmine.objectContaining({
              id: 'student-1-item-2',
              notPickedUpReason: 'available_didnt_need'
            }),
            jasmine.objectContaining({
              id: 'student-1-item-3',
              notPickedUpReason: undefined
            })
          ])
        })
      ]
    }));
    expect(dialogRef.close).toHaveBeenCalledWith({ draftSaved: true });
  });

  it('closes without saving a draft if the family id or checklist is missing', () => {
    component.sessionFamily = { ...family, checklist: undefined };

    component.closeAndSaveDraft();

    expect(familyService.updateFamilyChecklist).toHaveBeenCalledTimes(0);
    expect(dialogRef.close).toHaveBeenCalled();
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

  it('saves a completed session when the user confirms', () => {
    spyOn(window, 'confirm').and.returnValue(true);

    component.saveCompletedSession();

    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledWith('family-1', jasmine.any(Object));
    expect(dialogRef.close).toHaveBeenCalledWith({ completed: true });
  });

  it('does not save a completed session when the user cancels', () => {
    spyOn(window, 'confirm').and.returnValue(false);

    component.saveCompletedSession();

    expect(familyService.saveFamilyHelpSessionAll).toHaveBeenCalledTimes(0);
  });

  it('regenerates a session by clearing before starting again', () => {
    component.restartSession();

    expect(familyService.clearFamilyHelpSession).toHaveBeenCalledWith('family-1');
    expect(familyService.startFamilyHelpSession).toHaveBeenCalledTimes(2);
  });

  it('shows a useful error if a session fails to start', () => {
    TestBed.resetTestingModule();
    familyService.startFamilyHelpSession.and.returnValue(throwError(() => new Error('server down')));

    TestBed.configureTestingModule({
      imports: [PointOfSaleSessionDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: FamilyService, useValue: familyService },
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
