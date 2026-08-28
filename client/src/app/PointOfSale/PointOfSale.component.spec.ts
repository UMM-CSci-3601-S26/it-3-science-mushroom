import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../auth/auth-service';
import { Family } from '../family/family';
import { FamilyService } from '../family/family.service';
import { DialogService } from '../shared/dialog/dialog.service';
import { PointOfSaleChecklistPrintDialogComponent } from './point-of-sale-checklist-print-dialog.component';
import { PointOfSaleComponent } from './PointOfSale.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

describe('PointOfSaleComponent', () => {
  let fixture: ComponentFixture<PointOfSaleComponent>;
  let component: PointOfSaleComponent;
  let familyService: jasmine.SpyObj<FamilyService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogService: jasmine.SpyObj<DialogService>;
  let authService: jasmine.SpyObj<AuthService>;

  const family: Family = {
    _id: 'family-1',
    guardianName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main St',
    accommodations: 'None',
    needSpanishHelp: false,
    timeSlot: '9:00-10:00',
    students: [
      {
        name: 'Sam',
        grade: '3',
        school: 'Morris Area Elementary School',
        schoolAbbreviation: 'MAES',
        teacher: 'Ms. Test',
        headphones: false,
        backpack: true
      }
    ],
    checklist: {
      templateId: 'template-1',
      printableTitle: 'Sam Supply Checklist',
      snapshot: true,
      sections: [{
        id: 'student-1',
        title: 'Sam',
        printableTitle: 'Sam',
        saved: true,
        items: [
          {
            id: 'item-1',
            label: '36 Pencils',
            selected: false,
            available: true,
            requestedQuantity: 36
          },
          {
            id: 'item-2',
            label: '1 Folder Blue',
            selected: false,
            available: true,
            requestedQuantity: 1
          }
        ],
        notGivenItems: [{
          id: 'not-given-item-1',
          label: '2 Disinfectant Wipes',
          selected: false,
          available: false,
          itemDescription: '2 Disinfectant Wipes Clorox',
          requestedQuantity: 2
        }]
      }]
    }
  };

  beforeEach(async () => {
    familyService = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'getFamilies',
      'getCurrentFamilyChecklist',
      'revertCompletedFamilyHelpSession'
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogService = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);

    familyService.getFamilies.and.returnValue(of([family]));
    familyService.getCurrentFamilyChecklist.and.returnValue(of(family.checklist!));
    familyService.revertCompletedFamilyHelpSession.and.returnValue(of(family));
    authService.isAdmin.and.returnValue(true);
    dialog.open.and.returnValue({
      afterClosed: () => of(undefined)
    } as never);
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(true)
    } as never);

    await TestBed.configureTestingModule({
      imports: [PointOfSaleComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: FamilyService, useValue: familyService },
        { provide: MatDialog, useValue: dialog },
        { provide: DialogService, useValue: dialogService },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PointOfSaleComponent);
    component = fixture.componentInstance;
    (component as unknown as { dialog: jasmine.SpyObj<MatDialog> }).dialog = dialog;
  });

  function startComponent(): void {
    fixture.detectChanges();
  }

  it('loads families with initial empty filters', () => {
    startComponent();

    expect(component.loadingFamilies).toBeFalse();
    expect(component.familyLoadError).toBe('');
    expect(component.families).toEqual([family]);
    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: '',
      status: ''
    });
  });

  it('trims family search terms and applies status filters', fakeAsync(() => {
    startComponent();

    component.familySearch.setValue('  Jane  ');
    tick(300);
    component.statusFilter.setValue('helped');
    tick();

    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: 'Jane',
      status: ''
    });
    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: 'Jane',
      status: 'helped'
    });
  }));

  it('clears search fields and filters', () => {
    startComponent();
    component.familySearch.setValue('Jane');
    component.statusFilter.setValue('helped');

    component.clearFamilySearch();

    expect(component.familySearch.value).toBe('');
    expect(component.statusFilter.value).toBe('helped');

    component.familySearch.setValue('Jane');
    component.clearFilters();

    expect(component.familySearch.value).toBe('');
    expect(component.statusFilter.value).toBe('');
  });

  it('sets an error message when families fail to load', () => {
    familyService.getFamilies.and.returnValue(throwError(() => new Error('load failed')));

    startComponent();

    expect(component.loadingFamilies).toBeFalse();
    expect(component.familyLoadError).toBe('Unable to load families right now.');
    expect(component.families).toEqual([]);
  });

  it('refreshes families when a help session reports changes', () => {
    const closed = new Subject<{
      cleared?: boolean;
      completed?: boolean;
      draftSaved?: boolean;
      refresh?: boolean;
    } | undefined>();
    dialog.open.and.returnValue({
      afterClosed: () => closed.asObservable()
    } as never);
    startComponent();
    familyService.getFamilies.calls.reset();

    component.openHelpFamilySession(family);
    closed.next(undefined);
    expect(familyService.getFamilies).not.toHaveBeenCalled();

    closed.next({ cleared: true });

    expect(dialog.open).toHaveBeenCalledWith(PointOfSaleSessionDialogComponent, jasmine.objectContaining({
      data: { family },
      width: '860px',
      maxWidth: '92vw',
      maxHeight: '90vh'
    }));
    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: '',
      status: ''
    });
  });

  it('shows the checklist print action only to admins', () => {
    startComponent();

    expect(fixture.nativeElement.querySelector('[data-cy="pos-print-all-checklists-button"]')).not.toBeNull();

    authService.isAdmin.and.returnValue(false);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[data-cy="pos-print-all-checklists-button"]')).toBeNull();
  });

  it('opens the checklist print selector and prints selected students', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;

    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    component.openAllChecklistPrintDialog();

    expect(component.printableStudentCount()).toBe(1);
    expect(dialog.open).toHaveBeenCalledWith(PointOfSaleChecklistPrintDialogComponent, jasmine.objectContaining({
      data: { families: [family] },
      width: '720px',
      maxWidth: '92vw',
      maxHeight: '90vh'
    }));
    expect(window.open).toHaveBeenCalledWith('', '_blank', 'width=900,height=700');
    const printHtml = documentSpy.write.calls.mostRecent().args[0];
    expect(printHtml).toContain('Student Supply Checklist');
    expect(printHtml).toContain('<b>Student:</b> Sam');
    expect(printHtml).toContain('<b>Family Guardian:</b> Jane Doe');
    expect(printHtml).toContain('<b>School:</b> Morris Area Elementary School');
    expect(printHtml).toContain('<b>Teacher:</b> Ms. Test');
    expect(printHtml).toContain('<b>Need:</b> 36 Pencils');
    expect(printHtml).toContain('<b>Need:</b> 1 Folder Blue');
    expect(printHtml).toContain('<div class="give-row"><b>Give:</b> <span class="line"></span></div>');
    expect(printHtml).toContain('Y <span class="check-box">[ ]</span>');
    expect(printHtml).toContain('2 Disinfectant Wipes');
    expect(printHtml).not.toContain('2 Disinfectant Wipes Clorox');
    expect(printHtml).toContain('class="cols"');
    expect(printHtml).toContain('class="not-given-footer-box"');
  });

  it('loads a temporary checklist before printing when the family has no checklist yet', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;
    const familyWithoutChecklist: Family = {
      ...family,
      checklist: undefined
    };
    const temporaryChecklist = {
      ...family.checklist!,
      sections: [{
        ...family.checklist!.sections[0],
        items: [{
          id: 'temp-item-1',
          label: 'Generated Supply List Item',
          selected: false,
          available: true,
          requestedQuantity: 1
        }],
        notGivenItems: [{
          id: 'temp-not-given-item-1',
          label: 'Generated Footer Item',
          selected: false,
          available: false,
          requestedQuantity: 1
        }]
      }]
    };

    familyService.getFamilies.and.returnValue(of([familyWithoutChecklist]));
    familyService.getCurrentFamilyChecklist.and.returnValue(of(temporaryChecklist));
    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family: familyWithoutChecklist,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    component.openAllChecklistPrintDialog();

    expect(familyService.getCurrentFamilyChecklist).toHaveBeenCalledOnceWith('family-1');
    expect(documentSpy.write.calls.first().args[0]).toContain('Preparing student checklists');
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('<b>Need:</b> Generated Supply List Item');
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('Generated Footer Item');
  });

  it('loads a fresh temporary checklist instead of printing stale loaded checklist data', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;
    const staleFamily: Family = {
      ...family,
      checklist: {
        ...family.checklist!,
        sections: [{
          ...family.checklist!.sections[0],
          items: [{
            id: 'stale-item-1',
            label: 'Stale Supply List Item',
            selected: false,
            available: true,
            requestedQuantity: 1
          }],
          notGivenItems: [{
            id: 'stale-not-given-item-1',
            label: 'Stale Footer Item',
            selected: false,
            available: false,
            requestedQuantity: 1
          }]
        }]
      }
    };
    const freshChecklist = {
      ...family.checklist!,
      sections: [{
        ...family.checklist!.sections[0],
        items: [{
          id: 'fresh-item-1',
          label: 'Fresh Supply List Item',
          selected: false,
          available: true,
          requestedQuantity: 1
        }],
        notGivenItems: [{
          id: 'fresh-not-given-item-1',
          label: 'Fresh Footer Item',
          selected: false,
          available: false,
          requestedQuantity: 1
        }]
      }]
    };

    familyService.getCurrentFamilyChecklist.and.returnValue(of(freshChecklist));
    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family: staleFamily,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    component.openAllChecklistPrintDialog();

    const printHtml = documentSpy.write.calls.mostRecent().args[0];
    expect(familyService.getCurrentFamilyChecklist).toHaveBeenCalledWith('family-1');
    expect(printHtml).toContain('Fresh Supply List Item');
    expect(printHtml).toContain('Fresh Footer Item');
    expect(printHtml).not.toContain('Stale Supply List Item');
    expect(printHtml).not.toContain('Stale Footer Item');
  });

  it('prints without crashing when an old unsaved checklist shape is missing item arrays', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;
    const oldShapeFamily = {
      ...family,
      _id: undefined,
      checklist: {
        ...family.checklist!,
        sections: [{
          id: 'student-1',
          title: 'Sam',
          printableTitle: 'Sam',
          saved: false
        }]
      }
    } as unknown as Family;

    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family: oldShapeFamily,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    expect(() => component.openAllChecklistPrintDialog()).not.toThrow();
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('Student Supply Checklist');
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('class="footer-empty-line"');
  });

  it('prints write-in lines for missing checklist header values', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;
    const familyWithMissingHeader: Family = {
      ...family,
      guardianName: '',
      students: [{
        ...family.students[0],
        name: '',
        school: 'N/A',
        teacher: ''
      }]
    };

    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family: familyWithMissingHeader,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    component.openAllChecklistPrintDialog();

    const printHtml = documentSpy.write.calls.mostRecent().args[0];
    expect(printHtml).toContain('<b>Student:</b> <span class="line"></span>');
    expect(printHtml).toContain('<b>Family Guardian:</b> <span class="line"></span>');
    expect(printHtml).toContain('<b>School:</b> <span class="line"></span>');
    expect(printHtml).toContain('<b>Teacher:</b> <span class="line"></span>');
  });

  it('prints the not-given footer box with an empty line', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['open', 'write', 'close']);
    const popupWindow = {
      document: documentSpy,
      focus: jasmine.createSpy('focus')
    } as unknown as Window;

    spyOn(window, 'open').and.returnValue(popupWindow);
    dialog.open.and.returnValue({
      afterClosed: () => of({
        familySelections: [{
          family,
          selectedStudentIndexes: [0]
        }]
      })
    } as never);
    startComponent();

    component.openAllChecklistPrintDialog();

    const printHtml = documentSpy.write.calls.mostRecent().args[0];
    expect(printHtml).toContain('Not Given At Drive');
    expect(printHtml).toContain('class="footer-empty-line"');
    expect(printHtml).not.toContain('Original Supply List Item');
  });

  it('does not open the checklist print selector for non-admins', () => {
    authService.isAdmin.and.returnValue(false);
    startComponent();

    component.openAllChecklistPrintDialog();

    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('refreshes families when a help session is closed without a mutation', () => {
    const closed = new Subject<{ refresh?: boolean } | undefined>();
    dialog.open.and.returnValue({
      afterClosed: () => closed.asObservable()
    } as never);
    startComponent();
    familyService.getFamilies.calls.reset();

    component.openHelpFamilySession(family);
    closed.next({ refresh: true });

    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: '',
      status: ''
    });
  });

  it('skips revert when the family has no id or the user cancels', () => {
    dialogService.openDialog.and.returnValue({
      afterClosed: () => of(false)
    } as never);
    startComponent();

    component.revertCompletedFamilySession({ ...family, _id: undefined });
    expect(dialogService.openDialog).not.toHaveBeenCalled();

    component.revertCompletedFamilySession(family);
    expect(dialogService.openDialog).toHaveBeenCalledWith({
      title: 'Revert Completed Session',
      message: 'Revert this completed session? This will restore the removed inventory and reopen the session.',
      buttonOne: 'Cancel',
      buttonTwo: 'Revert'
    });
    expect(familyService.revertCompletedFamilyHelpSession).not.toHaveBeenCalled();
  });

  it('refreshes families after a completed session is reverted', () => {
    startComponent();
    familyService.getFamilies.calls.reset();

    component.revertCompletedFamilySession(family);

    expect(component.familyLoadError).toBe('');
    expect(familyService.revertCompletedFamilyHelpSession).toHaveBeenCalledOnceWith('family-1');
    expect(familyService.getFamilies).toHaveBeenCalledWith({
      guardianName: '',
      status: ''
    });
  });

  it('shows an error when reverting a completed session fails', () => {
    familyService.revertCompletedFamilyHelpSession.and.returnValue(throwError(() => new Error('revert failed')));
    startComponent();

    component.revertCompletedFamilySession(family);

    expect(component.loadingFamilies).toBeFalse();
    expect(component.familyLoadError).toBe('Unable to revert that completed session.');
  });
});
