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
    ]
  };

  beforeEach(async () => {
    familyService = jasmine.createSpyObj<FamilyService>('FamilyService', [
      'getFamilies',
      'revertCompletedFamilyHelpSession'
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialogService = jasmine.createSpyObj<DialogService>('DialogService', ['openDialog']);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isAdmin']);

    familyService.getFamilies.and.returnValue(of([family]));
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
    const documentSpy = jasmine.createSpyObj<Document>('document', ['write', 'close']);
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
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('Student Supply Checklist');
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('class="cols"');
    expect(documentSpy.write.calls.mostRecent().args[0]).toContain('class="not-given-footer-box"');
  });

  it('prints the not-given footer box with an empty line', () => {
    const documentSpy = jasmine.createSpyObj<Document>('document', ['write', 'close']);
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
