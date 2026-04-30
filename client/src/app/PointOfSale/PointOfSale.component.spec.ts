import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Family } from '../family/family';
import { FamilyService } from '../family/family.service';
import { PointOfSaleComponent } from './PointOfSale.component';
import { PointOfSaleSessionDialogComponent } from './point-of-sale-session-dialog.component';

describe('PointOfSaleComponent', () => {
  let fixture: ComponentFixture<PointOfSaleComponent>;
  let component: PointOfSaleComponent;
  let familyService: jasmine.SpyObj<FamilyService>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const family: Family = {
    _id: 'family-1',
    guardianName: 'Jane Doe',
    email: 'jane@example.com',
    address: '123 Main St',
    accommodations: 'None',
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

    familyService.getFamilies.and.returnValue(of([family]));
    familyService.revertCompletedFamilyHelpSession.and.returnValue(of(family));

    await TestBed.configureTestingModule({
      imports: [PointOfSaleComponent, NoopAnimationsModule],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: FamilyService, useValue: familyService },
        { provide: MatDialog, useValue: dialog }
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
    const closed = new Subject<{ cleared?: boolean; draftSaved?: boolean; completed?: boolean } | undefined>();
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

  it('skips revert when the family has no id or the user cancels', () => {
    const confirmSpy = spyOn(window, 'confirm').and.returnValue(false);
    startComponent();

    component.revertCompletedFamilySession({ ...family, _id: undefined });
    expect(confirmSpy).not.toHaveBeenCalled();

    component.revertCompletedFamilySession(family);
    expect(confirmSpy).toHaveBeenCalled();
    expect(familyService.revertCompletedFamilyHelpSession).not.toHaveBeenCalled();
  });

  it('refreshes families after a completed session is reverted', () => {
    spyOn(window, 'confirm').and.returnValue(true);
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
    spyOn(window, 'confirm').and.returnValue(true);
    familyService.revertCompletedFamilyHelpSession.and.returnValue(throwError(() => new Error('revert failed')));
    startComponent();

    component.revertCompletedFamilySession(family);

    expect(component.loadingFamilies).toBeFalse();
    expect(component.familyLoadError).toBe('Unable to revert that completed session.');
  });
});
